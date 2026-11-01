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

export async function getTasksFromDb(): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryTasks;
  }

  try {
    const snapshot = await db.collection("tasks").orderBy("created_at", "desc").get();
    if (snapshot.empty) {
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

    return tasks;
  } catch (err) {
    console.warn("Firestore read failed, falling back to in-memory tasks:", err);
    return memoryTasks;
  }
}

export async function saveTaskToDb(task: Task): Promise<Task> {
  const db = getFirestoreDb();
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

export async function deleteTaskFromDb(taskId: string): Promise<boolean> {
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
  queryText: string
): Promise<SimilarResolution[]> {
  const tasks = await getTasksFromDb();
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
  cancelReason?: string | null
): Promise<Task | null> {
  const tasks = await getTasksFromDb();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const nowIso = new Date().toISOString();
  task.status = newStatus;

  if (newStatus === "IN_PROGRESS" && !task.started_at) {
    task.started_at = nowIso;
  } else if (newStatus === "COMPLETED") {
    task.completed_at = nowIso;
    task.resolution_notes = resolutionNotes || task.resolution_notes || "Demanda concluída com sucesso.";
    task.met_original_sla = checkMetOriginalSla(task.original_due_date, task.completed_at);
  } else if (newStatus === "CANCELED") {
    task.cancel_reason = cancelReason || "Cancelada pelo usuário.";
  }

  await saveTaskToDb(task);
  return task;
}

export async function extendTaskDeadline(
  taskId: string,
  newDueDateIso: string,
  reason: string
): Promise<Task | null> {
  const tasks = await getTasksFromDb();
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

  await saveTaskToDb(task);
  return task;
}

export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryAccounts.map((acc) => ({
      ...acc,
      is_connected: Boolean(acc.access_token || acc.refresh_token),
    }));
  }

  try {
    const snapshot = await db.collection("connected_accounts").get();
    if (snapshot.empty) {
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

export async function saveConnectedAccount(account: ConnectedAccount): Promise<ConnectedAccount> {
  const db = getFirestoreDb();
  const idx = memoryAccounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    memoryAccounts[idx] = account;
  } else {
    memoryAccounts.push(account);
  }

  if (!db) return account;

  try {
    await db.collection("connected_accounts").doc(account.id).set(account, { merge: true });
    return account;
  } catch (err) {
    console.warn("Firestore save account failed:", err);
    return account;
  }
}
