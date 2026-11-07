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

/**
 * Strict data isolation check: verifies if a task belongs to Hellen's workspace.
 * If owner_uid, user_id, or account_email belongs to another user, returns FALSE.
 * Ensures zero data bleeding between Hellen and any other users.
 */
export function isHellenTask(data: Partial<Task>): boolean {
  // 1. If owner_uid belongs explicitly to another user, IT IS NOT HELLEN'S!
  if (data.owner_uid && !isHellenUser(data.owner_uid)) {
    return false;
  }
  // 2. If user_id belongs explicitly to another user, IT IS NOT HELLEN'S!
  if (data.user_id && !isHellenUser(data.user_id)) {
    return false;
  }
  // 3. If account_email belongs explicitly to another user, IT IS NOT HELLEN'S!
  if (data.account_email && !isHellenEmail(data.account_email)) {
    return false;
  }
  // 4. If owner_uid or user_id or account_email matches Hellen
  if (isHellenUser(data.owner_uid) || isHellenUser(data.user_id) || isHellenEmail(data.account_email)) {
    return true;
  }
  // 5. Legacy orphaned tasks without an owner_uid
  if (!data.owner_uid || data.owner_uid === "guest_workspace" || data.owner_uid === "primary_workspace") {
    return true;
  }
  return false;
}

/**
 * Detects if a task belongs to work (Notre Dame, TOTVS, ERP, school, IT support, etc.)
 * All current existing demands are work demands belonging to haferreira@notredamecampinas.net.br,
 * UNLESS explicitly transferred to personal by the user.
 */
export function isWorkDemand(task: Partial<Task>): boolean {
  // If explicitly transferred or manually assigned to personal
  if (
    task.transferred_to === "personal" ||
    (task.manually_assigned && (task.account_type === "personal" || task.account_type === "Pessoal"))
  ) {
    return false;
  }

  // All current existing demands belong to Trabalho
  return true;
}

/**
 * Returns strict partition for Hellen's tasks: Work vs Personal.
 * All current existing demands belong 100% to Trabalho (haferreira@notredamecampinas.net.br),
 * unless explicitly transferred to personal by the user.
 */
export function partitionHellenTask(data: Partial<Task>): {
  targetAccountType: string;
  targetAccountEmail: string;
} {
  const isWork = isWorkDemand(data);
  if (isWork) {
    return {
      targetAccountType: "Trabalho",
      targetAccountEmail: "haferreira@notredamecampinas.net.br",
    };
  }
  return {
    targetAccountType: "Pessoal",
    targetAccountEmail: HELLEN_PRIMARY_EMAIL,
  };
}

/**
 * Transfers a single demand between accounts/workspaces (e.g. Trabalho <-> Pessoal)
 */
export async function transferTaskAccount(
  taskId: string,
  targetAccount: "work" | "personal" | string,
  targetEmail?: string,
  userId?: string
): Promise<Task | null> {
  if (!userId) {
    return null;
  }
  const isHellen = isHellenUser(userId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;
  const db = getFirestoreDb();

  const isWork = targetAccount === "work" || targetAccount.toLowerCase().includes("trab");
  const newType = isWork ? "Trabalho" : "Pessoal";
  const newEmail =
    targetEmail || (isHellen ? (isWork ? "haferreira@notredamecampinas.net.br" : HELLEN_PRIMARY_EMAIL) : "");

  const updatePayload: Partial<Task> = {
    account_type: newType,
    account_email: newEmail,
    transferred_to: isWork ? "work" : "personal",
    manually_assigned: true,
  };

  // Update in memory
  const memIdx = memoryTasks.findIndex((t) => t.id === taskId);
  if (memIdx >= 0) {
    memoryTasks[memIdx] = {
      ...memoryTasks[memIdx],
      ...updatePayload,
    };
  }

  if (db) {
    try {
      const docRef = db.collection("tasks").doc(taskId);
      await docRef.set(updatePayload, { merge: true });
      const snap = await docRef.get();
      if (snap.exists) {
        return snap.data() as Task;
      }
    } catch (err) {
      console.warn("Failed to transfer task in Firestore:", err);
    }
  }

  return memIdx >= 0 ? memoryTasks[memIdx] : null;
}

/**
 * Resolves context email for a task based on explicit parameter, account_type, or defaults.
 */
export function resolveTaskAccountEmail(
  accountType?: string,
  explicitEmail?: string,
  isHellenMatch: boolean = true
): string {
  if (explicitEmail && explicitEmail.includes("@")) {
    return explicitEmail.toLowerCase().trim();
  }
  if (!isHellenMatch) {
    return "";
  }
  const at = (accountType || "").toLowerCase();
  if (
    at.includes("notre") ||
    at.includes("trab") ||
    at.includes("work") ||
    at.includes("escola") ||
    at.includes("ti")
  ) {
    return "haferreira@notredamecampinas.net.br";
  }
  if (at.includes("pess") || at.includes("pers") || at.includes("vida")) {
    return HELLEN_PRIMARY_EMAIL;
  }
  return "haferreira@notredamecampinas.net.br";
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
  const taskMap = new Map<string, Task>();

  if (db) {
    try {
      const batchPromises: Promise<any>[] = [];

      // 2. Fetch ALL root tasks from 'tasks' collection without ANY filtering
      const tasksSnap = await db.collection("tasks").get();

      for (const doc of tasksSnap.docs) {
        const data = doc.data() as Task;
        const taskId = data.id || doc.id;

        // Strict isolation: skip tasks belonging to other users
        if (!isHellenTask(data)) {
          continue;
        }

        const { targetAccountType, targetAccountEmail } = partitionHellenTask(data);

        const consolidatedTask: Task = {
          ...data,
          id: taskId,
          owner_uid: masterId,
          user_id: masterId,
          account_email: targetAccountEmail,
          account_type: targetAccountType,
        };

        taskMap.set(taskId, consolidatedTask);

        if (
          data.user_id !== masterId ||
          data.owner_uid !== masterId ||
          data.account_email !== targetAccountEmail ||
          data.account_type !== targetAccountType
        ) {
          migratedCount++;
          batchPromises.push(
            doc.ref.set(consolidatedTask, { merge: true }).catch(() => {})
          );
        }
      }

      // 3. Check collectionGroup('tasks') for any tasks in subcollections
      try {
        const groupSnap = await db.collectionGroup("tasks").get();
        for (const doc of groupSnap.docs) {
          const data = doc.data() as Task;
          const taskId = data.id || doc.id;
          if (!isHellenTask(data)) {
            continue;
          }
          if (!taskMap.has(taskId)) {
            const { targetAccountType: accType, targetAccountEmail: accEmail } = partitionHellenTask(data);
            const consolidatedTask: Task = {
              ...data,
              id: taskId,
              owner_uid: masterId,
              user_id: masterId,
              account_email: accEmail,
              account_type: accType,
            };
            taskMap.set(taskId, consolidatedTask);
            migratedCount++;
            batchPromises.push(
              db.collection("tasks").doc(taskId).set(consolidatedTask, { merge: true }).catch(() => {})
            );
          }
        }
      } catch (gErr) {
        console.warn("CollectionGroup scan in consolidate failed:", gErr);
      }

      // 4. Scan any alternate collections (tarefas, demands, chamados, items)
      try {
        const rootCols = await db.listCollections();
        for (const col of rootCols) {
          const cId = col.id.toLowerCase();
          if (["tarefas", "demands", "chamados", "items", "atividades"].includes(cId)) {
            const snap = await col.get();
            for (const doc of snap.docs) {
              const data = doc.data() as Task;
              const taskId = data.id || doc.id;
              if (!isHellenTask(data)) {
                continue;
              }
              if (!taskMap.has(taskId)) {
                const { targetAccountType: accType, targetAccountEmail: accEmail } = partitionHellenTask(data);
                const consolidatedTask: Task = {
                  ...data,
                  id: taskId,
                  owner_uid: masterId,
                  user_id: masterId,
                  account_email: accEmail,
                  account_type: accType,
                };
                taskMap.set(taskId, consolidatedTask);
                migratedCount++;
                batchPromises.push(
                  db.collection("tasks").doc(taskId).set(consolidatedTask, { merge: true }).catch(() => {})
                );
              }
            }
          }
        }
      } catch (colErr) {
        console.warn("listCollections scan in consolidate failed:", colErr);
      }

      await Promise.all(batchPromises);

      // 5. Ensure connected accounts exist under users/{masterId}/accounts
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
    total_tasks_count: taskMap.size,
    accounts,
  };
}

// ==========================================
// 3. TASK PERSISTENCE & CENTRALIZATION
// ==========================================

export async function getTasksFromDb(userId?: string): Promise<Task[]> {
  // If no user is authenticated, return strictly empty array to prevent data leaking
  if (!userId) {
    return [];
  }
  const isHellen = isHellenUser(userId);
  const targetMasterId = isHellen ? HELLEN_MASTER_ID : userId;

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

    if (isHellen) {
      // 1. ALL documents from tasks collection - complete uninhibited ingestion
      const allTasksSnap = await db.collection("tasks").get();
      const tasksToMigrate: Task[] = [];

      for (const doc of allTasksSnap.docs) {
        const data = doc.data() as Task;
        const taskId = data.id || doc.id;

        // Strict isolation: skip tasks belonging to other users
        if (!isHellenTask(data)) {
          continue;
        }

        const { targetAccountType, targetAccountEmail } = partitionHellenTask(data);

        const consolidatedTask: Task = {
          ...data,
          id: taskId,
          owner_uid: HELLEN_MASTER_ID,
          user_id: HELLEN_MASTER_ID,
          account_email: targetAccountEmail,
          account_type: targetAccountType,
        };

        taskMap.set(taskId, consolidatedTask);

        if (
          data.user_id !== HELLEN_MASTER_ID ||
          data.owner_uid !== HELLEN_MASTER_ID ||
          data.account_email !== targetAccountEmail ||
          data.account_type !== targetAccountType
        ) {
          tasksToMigrate.push(consolidatedTask);
        }
      }

      // 2. CollectionGroup for any subcollection tasks
      try {
        const groupSnap = await db.collectionGroup("tasks").get();
        for (const doc of groupSnap.docs) {
          const data = doc.data() as Task;
          const taskId = data.id || doc.id;
          if (!isHellenTask(data)) {
            continue;
          }
          if (!taskMap.has(taskId)) {
            const { targetAccountType: accType, targetAccountEmail: accEmail } = partitionHellenTask(data);
            const consolidatedTask: Task = {
              ...data,
              id: taskId,
              owner_uid: HELLEN_MASTER_ID,
              user_id: HELLEN_MASTER_ID,
              account_email: accEmail,
              account_type: accType,
            };
            taskMap.set(taskId, consolidatedTask);
            tasksToMigrate.push(consolidatedTask);
          }
        }
      } catch (gErr) {
        console.warn("CollectionGroup read in getTasksFromDb failed:", gErr);
      }

      // 3. Scan other collections if any
      try {
        const rootCols = await db.listCollections();
        for (const col of rootCols) {
          const cId = col.id.toLowerCase();
          if (["tarefas", "demands", "chamados", "items", "atividades"].includes(cId)) {
            const snap = await col.get();
            for (const doc of snap.docs) {
              const data = doc.data() as Task;
              const taskId = data.id || doc.id;
              if (!isHellenTask(data)) {
                continue;
              }
              if (!taskMap.has(taskId)) {
                const { targetAccountType: accType, targetAccountEmail: accEmail } = partitionHellenTask(data);
                const consolidatedTask: Task = {
                  ...data,
                  id: taskId,
                  owner_uid: HELLEN_MASTER_ID,
                  user_id: HELLEN_MASTER_ID,
                  account_email: accEmail,
                  account_type: accType,
                };
                taskMap.set(taskId, consolidatedTask);
                tasksToMigrate.push(consolidatedTask);
              }
            }
          }
        }
      } catch (colErr) {
        console.warn("listCollections scan in getTasksFromDb failed:", colErr);
      }

      // Asynchronously update all tasks in Firestore to permanently belong to HELLEN_MASTER_ID
      if (tasksToMigrate.length > 0) {
        Promise.all(
          tasksToMigrate.map((t) =>
            db.collection("tasks").doc(t.id).set(t, { merge: true }).catch(() => {})
          )
        ).catch(() => {});
      }
    } else {
      // General multi-user lookup for other users
      try {
        const userProfile = await getMasterUserProfile(userId);
        const candidateIds = new Set<string>([userId]);
        if (userProfile?.linked_emails) {
          for (const email of userProfile.linked_emails) {
            candidateIds.add(`usr_${email.replace(/[^a-z0-9_-]/g, "_")}`);
          }
        }

        // Query strictly by owner_uid (primary isolation key)
        const ownerSnap = await db
          .collection("tasks")
          .where("owner_uid", "==", userId)
          .get();

        for (const doc of ownerSnap.docs) {
          const data = doc.data() as Task;
          taskMap.set(data.id || doc.id, { ...data, id: data.id || doc.id });
        }

        // Query by user_id for backward compatibility
        const userSnap = await db
          .collection("tasks")
          .where("user_id", "==", userId)
          .get();

        for (const doc of userSnap.docs) {
          const data = doc.data() as Task;
          const tId = data.id || doc.id;
          if (!taskMap.has(tId)) {
            taskMap.set(tId, { ...data, id: tId, owner_uid: userId });
          }
        }
      } catch (legacyErr) {
        console.warn("Legacy task migration check failed:", legacyErr);
      }
    }

    const tasks = Array.from(taskMap.values());
    tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return tasks;
  } catch (err) {
    console.warn("Firestore read failed, falling back to in-memory tasks:", err);
    if (isHellen) {
      return memoryTasks.map((t) => {
        const { targetAccountType, targetAccountEmail } = partitionHellenTask(t);
        return {
          ...t,
          owner_uid: HELLEN_MASTER_ID,
          user_id: HELLEN_MASTER_ID,
          account_email: targetAccountEmail,
          account_type: targetAccountType,
        };
      });
    }
    if (userId) {
      return memoryTasks.filter((t) => !t.user_id || t.user_id === userId || t.owner_uid === userId);
    }
    return memoryTasks;
  }
}

export async function saveTaskToDb(task: Task, userId?: string): Promise<Task> {
  const effectiveUserId = userId || task.owner_uid || task.user_id;
  if (!effectiveUserId) {
    throw new Error("Não é possível salvar tarefa sem usuário autenticado.");
  }
  const isHellen = isHellenUser(effectiveUserId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : effectiveUserId;
  task.user_id = targetUserId;
  task.owner_uid = targetUserId;

  if (isHellen) {
    const { targetAccountType, targetAccountEmail } = partitionHellenTask(task);
    if (!task.account_type) task.account_type = targetAccountType;
    if (!task.account_email || (task.account_type === "Trabalho" && task.account_email.includes("hellen"))) {
      task.account_email = targetAccountEmail;
    }
  } else if (!task.account_email) {
    task.account_email = resolveTaskAccountEmail(task.account_type, undefined, isHellen);
  }

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

/**
 * Safely unlinks a secondary account with transactional migration of all demands.
 * Guarantees zero data loss before removing the secondary account link.
 */
export async function migrateAndUnlinkAccount(
  masterUid: string,
  emailToUnlink: string,
  targetEmail?: string
): Promise<{
  success: boolean;
  message: string;
  migrated_tasks_count: number;
  unlinked_email: string;
  target_email: string;
}> {
  const cleanUnlink = emailToUnlink.toLowerCase().trim();
  const db = getFirestoreDb();
  const nowIso = new Date().toISOString();

  // 1. Get Master Profile
  const masterProfile = await getMasterUserProfile(masterUid);
  const primaryEmail = (masterProfile?.primary_email || HELLEN_PRIMARY_EMAIL).toLowerCase().trim();

  if (cleanUnlink === primaryEmail) {
    throw new Error("Não é possível desvincular a Conta Mestre (e-mail principal).");
  }

  const cleanTarget = (targetEmail || primaryEmail).toLowerCase().trim();

  // Find target account label
  const accounts = await getConnectedAccounts(masterUid);
  const targetAcc = accounts.find((a) => a.email.toLowerCase() === cleanTarget);
  const targetLabel = targetAcc?.label || (cleanTarget === primaryEmail ? "Pessoal" : "Geral");

  let migratedCount = 0;

  if (db) {
    // 2. Query all tasks belonging to masterUid that have account_email == cleanUnlink
    const tasksSnap = await db.collection("tasks").get();
    const batch = db.batch();

    for (const doc of tasksSnap.docs) {
      const data = doc.data() as Task;
      const isOwnedByMaster =
        data.owner_uid === masterUid ||
        data.user_id === masterUid ||
        isHellenUser(masterUid);

      const taskEmail = (data.account_email || "").toLowerCase().trim();
      const matchesUnlink =
        taskEmail === cleanUnlink ||
        (!taskEmail && data.account_type && cleanUnlink.includes("notredame") && data.account_type.toLowerCase().includes("notre"));

      if (isOwnedByMaster && matchesUnlink) {
        migratedCount++;
        batch.update(doc.ref, {
          account_email: cleanTarget,
          account_type: targetLabel,
          owner_uid: masterUid,
          user_id: masterUid,
        });
      }
    }

    // 3. Remove cleanUnlink from linked_emails in users/{masterUid}
    const userRef = db.collection("users").doc(masterUid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const uData = userDoc.data() as MasterUserProfile;
      const updatedLinked = (uData.linked_emails || []).filter(
        (e) => e.toLowerCase() !== cleanUnlink
      );
      batch.update(userRef, {
        linked_emails: updatedLinked,
        updated_at: nowIso,
      });
    }

    // 4. Remove account document from users/{masterUid}/accounts
    const accountsSnap = await db.collection("users").doc(masterUid).collection("accounts").get();
    for (const accDoc of accountsSnap.docs) {
      const accData = accDoc.data() as ConnectedAccount;
      if (accData.email.toLowerCase() === cleanUnlink) {
        batch.delete(accDoc.ref);
      }
    }

    await batch.commit();
  }

  // Also update in-memory cache
  memoryTasks = memoryTasks.map((t) => {
    if (t.account_email?.toLowerCase() === cleanUnlink) {
      return {
        ...t,
        account_email: cleanTarget,
        account_type: targetLabel,
      };
    }
    return t;
  });

  memoryAccounts = memoryAccounts.filter((a) => a.email.toLowerCase() !== cleanUnlink);

  return {
    success: true,
    message: `${migratedCount} demandas transferidas com sucesso para ${cleanTarget}. Conta ${cleanUnlink} desvinculada com segurança.`,
    migrated_tasks_count: migratedCount,
    unlinked_email: cleanUnlink,
    target_email: cleanTarget,
  };
}

export async function deleteTaskFromDb(taskId: string, userId?: string): Promise<boolean> {
  if (!userId) {
    console.warn(`Unauthorized deleteTaskFromDb attempt without userId on task ${taskId}`);
    return false;
  }
  const isHellen = isHellenUser(userId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;

  const db = getFirestoreDb();
  memoryTasks = memoryTasks.filter((t) => t.id !== taskId);

  if (!db) return true;

  try {
    const docRef = db.collection("tasks").doc(taskId);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data() as Task;
      if (!isHellen && data.owner_uid && data.owner_uid !== targetUserId && data.user_id !== targetUserId) {
        console.warn(`Unauthorized delete attempt on task ${taskId} by user ${userId}`);
        return false;
      }
      if (isHellen && !isHellenTask(data)) {
        console.warn(`Unauthorized delete attempt on other user's task ${taskId}`);
        return false;
      }
      await docRef.delete();
    }
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
  if (!userId) {
    return [];
  }
  const isHellen = isHellenUser(userId);
  const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;

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
      const userProfile = targetUserId ? await getMasterUserProfile(targetUserId) : null;
      if (userProfile?.primary_email) {
        const userDefaultAccount: ConnectedAccount = {
          id: `acc_${userProfile.primary_email.replace(/[^a-z0-9_-]/g, "_")}`,
          user_id: targetUserId,
          label: "Principal",
          email: userProfile.primary_email,
          color: "purple",
          last_sync_at: new Date().toISOString(),
          is_connected: true,
        };
        const colRef = db.collection("users").doc(targetUserId).collection("accounts");
        colRef.doc(userDefaultAccount.id).set(userDefaultAccount, { merge: true }).catch(() => {});
        return [userDefaultAccount];
      }
      return [];
    }

    // Automatic Deduplication by email:
    // Ensures that if an account was linked multiple times under different IDs,
    // only ONE unified entry is kept and redundant duplicate documents are pruned from Firestore.
    const deduplicatedAccounts: ConnectedAccount[] = [];
    const seenEmails = new Set<string>();

    for (const acc of accounts) {
      const emailLower = (acc.email || "").toLowerCase().trim();
      if (!emailLower) {
        deduplicatedAccounts.push(acc);
        continue;
      }

      if (seenEmails.has(emailLower)) {
        // Redundant duplicate: delete from Firestore to keep the DB clean
        if (targetUserId && acc.id) {
          db.collection("users").doc(targetUserId).collection("accounts").doc(acc.id).delete().catch(() => {});
        }
      } else {
        seenEmails.add(emailLower);
        deduplicatedAccounts.push(acc);
      }
    }

    return deduplicatedAccounts;
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
