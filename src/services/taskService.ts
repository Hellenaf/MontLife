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

// Initial seed data with past completed tasks with resolution notes for the Wiki & AI search
const INITIAL_SEED_TASKS: Task[] = [
  {
    id: "seed-task-1",
    raw_input: "arrumar sincronização de notas no RM amanhã",
    title: "Correção na Sincronização de Notas do TOTVS RM",
    description: "Identificar falha no job de integração entre o portal acadêmico e o banco de dados do TOTVS RM. Verificar se há registros travados na tabela de lock.",
    account_type: "work",
    category: "TOTVS RM",
    tags: ["totvs-rm", "sincronizacao", "notas", "banco-de-dados"],
    priority: "P2",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    started_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    original_due_date: new Date(Date.now() - 6 * 86400000).toISOString(),
    current_due_date: new Date(Date.now() - 6 * 86400000).toISOString(),
    extension_count: 0,
    deadline_extensions: [],
    resolution_notes: "O serviço TOTVSHost estava parado no servidor de aplicação devido a estouro de memória no pool de conexões. Foi reiniciado o serviço e limpa a tabela GLOCK.",
    cancel_reason: null,
    google_task_id: "gt-seed-1",
    google_calendar_event_id: null,
    learning_resources: {
      youtube_videos: [
        {
          title: "TOTVS RM - Monitoramento de Serviços e Travamentos de Lock",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
          channel: "TOTVS Dicas Técnicas",
        },
      ],
      search_queries: ["totvs rm servico travado solucao glock", "totvs host pool conexao"],
    },
    met_original_sla: true,
  },
  {
    id: "seed-task-2",
    raw_input: "Criar contas dos novos professores no Google Workspace",
    title: "Provisionamento de Contas no Google Workspace (Novos Professores)",
    description: "Criar as contas de e-mail institucional no painel admin.google.com, alocar na Unidade Organizacional (OU) Docentes e atribuir licenças do Google Workspace for Education.",
    account_type: "work",
    category: "Google Workspace",
    tags: ["google-workspace", "professores", "contas", "admin-console"],
    priority: "P3",
    status: "IN_PROGRESS",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    started_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    completed_at: null,
    original_due_date: calculateSlaDueDate("P3", new Date(Date.now() - 2 * 86400000)),
    current_due_date: calculateSlaDueDate("P3", new Date(Date.now() - 2 * 86400000)),
    extension_count: 0,
    deadline_extensions: [],
    resolution_notes: null,
    cancel_reason: null,
    google_task_id: "gt-seed-2",
    google_calendar_event_id: null,
    learning_resources: {
      youtube_videos: [
        {
          title: "Google Workspace Admin: Criando usuários em massa via CSV e GAM",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80",
          channel: "Workspace Academy",
        },
      ],
      search_queries: ["google admin console provisionamento professores", "gam google workspace bulk users"],
    },
    met_original_sla: null,
  },
  {
    id: "seed-task-3",
    raw_input: "Planejar dinâmica de boas-vindas da catequese deste sábado",
    title: "Planejamento da Dinâmica de Boas-Vindas da Catequese",
    description: "Definir tema da acolhida, imprimir folhetos de cantos e separar materiais de pintura para as crianças da 1ª etapa.",
    account_type: "personal",
    category: "Catequese",
    tags: ["catequese", "planejamento", "encontro", "acolhida"],
    priority: "P3",
    status: "TODO",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    started_at: null,
    completed_at: null,
    original_due_date: calculateSlaDueDate("P3", new Date(Date.now() - 1 * 86400000)),
    current_due_date: calculateSlaDueDate("P3", new Date(Date.now() - 1 * 86400000)),
    extension_count: 0,
    deadline_extensions: [],
    resolution_notes: null,
    cancel_reason: null,
    google_task_id: "gt-seed-3",
    google_calendar_event_id: null,
    learning_resources: {
      youtube_videos: [
        {
          title: "Dinâmicas Criativas para Encontros de Catequese Infantil",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&q=80",
          channel: "Formação Catequética",
        },
      ],
      search_queries: ["dinamicas acolhida catequese infantil", "plano de aula catequese primeira comunhao"],
    },
    met_original_sla: null,
  },
  {
    id: "seed-task-4",
    raw_input: "Trocar switch queimado do laboratório de informática urgente",
    title: "Substituição do Switch do Laboratório de Informática",
    description: "Switch 24 portas do rack do laboratório 2 parou de responder. Testar fonte e substituir por unidade reserva no estoque de TI.",
    account_type: "work",
    category: "Infra & Hardware",
    tags: ["infra-hardware", "rede", "switch", "laboratorio"],
    priority: "P1",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    started_at: new Date(Date.now() - 4 * 86400000 + 1800000).toISOString(),
    completed_at: new Date(Date.now() - 4 * 86400000 + 7200000).toISOString(),
    original_due_date: new Date(Date.now() - 4 * 86400000 + 14400000).toISOString(),
    current_due_date: new Date(Date.now() - 4 * 86400000 + 14400000).toISOString(),
    extension_count: 0,
    deadline_extensions: [],
    resolution_notes: "Substituído o switch queimado pelo modelo reserva HP ProCurve 2530. Reconfigurada a VLAN 10 (Alunos) e VLAN 20 (Docentes). Rede restabelecida em 1h30.",
    cancel_reason: null,
    google_task_id: "gt-seed-4",
    google_calendar_event_id: null,
    learning_resources: {
      youtube_videos: [
        {
          title: "Configuração Rápida de VLAN em Switches Gerenciáveis",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80",
          channel: "Redes & Infra",
        },
      ],
      search_queries: ["configuracao vlan procurve switch", "troubleshooting switch rede travado"],
    },
    met_original_sla: true,
  },
];

const INITIAL_SEED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "work",
    email: "institucional@escola.edu.br",
    default_tasklist_id: "tl-work-default",
    last_sync_at: new Date().toISOString(),
    is_connected: true,
  },
  {
    id: "personal",
    email: "pessoal.mont@gmail.com",
    default_tasklist_id: "tl-personal-default",
    last_sync_at: new Date().toISOString(),
    is_connected: true,
  },
];

// Fallback in-memory / local storage
let memoryTasks: Task[] = [...INITIAL_SEED_TASKS];
let memoryAccounts: ConnectedAccount[] = [...INITIAL_SEED_ACCOUNTS];

export async function getTasksFromDb(): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) {
    return memoryTasks;
  }

  try {
    const snapshot = await db.collection("tasks").orderBy("created_at", "desc").get();
    if (snapshot.empty) {
      // Seed initial tasks if empty
      const batch = db.batch();
      for (const t of memoryTasks) {
        batch.set(db.collection("tasks").doc(t.id), t);
      }
      await batch.commit();
      return memoryTasks;
    }

    return snapshot.docs.map((doc) => doc.data() as Task);
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

    // Tag matching
    for (const tag of searchTags) {
      const normTag = tag.toLowerCase();
      if (tTags.some((tt) => tt.toLowerCase() === normTag || tt.includes(normTag) || normTag.includes(tt))) {
        matched.push(tag);
      }
    }

    // Text matching if tags did not match
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
    task.resolution_notes = resolutionNotes || task.resolution_notes || "Tarefa concluída com sucesso.";
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
  if (!db) return memoryAccounts;

  try {
    const snapshot = await db.collection("connected_accounts").get();
    if (snapshot.empty) {
      const batch = db.batch();
      for (const acc of memoryAccounts) {
        batch.set(db.collection("connected_accounts").doc(acc.id), acc);
      }
      await batch.commit();
      return memoryAccounts;
    }
    return snapshot.docs.map((doc) => doc.data() as ConnectedAccount);
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

