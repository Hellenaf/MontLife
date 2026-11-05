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
import { ExternalLink } from "lucide-react";

export default function MontOpsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [activeNav, setActiveNav] = useState("tarefas");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [centralActiveTab, setCentralActiveTab] = useState<"details" | "study">("details");

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
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [newTaskInitialText, setNewTaskInitialText] = useState("");
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    email: string;
    name: string;
    picture?: string;
  } | null>(null);

  // Optimistic initial hydration from local cache
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedTasks = localStorage.getItem("montlife_cached_tasks");
        if (cachedTasks) {
          const parsed = JSON.parse(cachedTasks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            setSelectedTaskId(parsed[0].id);
          }
        }
        const cachedAccounts = localStorage.getItem("montlife_cached_accounts");
        if (cachedAccounts) {
          const parsed = JSON.parse(cachedAccounts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAccounts(parsed);
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }, []);

  // Fetch initial data ONCE on mount
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setSelectedTaskId((prev) => prev || (data.tasks.length > 0 ? data.tasks[0].id : null));
        if (typeof window !== "undefined") {
          localStorage.setItem("montlife_cached_tasks", JSON.stringify(data.tasks));
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (typeof window !== "undefined") {
          localStorage.setItem("montlife_cached_accounts", JSON.stringify(data.accounts));
        }
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
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch {
      // not logged in or guest
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("montlife_cached_tasks");
      localStorage.removeItem("montlife_cached_accounts");
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    loadTasks();
    loadAccounts();
    loadUser();
  }, [loadTasks, loadAccounts, loadUser]);

  // Listen to OAuth redirect query params & prompt classification
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);

      // 1. Post-OAuth Classification Prompt
      if (params.get("prompt_classify") === "true") {
        const email = params.get("email") || "";
        setClassifyEmail(email);
        setIsClassifyModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // 2. Direct OAuth Success
      if (params.get("oauth_success")) {
        const type = params.get("oauth_success");
        setOauthFeedback(
          `Conta ${type === "work" ? "de Trabalho" : "Pessoal"} vinculada com sucesso! Importando suas tarefas reais do Google Tasks...`
        );
        window.history.replaceState({}, document.title, window.location.pathname);
        loadAccounts().then(() => loadTasks());
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
  }, [loadAccounts, loadTasks]);

  // Redirect to /login if user is unauthenticated and not in guest/classify mode
  useEffect(() => {
    if (typeof window !== "undefined" && accountsLoaded) {
      const params = new URLSearchParams(window.location.search);
      const isGuest = params.get("guest") === "true";
      const isPrompting = params.get("prompt_classify") === "true" || isClassifyModalOpen;
      const isOAuth = params.get("oauth_success") || params.get("oauth_error");
      const hasConnected = accounts.some((a) => a.is_connected);

      if (!hasConnected && !isGuest && !isPrompting && !isOAuth) {
        window.location.href = "/login";
      }
    }
  }, [accountsLoaded, accounts, isClassifyModalOpen]);

  const handleClassified = async (type: AccountType, importedCount: number) => {
    setIsClassifyModalOpen(false);
    setOauthFeedback(
      `Conta ${type === "work" ? "de Trabalho" : "Pessoal"} configurada com sucesso! ${importedCount} tarefas reais do Google Tasks importadas.`
    );
    await loadAccounts();
    await loadTasks();
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

  const hasConnectedAccount = accounts.some((a) => a.is_connected);
  const allCategories = useMemo(() => getAllCategories(tasks), [tasks]);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-slate-50 dark:bg-[#090A0F] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Sidebar Nav (Far Left, from the mockup) */}
      <div className="hidden lg:flex h-full no-print">
        <SidebarNav
          accounts={accounts}
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

      {/* 2. Main Area (Header on top, then 3 columns below) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header Command Bar */}
        <div className="no-print">
          <HeaderCommandBar
            accounts={accounts}
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
          />
        </div>

        {/* Banner if no account is connected */}
        {!hasConnectedAccount && accountsLoaded && accounts.length > 0 && (
          <div className="no-print bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800 px-4 py-2 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p>
                <strong>Nenhuma conta vinculada.</strong> Conecte sua conta do Google para sincronizar suas tarefas reais do Google Tasks.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                Fazer Login com Google
              </a>
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
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <AgendaDoDiaView
              tasks={tasks}
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
            />
          </main>
        ) : activeNav === "wiki" ? (
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/50 dark:bg-[#0c0d13]">
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
          <main className="flex-1 overflow-hidden p-3 sm:p-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <KanbanView
              tasks={tasks}
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
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100/50 dark:bg-[#0c0d13]">
            <ReportsView
              tasks={tasks}
              onBackToTasks={() => {
                setActiveNav("tarefas");
                setCentralActiveTab("details");
              }}
            />
          </main>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Quadrante Esquerdo: Minhas Tarefas */}
            <LeftTasksQuadrant
              tasks={tasks}
              selectedTaskId={selectedTask?.id || null}
              onSelectTask={(task) => {
                setSelectedTaskId(task.id);
                setCentralActiveTab("details");
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
              onRequestNewTask={() => {
                setNewTaskInitialText("");
                setIsNewTaskModalOpen(true);
              }}
              onRefreshTasks={loadTasks}
              accountFilter={accountFilter}
              onAccountFilterChange={setAccountFilter}
            />

            {/* Quadrante Central: Detalhes da Demanda (sem duplicação de agenda) */}
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
              onSelectTask={(task) => {
            setSelectedTaskId(task.id);
            setActiveNav("tarefas");
            setCentralActiveTab("details");
          }}
              onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
              activeTab={centralActiveTab}
              onTabChange={setCentralActiveTab}
            />

            {/* Quadrante Direito: Métricas & Desempenho + Resumo Anual */}
            <RightKpiQuadrant
              tasks={tasks}
              onOpenReportModal={() => setActiveNav("relatorios")}
            />
          </div>
        )}
      </div>

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
        accounts={accounts}
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
