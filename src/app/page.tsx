"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SidebarNav } from "@/components/SidebarNav";
import { HeaderCommandBar } from "@/components/HeaderCommandBar";
import { LeftTasksQuadrant } from "@/components/LeftTasksQuadrant";
import { CentralQuadrant } from "@/components/CentralQuadrant";
import { RightKpiQuadrant } from "@/components/RightKpiQuadrant";
import { ResolutionModal } from "@/components/modals/ResolutionModal";
import { ExtendDeadlineModal } from "@/components/modals/ExtendDeadlineModal";
import { AccountsModal } from "@/components/modals/AccountsModal";
import { NewTaskModal } from "@/components/modals/NewTaskModal";
import { ClassifyAccountModal } from "@/components/modals/ClassifyAccountModal";
import { CancelTaskModal } from "@/components/modals/CancelTaskModal";
import { AgendaDoDiaView } from "@/components/AgendaDoDiaView";
import { NotesView } from "@/components/NotesView";
import { WikiTechnicalView } from "@/components/WikiTechnicalView";
import { ReportsView } from "@/components/ReportsView";
import { KanbanView } from "@/components/KanbanView";
import {
  Task,
  TaskAttachment,
  ConnectedAccount,
  TaskStatus,
  ItemType,
  AccountType,
  Note,
  ExtractedNoteTaskDraft,
} from "@/types";
import { getAllCategories } from "@/lib/categories";
import { getOfflineQueue, enqueueOfflineAction, syncOfflineQueue } from "@/lib/offlineQueue";
import {
  ExternalLink,
  ListTodo,
  FileText,
  Calendar,
  TrendingUp,
  User,
  Kanban,
  BarChart3,
  Menu,
  Layers,
  X,
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
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [centralActiveTab, setCentralActiveTab] = useState<"details" | "study">("details");
  const [mobileActiveView, setMobileActiveView] = useState<"tasks" | "details" | "kpi">("tasks");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopKpiOpen, setIsDesktopKpiOpen] = useState<boolean>(true);

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

  // Persist desktop KPI panel state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("montlife_desktop_kpi_open");
      if (saved === "false") setIsDesktopKpiOpen(false);
    } catch {}
  }, []);

  const handleToggleDesktopKpi = () => {
    setIsDesktopKpiOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("montlife_desktop_kpi_open", String(next));
        } catch {}
      }
      return next;
    });
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
      title: (draft.title || "").trim() || "Sem título",
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

  const handleUpdateStatus = async (
    taskId: string,
    newStatus: TaskStatus,
    resolutionNotes?: string,
    cancelReason?: string,
    resolutionAttachments?: TaskAttachment[]
  ) => {
    const payload = {
      action: "update_status",
      status: newStatus,
      resolution_notes: resolutionNotes,
      cancel_reason: cancelReason,
      resolution_attachments: resolutionAttachments,
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

  const handleDeleteTask = async (taskId: string) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
      setTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== taskId);
        syncTasksCache(remaining);
        if (selectedTaskId === taskId) {
          setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => {
          const remaining = prev.filter((t) => t.id !== taskId);
          syncTasksCache(remaining);
          if (selectedTaskId === taskId) {
            setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
          }
          return remaining;
        });
      }
    } catch (err) {
      console.warn("Falha na rede ao excluir demanda, enfileirando offline:", err);
      enqueueOfflineAction("DELETE_TASK", { taskId });
      setOfflinePendingCount(getOfflineQueue().length);
    }
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
    setActiveNav("tarefas");
    setCentralActiveTab("details");
    setMobileActiveView("details");
  };

  const openTasksCount = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length,
    [tasks]
  );

  const hasConnectedAccount = safeAccounts.some((a) => Boolean(a.is_connected || a.access_token || a.refresh_token));
  const allCategories = useMemo(() => getAllCategories(tasks), [tasks]);

  return (
    <div className="w-full h-screen h-[100dvh] overflow-hidden flex bg-slate-50 dark:bg-[#090A0F] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Sidebar Nav (Far Left, from the mockup) */}
      <div className="hidden lg:flex h-full no-print">
        <SidebarNav
          accounts={safeAccounts}
          tasks={tasks}
          activeNav={activeNav}
          onSelectNav={(nav) => {
            setActiveNav(nav);
            if (nav === "config") setIsAccountsModalOpen(true);
            if (nav === "tarefas" || nav === "inicio") {
              setCentralActiveTab("details");
            }
          }}
          onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
          onOpenReportModal={() => setActiveNav("relatorios")}
          selectedAccountFilter={accountFilter}
          onSelectAccountFilter={(filter) => setAccountFilter(filter)}
          onLogout={handleLogout}
          completedTasksCount={tasks.filter((t) => t.status === "COMPLETED").length}
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
                setActiveNav(nav);
                setIsMobileMenuOpen(false);
                if (nav === "config") setIsAccountsModalOpen(true);
                if (nav === "tarefas" || nav === "inicio") {
                  setCentralActiveTab("details");
                  setMobileActiveView("tasks");
                }
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

      {/* 2. Main Area (Header on top, then 3 columns below) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Header Command Bar */}
        <div className="no-print relative z-40 shrink-0">
          <HeaderCommandBar
            accounts={safeAccounts}
            tasks={tasks}
            availableCategories={allCategories}
            onTaskCreated={handleTaskCreated}
            onSelectTask={navigateToTaskDetails}
            onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
            onOpenReportModal={() => setActiveNav("relatorios")}
            onOpenNotes={() => setActiveNav("notas")}
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
          <div className="no-print bg-amber-500 text-slate-950 font-medium px-3 sm:px-4 py-2 flex items-center justify-between text-xs shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                <strong>Modo Offline Ativo:</strong> Você está sem conexão com a internet. Suas alterações estão seguras no cache local e serão sincronizadas automaticamente assim que você reconectar.
              </span>
            </div>
            {offlinePendingCount > 0 && (
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                {offlinePendingCount} na fila
              </span>
            )}
          </div>
        )}

        {/* Feedback de Sincronização Offline */}
        {offlineSyncMessage && (
          <div className="no-print bg-emerald-600 text-white font-medium px-3 sm:px-4 py-2 flex items-center justify-between text-xs shrink-0 shadow-xs z-30 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 shrink-0" />
              <span>{offlineSyncMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setOfflineSyncMessage(null)}
              className="text-white hover:text-emerald-100 font-bold px-2 py-0.5 rounded text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Banner if no account is connected */}
        {!hasConnectedAccount && accountsLoaded && (
          <div className="no-print bg-purple-50 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-800 px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-purple-900 dark:text-purple-200 shrink-0">
            <div className="flex items-start sm:items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0 mt-1 sm:mt-0" />
              <p className="leading-snug">
                <strong>Nenhuma conta Google vinculada.</strong> Conecte suas contas para associar seus espaços de trabalho e autenticar com segurança.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsAccountsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
              >
                + Vincular Conta Google
              </button>
            </div>
          </div>
        )}

        {/* OAuth Feedback Toast Banner */}
        {oauthFeedback && (
          <div className="bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200 shrink-0">
            <span className="leading-snug">{oauthFeedback}</span>
            <button
              onClick={() => setOauthFeedback(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white px-2 py-0.5 rounded text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Dedicated Agenda do Dia View OR Wiki Técnica View OR 3 Columns Demand Grid */}
        {activeNav === "agenda" ? (
          <main className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 lg:p-3.5 pb-4 lg:pb-3.5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <AgendaDoDiaView
              tasks={tasks}
              accountFilter={accountFilter}
              selectedTaskId={selectedTaskId}
              onSelectTask={navigateToTaskDetails}
              onOpenNewTaskModal={(prefillDate) => {
                setNewTaskInitialText("");
                setNewTaskInitialDate(prefillDate ?? null);
                setNewTaskInitialDraft(null);
                setPendingNoteLink(null);
                setIsNewTaskModalOpen(true);
              }}
              onTaskCreated={handleTaskCreated}
            />
          </main>
        ) : activeNav === "notas" ? (
          <main className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-4 lg:p-4 bg-slate-100/50 dark:bg-[#0c0d13]">
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
          <main className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-5 pb-4 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <WikiTechnicalView
              tasks={tasks}
              onSelectTask={navigateToTaskDetails}
              onBackToTasks={() => {
                setActiveNav("tarefas");
                setCentralActiveTab("details");
                setMobileActiveView("tasks");
              }}
            />
          </main>
        ) : activeNav === "kanban" ? (
          <main className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-5 pb-4 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <KanbanView
              tasks={tasks}
              accountFilter={accountFilter}
              onSelectTask={navigateToTaskDetails}
              onUpdateStatus={handleUpdateStatus}
              onOpenNewTaskModal={() => {
                setNewTaskInitialText("");
                setNewTaskInitialDate(null);
                setIsNewTaskModalOpen(true);
              }}
              onRequestCancelTask={(task) => {
                setTaskForCancel(task);
                setIsCancelModalOpen(true);
              }}
            />
          </main>
        ) : activeNav === "relatorios" ? (
          <main className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-5 pb-4 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <ReportsView
              tasks={tasks}
              accountFilter={accountFilter}
              onBackToTasks={() => {
                setActiveNav("tarefas");
                setCentralActiveTab("details");
                setMobileActiveView("tasks");
              }}
            />
          </main>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Mobile Sub-Navigation Segmented Control (Lista | Detalhes | Métricas) */}
            <div className="lg:hidden px-2.5 py-2 bg-white dark:bg-[#101118] border-b border-slate-200 dark:border-zinc-800/80 shrink-0">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-[#171825] border border-slate-200/70 dark:border-zinc-800/70">
                <button
                  type="button"
                  onClick={() => setMobileActiveView("tasks")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    mobileActiveView === "tasks"
                      ? "bg-white dark:bg-[#23253a] text-purple-700 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <span className="truncate">Lista ({openTasksCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCentralActiveTab("details");
                    setMobileActiveView("details");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    mobileActiveView === "details"
                      ? "bg-white dark:bg-[#23253a] text-purple-700 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span className="truncate">Detalhes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileActiveView("kpi")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    mobileActiveView === "kpi"
                      ? "bg-white dark:bg-[#23253a] text-purple-700 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">Métricas</span>
                </button>
              </div>
            </div>

            {/* Quadrante Esquerdo: Minhas Tarefas */}
            <div className={`${mobileActiveView === "tasks" ? "flex" : "hidden"} lg:flex flex-1 min-h-0 lg:flex-none lg:h-full w-full lg:w-auto lg:shrink-0`}>
              <LeftTasksQuadrant
                tasks={tasks}
                accounts={safeAccounts}
                selectedTaskId={selectedTask?.id || null}
                onSelectTask={(task) => {
                  setSelectedTaskId(task.id);
                  setCentralActiveTab("details");
                  setMobileActiveView("details");
                }}
                onUpdateStatus={handleUpdateStatus}
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
                onRequestNewTask={() => {
                  setNewTaskInitialText("");
                  setNewTaskInitialDate(null);
                  setIsNewTaskModalOpen(true);
                }}
                onRefreshTasks={loadTasks}
                accountFilter={accountFilter}
                onAccountFilterChange={setAccountFilter}
              />
            </div>

            {/* Quadrante Central: Detalhes da Demanda (sem duplicação de agenda) */}
            <div className={`${mobileActiveView === "details" ? "flex" : "hidden"} lg:flex flex-1 min-h-0 lg:h-full min-w-0`}>
              <CentralQuadrant
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
                onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
                activeTab={centralActiveTab}
                onTabChange={setCentralActiveTab}
                onBackToTasks={() => setMobileActiveView("tasks")}
                isKpiPanelOpen={isDesktopKpiOpen}
                onToggleKpiPanel={handleToggleDesktopKpi}
              />
            </div>

            {/* Quadrante Direito: Métricas & Briefing IA + Resumo Anual */}
            <div className={`${mobileActiveView === "kpi" ? "flex" : "hidden"} ${isDesktopKpiOpen ? "lg:flex" : "lg:hidden"} flex-1 min-h-0 lg:flex-none lg:h-full w-full lg:w-auto lg:shrink-0`}>
              <RightKpiQuadrant
                tasks={tasks}
                onOpenReportModal={() => setActiveNav("relatorios")}
                pinnedNotesCount={notes.filter((n) => Boolean(n.pinned) && !n.archived).length}
                onSelectTaskById={(taskId) => {
                  const found = tasks.find((t) => t.id === taskId);
                  if (found) navigateToTaskDetails(found);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for PWA on Phones) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 min-h-[64px] pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#10111a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800/80 px-1.5 flex items-center justify-around z-40">
        <button
          type="button"
          onClick={() => {
            setActiveNav("tarefas");
            setMobileActiveView("tasks");
          }}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "tarefas"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`relative px-2.5 py-1 rounded-xl transition-colors ${
              activeNav === "tarefas" ? "bg-purple-600/10 dark:bg-purple-500/20" : ""
            }`}
          >
            <ListTodo className="w-5 h-5" />
            {openTasksCount > 0 && (
              <span className="absolute -top-0.5 right-0 px-1 text-[9px] font-bold rounded-full bg-purple-600 text-white leading-tight">
                {openTasksCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Demandas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("notas")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "notas"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`relative px-2.5 py-1 rounded-xl transition-colors ${
              activeNav === "notas" ? "bg-purple-600/10 dark:bg-purple-500/20" : ""
            }`}
          >
            <StickyNote className="w-5 h-5" />
            {notes.filter((n) => !n.archived).length > 0 && (
              <span className="absolute -top-0.5 right-0 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-white leading-tight">
                {notes.filter((n) => !n.archived).length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Notas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("agenda")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "agenda"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              activeNav === "agenda" ? "bg-purple-600/10 dark:bg-purple-500/20" : ""
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("kanban")}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeNav === "kanban"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              activeNav === "kanban" ? "bg-purple-600/10 dark:bg-purple-500/20" : ""
            }`}
          >
            <Kanban className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Kanban</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
            isMobileMenuOpen ||
            activeNav === "wiki" ||
            activeNav === "relatorios" ||
            activeNav === "config"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              isMobileMenuOpen ||
              activeNav === "wiki" ||
              activeNav === "relatorios" ||
              activeNav === "config"
                ? "bg-purple-600/10 dark:bg-purple-500/20"
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
    </div>
  );
}
