import { getFirestoreDb } from "@/lib/firebaseAdmin";
import {
  Task,
  TaskStatus,
  SimilarResolution,
  ConnectedAccount,
  AccountType,
  MasterUserProfile,
} from "@/types";
import {
  calculateSlaDueDate,
  checkMetOriginalSla,
} from "@/lib/sla";

const DEFAULT_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "work",
    label: "Trabalho",
    email: "",
    default_tasklist_id: "@default",
    last_sync_at: null,
    is_connected: false,
  },
  {
    id: "personal",
    label: "Pessoal",
    email: "",
    default_tasklist_id: "@default",
    last_sync_at: null,
    is_connected: false,
  },
];

// In-memory fallback cache
let memoryTasks: Task[] = [];
let memoryAccounts: ConnectedAccount[] = [...DEFAULT_ACCOUNTS];
let memoryUsers: MasterUserProfile[] = [];

// ==========================================
// 1. MASTER USER & CROSS-ACCOUNT RECOGNITION
// ==========================================

export async function findMasterUserByEmail(
  email: string
): Promise<MasterUserProfile | null> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return null;

  const db = getFirestoreDb();
  if (!db) {
    return (
      memoryUsers.find(
        (u) =>
          u.primary_email.toLowerCase() === cleanEmail ||
          u.linked_emails.map((e) => e.toLowerCase()).includes(cleanEmail)
      ) || null
    );
  }

  try {
    // 1. Check if email is in linked_emails array
    const linkedSnap = await db
      .collection("users")
      .where("linked_emails", "array-contains", cleanEmail)
      .limit(1)
      .get();

    if (!linkedSnap.empty) {
      return linkedSnap.docs[0].data() as MasterUserProfile;
    }

    // 2. Check primary_email field
    const primarySnap = await db
      .collection("users")
      .where("primary_email", "==", cleanEmail)
      .limit(1)
      .get();

    if (!primarySnap.empty) {
      return primarySnap.docs[0].data() as MasterUserProfile;
    }

    return null;
  } catch (err) {
    console.warn("Failed to find master user by email in Firestore:", err);
    return (
      memoryUsers.find(
        (u) =>
          u.primary_email.toLowerCase() === cleanEmail ||
          u.linked_emails.map((e) => e.toLowerCase()).includes(cleanEmail)
      ) || null
    );
  }
}

export async function getMasterUserProfile(
  userId: string
): Promise<MasterUserProfile | null> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryUsers.find((u) => u.id === userId) || null;
  }

  try {
    const doc = await db.collection("users").doc(userId).get();
    if (doc.exists) {
      return doc.data() as MasterUserProfile;
    }
    return null;
  } catch (err) {
    console.warn("Failed to read user profile from Firestore:", err);
    return memoryUsers.find((u) => u.id === userId) || null;
  }
}

export async function createOrUpdateMasterUser(
  profileData: Partial<MasterUserProfile> & {
    id?: string;
    primary_email: string;
  }
): Promise<MasterUserProfile> {
  const cleanEmail = profileData.primary_email.toLowerCase().trim();
  const rawId =
    profileData.id ||
    `usr_${cleanEmail.replace(/[^a-z0-9_-]/g, "_")}`;

  const nowIso = new Date().toISOString();
  const existing = await getMasterUserProfile(rawId);

  const existingLinked = existing?.linked_emails || [];
  const incomingLinked = profileData.linked_emails || [];
  const mergedEmails = Array.from(
    new Set([
      ...existingLinked.map((e) => e.toLowerCase()),
      ...incomingLinked.map((e) => e.toLowerCase()),
      cleanEmail,
    ])
  );

  const fullProfile: MasterUserProfile = {
    id: rawId,
    primary_email: cleanEmail,
    name: profileData.name || existing?.name || cleanEmail.split("@")[0],
    picture: profileData.picture || existing?.picture || "",
    role: profileData.role || existing?.role || "member",
    linked_emails: mergedEmails,
    created_at: existing?.created_at || profileData.created_at || nowIso,
    updated_at: nowIso,
    last_login_at: nowIso,
  };

  // Keep in-memory
  const idx = memoryUsers.findIndex((u) => u.id === fullProfile.id);
  if (idx >= 0) {
    memoryUsers[idx] = fullProfile;
  } else {
    memoryUsers.push(fullProfile);
  }

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("users").doc(fullProfile.id).set(fullProfile, { merge: true });
    } catch (err) {
      console.warn("Failed to write master user to Firestore:", err);
    }
  }

  return fullProfile;
}

export async function linkEmailToMasterUser(
  masterUserId: string,
  newEmail: string
): Promise<void> {
  const cleanEmail = newEmail.toLowerCase().trim();
  if (!cleanEmail || !masterUserId) return;

  const db = getFirestoreDb();
  const nowIso = new Date().toISOString();

  // In memory
  const memUser = memoryUsers.find((u) => u.id === masterUserId);
  if (memUser) {
    if (!memUser.linked_emails.includes(cleanEmail)) {
      memUser.linked_emails.push(cleanEmail);
      memUser.updated_at = nowIso;
    }
  }

  if (db) {
    try {
      const userDocRef = db.collection("users").doc(masterUserId);
      const doc = await userDocRef.get();
      if (doc.exists) {
        const data = doc.data() as MasterUserProfile;
        const currentList = data.linked_emails || [data.primary_email];
        if (!currentList.map((e) => e.toLowerCase()).includes(cleanEmail)) {
          await userDocRef.update({
            linked_emails: [...currentList, cleanEmail],
            updated_at: nowIso,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to link email to master user in Firestore:", err);
    }
  }
}

// ==========================================
// 2. TASK PERSISTENCE & LEGACY UNIFICATION
// ==========================================

export async function getTasksFromDb(userId?: string): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) {
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId);
    }
    return memoryTasks;
  }

  try {
    const taskMap = new Map<string, Task>();

    if (userId) {
      // 1. Fetch user's direct tasks
      const userSnap = await db
        .collection("tasks")
        .where("user_id", "==", userId)
        .get();

      for (const doc of userSnap.docs) {
        const data = doc.data() as Task;
        if (!data.id.startsWith("seed-task-")) {
          taskMap.set(data.id, data);
        }
      }

      // 2. CRITICAL PERSISTENCE BUG FIX:
      // Check for legacy/unassigned native tasks in Firestore that were created
      // prior to authentication or in guest/test mode. Automatically migrate/adopt them!
      try {
        const legacySnap = await db
          .collection("tasks")
          .orderBy("created_at", "desc")
          .limit(100)
          .get();

        const tasksToMigrate: Task[] = [];
        for (const doc of legacySnap.docs) {
          const data = doc.data() as Task;
          if (data.id.startsWith("seed-task-")) {
            doc.ref.delete().catch(() => {});
            continue;
          }

          // If task has no user_id, or has legacy guest/primary workspace id
          const isOrphaned =
            !data.user_id ||
            data.user_id === "guest_workspace" ||
            data.user_id === "guest" ||
            data.user_id === "primary" ||
            data.user_id === "primary_workspace";

          if (isOrphaned) {
            const adoptedTask = { ...data, user_id: userId };
            taskMap.set(data.id, adoptedTask);
            tasksToMigrate.push(adoptedTask);
          }
        }

        // Asynchronously update adopted tasks in Firestore so they are permanently saved
        if (tasksToMigrate.length > 0) {
          Promise.all(
            tasksToMigrate.map((t) =>
              db.collection("tasks").doc(t.id).update({ user_id: userId }).catch(() => {})
            )
          ).catch(() => {});
        }
      } catch (legacyErr) {
        console.warn("Legacy task migration check failed:", legacyErr);
      }
    } else {
      // If no userId, return all valid production tasks
      const snapshot = await db.collection("tasks").orderBy("created_at", "desc").get();
      for (const doc of snapshot.docs) {
        const data = doc.data() as Task;
        if (!data.id.startsWith("seed-task-")) {
          taskMap.set(data.id, data);
        }
      }
    }

    const tasks = Array.from(taskMap.values());
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
  } else if (!task.user_id) {
    task.user_id = "primary_workspace";
  }

  // Update memory
  const idx = memoryTasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    memoryTasks[idx] = task;
  } else {
    memoryTasks.unshift(task);
  }

  if (!db) {
    return task;
  }

  try {
    await db.collection("tasks").doc(task.id).set(task, { merge: true });
    return task;
  } catch (err) {
    console.warn("Firestore write failed, saving to in-memory:", err);
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

  task.execution_history.unshift({
    id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: nowIso,
    notes: params.notes || "Nova ocorrência registrada na demanda existente.",
    method: params.method || (task.resolution_notes ? "Método padrão anterior" : undefined),
    registered_by: params.registeredBy || "Usuário",
  });

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

// ==========================================
// 3. UNLIMITED CONNECTED ACCOUNTS
// ==========================================

export async function getConnectedAccounts(userId?: string): Promise<ConnectedAccount[]> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryAccounts.map((acc) => ({
      ...acc,
      label: acc.label || (acc.id === "work" ? "Trabalho" : acc.id === "personal" ? "Pessoal" : "Geral"),
      is_connected: Boolean(acc.access_token || acc.refresh_token),
    }));
  }

  try {
    let accounts: ConnectedAccount[] = [];

    if (userId) {
      const colRef = db.collection("users").doc(userId).collection("accounts");
      const snapshot = await colRef.get();

      if (!snapshot.empty) {
        accounts = snapshot.docs.map((doc) => {
          const data = doc.data() as ConnectedAccount;
          return {
            ...data,
            label: data.label || (data.id === "work" ? "Trabalho" : data.id === "personal" ? "Pessoal" : "Geral"),
            is_connected: Boolean(data.access_token || data.refresh_token),
          };
        });
      } else {
        // Fallback: check legacy root connected_accounts
        const legacySnap = await db.collection("connected_accounts").get();
        if (!legacySnap.empty) {
          accounts = legacySnap.docs.map((doc) => {
            const data = doc.data() as ConnectedAccount;
            return {
              ...data,
              label: data.label || (data.id === "work" ? "Trabalho" : data.id === "personal" ? "Pessoal" : "Geral"),
              is_connected: Boolean(data.access_token || data.refresh_token),
            };
          });
        }
      }
    } else {
      const rootSnap = await db.collection("connected_accounts").get();
      if (!rootSnap.empty) {
        accounts = rootSnap.docs.map((doc) => {
          const data = doc.data() as ConnectedAccount;
          return {
            ...data,
            label: data.label || (data.id === "work" ? "Trabalho" : data.id === "personal" ? "Pessoal" : "Geral"),
            is_connected: Boolean(data.access_token || data.refresh_token),
          };
        });
      }
    }

    if (accounts.length === 0) {
      return memoryAccounts.map((acc) => ({
        ...acc,
        label: acc.label || (acc.id === "work" ? "Trabalho" : acc.id === "personal" ? "Pessoal" : "Geral"),
        is_connected: Boolean(acc.access_token || acc.refresh_token),
      }));
    }

    return accounts;
  } catch (err) {
    console.warn("Firestore read accounts failed:", err);
    return memoryAccounts;
  }
}

export async function saveConnectedAccount(
  account: ConnectedAccount,
  userId?: string
): Promise<ConnectedAccount> {
  const db = getFirestoreDb();
  if (userId) {
    account.user_id = userId;
  }

  // Ensure an id and label exist
  if (!account.id) {
    account.id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }
  if (!account.label) {
    account.label = account.id === "work" ? "Trabalho" : account.id === "personal" ? "Pessoal" : "Geral";
  }

  // In memory
  const idx = memoryAccounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    memoryAccounts[idx] = account;
  } else {
    memoryAccounts.push(account);
  }

  // Also ensure this email is linked to the user's master profile
  if (userId && account.email) {
    linkEmailToMasterUser(userId, account.email).catch(() => {});
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

export async function deleteConnectedAccount(
  accountId: string,
  userId?: string
): Promise<boolean> {
  memoryAccounts = memoryAccounts.filter((a) => a.id !== accountId);

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    if (userId) {
      await db.collection("users").doc(userId).collection("accounts").doc(accountId).delete();
    } else {
      await db.collection("connected_accounts").doc(accountId).delete();
    }
    return true;
  } catch (err) {
    console.warn("Firestore delete account failed:", err);
    return true;
  }
}
