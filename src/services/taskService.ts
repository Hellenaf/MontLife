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

export const HELLEN_PRIMARY_EMAIL = "hellenalvesferreira.s2@gmail.com";
export const HELLEN_LINKED_EMAILS: string[] = [
  "hellenalvesferreira.s2@gmail.com",
  "haferreira@notredamecampinas.net.br",
  "hellenaf6667@gmail.com",
];

export const HELLEN_MASTER_ID = "usr_hellenalvesferreira_s2_gmail_com";

export function isHellenEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return HELLEN_LINKED_EMAILS.some((e) => e.toLowerCase() === clean);
}

export function isHellenUser(userId?: string | null, email?: string | null): boolean {
  if (email && isHellenEmail(email)) return true;
  if (!userId) return false;
  const lower = userId.toLowerCase();
  return (
    lower === HELLEN_MASTER_ID ||
    lower.includes("hellenalvesferreira") ||
    lower.includes("haferreira") ||
    lower.includes("hellenaf") ||
    lower.includes("notredame")
  );
}

const DEFAULT_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "acc_haferreira_notredamecampinas_net_br",
    user_id: HELLEN_MASTER_ID,
    label: "Trabalho (Notre Dame)",
    email: "haferreira@notredamecampinas.net.br",
    color: "blue",
    default_tasklist_id: "@default",
    last_sync_at: new Date().toISOString(),
    is_connected: true,
  },
  {
    id: "acc_hellenalvesferreira_s2_gmail_com",
    user_id: HELLEN_MASTER_ID,
    label: "Pessoal",
    email: "hellenalvesferreira.s2@gmail.com",
    color: "purple",
    default_tasklist_id: "@default",
    last_sync_at: new Date().toISOString(),
    is_connected: true,
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

  // Hellen's Master Identity resolution
  if (isHellenEmail(cleanEmail)) {
    const db = getFirestoreDb();
    if (db) {
      try {
        const primarySnap = await db
          .collection("users")
          .where("primary_email", "==", HELLEN_PRIMARY_EMAIL)
          .limit(1)
          .get();

        if (!primarySnap.empty) {
          return primarySnap.docs[0].data() as MasterUserProfile;
        }

        const directDoc = await db.collection("users").doc(HELLEN_MASTER_ID).get();
        if (directDoc.exists) {
          return directDoc.data() as MasterUserProfile;
        }

        for (const hEmail of HELLEN_LINKED_EMAILS) {
          const snap = await db
            .collection("users")
            .where("linked_emails", "array-contains", hEmail)
            .limit(1)
            .get();
          if (!snap.empty) {
            return snap.docs[0].data() as MasterUserProfile;
          }
        }
      } catch (err) {
        console.warn("Firestore lookup for Hellen master user failed:", err);
      }
    }

    return {
      id: HELLEN_MASTER_ID,
      primary_email: HELLEN_PRIMARY_EMAIL,
      name: "Hellen Ferreira",
      picture: "",
      role: "owner",
      linked_emails: [...HELLEN_LINKED_EMAILS],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    };
  }

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
  if (isHellenUser(userId)) {
    const profile = await findMasterUserByEmail(HELLEN_PRIMARY_EMAIL);
    if (profile) return profile;
  }

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
  const isHellen = isHellenEmail(cleanEmail) || isHellenUser(profileData.id);

  const rawId = isHellen
    ? HELLEN_MASTER_ID
    : (profileData.id || `usr_${cleanEmail.replace(/[^a-z0-9_-]/g, "_")}`);

  const nowIso = new Date().toISOString();
  const existing = await getMasterUserProfile(rawId);

  const existingLinked = existing?.linked_emails || [];
  const incomingLinked = profileData.linked_emails || [];
  const baseEmails = isHellen ? HELLEN_LINKED_EMAILS : [cleanEmail];

  const mergedEmails = Array.from(
    new Set([
      ...baseEmails.map((e) => e.toLowerCase()),
      ...existingLinked.map((e) => e.toLowerCase()),
      ...incomingLinked.map((e) => e.toLowerCase()),
    ])
  );

  const fullProfile: MasterUserProfile = {
    id: rawId,
    primary_email: isHellen ? HELLEN_PRIMARY_EMAIL : cleanEmail,
    name: profileData.name || existing?.name || (isHellen ? "Hellen Ferreira" : cleanEmail.split("@")[0]),
    picture: profileData.picture || existing?.picture || "",
    role: isHellen ? "owner" : (profileData.role || existing?.role || "member"),
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

  const targetMasterId = isHellenUser(masterUserId) || isHellenEmail(cleanEmail)
    ? HELLEN_MASTER_ID
    : masterUserId;

  const db = getFirestoreDb();
  const nowIso = new Date().toISOString();

  // In memory
  const memUser = memoryUsers.find((u) => u.id === targetMasterId);
  if (memUser) {
    if (!memUser.linked_emails.includes(cleanEmail)) {
      memUser.linked_emails.push(cleanEmail);
      memUser.updated_at = nowIso;
    }
  }

  if (db) {
    try {
      const userDocRef = db.collection("users").doc(targetMasterId);
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
// 2. CONSOLIDATION ROUTINE (HELLEN & MULTI-USER)
// ==========================================

export async function consolidateHellenWorkspace(userId?: string): Promise<{
  success: boolean;
  master_id: string;
  migrated_tasks_count: number;
  total_tasks_count: number;
  accounts: ConnectedAccount[];
}> {
  const masterId = HELLEN_MASTER_ID;
  const nowIso = new Date().toISOString();

  // 1. Ensure Master User Profile
  await createOrUpdateMasterUser({
    id: masterId,
    primary_email: HELLEN_PRIMARY_EMAIL,
    linked_emails: [...HELLEN_LINKED_EMAILS],
    name: "Hellen Ferreira",
    role: "owner",
  });

  const db = getFirestoreDb();
  let migratedCount = 0;
  let totalCount = 0;

  if (db) {
    try {
      // 2. Identify candidate IDs
      const candidateUserIds = new Set<string>([
        masterId,
        "usr_haferreira_notredamecampinas_net_br",
        "usr_hellenalvesferreira_s2_gmail_com",
        "usr_hellenaf6667_gmail_com",
        "haferreira@notredamecampinas.net.br",
        "hellenalvesferreira.s2@gmail.com",
        "hellenaf6667@gmail.com",
        "guest_workspace",
        "primary",
        "primary_workspace",
        "guest",
      ]);

      if (userId) candidateUserIds.add(userId);

      // Check users collection in Firestore
      try {
        const usersSnap = await db.collection("users").get();
        for (const doc of usersSnap.docs) {
          const u = doc.data() as MasterUserProfile;
          if (
            isHellenEmail(u.primary_email) ||
            (u.linked_emails && u.linked_emails.some((e) => isHellenEmail(e))) ||
            doc.id.toLowerCase().includes("haferreira") ||
            doc.id.toLowerCase().includes("hellen")
          ) {
            candidateUserIds.add(doc.id);
          }
        }
      } catch (err) {
        console.warn("Could not query users collection for candidate IDs:", err);
      }

      // 3. Scan all tasks and migrate matching ones to masterId
      const tasksSnap = await db.collection("tasks").get();
      const batchPromises: Promise<any>[] = [];

      for (const doc of tasksSnap.docs) {
        const task = doc.data() as Task;
        if (task.id.startsWith("seed-task-")) {
          batchPromises.push(doc.ref.delete().catch(() => {}));
          continue;
        }

        const rawUserId = task.user_id || "";
        const matchesUser =
          !rawUserId ||
          candidateUserIds.has(rawUserId) ||
          rawUserId.toLowerCase().includes("haferreira") ||
          rawUserId.toLowerCase().includes("notredame") ||
          rawUserId.toLowerCase().includes("hellen");

        const content = `${task.title || ""} ${task.raw_input || ""} ${task.description || ""} ${(task.tags || []).join(" ")}`.toLowerCase();
        const hasNotreDameKeyword =
          content.includes("totvs") ||
          content.includes("sonia") ||
          content.includes("sônia") ||
          content.includes("notre") ||
          content.includes("notredame") ||
          content.includes("campinas") ||
          content.includes("rm") ||
          content.includes("classapp") ||
          content.includes("pergamum") ||
          content.includes("aluno") ||
          content.includes("rematricula") ||
          content.includes("matrícula") ||
          content.includes("secretaria");

        if (matchesUser || hasNotreDameKeyword) {
          totalCount++;
          const targetAccountType =
            task.account_type ||
            (hasNotreDameKeyword || rawUserId.includes("haferreira") || rawUserId.includes("notredame")
              ? "Trabalho (Notre Dame)"
              : "Pessoal");

          if (task.user_id !== masterId || task.account_type !== targetAccountType) {
            migratedCount++;
            batchPromises.push(
              doc.ref.update({
                user_id: masterId,
                account_type: targetAccountType,
              }).catch(() => {})
            );
          }
        }
      }

      await Promise.all(batchPromises);

      // 4. Ensure connected accounts exist under users/{masterId}/accounts
      const accountsRef = db.collection("users").doc(masterId).collection("accounts");
      const defaultAccounts: ConnectedAccount[] = [
        {
          id: "acc_haferreira_notredamecampinas_net_br",
          user_id: masterId,
          label: "Trabalho (Notre Dame)",
          email: "haferreira@notredamecampinas.net.br",
          color: "blue",
          default_tasklist_id: "@default",
          last_sync_at: nowIso,
          is_connected: true,
        },
        {
          id: "acc_hellenalvesferreira_s2_gmail_com",
          user_id: masterId,
          label: "Pessoal",
          email: "hellenalvesferreira.s2@gmail.com",
          color: "purple",
          default_tasklist_id: "@default",
          last_sync_at: nowIso,
          is_connected: true,
        },
      ];

      for (const acc of defaultAccounts) {
        await accountsRef.doc(acc.id).set(acc, { merge: true });
      }
    } catch (err) {
      console.error("Error during consolidateHellenWorkspace:", err);
    }
  }

  const accounts = await getConnectedAccounts(masterId);
  return {
    success: true,
    master_id: masterId,
    migrated_tasks_count: migratedCount,
    total_tasks_count: totalCount,
    accounts,
  };
}

// ==========================================
// 3. TASK PERSISTENCE & CENTRALIZATION
// ==========================================

export async function getTasksFromDb(userId?: string): Promise<Task[]> {
  const isHellen = isHellenUser(userId);
  const targetMasterId = isHellen ? HELLEN_MASTER_ID : (userId || "primary_workspace");

  const db = getFirestoreDb();
  if (!db) {
    if (isHellen) {
      return memoryTasks.map((t) => ({ ...t, user_id: HELLEN_MASTER_ID }));
    }
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId);
    }
    return memoryTasks;
  }

  try {
    const taskMap = new Map<string, Task>();

    if (userId) {
      // 1. Fetch user's direct tasks
      const directIds = isHellen ? [userId, HELLEN_MASTER_ID] : [userId];
      for (const queryId of Array.from(new Set(directIds))) {
        const userSnap = await db
          .collection("tasks")
          .where("user_id", "==", queryId)
          .get();

        for (const doc of userSnap.docs) {
          const data = doc.data() as Task;
          if (!data.id.startsWith("seed-task-")) {
            taskMap.set(data.id, isHellen ? { ...data, user_id: HELLEN_MASTER_ID } : data);
          }
        }
      }

      // 2. Consolidation for Hellen (Centralize Notre Dame & Pessoal demands)
      if (isHellen) {
        const hellenCandidateIds = new Set<string>([
          userId,
          HELLEN_MASTER_ID,
          "usr_haferreira_notredamecampinas_net_br",
          "usr_hellenalvesferreira_s2_gmail_com",
          "usr_hellenaf6667_gmail_com",
          "haferreira@notredamecampinas.net.br",
          "hellenalvesferreira.s2@gmail.com",
          "hellenaf6667@gmail.com",
          "guest_workspace",
          "primary",
          "primary_workspace",
          "guest",
        ]);

        const tasksToMigrate: Task[] = [];

        try {
          const allTasksSnap = await db.collection("tasks").get();
          for (const doc of allTasksSnap.docs) {
            const data = doc.data() as Task;
            if (data.id.startsWith("seed-task-")) {
              doc.ref.delete().catch(() => {});
              continue;
            }

            const rawUserId = data.user_id || "";
            const isAssignedToHellenCandidate =
              !rawUserId ||
              hellenCandidateIds.has(rawUserId) ||
              rawUserId.toLowerCase().includes("haferreira") ||
              rawUserId.toLowerCase().includes("notredame") ||
              rawUserId.toLowerCase().includes("hellen");

            const content = `${data.title || ""} ${data.raw_input || ""} ${data.description || ""} ${(data.tags || []).join(" ")}`.toLowerCase();
            const hasNotreDameKeyword =
              content.includes("totvs") ||
              content.includes("sonia") ||
              content.includes("sônia") ||
              content.includes("notre") ||
              content.includes("notredame") ||
              content.includes("campinas") ||
              content.includes("rm") ||
              content.includes("classapp") ||
              content.includes("pergamum") ||
              content.includes("aluno") ||
              content.includes("rematricula") ||
              content.includes("matrícula") ||
              content.includes("secretaria");

            if (isAssignedToHellenCandidate || hasNotreDameKeyword) {
              const targetAccountType =
                data.account_type ||
                (hasNotreDameKeyword || rawUserId.includes("haferreira") || rawUserId.includes("notredame")
                  ? "Trabalho (Notre Dame)"
                  : "Pessoal");

              const consolidatedTask: Task = {
                ...data,
                user_id: HELLEN_MASTER_ID,
                account_type: targetAccountType,
              };

              taskMap.set(data.id, consolidatedTask);

              if (data.user_id !== HELLEN_MASTER_ID || data.account_type !== targetAccountType) {
                tasksToMigrate.push(consolidatedTask);
              }
            }
          }

          if (tasksToMigrate.length > 0) {
            Promise.all(
              tasksToMigrate.map((t) =>
                db.collection("tasks").doc(t.id).update({
                  user_id: HELLEN_MASTER_ID,
                  account_type: t.account_type,
                }).catch(() => {})
              )
            ).catch(() => {});
          }
        } catch (scanErr) {
          console.warn("Full tasks scan for Hellen consolidation failed:", scanErr);
        }
      } else {
        // Multi-user support for other users: adopt linked emails and orphan tasks
        try {
          const userProfile = await getMasterUserProfile(userId);
          const candidateIds = new Set<string>([userId]);
          if (userProfile?.linked_emails) {
            for (const email of userProfile.linked_emails) {
              candidateIds.add(`usr_${email.replace(/[^a-z0-9_-]/g, "_")}`);
            }
          }

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

            const isCandidate = data.user_id && candidateIds.has(data.user_id);
            const isOrphaned =
              !data.user_id ||
              data.user_id === "guest_workspace" ||
              data.user_id === "guest" ||
              data.user_id === "primary" ||
              data.user_id === "primary_workspace";

            if (isCandidate || isOrphaned) {
              const adoptedTask = { ...data, user_id: userId };
              taskMap.set(data.id, adoptedTask);
              if (data.user_id !== userId) {
                tasksToMigrate.push(adoptedTask);
              }
            }
          }

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
    if (isHellen) {
      return memoryTasks.map((t) => ({ ...t, user_id: HELLEN_MASTER_ID }));
    }
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId);
    }
    return memoryTasks;
  }
}

export async function saveTaskToDb(task: Task, userId?: string): Promise<Task> {
  const isHellen = isHellenUser(userId) || isHellenUser(task.user_id);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : (userId || task.user_id || "primary_workspace");
  task.user_id = targetUserId;

  // Update memory
  const idx = memoryTasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    memoryTasks[idx] = task;
  } else {
    memoryTasks.unshift(task);
  }

  const db = getFirestoreDb();
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
// 4. UNLIMITED CONNECTED ACCOUNTS
// ==========================================

export async function getConnectedAccounts(userId?: string): Promise<ConnectedAccount[]> {
  const isHellen = isHellenUser(userId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : (userId || "");

  const hellenDefaultAccounts: ConnectedAccount[] = [
    {
      id: "acc_haferreira_notredamecampinas_net_br",
      user_id: HELLEN_MASTER_ID,
      label: "Trabalho (Notre Dame)",
      email: "haferreira@notredamecampinas.net.br",
      color: "blue",
      default_tasklist_id: "@default",
      last_sync_at: new Date().toISOString(),
      is_connected: true,
    },
    {
      id: "acc_hellenalvesferreira_s2_gmail_com",
      user_id: HELLEN_MASTER_ID,
      label: "Pessoal",
      email: "hellenalvesferreira.s2@gmail.com",
      color: "purple",
      default_tasklist_id: "@default",
      last_sync_at: new Date().toISOString(),
      is_connected: true,
    },
  ];

  const db = getFirestoreDb();
  if (!db) {
    if (isHellen) {
      return hellenDefaultAccounts;
    }
    return memoryAccounts.map((acc) => ({
      ...acc,
      label: acc.label || (acc.id === "work" ? "Trabalho" : acc.id === "personal" ? "Pessoal" : "Geral"),
      is_connected: Boolean(acc.access_token || acc.refresh_token || acc.email),
    }));
  }

  try {
    let accounts: ConnectedAccount[] = [];

    if (targetUserId) {
      const colRef = db.collection("users").doc(targetUserId).collection("accounts");
      const snapshot = await colRef.get();

      if (!snapshot.empty) {
        accounts = snapshot.docs.map((doc) => {
          const data = doc.data() as ConnectedAccount;
          return {
            ...data,
            label: data.label || (data.id === "work" ? "Trabalho" : data.id === "personal" ? "Pessoal" : "Geral"),
            is_connected: Boolean(data.access_token || data.refresh_token || data.email),
          };
        });
      }

      // Check candidate Hellen ids to migrate any existing accounts
      if (isHellen) {
        const alternateHellenIds = [
          userId,
          "usr_haferreira_notredamecampinas_net_br",
          "usr_hellenalvesferreira_s2_gmail_com",
          "usr_hellenaf6667_gmail_com",
        ].filter((id): id is string => Boolean(id && id !== HELLEN_MASTER_ID));

        for (const altId of alternateHellenIds) {
          try {
            const altSnap = await db.collection("users").doc(altId).collection("accounts").get();
            for (const doc of altSnap.docs) {
              const data = doc.data() as ConnectedAccount;
              if (!accounts.some((a) => a.email?.toLowerCase() === data.email?.toLowerCase())) {
                accounts.push({
                  ...data,
                  user_id: HELLEN_MASTER_ID,
                  is_connected: true,
                });
                colRef.doc(doc.id).set({ ...data, user_id: HELLEN_MASTER_ID }, { merge: true }).catch(() => {});
              }
            }
          } catch {}
        }

        // Ensure both Notre Dame and Pessoal exist
        for (const defAcc of hellenDefaultAccounts) {
          const existing = accounts.find((a) => a.email?.toLowerCase() === defAcc.email?.toLowerCase());
          if (!existing) {
            accounts.push(defAcc);
            colRef.doc(defAcc.id).set(defAcc, { merge: true }).catch(() => {});
          } else {
            existing.is_connected = true;
            if (!existing.label || existing.label === "work") {
              existing.label = defAcc.label;
            }
          }
        }
      }
    }

    if (accounts.length === 0) {
      if (isHellen) {
        return hellenDefaultAccounts;
      }
      return memoryAccounts.map((acc) => ({
        ...acc,
        label: acc.label || (acc.id === "work" ? "Trabalho" : acc.id === "personal" ? "Pessoal" : "Geral"),
        is_connected: Boolean(acc.access_token || acc.refresh_token || acc.email),
      }));
    }

    return accounts;
  } catch (err) {
    console.warn("Firestore read accounts failed:", err);
    if (isHellen) return hellenDefaultAccounts;
    return memoryAccounts;
  }
}

export async function saveConnectedAccount(
  account: ConnectedAccount,
  userId?: string
): Promise<ConnectedAccount> {
  const isHellen = isHellenUser(userId) || isHellenEmail(account.email);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : (userId || account.user_id);

  if (targetUserId) {
    account.user_id = targetUserId;
  }

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

  if (targetUserId && account.email) {
    linkEmailToMasterUser(targetUserId, account.email).catch(() => {});
  }

  const db = getFirestoreDb();
  if (!db) return account;

  try {
    const docRef = targetUserId
      ? db.collection("users").doc(targetUserId).collection("accounts").doc(account.id)
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
  const isHellen = isHellenUser(userId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;

  memoryAccounts = memoryAccounts.filter((a) => a.id !== accountId);

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    if (targetUserId) {
      await db.collection("users").doc(targetUserId).collection("accounts").doc(accountId).delete();
    } else {
      await db.collection("connected_accounts").doc(accountId).delete();
    }
    return true;
  } catch (err) {
    console.warn("Firestore delete account failed:", err);
    return true;
  }
}
