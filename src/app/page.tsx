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
import { WikiTechnicalView } from "@/components/WikiTechnicalView";
import { ReportsView } from "@/components/ReportsView";
import { KanbanView } from "@/components/KanbanView";
import { Task, TaskAttachment, ConnectedAccount, TaskStatus, ItemType, AccountType } from "@/types";
import { getAllCategories } from "@/lib/categories";
import { ExternalLink, ListTodo, FileText, Calendar, TrendingUp, User, Plus, Kanban, BarChart3, Menu, Layers, X } from "lucide-react";

export default function MontOpsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [activeNav, setActiveNav] = useState("tarefas");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [centralActiveTab, setCentralActiveTab] = useState<"details" | "study">("details");
  const [mobileActiveView, setMobileActiveView] = useState<"tasks" | "details" | "kpi">("tasks");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    email: string;
    name: string;
    picture?: string;
  } | null>(null);

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
    loadAccounts();
    loadUser();
  }, [loadTasks, loadAccounts, loadUser]);

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
  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
  };

  const handleUpdateStatus = async (
    taskId: string,
    newStatus: TaskStatus,
    resolutionNotes?: string,
    cancelReason?: string,
    resolutionAttachments?: TaskAttachment[]
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          status: newStatus,
          resolution_notes: resolutionNotes,
          cancel_reason: cancelReason,
          resolution_attachments: resolutionAttachments,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? data.task : t))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleCancelTask = async (taskId: string, cancelReason: string) => {
    await handleUpdateStatus(taskId, "CANCELED", undefined, cancelReason);
  };

  const handleReopenTask = async (taskId: string) => {
    await handleUpdateStatus(taskId, "TODO");
  };

  const handleUpdateItemType = async (taskId: string, itemType: ItemType) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? data.task : t))
        );
      }
    } catch (err) {
      console.error("Failed to update item type:", err);
    }
  };

  const handleUpdateTaskFields = async (taskId: string, fields: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? data.task : t))
        );
      }
    } catch (err) {
      console.error("Failed to update task fields:", err);
    }
  };

  const handleTransferTask = async (
    task: Task,
    targetAccount: "work" | "personal" | string
  ) => {
    const isWork = targetAccount === "work" || targetAccount.toLowerCase().includes("trab");
    const targetEmail = isWork
      ? "haferreira@notredamecampinas.net.br"
      : "hellenalvesferreira.s2@gmail.com";
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
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? data.task : t))
        );
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
    try {
      const res = await fetch(`/api/tasks/${taskForExtend.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend_deadline",
          new_due_date: newDueDateIso,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskForExtend.id ? data.task : t))
        );
      }
    } catch (err) {
      console.error("Failed to extend deadline:", err);
    } finally {
      setTaskForExtend(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => {
          const remaining = prev.filter((t) => t.id !== taskId);
          if (selectedTaskId === taskId) {
            setSelectedTaskId(remaining.length > 0 ? remaining[0].id : null);
          }
          return remaining;
        });
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
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
              currentUser={currentUser}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 2. Main Area (Header on top, then 3 columns below) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 pb-16 lg:pb-0">
        {/* Header Command Bar */}
        <div className="no-print">
          <HeaderCommandBar
            accounts={safeAccounts}
            tasks={tasks}
            availableCategories={allCategories}
            onTaskCreated={handleTaskCreated}
            onSelectTask={(task) => {
              setSelectedTaskId(task.id);
              setActiveNav("tarefas");
              setCentralActiveTab("details");
            }}
            onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
            onOpenReportModal={() => setActiveNav("relatorios")}
            onOpenNewTaskModal={(prefill) => {
              setNewTaskInitialText(prefill || "");
              setIsNewTaskModalOpen(true);
            }}
            onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        </div>

        {/* Banner if no account is connected */}
        {!hasConnectedAccount && accountsLoaded && (
          <div className="no-print bg-purple-50 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-800 px-4 py-2 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <p>
                <strong>Nenhuma conta Google vinculada.</strong> Conecte suas contas para associar seus espaços de trabalho e autenticar com segurança.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAccountsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
              >
                + Vincular Conta Google
              </button>
            </div>
          </div>
        )}

        {/* OAuth Feedback Toast Banner */}
        {oauthFeedback && (
          <div className="bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 shrink-0">
            <span>{oauthFeedback}</span>
            <button
              onClick={() => setOauthFeedback(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white px-2 py-0.5 rounded text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Dedicated Agenda do Dia View OR Wiki Técnica View OR 3 Columns Demand Grid */}
        {activeNav === "agenda" ? (
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <AgendaDoDiaView
              tasks={tasks}
              accountFilter={accountFilter}
              selectedTaskId={selectedTaskId}
              onSelectTask={(task) => {
                setSelectedTaskId(task.id);
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
              onOpenNewTaskModal={() => {
                setNewTaskInitialText("");
                setIsNewTaskModalOpen(true);
              }}
              onTaskCreated={handleTaskCreated}
            />
          </main>
        ) : activeNav === "wiki" ? (
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <WikiTechnicalView
              tasks={tasks}
              onSelectTask={(task) => {
                setSelectedTaskId(task.id);
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
              onBackToTasks={() => {
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
            />
          </main>
        ) : activeNav === "kanban" ? (
          <main className="flex-1 overflow-hidden p-2.5 sm:p-5 pb-24 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <KanbanView
              tasks={tasks}
              accountFilter={accountFilter}
              onSelectTask={(task) => {
                setSelectedTaskId(task.id);
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
              onUpdateStatus={handleUpdateStatus}
              onOpenNewTaskModal={() => {
                setNewTaskInitialText("");
                setIsNewTaskModalOpen(true);
              }}
              onRequestCancelTask={(task) => {
                setTaskForCancel(task);
                setIsCancelModalOpen(true);
              }}
            />
          </main>
        ) : activeNav === "relatorios" ? (
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 lg:pb-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <ReportsView
              tasks={tasks}
              accountFilter={accountFilter}
              onBackToTasks={() => {
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
            />
          </main>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Quadrante Esquerdo: Minhas Tarefas */}
            <div className={`${mobileActiveView === "tasks" ? "flex" : "hidden"} lg:flex h-full w-full lg:w-auto shrink-0`}>
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
                  setIsNewTaskModalOpen(true);
                }}
                onRefreshTasks={loadTasks}
                accountFilter={accountFilter}
                onAccountFilterChange={setAccountFilter}
              />
            </div>

            {/* Quadrante Central: Detalhes da Demanda (sem duplicação de agenda) */}
            <div className={`${mobileActiveView === "details" ? "flex" : "hidden"} lg:flex flex-1 h-full min-w-0`}>
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
                onSelectTask={(task) => {
                  setSelectedTaskId(task.id);
                  setActiveNav("tarefas");
                  setCentralActiveTab("details");
                }}
                onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
                activeTab={centralActiveTab}
                onTabChange={setCentralActiveTab}
                onBackToTasks={() => setMobileActiveView("tasks")}
              />
            </div>

            {/* Quadrante Direito: Métricas & Desempenho + Resumo Anual */}
            <div className={`${mobileActiveView === "kpi" ? "flex" : "hidden"} lg:flex h-full w-full lg:w-auto shrink-0`}>
              <RightKpiQuadrant
                tasks={tasks}
                onOpenReportModal={() => setActiveNav("relatorios")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => {
          setNewTaskInitialText("");
          setIsNewTaskModalOpen(true);
        }}
        className="lg:hidden fixed bottom-20 right-4 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/40 flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Adicionar nova demanda"
        title="Nova Demanda"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Mobile Bottom Navigation Bar (Fixed for PWA on Phones) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#10111a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800/80 px-2 flex items-center justify-around z-40 pb-safe">
        <button
          type="button"
          onClick={() => {
            setActiveNav("tarefas");
            setMobileActiveView("tasks");
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNav === "tarefas"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <ListTodo className="w-5 h-5" />
            {tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-purple-600 text-white">
                {tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length}
              </span>
            )}
          </div>
          <span className="text-[10px]">Demandas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("kanban")}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNav === "kanban"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Kanban className="w-5 h-5" />
          <span className="text-[10px]">Kanban</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("agenda")}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNav === "agenda"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav("relatorios")}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeNav === "relatorios"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Relatórios</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isMobileMenuOpen || activeNav === "wiki"
              ? "text-purple-600 dark:text-purple-400 font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Menu className="w-5 h-5" />
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
        onClose={() => setIsNewTaskModalOpen(false)}
        onTaskCreated={(task) => {
          handleTaskCreated(task);
          setIsNewTaskModalOpen(false);
        }}
        existingTasks={tasks}
        onSelectExistingTask={(task) => {
          setSelectedTaskId(task.id);
          setIsNewTaskModalOpen(false);
          setActiveNav("tarefas");
          setCentralActiveTab("details");
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          setSelectedTaskId(updatedTask.id);
          setIsNewTaskModalOpen(false);
        }}
        initialText={newTaskInitialText}
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
