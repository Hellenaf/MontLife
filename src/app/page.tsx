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
import { Task, ConnectedAccount, TaskStatus } from "@/types";

export default function MontOpsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  // Modals state
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [taskForResolution, setTaskForResolution] = useState<Task | null>(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [taskForExtend, setTaskForExtend] = useState<Task | null>(null);

  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fetch initial data
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        if (!selectedTask && data.tasks.length > 0) {
          setSelectedTask(data.tasks[0]);
        } else if (selectedTask) {
          const updatedSelected = data.tasks.find((t: Task) => t.id === selectedTask.id);
          if (updatedSelected) setSelectedTask(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, [selectedTask]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadAccounts();
  }, [loadTasks, loadAccounts]);

  // Handlers
  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTask(newTask);
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
        if (selectedTask?.id === taskId) {
          setSelectedTask(data.task);
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
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
        if (selectedTask?.id === taskForExtend.id) {
          setSelectedTask(data.task);
        }
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
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (selectedTask?.id === taskId) {
          setSelectedTask(tasks.find((t) => t.id !== taskId) || null);
        }
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0F0E17]">
      {/* 1. Header Fixo & Barra de Comando IA */}
      <HeaderCommandBar
        accounts={accounts}
        onTaskCreated={handleTaskCreated}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* 2. Fixed-Grid: 3 Colunas Abaixo do Header (Tela Cheia, Scroll Interno Independente) */}
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Quadrante Esquerdo: Gestão de Tarefas */}
        <LeftTasksQuadrant
          tasks={tasks}
          selectedTaskId={selectedTask?.id || null}
          onSelectTask={(task) => setSelectedTask(task)}
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
        />

        {/* Quadrante Central: Timeline & Detalhes & Estudo */}
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
        />

        {/* Quadrante Direito: KPIs & Metrificação */}
        <RightKpiQuadrant
          tasks={tasks}
          onOpenReportModal={() => setIsReportModalOpen(true)}
        />
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
      />
    </div>
  );
}

