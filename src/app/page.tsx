"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HeaderCommandBar } from "@/components/HeaderCommandBar";
import { LeftTasksQuadrant } from "@/components/LeftTasksQuadrant";
import { CentralQuadrant } from "@/components/CentralQuadrant";
import { RightKpiQuadrant } from "@/components/RightKpiQuadrant";
import { ResolutionModal } from "@/components/modals/ResolutionModal";
import { ExtendDeadlineModal } from "@/components/modals/ExtendDeadlineModal";
import { AnnualReportModal } from "@/components/modals/AnnualReportModal";
import { AccountsModal } from "@/components/modals/AccountsModal";
import { NewTaskModal } from "@/components/modals/NewTaskModal";
import { ClassifyAccountModal } from "@/components/modals/ClassifyAccountModal";
import { Task, ConnectedAccount, TaskStatus, ItemType, AccountType } from "@/types";
import { ExternalLink } from "lucide-react";

export default function MontOpsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  // Dynamically derive selected task from tasks array
  const selectedTask =
    tasks.find((t) => t.id === selectedTaskId) || (tasks.length > 0 ? tasks[0] : null);

  // Modals state
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [taskForResolution, setTaskForResolution] = useState<Task | null>(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [taskForExtend, setTaskForExtend] = useState<Task | null>(null);

  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isClassifyModalOpen, setIsClassifyModalOpen] = useState(false);
  const [classifyEmail, setClassifyEmail] = useState("");
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [newTaskInitialText, setNewTaskInitialText] = useState("");
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);

  // Fetch initial data ONCE on mount
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setSelectedTaskId((prev) => prev || (data.tasks.length > 0 ? data.tasks[0].id : null));
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
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setAccountsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadAccounts();
  }, [loadTasks, loadAccounts]);

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
        fetch("/api/google/sync", { method: "POST" })
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

  const handlePurgeSeedTasks = async () => {
    const seedTasks = tasks.filter((t) => t.id.startsWith("seed-task-"));
    for (const t of seedTasks) {
      await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    }
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
    cancelReason?: string
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

  const handleConfirmResolution = async (resolutionNotes: string) => {
    if (!taskForResolution) return;
    await handleUpdateStatus(taskForResolution.id, "COMPLETED", resolutionNotes);
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

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#090810]">
      {/* 1. Header Fixo & Barra de Comando IA */}
      <HeaderCommandBar
        accounts={accounts}
        onTaskCreated={handleTaskCreated}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenNewTaskModal={(prefill) => {
          setNewTaskInitialText(prefill || "");
          setIsNewTaskModalOpen(true);
        }}
      />

      {/* 2. Fixed-Grid: 3 Colunas Abaixo do Header (Tela Cheia, Scroll Interno Independente) */}
      <div className="flex-1 flex flex-col overflow-hidden pt-16">
        {/* Banner if no account is connected */}
        {!hasConnectedAccount && accounts.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950 via-[#131122] to-purple-950 border-b border-indigo-500/30 px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[#EAE9FC]">
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
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 shrink-0">
            <span>{oauthFeedback}</span>
            <button
              onClick={() => setOauthFeedback(null)}
              className="text-emerald-400 hover:text-white px-2 py-0.5 rounded text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Quadrante Esquerdo: Gestão de Tarefas, Atividades e Lembretes */}
          <LeftTasksQuadrant
            tasks={tasks}
            selectedTaskId={selectedTask?.id || null}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            onUpdateStatus={handleUpdateStatus}
            onRequestResolution={(task) => {
              setTaskForResolution(task);
              setIsResolutionModalOpen(true);
            }}
            onRequestExtendDeadline={(task) => {
              setTaskForExtend(task);
              setIsExtendModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onRequestNewTask={() => {
              setNewTaskInitialText("");
              setIsNewTaskModalOpen(true);
            }}
          />

          {/* Quadrante Central: Detalhes, Seletor de Tipo, Agenda & Estudo */}
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
            onUpdateStatus={handleUpdateStatus}
            onUpdateItemType={handleUpdateItemType}
          />

          {/* Quadrante Direito: KPIs em Tempo Real */}
          <RightKpiQuadrant
            tasks={tasks}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        </div>
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

      <AnnualReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
      />

      <AccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={accounts}
        onRefreshAccounts={loadAccounts}
        onPurgeSeedTasks={handlePurgeSeedTasks}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onTaskCreated={(task) => {
          handleTaskCreated(task);
          setIsNewTaskModalOpen(false);
        }}
        initialText={newTaskInitialText}
      />

      <ClassifyAccountModal
        isOpen={isClassifyModalOpen}
        email={classifyEmail}
        onClassified={handleClassified}
        onClose={() => setIsClassifyModalOpen(false)}
      />
    </div>
  );
}
