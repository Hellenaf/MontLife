"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SidebarNav } from "@/components/SidebarNav";
import { CommandRail } from "@/components/CommandRail";
import { HeaderCommandBar } from "@/components/HeaderCommandBar";
import { ExecutionHubView, ExecutionMode } from "@/components/ExecutionHubView";
import { TodayBentoView } from "@/components/TodayBentoView";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { RightKpiQuadrant } from "@/components/RightKpiQuadrant";
import { CommandPalette } from "@/components/CommandPalette";
import { UndoToast, UndoToastData } from "@/components/UndoToast";
import { useTheme } from "@/context/ThemeContext";
import { ResolutionModal } from "@/components/modals/ResolutionModal";
import { ExtendDeadlineModal } from "@/components/modals/ExtendDeadlineModal";
import { AccountsModal } from "@/components/modals/AccountsModal";
import { NewTaskModal } from "@/components/modals/NewTaskModal";
import { ClassifyAccountModal } from "@/components/modals/ClassifyAccountModal";
import { CancelTaskModal } from "@/components/modals/CancelTaskModal";
import { NotesView } from "@/components/NotesView";
import { WikiTechnicalView } from "@/components/WikiTechnicalView";
import { ReportsView } from "@/components/ReportsView";
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
} from "@/types";
import { getAllCategories } from "@/lib/categories";
import { getOfflineQueue, enqueueOfflineAction, syncOfflineQueue } from "@/lib/offlineQueue";
import {
  ListTodo,
  Sunrise,
  BookOpen,
  Menu,
  Wifi,
  WifiOff,
  StickyNote,
} from "lucide-react";

export default function MontOpsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [activeNav, setActiveNav] = useState("tarefas");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("list");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [centralActiveTab, setCentralActiveTab] = useState<"details" | "study">("details");
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopKpiOpen, setIsDesktopKpiOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [undoToast, setUndoToast] = useState<UndoToastData | null>(null);
  const pendingDeleteRef = useRef<{
    taskId: string;
    timer: ReturnType<typeof setTimeout>;
    commit: () => Promise<void>;
  } | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Dynamically derive selected task from tasks array
  const selectedTask =
    tasks.find((t) => t.id === selectedTaskId) || (tasks.length > 0 ? tasks[0] : null);

  // Modals state
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [taskForResolution, setTaskForResolution] = useState<Task | null>(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [taskForExtend, setTaskForExtend] = useState<Task | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [taskForCancel, setTaskForCancel] = useState<Task | null>(null);

  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isClassifyModalOpen, setIsClassifyModalOpen] = useState(false);
  const [classifyEmail, setClassifyEmail] = useState("");
  const [classifyTicket, setClassifyTicket] = useState("");
  const [classifyAccountId, setClassifyAccountId] = useState("");
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [newTaskInitialText, setNewTaskInitialText] = useState("");
  const [newTaskInitialDate, setNewTaskInitialDate] = useState<Date | null>(null);
  const [newTaskInitialDraft, setNewTaskInitialDraft] = useState<Partial<ExtractedNoteTaskDraft> | null>(null);
  const [pendingNoteLink, setPendingNoteLink] = useState<{
    noteId: string;
    checklistItemId?: string;
  } | null>(null);
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    email: string;
    name: string;
    picture?: string;
  } | null>(null);

  // Modo Offline e Sincronização PWA
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(null);

  // Toggle Executive Metrics & AI Briefing Slide-Over Drawer
  const handleToggleDesktopKpi = () => {
    setIsDesktopKpiOpen((prev) => !prev);
  };

  // User-scoped cache hydration to guarantee multi-tenant UI isolation on shared devices
  useEffect(() => {
    if (typeof window !== "undefined" && currentUser?.userId) {
      try {
        const userCacheKey = `montlife_cached_tasks_${currentUser.userId}`;
        const cachedTasks = localStorage.getItem(userCacheKey);
        if (cachedTasks && tasks.length === 0) {
          const parsed = JSON.parse(cachedTasks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            setSelectedTaskId(parsed[0].id);
          }
        }
        const notesCacheKey = `montlife_cached_notes_${currentUser.userId}`;
        const cachedNotes = localStorage.getItem(notesCacheKey);
        if (cachedNotes && notes.length === 0) {
          const parsedNotes = JSON.parse(cachedNotes);
          if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
            setNotes(parsedNotes);
          }
        }
        const accCacheKey = `montlife_cached_accounts_${currentUser.userId}`;
        const cachedAccounts = localStorage.getItem(accCacheKey);
        if (cachedAccounts && accounts.length === 0) {
          const parsed = JSON.parse(cachedAccounts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed
              .filter((a: unknown): a is ConnectedAccount => Boolean(a && typeof a === "object"))
              .map((a: ConnectedAccount) => ({
                ...a,
                label: typeof a.label === "string" ? a.label : "Geral",
                email: typeof a.email === "string" ? a.email : "",
              }));
            setAccounts(sanitized);
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }, [currentUser?.userId]);

  // Fetch initial data ONCE on mount
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
        setSelectedTaskId((prev) => (prev && data.tasks.some((t: Task) => t.id === prev)) ? prev : (data.tasks.length > 0 ? data.tasks[0].id : null));
        if (typeof window !== "undefined" && currentUser?.userId) {
          localStorage.setItem(`montlife_cached_tasks_${currentUser.userId}`, JSON.stringify(data.tasks));
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
            localStorage.setItem(`montlife_cached_notes_${currentUser.userId}`, JSON.stringify(data.notes));
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
          .filter((a: unknown): a is ConnectedAccount => Boolean(a && typeof a === "object"))
          .map((a: ConnectedAccount) => ({
            ...a,
            label: typeof a.label === "string" ? a.label : "Geral",
            email: typeof a.email === "string" ? a.email : "",
          }));
        setAccounts(sanitized);
        if (typeof window !== "undefined" && currentUser?.userId) {
          localStorage.setItem(`montlife_cached_accounts_${currentUser.userId}`, JSON.stringify(sanitized));
        }
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setAccountsLoaded(true);
    }
  }, [currentUser?.userId]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

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
    loadTasks();
    loadNotes();
    loadAccounts();
    loadUser();
  }, [loadTasks, loadNotes, loadAccounts, loadUser]);

  // Registro do Service Worker e monitoramento de conectividade (Offline & Web Push)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      setOfflinePendingCount(getOfflineQueue().length);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("MontLife Service Worker ativo:", reg.scope);
          })
          .catch((err) => {
            console.warn("Falha no registro do Service Worker:", err);
          });
      }

      const handleOnline = async () => {
        setIsOnline(true);
        const count = getOfflineQueue().length;
        if (count > 0) {
          setOfflineSyncMessage(`Conexão restabelecida! Sincronizando ${count} alteração(ões)...`);
          const res = await syncOfflineQueue();
          setOfflinePendingCount(getOfflineQueue().length);
          if (res.synced > 0) {
            setOfflineSyncMessage(`${res.synced} alteração(ões) sincronizadas com sucesso!`);
            loadTasks();
            loadNotes();
            setTimeout(() => setOfflineSyncMessage(null), 5000);
          } else {
            setOfflineSyncMessage(null);
          }
        }
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [loadTasks]);

  // Listen to OAuth redirect query params & prompt classification
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      // 1. Post-OAuth Classification Prompt (New account needs context label)
      if (params.get("prompt_classify") === "true") {
        const email = params.get("email") || "";
        const ticket = params.get("ticket") || "";
        const accId = params.get("acc_id") || "";
        setClassifyEmail(email);
        setClassifyTicket(ticket);
        setClassifyAccountId(accId);
        setIsClassifyModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // 2. Direct Transparent Login Success (Existing Master Profile)
      if (params.get("login_success") === "true") {
        const email = params.get("email") || "";
        setOauthFeedback(
          email
            ? `Bem-vinda de volta! Perfil Mestre carregado (${email}).`
            : "Bem-vinda ao MontLife! Seus dados e contas vinculadas foram carregados."
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        loadAccounts().then(() => loadTasks()).then(() => loadUser());
        fetch("/api/google/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
          .then((r) => r.json())
          .then(() => {
            loadTasks();
            loadAccounts();
          });
      } else if (params.get("oauth_success")) {
        const type = params.get("oauth_success");
        setOauthFeedback(
          `Conta vinculada com sucesso! Consolidando demandas no armazenamento nativo...`
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        loadAccounts().then(() => loadTasks()).then(() => loadUser());
        fetch("/api/google/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
          .then((r) => r.json())
          .then(() => {
            loadTasks();
            loadAccounts();
          });
      } else if (params.get("oauth_error")) {
        setOauthFeedback("Erro na autenticação com o Google. Tente novamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [loadAccounts, loadTasks, loadUser]);

  // Protect dashboard: redirect to /login only if user is definitively unauthenticated
  useEffect(() => {
    if (typeof window !== "undefined" && userLoaded && accountsLoaded) {
      const params = new URLSearchParams(window.location.search);
      const isPrompting = params.get("prompt_classify") === "true" || isClassifyModalOpen;
      const isOAuth =
        params.get("oauth_success") ||
        params.get("login_success") ||
        params.get("oauth_error");

      if (!currentUser && !isPrompting && !isOAuth) {
        window.location.href = "/login";
      }
    }
  }, [userLoaded, accountsLoaded, currentUser, isClassifyModalOpen]);

  const handleClassified = async (label: string, importedCount: number) => {
    setIsClassifyModalOpen(false);
    setOauthFeedback(
      `Espaço "${label}" configurado com sucesso! Armazenamento 100% nativo ativado.`
    );
    await loadAccounts();
    await loadTasks();
    await loadUser();
  };

  // Handlers
  const syncTasksCache = useCallback(
    (nextTasks: Task[]) => {
      if (typeof window !== "undefined" && currentUser?.userId) {
        try {
          localStorage.setItem(`montlife_cached_tasks_${currentUser.userId}`, JSON.stringify(nextTasks));
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    [currentUser?.userId]
  );

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => {
      const updated = prev.some((t) => t.id === newTask.id)
        ? prev.map((t) => (t.id === newTask.id ? newTask : t))
        : [newTask, ...prev];
      syncTasksCache(updated);
      return updated;
    });
    setSelectedTaskId(newTask.id);
  };

  // ==========================================
  // Notes State Helpers & Offline-Safe Handlers
  // ==========================================
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

  const handleCreateNote = async (draft: Partial<Note>): Promise<Note | null> => {
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
          const updated = prev.map((n) => (n.id === optimisticNote.id ? data.note : n));
          syncNotesCache(updated);
          return updated;
        });
        return data.note;
      }
      return optimisticNote;
    } catch {
      enqueueOfflineAction("SAVE_NOTE", { note: optimisticNote, isNew: true });
      setOfflinePendingCount(getOfflineQueue().length);
      return optimisticNote;
    }
  };

  const handleUpdateNote = async (
    noteId: string,
    patch: Partial<Note>
  ): Promise<Note | null> => {
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
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      syncNotesCache(next);
      return next;
    });

    if (typeof window !== "undefined" && !navigator.onLine) {
      if (updatedSnapshot) {
        enqueueOfflineAction("SAVE_NOTE", { note: updatedSnapshot, isNew: false });
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
        enqueueOfflineAction("SAVE_NOTE", { note: updatedSnapshot, isNew: false });
        setOfflinePendingCount(getOfflineQueue().length);
      }
      return updatedSnapshot;
    }
  };

  const handleDeleteNote = async (noteId: string): Promise<void> => {
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
  };

  const handleCreateTasksFromNote = async (
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
        new Set([...(note.converted_task_ids || []), ...createdList.map((t) => t.id)])
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
  };

  const handleOpenNewTaskModalWithDraft = (
    draft: Partial<ExtractedNoteTaskDraft>,
    sourceNoteId: string,
    checklistItemId?: string
  ) => {
    setNewTaskInitialText("");
    setNewTaskInitialDate(null);
    setNewTaskInitialDraft(draft);
    setPendingNoteLink({ noteId: sourceNoteId, checklistItemId });
    setIsNewTaskModalOpen(true);
  };

  const STATUS_LABELS: Record<TaskStatus, string> = {
    TRIAGE: "Triagem",
    TODO: "A Fazer",
    IN_PROGRESS: "Em Andamento",
    WAITING: "Aguardando",
    COMPLETED: "Concluída",
    CANCELED: "Cancelada",
  };

  const handleQuickCreateKanbanTask = async (
    title: string,
    status: TaskStatus = "TODO",
    priority: Priority = "P3"
  ) => {
    const clean = title.trim();
    if (!clean) return;
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
      }
    } catch (err) {
      console.error("Failed to quick-create task:", err);
    }
  };

  const handleUpdateStatus = async (
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

    // Suporte Offline Imediato (Optimistic UI + Fila de Sincronização)
    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("UPDATE_STATUS", {
        taskId,
        ...payload,
      });
      setOfflinePendingCount(getOfflineQueue().length);
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                resolution_notes: resolutionNotes !== undefined ? resolutionNotes : t.resolution_notes,
                cancel_reason: cancelReason !== undefined ? cancelReason : t.cancel_reason,
                resolution_attachments: resolutionAttachments !== undefined ? resolutionAttachments : t.resolution_attachments,
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
    } catch (err) {
      console.warn("Falha na rede ao atualizar status, enfileirando offline:", err);
      enqueueOfflineAction("UPDATE_STATUS", {
        taskId,
        ...payload,
      });
      setOfflinePendingCount(getOfflineQueue().length);
    }
  };

  const handleCancelTask = async (taskId: string, cancelReason: string) => {
    await handleUpdateStatus(taskId, "CANCELED", undefined, cancelReason);
  };

  const handleReopenTask = async (taskId: string) => {
    await handleUpdateStatus(taskId, "TODO");
  };

  const handleUpdateItemType = async (taskId: string, itemType: ItemType) => {
    const payload = { item_type: itemType };

    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("UPDATE_FIELDS", {
        taskId,
        fields: payload,
      });
      setOfflinePendingCount(getOfflineQueue().length);
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === taskId ? { ...t, item_type: itemType } : t));
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
    } catch (err) {
      console.warn("Falha na rede ao alterar tipo de item, enfileirando offline:", err);
      enqueueOfflineAction("UPDATE_FIELDS", {
        taskId,
        fields: payload,
      });
      setOfflinePendingCount(getOfflineQueue().length);
    }
  };

  const handleUpdateTaskFields = async (taskId: string, fields: Partial<Task>) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("UPDATE_FIELDS", {
        taskId,
        fields,
      });
      setOfflinePendingCount(getOfflineQueue().length);
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === taskId ? { ...t, ...fields } : t));
        syncTasksCache(updated);
        return updated;
      });
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
    } catch (err) {
      console.warn("Falha na rede ao atualizar campos, enfileirando offline:", err);
      enqueueOfflineAction("UPDATE_FIELDS", {
        taskId,
        fields,
      });
      setOfflinePendingCount(getOfflineQueue().length);
    }
  };

  const handleTransferTask = async (
    task: Task,
    targetAccount: "work" | "personal" | string
  ) => {
    const isWork = targetAccount === "work" || targetAccount.toLowerCase().includes("trab");
    const isHellen = currentUser?.email?.toLowerCase().includes("hellen") || currentUser?.email?.toLowerCase().includes("notredame");
    const matchedAcc = safeAccounts.find((a) => {
      const lbl = (a.label || "").toLowerCase();
      return isWork ? (lbl.includes("trab") || lbl.includes("work")) : (lbl.includes("pess") || lbl.includes("vida"));
    });
    const targetEmail = matchedAcc?.email || (isHellen
      ? (isWork ? "haferreira@notredamecampinas.net.br" : "hellenalvesferreira.s2@gmail.com")
      : (currentUser?.email || ""));
    const targetType = isWork ? "Trabalho" : "Pessoal";

    // Optimistic local update
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
  };

  const handleConfirmResolution = async (
    resolutionNotes: string,
    resolutionAttachments?: TaskAttachment[]
  ) => {
    if (!taskForResolution) return;
    await handleUpdateStatus(
      taskForResolution.id,
      "COMPLETED",
      resolutionNotes,
      undefined,
      resolutionAttachments
    );
    setTaskForResolution(null);
  };

  const handleConfirmExtendDeadline = async (
    newDueDateIso: string,
    reason: string
  ) => {
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
          t.id === taskForExtend.id ? { ...t, current_due_date: newDueDateIso } : t
        );
        syncTasksCache(updated);
        return updated;
      });
      setTaskForExtend(null);
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
          const updated = prev.map((t) => (t.id === taskForExtend.id ? data.task : t));
          syncTasksCache(updated);
          return updated;
        });
      }
    } catch (err) {
      console.warn("Falha na rede ao estender prazo, enfileirando offline:", err);
      enqueueOfflineAction("EXTEND_DEADLINE", {
        taskId: taskForExtend.id,
        new_due_date: newDueDateIso,
        reason,
      });
      setOfflinePendingCount(getOfflineQueue().length);
    } finally {
      setTaskForExtend(null);
    }
  };

  const executeDeleteTaskOnServer = async (taskId: string) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
      return;
    }

    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Falha na rede ao excluir demanda, enfileirando offline:", err);
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const targetIndex = tasks.findIndex((t) => t.id === taskId);
    const deletedSnapshot = targetIndex >= 0 ? tasks[targetIndex] : null;

    // Flush any previously queued deferred delete immediately
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      const prevCommit = pendingDeleteRef.current.commit;
      pendingDeleteRef.current = null;
      void prevCommit();
    }

    // Optimistic removal from UI + Cache
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskId);
      syncTasksCache(remaining);
      if (selectedTaskId === taskId) {
        setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
        setIsTaskDrawerOpen(false);
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
            restored.splice(Math.min(targetIndex, restored.length), 0, deletedSnapshot);
            syncTasksCache(restored);
            return restored;
          });
          setSelectedTaskId(deletedSnapshot.id);
        }
      },
    });
  };

  const safeAccounts = useMemo(() => {
    return (Array.isArray(accounts) ? accounts : [])
      .filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
      .map((a) => ({
        ...a,
        label: typeof a.label === "string" ? a.label : "Geral",
        email: typeof a.email === "string" ? a.email : "",
      }));
  }, [accounts]);

  const navigateToTaskDetails = (task: Task) => {
    setSelectedTaskId(task.id);
    setCentralActiveTab("details");
    setIsTaskDrawerOpen(true);
  };

  const handleNavigate = (nav: string, execMode?: ExecutionMode) => {
    if (nav === "config") {
      setIsAccountsModalOpen(true);
      return;
    }
    if (nav === "kanban") {
      setActiveNav("tarefas");
      setExecutionMode("kanban");
      return;
    }
    if (nav === "agenda") {
      setActiveNav("tarefas");
      setExecutionMode("agenda");
      return;
    }
    if (nav === "tarefas" || nav === "inicio") {
      setActiveNav("tarefas");
      if (execMode) setExecutionMode(execMode);
      return;
    }
    setActiveNav(nav);
  };

  const openTasksCount = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length,
    [tasks]
  );

  const hasConnectedAccount = safeAccounts.some((a) => Boolean(a.is_connected || a.access_token || a.refresh_token));
  const allCategories = useMemo(() => getAllCategories(tasks), [tasks]);

  return (
    <div className="w-full h-screen h-[100dvh] overflow-hidden flex bg-[#E9E6DE] dark:bg-[#161B26] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Ultra-Thin Desktop Command Rail (66px) */}
      <div className="hidden lg:flex h-full no-print">
        <CommandRail
          accounts={safeAccounts}
          tasks={tasks}
          activeNav={activeNav}
          onSelectNav={(nav) => handleNavigate(nav)}
          selectedAccountFilter={accountFilter}
          onSelectAccountFilter={(filter) => setAccountFilter(filter)}
          onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleMetricsDrawer={handleToggleDesktopKpi}
          isMetricsOpen={isDesktopKpiOpen}
          onLogout={handleLogout}
          notesCount={notes.filter((n) => !n.archived).length}
          currentUser={currentUser}
        />
      </div>

      {/* 1.1 Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            <SidebarNav
              accounts={safeAccounts}
              tasks={tasks}
              activeNav={activeNav}
              onSelectNav={(nav) => {
                handleNavigate(nav);
                setIsMobileMenuOpen(false);
              }}
              onOpenAccountsModal={() => {
                setIsAccountsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onOpenReportModal={() => {
                setActiveNav("relatorios");
                setIsMobileMenuOpen(false);
              }}
              selectedAccountFilter={accountFilter}
              onSelectAccountFilter={(filter) => {
                setAccountFilter(filter);
                setIsMobileMenuOpen(false);
              }}
              onLogout={handleLogout}
              completedTasksCount={tasks.filter((t) => t.status === "COMPLETED").length}
              notesCount={notes.filter((n) => !n.archived).length}
              currentUser={currentUser}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 2. Main Bento Command Area (Header + Full-Width Active View) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Header Command Bar */}
        <div className="no-print relative z-40 shrink-0">
          <HeaderCommandBar
            accounts={safeAccounts}
            tasks={tasks}
            availableCategories={allCategories}
            activeNav={activeNav}
            accountFilter={accountFilter}
            onSelectAccountFilter={setAccountFilter}
            onTaskCreated={handleTaskCreated}
            onSelectTask={navigateToTaskDetails}
            onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
            onOpenReportModal={() => setActiveNav("relatorios")}
            onOpenNotes={() => setActiveNav("notas")}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenNewTaskModal={(prefill) => {
              setNewTaskInitialText(prefill || "");
              setNewTaskInitialDate(null);
              setNewTaskInitialDraft(null);
              setPendingNoteLink(null);
              setIsNewTaskModalOpen(true);
            }}
          />
        </div>

        {/* Banner de Modo Offline */}
        {!isOnline && (
          <div className="no-print bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-medium px-4 py-2 flex items-center justify-between text-xs shrink-0 z-30">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Modo Offline:</strong> Sem conexão. Alterações salvas no cache local e sincronizadas ao reconectar.
              </span>
            </div>
            {offlinePendingCount > 0 && (
              <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
                {offlinePendingCount} na fila
              </span>
            )}
          </div>
        )}

        {/* Feedback de Sincronização Offline */}
        {offlineSyncMessage && (
          <div className="no-print bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 font-medium px-4 py-2 flex items-center justify-between text-xs shrink-0 z-30 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{offlineSyncMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setOfflineSyncMessage(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Banner if no account is connected */}
        {!hasConnectedAccount && accountsLoaded && (
          <div className="no-print bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-200/70 dark:border-indigo-900/50 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-indigo-950 dark:text-indigo-200 shrink-0">
            <div className="flex items-start sm:items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1 sm:mt-0" />
              <p className="leading-snug">
                <strong>Nenhuma conta Google vinculada.</strong> Conecte suas contas para sincronizar agenda e organizar seus espaços.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAccountsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors shrink-0 cursor-pointer"
            >
              + Vincular Google
            </button>
          </div>
        )}

        {/* OAuth Feedback Toast Banner */}
        {oauthFeedback && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2 flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200 shrink-0">
            <span className="leading-snug">{oauthFeedback}</span>
            <button
              onClick={() => setOauthFeedback(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white px-2 py-0.5 rounded text-xs shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Canvas */}
        {activeNav === "hoje" ? (
          <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#E9E6DE] dark:bg-[#161B26]">
            <TodayBentoView
              tasks={tasks}
              notes={notes}
              accountFilter={accountFilter}
              userName={currentUser?.name}
              onSelectTask={navigateToTaskDetails}
              onUpdateStatus={handleUpdateStatus}
              onOpenNewTaskModal={(prefillDate) => {
                setNewTaskInitialText("");
                setNewTaskInitialDate(prefillDate ?? null);
                setNewTaskInitialDraft(null);
                setPendingNoteLink(null);
                setIsNewTaskModalOpen(true);
              }}
              onCreateNote={handleCreateNote}
              onNavigate={(nav, execMode) => handleNavigate(nav, execMode)}
              onTaskCreated={handleTaskCreated}
            />
          </main>
        ) : activeNav === "notas" ? (
          <main className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 lg:p-5 bg-[#E9E6DE] dark:bg-[#161B26]">
            <NotesView
              notes={notes}
              tasks={tasks}
              accountFilter={accountFilter}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onCreateTasksFromNote={handleCreateTasksFromNote}
              onOpenNewTaskModalWithDraft={handleOpenNewTaskModalWithDraft}
              onSelectTask={navigateToTaskDetails}
            />
          </main>
        ) : activeNav === "wiki" ? (
          <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-[#E9E6DE] dark:bg-[#161B26]">
            <WikiTechnicalView
              tasks={tasks}
              onSelectTask={navigateToTaskDetails}
              onBackToTasks={() => handleNavigate("tarefas", "list")}
            />
          </main>
        ) : activeNav === "relatorios" ? (
          <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-[#E9E6DE] dark:bg-[#161B26]">
            <ReportsView
              tasks={tasks}
              accountFilter={accountFilter}
              onBackToTasks={() => handleNavigate("tarefas", "list")}
            />
          </main>
        ) : (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-5 bg-[#E9E6DE] dark:bg-[#161B26]">
            <ExecutionHubView
              tasks={tasks}
              accountFilter={accountFilter}
              selectedTaskId={isTaskDrawerOpen ? selectedTaskId : null}
              executionMode={executionMode}
              onChangeExecutionMode={setExecutionMode}
              onSelectTask={navigateToTaskDetails}
              onUpdateStatus={handleUpdateStatus}
              onQuickCreateTask={handleQuickCreateKanbanTask}
              onRequestResolution={(task) => {
                setTaskForResolution(task);
                setIsResolutionModalOpen(true);
              }}
              onRequestExtendDeadline={(task) => {
                setTaskForExtend(task);
                setIsExtendModalOpen(true);
              }}
              onRequestCancelTask={(task) => {
                setTaskForCancel(task);
                setIsCancelModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onTransferTask={handleTransferTask}
              onOpenNewTaskModal={(prefillDate) => {
                setNewTaskInitialText("");
                setNewTaskInitialDate(prefillDate ?? null);
                setNewTaskInitialDraft(null);
                setPendingNoteLink(null);
                setIsNewTaskModalOpen(true);
              }}
              onTaskCreated={handleTaskCreated}
              onRefreshTasks={loadTasks}
              onOpenMetricsDrawer={handleToggleDesktopKpi}
            />
          </main>
        )}
      </div>

      {/* Global Slide-Over Task Detail Drawer (opens smoothly over any view) */}
      <TaskDetailDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        selectedTask={selectedTask}
        allTasks={tasks}
        onRequestResolution={(task) => {
          setTaskForResolution(task);
          setIsResolutionModalOpen(true);
        }}
        onRequestExtendDeadline={(task) => {
          setTaskForExtend(task);
          setIsExtendModalOpen(true);
        }}
        onRequestCancelTask={(task) => {
          setTaskForCancel(task);
          setIsCancelModalOpen(true);
        }}
        onReopenTask={handleReopenTask}
        onUpdateStatus={handleUpdateStatus}
        onUpdateItemType={handleUpdateItemType}
        onUpdateTaskFields={handleUpdateTaskFields}
        onTransferTask={handleTransferTask}
        onSelectTask={navigateToTaskDetails}
        onOpenNewTaskModal={() => {
          setNewTaskInitialText("");
          setNewTaskInitialDate(null);
          setNewTaskInitialDraft(null);
          setPendingNoteLink(null);
          setIsNewTaskModalOpen(true);
        }}
        activeTab={centralActiveTab}
        onTabChange={setCentralActiveTab}
      />

      {/* Global Executive Metrics & AI Briefing Slide-Over Drawer */}
      {isDesktopKpiOpen && (
        <div className="no-print fixed inset-0 z-40 flex justify-end bg-slate-950/30 dark:bg-[#0B0F19]/55 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => setIsDesktopKpiOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[360px] lg:w-[370px] h-full shadow-2xl animate-drawer-right bg-[#F6F4EE] dark:bg-[#212838] border-l border-[#DCD6CA] dark:border-[#323D54] overflow-hidden"
          >
            <RightKpiQuadrant
              tasks={tasks}
              onOpenReportModal={() => {
                setIsDesktopKpiOpen(false);
                setActiveNav("relatorios");
              }}
              pinnedNotesCount={notes.filter((n) => Boolean(n.pinned) && !n.archived).length}
              onBackToTasks={() => setIsDesktopKpiOpen(false)}
              onCloseDesktop={() => setIsDesktopKpiOpen(false)}
              onSelectTaskById={(taskId) => {
                const found = tasks.find((t) => t.id === taskId);
                if (found) {
                  setIsDesktopKpiOpen(false);
                  navigateToTaskDetails(found);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 min-h-[62px] pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] bg-[#F6F4EE]/95 dark:bg-[#1B2130]/95 backdrop-blur-lg border-t border-[#DCD6CA]/85 dark:border-[#323D54] px-1.5 flex items-center justify-around z-40">
        <button
          type="button"
          onClick={() => handleNavigate("tarefas")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "tarefas" || activeNav === "inicio"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`relative px-2.5 py-1 rounded-lg transition-colors ${
              activeNav === "tarefas" || activeNav === "inicio"
                ? "bg-indigo-500/12 dark:bg-indigo-500/20"
                : ""
            }`}
          >
            <ListTodo className="w-5 h-5" />
            {openTasksCount > 0 && (
              <span className="absolute -top-0.5 right-0 px-1 text-[9px] font-mono font-bold rounded-full bg-indigo-600 text-white leading-tight">
                {openTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Execução</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate("hoje")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "hoje"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeNav === "hoje" ? "bg-indigo-500/12 dark:bg-indigo-500/20" : ""
            }`}
          >
            <Sunrise className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Meu Dia</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate("notas")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "notas"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`relative px-2.5 py-1 rounded-lg transition-colors ${
              activeNav === "notas" ? "bg-indigo-500/12 dark:bg-indigo-500/20" : ""
            }`}
          >
            <StickyNote className="w-5 h-5" />
            {notes.filter((n) => !n.archived).length > 0 && (
              <span className="absolute -top-0.5 right-0 px-1 text-[9px] font-mono font-bold rounded-full bg-slate-700 dark:bg-slate-600 text-white leading-tight">
                {notes.filter((n) => !n.archived).length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Notas</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate("wiki")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "wiki"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeNav === "wiki" ? "bg-indigo-500/12 dark:bg-indigo-500/20" : ""
            }`}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Wiki</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            isMobileMenuOpen || activeNav === "relatorios" || activeNav === "config"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              isMobileMenuOpen || activeNav === "relatorios" || activeNav === "config"
                ? "bg-indigo-500/12 dark:bg-indigo-500/20"
                : ""
            }`}
          >
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

      {/* Modais do Sistema */}
      <ResolutionModal
        task={taskForResolution}
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setTaskForResolution(null);
        }}
        onConfirm={handleConfirmResolution}
      />

      <ExtendDeadlineModal
        task={taskForExtend}
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false);
          setTaskForExtend(null);
        }}
        onConfirm={handleConfirmExtendDeadline}
      />


      <AccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={safeAccounts}
        onRefreshAccounts={loadAccounts}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setNewTaskInitialDate(null);
          setNewTaskInitialDraft(null);
          setPendingNoteLink(null);
        }}
        onTaskCreated={async (task) => {
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
        }}
        existingTasks={tasks}
        onSelectExistingTask={(task) => {
          navigateToTaskDetails(task);
          setIsNewTaskModalOpen(false);
          setNewTaskInitialDate(null);
          setNewTaskInitialDraft(null);
          setPendingNoteLink(null);
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          setSelectedTaskId(updatedTask.id);
          setIsNewTaskModalOpen(false);
          setNewTaskInitialDate(null);
          setNewTaskInitialDraft(null);
          setPendingNoteLink(null);
        }}
        initialText={newTaskInitialText}
        initialDate={newTaskInitialDate}
        initialDraft={newTaskInitialDraft}
        availableCategories={allCategories}
      />

      <ClassifyAccountModal
        isOpen={isClassifyModalOpen}
        email={classifyEmail}
        ticketId={classifyTicket}
        accountId={classifyAccountId}
        onClassified={handleClassified}
        onClose={() => setIsClassifyModalOpen(false)}
      />

      <CancelTaskModal
        task={taskForCancel}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setTaskForCancel(null);
        }}
        onConfirm={async (taskId, reason) => {
          await handleCancelTask(taskId, reason);
        }}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        notes={notes}
        onSelectTask={navigateToTaskDetails}
        onSelectNote={() => handleNavigate("notas")}
        onNavigate={(nav) => handleNavigate(nav)}
        onOpenNewTaskModal={(prefill) => {
          setNewTaskInitialText(prefill || "");
          setNewTaskInitialDate(null);
          setNewTaskInitialDraft(null);
          setPendingNoteLink(null);
          setIsNewTaskModalOpen(true);
        }}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        onToggleTheme={toggleTheme}
        onToggleKpiPanel={handleToggleDesktopKpi}
        theme={theme}
        isKpiPanelOpen={isDesktopKpiOpen}
      />

      {/* Global Floating Undo Toast */}
      <UndoToast toast={undoToast} onDismiss={() => setUndoToast(null)} />
    </div>
  );
}
