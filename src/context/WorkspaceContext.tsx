"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  Task,
  TaskAttachment,
  ConnectedAccount,
  TaskStatus,
  Priority,
  ItemType,
  AccountType,
  Note,
  ExtractedNoteTaskDraft,
  DailyBriefingResponse,
} from "@/types";
import { UndoToastData } from "@/components/UndoToast";
import { getAllCategories } from "@/lib/categories";
import {
  getOfflineQueue,
  enqueueOfflineAction,
  syncOfflineQueue,
} from "@/lib/offlineQueue";
import {
  useLayoutPreferences,
  LayoutPreferences,
  SplitRatios,
  DensityMode,
} from "@/hooks/useLayoutPreferences";

export interface CurrentUserInfo {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TRIAGE: "Triagem",
  TODO: "A Fazer",
  IN_PROGRESS: "Em Andamento",
  WAITING: "Aguardando",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

interface WorkspaceContextValue {
  // Core Data
  tasks: Task[];
  notes: Note[];
  accounts: ConnectedAccount[];
  currentUser: CurrentUserInfo | null;
  accountsLoaded: boolean;
  userLoaded: boolean;
  isLoadingInitial: boolean;
  allCategories: string[];
  hasConnectedAccount: boolean;

  // Global Workspace Filter & Search
  accountFilter: "all" | AccountType;
  setAccountFilter: (filter: "all" | AccountType) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;

  // Sync & Offline State
  isOnline: boolean;
  isSyncingGoogle: boolean;
  offlinePendingCount: number;
  offlineSyncMessage: string | null;
  setOfflineSyncMessage: (msg: string | null) => void;
  oauthFeedback: string | null;
  setOauthFeedback: (msg: string | null) => void;
  lastSyncedAt: string | null;
  triggerGoogleSync: () => Promise<void>;

  // Cached Daily Briefing
  briefing: DailyBriefingResponse | null;
  isLoadingBriefing: boolean;
  briefingError: string | null;
  refreshBriefing: () => Promise<void>;

  // Reloaders
  loadTasks: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  handleLogout: () => Promise<void>;

  // Task Mutations
  handleTaskCreated: (newTask: Task) => void;
  handleQuickCreateTask: (
    title: string,
    status?: TaskStatus,
    priority?: Priority,
    extra?: Partial<Task>
  ) => Promise<Task | null>;
  handleUpdateStatus: (
    taskId: string,
    newStatus: TaskStatus,
    resolutionNotes?: string,
    cancelReason?: string,
    resolutionAttachments?: TaskAttachment[],
    skipUndoToast?: boolean
  ) => Promise<void>;
  handleBulkUpdateStatus: (taskIds: string[], newStatus: TaskStatus) => Promise<void>;
  handleBulkTransfer: (taskIds: string[], target: "work" | "personal") => Promise<void>;
  handleBulkDelete: (taskIds: string[]) => Promise<void>;
  handleCancelTask: (taskId: string, cancelReason: string) => Promise<void>;
  handleReopenTask: (taskId: string) => Promise<void>;
  handleUpdateItemType: (taskId: string, itemType: ItemType) => Promise<void>;
  handleUpdateTaskFields: (taskId: string, fields: Partial<Task>) => Promise<void>;
  handleTransferTask: (task: Task, targetAccount: "work" | "personal" | string) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;

  // Note Mutations
  handleCreateNote: (draft: Partial<Note>) => Promise<Note | null>;
  handleUpdateNote: (noteId: string, patch: Partial<Note>) => Promise<Note | null>;
  handleDeleteNote: (noteId: string) => Promise<void>;
  handleCreateTasksFromNote: (
    note: Note,
    drafts: ExtractedNoteTaskDraft[],
    checklistItemId?: string
  ) => Promise<Task[]>;

  // Navigation helpers
  openTaskInModule: (task: Task, targetPath?: "/demandas" | "/kanban" | "/agenda") => void;
  openNoteInModule: (noteId: string) => void;

  // Modals & Global UI Triggers
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isAccountsModalOpen: boolean;
  setIsAccountsModalOpen: (open: boolean) => void;
  openNewTaskModal: (opts?: {
    initialText?: string;
    initialDate?: Date | null;
    initialDraft?: Partial<ExtractedNoteTaskDraft> | null;
    sourceNoteId?: string;
    checklistItemId?: string;
  }) => void;
  requestResolution: (task: Task) => void;
  requestExtendDeadline: (task: Task) => void;
  requestCancelTask: (task: Task) => void;

  // Modal internal state for AppShell to render
  modalState: {
    taskForResolution: Task | null;
    isResolutionModalOpen: boolean;
    closeResolution: () => void;
    confirmResolution: (notes: string, attachments?: TaskAttachment[]) => Promise<void>;

    taskForExtend: Task | null;
    isExtendModalOpen: boolean;
    closeExtend: () => void;
    confirmExtend: (newDueDateIso: string, reason: string) => Promise<void>;

    taskForCancel: Task | null;
    isCancelModalOpen: boolean;
    closeCancel: () => void;

    isNewTaskModalOpen: boolean;
    closeNewTask: () => void;
    newTaskInitialText: string;
    newTaskInitialDate: Date | null;
    newTaskInitialDraft: Partial<ExtractedNoteTaskDraft> | null;
    completeNewTaskFromModal: (task: Task) => Promise<void>;
    updateTaskFromModal: (task: Task) => void;

    isClassifyModalOpen: boolean;
    closeClassify: () => void;
    classifyEmail: string;
    classifyTicket: string;
    classifyAccountId: string;
    handleClassified: (label: string, importedCount: number) => Promise<void>;
  };

  // Undo Toast
  undoToast: UndoToastData | null;
  setUndoToast: (toast: UndoToastData | null) => void;

  // Layout Preferences
  prefs: LayoutPreferences;
  updatePrefs: (
    updater: Partial<LayoutPreferences> | ((prev: LayoutPreferences) => LayoutPreferences)
  ) => void;
  toggleSidebar: () => void;
  setSplitRatio: (moduleKey: keyof SplitRatios, ratio: number) => void;
  setTaskDensity: (density: DensityMode) => void;
  resetPreferences: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function isTaskMatchingWorkspace(
  task: Task,
  accountFilter: "all" | AccountType
): boolean {
  if (!accountFilter || accountFilter === "all") return true;
  const f = accountFilter.toLowerCase().trim();
  const isWorkTask = (() => {
    if (task.transferred_to === "personal") return false;
    if (
      task.manually_assigned &&
      (task.account_type === "personal" || task.account_type === "Pessoal")
    ) {
      return false;
    }
    const tType = (task.account_type || "").toLowerCase();
    if (tType === "personal" || tType.includes("pess")) return false;
    return true;
  })();

  if (f === "work" || f.includes("trab") || f.includes("notre") || f.includes("haferreira")) {
    return isWorkTask;
  }
  if (f === "personal" || f.includes("pess") || f.includes("hellen")) {
    return !isWorkTask;
  }
  return (
    (task.account_type || "").toLowerCase() === f ||
    (task.account_email || "").toLowerCase() === f
  );
}

export function isNoteMatchingWorkspace(
  note: Note,
  accountFilter: "all" | AccountType
): boolean {
  if (!accountFilter || accountFilter === "all") return true;
  const f = accountFilter.toLowerCase().trim();
  const nType = (note.account_type || "work").toLowerCase();
  if (f === "work" || f.includes("trab") || f.includes("notre")) {
    return !nType.includes("pess") && nType !== "personal";
  }
  if (f === "personal" || f.includes("pess") || f.includes("hellen")) {
    return nType.includes("pess") || nType === "personal";
  }
  return nType === f;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    prefs,
    updatePrefs,
    toggleSidebar,
    setSplitRatio,
    setTaskDensity,
    resetPreferences,
  } = useLayoutPreferences();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Sync & Offline
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(null);
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Daily Briefing cache
  const [briefing, setBriefing] = useState<DailyBriefingResponse | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  // Global UI / Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<UndoToastData | null>(null);
  const pendingDeleteRef = useRef<{
    taskId: string;
    timer: ReturnType<typeof setTimeout>;
    commit: () => Promise<void>;
  } | null>(null);

  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [taskForResolution, setTaskForResolution] = useState<Task | null>(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [taskForExtend, setTaskForExtend] = useState<Task | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [taskForCancel, setTaskForCancel] = useState<Task | null>(null);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskInitialText, setNewTaskInitialText] = useState("");
  const [newTaskInitialDate, setNewTaskInitialDate] = useState<Date | null>(null);
  const [newTaskInitialDraft, setNewTaskInitialDraft] =
    useState<Partial<ExtractedNoteTaskDraft> | null>(null);
  const [pendingNoteLink, setPendingNoteLink] = useState<{
    noteId: string;
    checklistItemId?: string;
  } | null>(null);

  const [isClassifyModalOpen, setIsClassifyModalOpen] = useState(false);
  const [classifyEmail, setClassifyEmail] = useState("");
  const [classifyTicket, setClassifyTicket] = useState("");
  const [classifyAccountId, setClassifyAccountId] = useState("");

  // Safe sanitized accounts list
  const safeAccounts = useMemo(() => {
    return (Array.isArray(accounts) ? accounts : [])
      .filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
      .map((a) => ({
        ...a,
        label: typeof a.label === "string" ? a.label : "Geral",
        email: typeof a.email === "string" ? a.email : "",
      }));
  }, [accounts]);

  const hasConnectedAccount = useMemo(
    () =>
      safeAccounts.some((a) =>
        Boolean(a.is_connected || a.access_token || a.refresh_token)
      ),
    [safeAccounts]
  );

  const allCategories = useMemo(() => getAllCategories(tasks), [tasks]);

  // Cache helpers (multi-tenant isolation)
  const syncTasksCache = useCallback(
    (nextTasks: Task[]) => {
      if (typeof window !== "undefined" && currentUser?.userId) {
        try {
          localStorage.setItem(
            `montlife_cached_tasks_${currentUser.userId}`,
            JSON.stringify(nextTasks)
          );
        } catch {}
      }
    },
    [currentUser?.userId]
  );

  const syncNotesCache = useCallback(
    (nextNotes: Note[]) => {
      if (typeof window !== "undefined" && currentUser?.userId) {
        try {
          localStorage.setItem(
            `montlife_cached_notes_${currentUser.userId}`,
            JSON.stringify(nextNotes)
          );
        } catch {}
      }
    },
    [currentUser?.userId]
  );

  // Hydrate user-scoped cache when userId loads
  useEffect(() => {
    if (typeof window !== "undefined" && currentUser?.userId) {
      try {
        const cachedTasks = localStorage.getItem(
          `montlife_cached_tasks_${currentUser.userId}`
        );
        if (cachedTasks && tasks.length === 0) {
          const parsed = JSON.parse(cachedTasks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            setSelectedTaskId((prev) => prev || parsed[0].id);
          }
        }
        const cachedNotes = localStorage.getItem(
          `montlife_cached_notes_${currentUser.userId}`
        );
        if (cachedNotes && notes.length === 0) {
          const parsedNotes = JSON.parse(cachedNotes);
          if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
            setNotes(parsedNotes);
          }
        }
      } catch {}
    }
  }, [currentUser?.userId]);

  // Loaders
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.status === 401) {
        setTasks([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setSelectedTaskId((prev) =>
          prev && data.tasks.some((t: Task) => t.id === prev)
            ? prev
            : data.tasks.length > 0
            ? data.tasks[0].id
            : null
        );
        if (typeof window !== "undefined" && currentUser?.userId) {
          try {
            localStorage.setItem(
              `montlife_cached_tasks_${currentUser.userId}`,
              JSON.stringify(data.tasks)
            );
          } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, [currentUser?.userId]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.status === 401) {
        setNotes([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) {
        setNotes(data.notes);
        if (typeof window !== "undefined" && currentUser?.userId) {
          try {
            localStorage.setItem(
              `montlife_cached_notes_${currentUser.userId}`,
              JSON.stringify(data.notes)
            );
          } catch {}
        }
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, [currentUser?.userId]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.status === 401) {
        setAccounts([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        const sanitized = data.accounts
          .filter((a: unknown): a is ConnectedAccount =>
            Boolean(a && typeof a === "object")
          )
          .map((a: ConnectedAccount) => ({
            ...a,
            label: typeof a.label === "string" ? a.label : "Geral",
            email: typeof a.email === "string" ? a.email : "",
          }));
        setAccounts(sanitized);
        const latestSync = sanitized
          .map((a: ConnectedAccount) => a.last_sync_at)
          .filter((s: string | null): s is string => Boolean(s))
          .sort()
          .pop();
        if (latestSync) setLastSyncedAt(latestSync);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setAccountsLoaded(true);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        setCurrentUser(null);
        setTasks([]);
        setAccounts([]);
        return;
      }
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setUserLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadUser(), loadAccounts(), loadTasks(), loadNotes()]).finally(() => {
      if (active) setIsLoadingInitial(false);
    });
    return () => {
      active = false;
    };
  }, [loadUser, loadAccounts, loadTasks, loadNotes]);

  // Service Worker + Offline Connectivity
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    setOfflinePendingCount(getOfflineQueue().length);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    }

    const handleOnline = async () => {
      setIsOnline(true);
      const count = getOfflineQueue().length;
      if (count > 0) {
        setOfflineSyncMessage(
          `Conexão restabelecida! Sincronizando ${count} alteração(ões)...`
        );
        const res = await syncOfflineQueue();
        setOfflinePendingCount(getOfflineQueue().length);
        if (res.synced > 0) {
          setOfflineSyncMessage(
            `${res.synced} alteração(ões) sincronizadas com sucesso!`
          );
          await Promise.all([loadTasks(), loadNotes()]);
          setTimeout(() => setOfflineSyncMessage(null), 5000);
        } else {
          setOfflineSyncMessage(null);
        }
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadTasks, loadNotes]);

  // Global keyboard shortcuts: Ctrl+K (Command Palette), [ (Sidebar Collapse)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditable =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (document.activeElement as HTMLElement | null)?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  // OAuth redirect query params handler
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("prompt_classify") === "true") {
      setClassifyEmail(params.get("email") || "");
      setClassifyTicket(params.get("ticket") || "");
      setClassifyAccountId(params.get("acc_id") || "");
      setIsClassifyModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (params.get("login_success") === "true") {
      const email = params.get("email") || "";
      setOauthFeedback(
        email
          ? `Bem-vinda de volta! Perfil Mestre carregado (${email}).`
          : "Bem-vinda ao MontLife! Seus dados e contas vinculadas foram carregados."
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      loadAccounts()
        .then(() => loadTasks())
        .then(() => loadUser());
      fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then((r) => r.json())
        .then(() => {
          loadTasks();
          loadAccounts();
        })
        .catch(() => {});
    } else if (params.get("oauth_success")) {
      setOauthFeedback(
        "Conta vinculada com sucesso! Consolidando demandas no armazenamento nativo..."
      );
      window.history.replaceState({}, document.title, window.location.pathname);
      loadAccounts()
        .then(() => loadTasks())
        .then(() => loadUser());
      fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then((r) => r.json())
        .then(() => {
          loadTasks();
          loadAccounts();
        })
        .catch(() => {});
    } else if (params.get("oauth_error")) {
      setOauthFeedback("Erro na autenticação com o Google. Tente novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadAccounts, loadTasks, loadUser]);

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (typeof window !== "undefined" && userLoaded && accountsLoaded) {
      const params = new URLSearchParams(window.location.search);
      const isPrompting =
        params.get("prompt_classify") === "true" || isClassifyModalOpen;
      const isOAuth =
        params.get("oauth_success") ||
        params.get("login_success") ||
        params.get("oauth_error");
      if (!currentUser && !isPrompting && !isOAuth) {
        window.location.href = "/login";
      }
    }
  }, [userLoaded, accountsLoaded, currentUser, isClassifyModalOpen]);

  const triggerGoogleSync = useCallback(async () => {
    if (isSyncingGoogle) return;
    setIsSyncingGoogle(true);
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        await Promise.all([loadTasks(), loadAccounts()]);
        setLastSyncedAt(new Date().toISOString());
        setUndoToast({
          id: `sync-${Date.now()}`,
          message: "Sincronização concluída",
          detail: "Demandas e contas Google atualizadas.",
          variant: "success",
        });
      }
    } catch {
      setUndoToast({
        id: `sync-err-${Date.now()}`,
        message: "Não foi possível sincronizar agora",
        variant: "warning",
      });
    } finally {
      setIsSyncingGoogle(false);
    }
  }, [isSyncingGoogle, loadTasks, loadAccounts]);

  const refreshBriefing = useCallback(async () => {
    if (isLoadingBriefing) return;
    setIsLoadingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success && data.briefing) {
        setBriefing(data.briefing);
      } else {
        setBriefingError(data?.error || "Não foi possível gerar o briefing agora.");
      }
    } catch {
      setBriefingError("Erro ao conectar com o serviço de IA.");
    } finally {
      setIsLoadingBriefing(false);
    }
  }, [isLoadingBriefing]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  const handleClassified = useCallback(
    async (label: string) => {
      setIsClassifyModalOpen(false);
      setOauthFeedback(
        `Espaço "${label}" configurado com sucesso! Armazenamento 100% nativo ativado.`
      );
      await loadAccounts();
      await loadTasks();
      await loadUser();
    },
    [loadAccounts, loadTasks, loadUser]
  );

  // ==========================================
  // Task Handlers
  // ==========================================
  const handleTaskCreated = useCallback(
    (newTask: Task) => {
      setTasks((prev) => {
        const updated = prev.some((t) => t.id === newTask.id)
          ? prev.map((t) => (t.id === newTask.id ? newTask : t))
          : [newTask, ...prev];
        syncTasksCache(updated);
        return updated;
      });
      setSelectedTaskId(newTask.id);
    },
    [syncTasksCache]
  );

  const handleQuickCreateTask = useCallback(
    async (
      title: string,
      status: TaskStatus = "TODO",
      priority: Priority = "P3",
      extra?: Partial<Task>
    ): Promise<Task | null> => {
      const clean = title.trim();
      if (!clean) return null;
      const isPersonal =
        accountFilter === "personal" ||
        accountFilter.toLowerCase().includes("pess") ||
        accountFilter.toLowerCase().includes("hellen");

      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: clean,
            status,
            priority,
            item_type: "task",
            account_type: isPersonal ? "personal" : "work",
            ...extra,
          }),
        });
        const data = await res.json();
        if (data.success && data.task) {
          handleTaskCreated(data.task);
          setUndoToast({
            id: `created-${data.task.id}`,
            message: `Demanda criada (${priority}) em ${STATUS_LABELS[status] || status}`,
            detail: data.task.title,
            variant: "success",
          });
          return data.task;
        }
      } catch (err) {
        console.error("Failed to quick-create task:", err);
      }
      return null;
    },
    [accountFilter, handleTaskCreated]
  );

  const handleUpdateStatus = useCallback(
    async (
      taskId: string,
      newStatus: TaskStatus,
      resolutionNotes?: string,
      cancelReason?: string,
      resolutionAttachments?: TaskAttachment[],
      skipUndoToast?: boolean
    ) => {
      const prevTask = tasks.find((t) => t.id === taskId);
      const payload = {
        action: "update_status",
        status: newStatus,
        resolution_notes: resolutionNotes,
        cancel_reason: cancelReason,
        resolution_attachments: resolutionAttachments,
      };

      const showStatusUndoToast = () => {
        if (skipUndoToast || !prevTask || prevTask.status === newStatus) return;
        const previousStatus = prevTask.status;
        setUndoToast({
          id: `status-${taskId}-${Date.now()}`,
          message:
            newStatus === "COMPLETED"
              ? "Demanda concluída!"
              : newStatus === "CANCELED"
              ? "Demanda cancelada"
              : `Movida para ${STATUS_LABELS[newStatus] || newStatus}`,
          detail: prevTask.title,
          variant:
            newStatus === "COMPLETED"
              ? "success"
              : newStatus === "CANCELED"
              ? "warning"
              : "default",
          onUndo: async () => {
            await handleUpdateStatus(
              taskId,
              previousStatus,
              prevTask.resolution_notes ?? undefined,
              prevTask.cancel_reason ?? undefined,
              prevTask.resolution_attachments,
              true
            );
          },
        });
      };

      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("UPDATE_STATUS", { taskId, ...payload });
        setOfflinePendingCount(getOfflineQueue().length);
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: newStatus,
                  resolution_notes:
                    resolutionNotes !== undefined ? resolutionNotes : t.resolution_notes,
                  cancel_reason:
                    cancelReason !== undefined ? cancelReason : t.cancel_reason,
                  resolution_attachments:
                    resolutionAttachments !== undefined
                      ? resolutionAttachments
                      : t.resolution_attachments,
                }
              : t
          );
          syncTasksCache(updated);
          return updated;
        });
        showStatusUndoToast();
        return;
      }

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => {
            const updated = prev.map((t) => (t.id === taskId ? data.task : t));
            syncTasksCache(updated);
            return updated;
          });
          showStatusUndoToast();
        }
      } catch {
        enqueueOfflineAction("UPDATE_STATUS", { taskId, ...payload });
        setOfflinePendingCount(getOfflineQueue().length);
      }
    },
    [tasks, syncTasksCache]
  );

  const handleBulkUpdateStatus = useCallback(
    async (taskIds: string[], newStatus: TaskStatus) => {
      if (taskIds.length === 0) return;
      await Promise.all(
        taskIds.map((id) =>
          handleUpdateStatus(id, newStatus, undefined, undefined, undefined, true)
        )
      );
      setUndoToast({
        id: `bulk-status-${Date.now()}`,
        message: `${taskIds.length} demanda(s) movidas para ${STATUS_LABELS[newStatus]}`,
        variant: newStatus === "COMPLETED" ? "success" : "default",
      });
    },
    [handleUpdateStatus]
  );

  const handleCancelTask = useCallback(
    async (taskId: string, cancelReason: string) => {
      await handleUpdateStatus(taskId, "CANCELED", undefined, cancelReason);
    },
    [handleUpdateStatus]
  );

  const handleReopenTask = useCallback(
    async (taskId: string) => {
      await handleUpdateStatus(taskId, "TODO");
    },
    [handleUpdateStatus]
  );

  const handleUpdateItemType = useCallback(
    async (taskId: string, itemType: ItemType) => {
      const payload = { item_type: itemType };
      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("UPDATE_FIELDS", { taskId, fields: payload });
        setOfflinePendingCount(getOfflineQueue().length);
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskId ? { ...t, item_type: itemType } : t
          );
          syncTasksCache(updated);
          return updated;
        });
        return;
      }
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => {
            const updated = prev.map((t) => (t.id === taskId ? data.task : t));
            syncTasksCache(updated);
            return updated;
          });
        }
      } catch {
        enqueueOfflineAction("UPDATE_FIELDS", { taskId, fields: payload });
        setOfflinePendingCount(getOfflineQueue().length);
      }
    },
    [syncTasksCache]
  );

  const handleUpdateTaskFields = useCallback(
    async (taskId: string, fields: Partial<Task>) => {
      // Optimistic local update for fluid inline editing
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === taskId ? { ...t, ...fields } : t));
        syncTasksCache(updated);
        return updated;
      });

      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("UPDATE_FIELDS", { taskId, fields });
        setOfflinePendingCount(getOfflineQueue().length);
        return;
      }

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => {
            const updated = prev.map((t) => (t.id === taskId ? data.task : t));
            syncTasksCache(updated);
            return updated;
          });
        }
      } catch {
        enqueueOfflineAction("UPDATE_FIELDS", { taskId, fields });
        setOfflinePendingCount(getOfflineQueue().length);
      }
    },
    [syncTasksCache]
  );

  const handleTransferTask = useCallback(
    async (task: Task, targetAccount: "work" | "personal" | string) => {
      const isWork =
        targetAccount === "work" || targetAccount.toLowerCase().includes("trab");
      const isHellen =
        currentUser?.email?.toLowerCase().includes("hellen") ||
        currentUser?.email?.toLowerCase().includes("notredame");
      const matchedAcc = safeAccounts.find((a) => {
        const lbl = (a.label || "").toLowerCase();
        return isWork
          ? lbl.includes("trab") || lbl.includes("work")
          : lbl.includes("pess") || lbl.includes("vida");
      });
      const targetEmail =
        matchedAcc?.email ||
        (isHellen
          ? isWork
            ? "haferreira@notredamecampinas.net.br"
            : "hellenalvesferreira.s2@gmail.com"
          : currentUser?.email || "");
      const targetType = isWork ? "Trabalho" : "Pessoal";

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                account_type: targetType,
                account_email: targetEmail,
                transferred_to: isWork ? "work" : "personal",
                manually_assigned: true,
              }
            : t
        )
      );

      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "transfer_account",
            target_account: isWork ? "work" : "personal",
            account_type: targetType,
            account_email: targetEmail,
          }),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => {
            const updated = prev.map((t) => (t.id === task.id ? data.task : t));
            syncTasksCache(updated);
            return updated;
          });
          setUndoToast({
            id: `transfer-${task.id}-${Date.now()}`,
            message: `Transferida para ${targetType}`,
            detail: task.title,
            variant: "default",
            onUndo: async () => {
              await handleTransferTask(data.task, isWork ? "personal" : "work");
            },
          });
        }
      } catch (err) {
        console.error("Failed to transfer task:", err);
      }
    },
    [currentUser?.email, safeAccounts, syncTasksCache]
  );

  const handleBulkTransfer = useCallback(
    async (taskIds: string[], target: "work" | "personal") => {
      const selected = tasks.filter((t) => taskIds.includes(t.id));
      await Promise.all(selected.map((t) => handleTransferTask(t, target)));
    },
    [tasks, handleTransferTask]
  );

  const executeDeleteTaskOnServer = useCallback(async (taskId: string) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
      return;
    }
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch {
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
    }
  }, []);

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      const targetIndex = tasks.findIndex((t) => t.id === taskId);
      const deletedSnapshot = targetIndex >= 0 ? tasks[targetIndex] : null;

      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        const prevCommit = pendingDeleteRef.current.commit;
        pendingDeleteRef.current = null;
        void prevCommit();
      }

      setTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== taskId);
        syncTasksCache(remaining);
        if (selectedTaskId === taskId) {
          setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });

      const commit = async () => {
        await executeDeleteTaskOnServer(taskId);
      };

      const timer = setTimeout(() => {
        if (pendingDeleteRef.current?.taskId === taskId) {
          pendingDeleteRef.current = null;
          void commit();
        }
      }, 5200);

      pendingDeleteRef.current = { taskId, timer, commit };

      setUndoToast({
        id: `delete-${taskId}-${Date.now()}`,
        message: "Demanda excluída",
        detail: deletedSnapshot?.title,
        variant: "danger",
        durationMs: 5000,
        onUndo: () => {
          if (pendingDeleteRef.current?.taskId === taskId) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
          }
          if (deletedSnapshot) {
            setTasks((prev) => {
              if (prev.some((t) => t.id === deletedSnapshot.id)) return prev;
              const restored = [...prev];
              restored.splice(
                Math.min(targetIndex, restored.length),
                0,
                deletedSnapshot
              );
              syncTasksCache(restored);
              return restored;
            });
            setSelectedTaskId(deletedSnapshot.id);
          }
        },
      });
    },
    [tasks, selectedTaskId, syncTasksCache, executeDeleteTaskOnServer]
  );

  const handleBulkDelete = useCallback(
    async (taskIds: string[]) => {
      if (taskIds.length === 0) return;
      setTasks((prev) => {
        const remaining = prev.filter((t) => !taskIds.includes(t.id));
        syncTasksCache(remaining);
        if (selectedTaskId && taskIds.includes(selectedTaskId)) {
          setSelectedTaskId(remaining[0]?.id || null);
        }
        return remaining;
      });
      await Promise.all(taskIds.map((id) => executeDeleteTaskOnServer(id)));
      setUndoToast({
        id: `bulk-del-${Date.now()}`,
        message: `${taskIds.length} demanda(s) excluída(s)`,
        variant: "danger",
      });
    },
    [selectedTaskId, syncTasksCache, executeDeleteTaskOnServer]
  );

  // ==========================================
  // Note Handlers
  // ==========================================
  const handleCreateNote = useCallback(
    async (draft: Partial<Note>): Promise<Note | null> => {
      const nowIso = new Date().toISOString();
      const optimisticNote: Note = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: typeof draft.title === "string" ? draft.title.trim() : "",
        content: draft.content || "",
        category: draft.category || "geral",
        account_type: draft.account_type || "work",
        color: draft.color || "default",
        pinned: Boolean(draft.pinned),
        archived: false,
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        checklist: Array.isArray(draft.checklist) ? draft.checklist : [],
        ai_summary: draft.ai_summary || null,
        key_decisions: Array.isArray(draft.key_decisions) ? draft.key_decisions : [],
        demand_readiness: draft.demand_readiness ?? null,
        converted_task_ids: [],
        created_at: nowIso,
        updated_at: nowIso,
      };

      setNotes((prev) => {
        const updated = [optimisticNote, ...prev];
        syncNotesCache(updated);
        return updated;
      });
      setSelectedNoteId(optimisticNote.id);

      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("SAVE_NOTE", { note: optimisticNote, isNew: true });
        setOfflinePendingCount(getOfflineQueue().length);
        return optimisticNote;
      }

      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(optimisticNote),
        });
        const data = await res.json();
        if (res.ok && data.success && data.note) {
          setNotes((prev) => {
            const updated = prev.map((n) =>
              n.id === optimisticNote.id ? data.note : n
            );
            syncNotesCache(updated);
            return updated;
          });
          setSelectedNoteId(data.note.id);
          return data.note;
        }
        return optimisticNote;
      } catch {
        enqueueOfflineAction("SAVE_NOTE", { note: optimisticNote, isNew: true });
        setOfflinePendingCount(getOfflineQueue().length);
        return optimisticNote;
      }
    },
    [syncNotesCache]
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, patch: Partial<Note>): Promise<Note | null> => {
      let updatedSnapshot: Note | null = null;
      setNotes((prev) => {
        const next = prev.map((n) => {
          if (n.id !== noteId) return n;
          updatedSnapshot = {
            ...n,
            ...patch,
            updated_at: new Date().toISOString(),
          };
          return updatedSnapshot;
        });
        next.sort((a, b) => {
          const pinnedDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
          if (pinnedDiff !== 0) return pinnedDiff;
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
        syncNotesCache(next);
        return next;
      });

      if (typeof window !== "undefined" && !navigator.onLine) {
        if (updatedSnapshot) {
          enqueueOfflineAction("SAVE_NOTE", {
            note: updatedSnapshot,
            isNew: false,
          });
          setOfflinePendingCount(getOfflineQueue().length);
        }
        return updatedSnapshot;
      }

      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (res.ok && data.success && data.note) {
          setNotes((prev) => {
            const next = prev.map((n) => (n.id === noteId ? data.note : n));
            syncNotesCache(next);
            return next;
          });
          return data.note;
        }
        return updatedSnapshot;
      } catch {
        if (updatedSnapshot) {
          enqueueOfflineAction("SAVE_NOTE", {
            note: updatedSnapshot,
            isNew: false,
          });
          setOfflinePendingCount(getOfflineQueue().length);
        }
        return updatedSnapshot;
      }
    },
    [syncNotesCache]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        syncNotesCache(next);
        return next;
      });

      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("DELETE_NOTE", { noteId });
        setOfflinePendingCount(getOfflineQueue().length);
        return;
      }

      try {
        await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      } catch {
        enqueueOfflineAction("DELETE_NOTE", { noteId });
        setOfflinePendingCount(getOfflineQueue().length);
      }
    },
    [syncNotesCache]
  );

  const handleCreateTasksFromNote = useCallback(
    async (
      note: Note,
      drafts: ExtractedNoteTaskDraft[],
      checklistItemId?: string
    ): Promise<Task[]> => {
      const createdList: Task[] = [];

      for (const draft of drafts) {
        try {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              raw_input: draft.source_excerpt || draft.description || draft.title,
              title: draft.title,
              description: draft.description,
              account_type: draft.account_type || note.account_type || "work",
              item_type: draft.item_type || "task",
              category: draft.category || "Operações & Demandas",
              priority: draft.priority || "P3",
              due_date: draft.extracted_due_date_iso || undefined,
              scheduled_start: draft.extracted_due_date_iso || null,
              scheduled_end: draft.extracted_end_date_iso || null,
              tags: draft.tags || [],
              validation_steps: (draft.validation_steps || []).map((text, idx) => ({
                id: `step-${Date.now()}-${idx}`,
                text,
                completed: false,
              })),
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.task) {
            createdList.push(data.task);
            handleTaskCreated(data.task);
          }
        } catch (err) {
          console.error("Failed to create task from note draft:", err);
        }
      }

      if (createdList.length > 0) {
        const nextConverted = Array.from(
          new Set([
            ...(note.converted_task_ids || []),
            ...createdList.map((t) => t.id),
          ])
        );
        const nextChecklist =
          checklistItemId && createdList[0]
            ? (note.checklist || []).map((item) =>
                item.id === checklistItemId
                  ? { ...item, linked_task_id: createdList[0].id }
                  : item
              )
            : note.checklist;

        await handleUpdateNote(note.id, {
          converted_task_ids: nextConverted,
          checklist: nextChecklist,
        });
      }

      return createdList;
    },
    [handleTaskCreated, handleUpdateNote]
  );

  // ==========================================
  // Navigation & Modal Triggers
  // ==========================================
  const openTaskInModule = useCallback(
    (task: Task, targetPath: "/demandas" | "/kanban" | "/agenda" = "/demandas") => {
      setSelectedTaskId(task.id);
      router.push(targetPath);
    },
    [router]
  );

  const openNoteInModule = useCallback(
    (noteId: string) => {
      setSelectedNoteId(noteId);
      router.push("/anotacoes");
    },
    [router]
  );

  const openNewTaskModal = useCallback(
    (opts?: {
      initialText?: string;
      initialDate?: Date | null;
      initialDraft?: Partial<ExtractedNoteTaskDraft> | null;
      sourceNoteId?: string;
      checklistItemId?: string;
    }) => {
      setNewTaskInitialText(opts?.initialText || "");
      setNewTaskInitialDate(opts?.initialDate ?? null);
      setNewTaskInitialDraft(opts?.initialDraft ?? null);
      setPendingNoteLink(
        opts?.sourceNoteId
          ? { noteId: opts.sourceNoteId, checklistItemId: opts.checklistItemId }
          : null
      );
      setIsNewTaskModalOpen(true);
    },
    []
  );

  const requestResolution = useCallback((task: Task) => {
    setTaskForResolution(task);
    setIsResolutionModalOpen(true);
  }, []);

  const requestExtendDeadline = useCallback((task: Task) => {
    setTaskForExtend(task);
    setIsExtendModalOpen(true);
  }, []);

  const requestCancelTask = useCallback((task: Task) => {
    setTaskForCancel(task);
    setIsCancelModalOpen(true);
  }, []);

  const confirmResolution = useCallback(
    async (resolutionNotes: string, resolutionAttachments?: TaskAttachment[]) => {
      if (!taskForResolution) return;
      await handleUpdateStatus(
        taskForResolution.id,
        "COMPLETED",
        resolutionNotes,
        undefined,
        resolutionAttachments
      );
      setTaskForResolution(null);
      setIsResolutionModalOpen(false);
    },
    [taskForResolution, handleUpdateStatus]
  );

  const confirmExtend = useCallback(
    async (newDueDateIso: string, reason: string) => {
      if (!taskForExtend) return;
      const payload = {
        action: "extend_deadline",
        new_due_date: newDueDateIso,
        reason,
      };

      if (typeof window !== "undefined" && !navigator.onLine) {
        enqueueOfflineAction("EXTEND_DEADLINE", {
          taskId: taskForExtend.id,
          new_due_date: newDueDateIso,
          reason,
        });
        setOfflinePendingCount(getOfflineQueue().length);
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskForExtend.id
              ? { ...t, current_due_date: newDueDateIso }
              : t
          );
          syncTasksCache(updated);
          return updated;
        });
        setTaskForExtend(null);
        setIsExtendModalOpen(false);
        return;
      }

      try {
        const res = await fetch(`/api/tasks/${taskForExtend.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => {
            const updated = prev.map((t) =>
              t.id === taskForExtend.id ? data.task : t
            );
            syncTasksCache(updated);
            return updated;
          });
        }
      } catch {
        enqueueOfflineAction("EXTEND_DEADLINE", {
          taskId: taskForExtend.id,
          new_due_date: newDueDateIso,
          reason,
        });
        setOfflinePendingCount(getOfflineQueue().length);
      } finally {
        setTaskForExtend(null);
        setIsExtendModalOpen(false);
      }
    },
    [taskForExtend, syncTasksCache]
  );

  const completeNewTaskFromModal = useCallback(
    async (task: Task) => {
      handleTaskCreated(task);
      if (pendingNoteLink) {
        const sourceNote = notes.find((n) => n.id === pendingNoteLink.noteId);
        if (sourceNote) {
          const nextConverted = Array.from(
            new Set([...(sourceNote.converted_task_ids || []), task.id])
          );
          const nextChecklist = pendingNoteLink.checklistItemId
            ? (sourceNote.checklist || []).map((item) =>
                item.id === pendingNoteLink.checklistItemId
                  ? { ...item, linked_task_id: task.id }
                  : item
              )
            : sourceNote.checklist;
          await handleUpdateNote(sourceNote.id, {
            converted_task_ids: nextConverted,
            checklist: nextChecklist,
          });
        }
      }
      setIsNewTaskModalOpen(false);
      setNewTaskInitialDate(null);
      setNewTaskInitialDraft(null);
      setPendingNoteLink(null);
    },
    [handleTaskCreated, pendingNoteLink, notes, handleUpdateNote]
  );

  const updateTaskFromModal = useCallback(
    (updatedTask: Task) => {
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
        syncTasksCache(next);
        return next;
      });
      setSelectedTaskId(updatedTask.id);
      setIsNewTaskModalOpen(false);
      setNewTaskInitialDate(null);
      setNewTaskInitialDraft(null);
      setPendingNoteLink(null);
    },
    [syncTasksCache]
  );

  const value: WorkspaceContextValue = {
    tasks,
    notes,
    accounts: safeAccounts,
    currentUser,
    accountsLoaded,
    userLoaded,
    isLoadingInitial,
    allCategories,
    hasConnectedAccount,
    accountFilter,
    setAccountFilter,
    globalSearch,
    setGlobalSearch,
    selectedTaskId,
    setSelectedTaskId,
    selectedNoteId,
    setSelectedNoteId,
    isOnline,
    isSyncingGoogle,
    offlinePendingCount,
    offlineSyncMessage,
    setOfflineSyncMessage,
    oauthFeedback,
    setOauthFeedback,
    lastSyncedAt,
    triggerGoogleSync,
    briefing,
    isLoadingBriefing,
    briefingError,
    refreshBriefing,
    loadTasks,
    loadNotes,
    loadAccounts,
    handleLogout,
    handleTaskCreated,
    handleQuickCreateTask,
    handleUpdateStatus,
    handleBulkUpdateStatus,
    handleBulkTransfer,
    handleBulkDelete,
    handleCancelTask,
    handleReopenTask,
    handleUpdateItemType,
    handleUpdateTaskFields,
    handleTransferTask,
    handleDeleteTask,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleCreateTasksFromNote,
    openTaskInModule,
    openNoteInModule,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isAccountsModalOpen,
    setIsAccountsModalOpen,
    openNewTaskModal,
    requestResolution,
    requestExtendDeadline,
    requestCancelTask,
    modalState: {
      taskForResolution,
      isResolutionModalOpen,
      closeResolution: () => {
        setIsResolutionModalOpen(false);
        setTaskForResolution(null);
      },
      confirmResolution,
      taskForExtend,
      isExtendModalOpen,
      closeExtend: () => {
        setIsExtendModalOpen(false);
        setTaskForExtend(null);
      },
      confirmExtend,
      taskForCancel,
      isCancelModalOpen,
      closeCancel: () => {
        setIsCancelModalOpen(false);
        setTaskForCancel(null);
      },
      isNewTaskModalOpen,
      closeNewTask: () => {
        setIsNewTaskModalOpen(false);
        setNewTaskInitialDate(null);
        setNewTaskInitialDraft(null);
        setPendingNoteLink(null);
      },
      newTaskInitialText,
      newTaskInitialDate,
      newTaskInitialDraft,
      completeNewTaskFromModal,
      updateTaskFromModal,
      isClassifyModalOpen,
      closeClassify: () => setIsClassifyModalOpen(false),
      classifyEmail,
      classifyTicket,
      classifyAccountId,
      handleClassified,
    },
    undoToast,
    setUndoToast,
    prefs,
    updatePrefs,
    toggleSidebar,
    setSplitRatio,
    setTaskDensity,
    resetPreferences,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
