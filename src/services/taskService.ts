import { getFirestoreDb } from "@/lib/firebaseAdmin";
import {
  Task,
  TaskStatus,
  SimilarResolution,
  ConnectedAccount,
  AccountType,
} from "@/types";
import {
  calculateSlaDueDate,
  checkMetOriginalSla,
} from "@/lib/sla";

const DEFAULT_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "work",
    email: "",
    default_tasklist_id: "@default",
    last_sync_at: null,
    is_connected: false,
  },
  {
    id: "personal",
    email: "",
    default_tasklist_id: "@default",
    last_sync_at: null,
    is_connected: false,
  },
];

// Pure empty state in production
let memoryTasks: Task[] = [];
let memoryAccounts: ConnectedAccount[] = [...DEFAULT_ACCOUNTS];

export async function getTasksFromDb(userId?: string): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) {
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId);
    }
    return memoryTasks;
  }

  try {
    let snapshot;
    if (userId) {
      snapshot = await db.collection("tasks").where("user_id", "==", userId).get();
      // If user has no tasks yet, check if there are legacy tasks without user_id only for the primary owner
      if (snapshot.empty && (userId === "primary" || userId.includes("hellen"))) {
        const legacySnap = await db.collection("tasks").orderBy("created_at", "desc").get();
        const legacyDocs = legacySnap.docs.filter((d) => !d.data().user_id);
        if (legacyDocs.length > 0) {
          snapshot = { docs: legacyDocs, empty: false } as any;
        }
      }
    } else {
      snapshot = await db.collection("tasks").orderBy("created_at", "desc").get();
    }

    if (!snapshot || snapshot.empty) {
      return [];
    }

    const tasks: Task[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as Task;
      // Auto-purge any leftover legacy seed tasks from test mode
      if (data.id.startsWith("seed-task-")) {
        doc.ref.delete().catch(() => {});
        continue;
      }
      tasks.push(data);
    }

    // Sort descending by created_at
    tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return tasks;
  } catch (err) {
    console.warn("Firestore read failed, falling back to in-memory tasks:", err);
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId);
    }
    return memoryTasks;
  }
}

export async function saveTaskToDb(task: Task, userId?: string): Promise<Task> {
  const db = getFirestoreDb();
  if (userId) {
    task.user_id = userId;
  }

  if (!db) {
    const idx = memoryTasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      memoryTasks[idx] = task;
    } else {
      memoryTasks.unshift(task);
    }
    return task;
  }

  try {
    await db.collection("tasks").doc(task.id).set(task, { merge: true });
    return task;
  } catch (err) {
    console.warn("Firestore write failed, saving to in-memory:", err);
    const idx = memoryTasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      memoryTasks[idx] = task;
    } else {
      memoryTasks.unshift(task);
    }
    return task;
  }
}

export async function deleteTaskFromDb(taskId: string, userId?: string): Promise<boolean> {
  const db = getFirestoreDb();
  memoryTasks = memoryTasks.filter((t) => t.id !== taskId);

  if (!db) return true;

  try {
    await db.collection("tasks").doc(taskId).delete();
    return true;
  } catch (err) {
    console.warn("Firestore delete failed:", err);
    return true;
  }
}

export async function findSimilarCompletedTasks(
  searchTags: string[],
  queryText: string,
  userId?: string
): Promise<SimilarResolution[]> {
  const tasks = await getTasksFromDb(userId);
  const completed = tasks.filter((t) => t.status === "COMPLETED" && t.resolution_notes);

  const lowerQuery = queryText.toLowerCase();
  const results: SimilarResolution[] = [];

  for (const t of completed) {
    const matched: string[] = [];
    const tTags = t.tags || [];

    for (const tag of searchTags) {
      const normTag = tag.toLowerCase();
      if (tTags.some((tt) => tt.toLowerCase() === normTag || tt.includes(normTag) || normTag.includes(tt))) {
        matched.push(tag);
      }
    }

    const titleMatch = t.title.toLowerCase().includes(lowerQuery) || lowerQuery.includes(t.title.toLowerCase());
    const rawMatch = t.raw_input.toLowerCase().includes(lowerQuery);

    if (matched.length > 0 || titleMatch || rawMatch) {
      results.push({
        task_id: t.id,
        title: t.title,
        completed_at: t.completed_at || t.created_at,
        resolution_notes: t.resolution_notes!,
        matched_tags: matched.length > 0 ? matched : t.tags.slice(0, 3),
      });
    }
  }

  return results.slice(0, 3);
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  resolutionNotes?: string | null,
  cancelReason?: string | null,
  resolutionAttachments?: import("@/types").TaskAttachment[],
  userId?: string
): Promise<Task | null> {
  const tasks = await getTasksFromDb(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const nowIso = new Date().toISOString();
  task.status = newStatus;

  if (newStatus === "IN_PROGRESS" && !task.started_at) {
    task.started_at = nowIso;
  } else if (newStatus === "COMPLETED") {
    task.completed_at = nowIso;
    task.resolution_notes = resolutionNotes || task.resolution_notes || "Demanda concluída com sucesso.";
    if (resolutionAttachments && resolutionAttachments.length > 0) {
      task.resolution_attachments = [
        ...(task.resolution_attachments || []),
        ...resolutionAttachments,
      ];
    }
    task.met_original_sla = checkMetOriginalSla(task.original_due_date, task.completed_at);
  } else if (newStatus === "CANCELED") {
    task.cancel_reason = cancelReason || "Cancelada pelo usuário.";
  }

  await saveTaskToDb(task, userId);
  return task;
}

export async function registerExecutionRecurrence(
  taskId: string,
  params: {
    notes?: string;
    method?: string;
    registeredBy?: string;
    reopenStatus?: TaskStatus;
  },
  userId?: string
): Promise<Task | null> {
  const tasks = await getTasksFromDb(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const nowIso = new Date().toISOString();
  task.recurrence_count = (task.recurrence_count || 1) + 1;

  if (!task.execution_history) {
    task.execution_history = [];
  }

  // Record this execution in history
  task.execution_history.unshift({
    id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: nowIso,
    notes: params.notes || "Nova ocorrência registrada na demanda existente.",
    method: params.method || (task.resolution_notes ? "Método padrão anterior" : undefined),
    registered_by: params.registeredBy || "Usuário",
  });

  // If a new alternative method was specified, record it
  if (params.method && params.method.trim().length > 0) {
    if (!task.alternative_resolutions) {
      task.alternative_resolutions = [];
    }
    task.alternative_resolutions.push({
      id: `res-${Date.now()}`,
      date: nowIso,
      method: params.method.trim(),
      notes: params.notes || "",
    });
  }

  // Update status if user wants to work on it again
  if (params.reopenStatus) {
    task.status = params.reopenStatus;
    if (params.reopenStatus === "IN_PROGRESS") {
      task.started_at = nowIso;
      task.completed_at = null;
    }
  }

  await saveTaskToDb(task, userId);
  return task;
}

export async function findDirectDbMatchForTriage(rawInput: string, userId?: string): Promise<Task | null> {
  const tasks = await getTasksFromDb(userId);
  const cleanInput = rawInput.toLowerCase().trim();
  if (!cleanInput) return null;

  for (const t of tasks) {
    const tTitle = (t.title || "").toLowerCase().trim();
    const tRaw = (t.raw_input || "").toLowerCase().trim();

    // Exact match or highly distinct similarity
    if (tTitle === cleanInput || tRaw === cleanInput) {
      return t;
    }
    if (cleanInput.length > 10 && (tTitle.includes(cleanInput) || cleanInput.includes(tTitle))) {
      return t;
    }
  }
  return null;
}

export async function extendTaskDeadline(
  taskId: string,
  newDueDateIso: string,
  reason: string,
  userId?: string
): Promise<Task | null> {
  const tasks = await getTasksFromDb(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const previousDate = task.current_due_date;
  task.current_due_date = newDueDateIso;
  task.extension_count = (task.extension_count || 0) + 1;

  if (!task.deadline_extensions) {
    task.deadline_extensions = [];
  }

  task.deadline_extensions.push({
    extended_at: new Date().toISOString(),
    previous_date: previousDate,
    new_date: newDueDateIso,
    reason: reason || "Adiamento solicitado.",
  });

  await saveTaskToDb(task, userId);
  return task;
}

export async function getConnectedAccounts(userId?: string): Promise<ConnectedAccount[]> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryAccounts.map((acc) => ({
      ...acc,
      is_connected: Boolean(acc.access_token || acc.refresh_token),
    }));
  }

  try {
    const colRef = userId
      ? db.collection("users").doc(userId).collection("accounts")
      : db.collection("connected_accounts");

    const snapshot = await colRef.get();
    if (snapshot.empty) {
      if (userId) {
        const legacySnap = await db.collection("connected_accounts").get();
        if (!legacySnap.empty) {
          return legacySnap.docs.map((doc) => {
            const data = doc.data() as ConnectedAccount;
            return {
              ...data,
              is_connected: Boolean(data.access_token || data.refresh_token),
            };
          });
        }
      }

      return [
        { id: "work", email: "", default_tasklist_id: "@default", last_sync_at: null, is_connected: false },
        { id: "personal", email: "", default_tasklist_id: "@default", last_sync_at: null, is_connected: false },
      ];
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data() as ConnectedAccount;
      const isActuallyConnected = Boolean(data.access_token || data.refresh_token);
      return {
        ...data,
        is_connected: isActuallyConnected,
      };
    });
  } catch (err) {
    console.warn("Firestore read accounts failed:", err);
    return memoryAccounts;
  }
}

export async function saveConnectedAccount(account: ConnectedAccount, userId?: string): Promise<ConnectedAccount> {
  const db = getFirestoreDb();
  if (userId) {
    account.user_id = userId;
  }

  const idx = memoryAccounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    memoryAccounts[idx] = account;
  } else {
    memoryAccounts.push(account);
  }

  if (!db) return account;

  try {
    const docRef = userId
      ? db.collection("users").doc(userId).collection("accounts").doc(account.id)
      : db.collection("connected_accounts").doc(account.id);

    await docRef.set(account, { merge: true });
    return account;
  } catch (err) {
    console.warn("Firestore save account failed:", err);
    return account;
  }
}
