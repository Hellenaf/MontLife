"use client";

import React, { useState, useMemo } from "react";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";
import { SplitView } from "@/components/ui/SplitView";
import { TaskDetailPanel } from "@/components/modules/tasks/TaskDetailPanel";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Priority } from "@/types";

export function KanbanWorkspaceView() {
  const {
    tasks,
    accountFilter,
    selectedTaskId,
    setSelectedTaskId,
    handleUpdateStatus,
    handleQuickCreateTask,
    openNewTaskModal,
    requestCancelTask,
    prefs,
    setSplitRatio,
  } = useWorkspace();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [priorityGroupFilter, setPriorityGroupFilter] = useState<"ALL" | Priority>("ALL");

  const filteredTasks = useMemo(() => {
    if (priorityGroupFilter === "ALL") return tasks;
    return tasks.filter((t) => t.priority === priorityGroupFilter);
  }, [tasks, priorityGroupFilter]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const boardNode = (
    <div className="h-full w-full flex flex-col overflow-hidden bg-canvas">
      {/* Compact Kanban Toolbar */}
      <div className="px-4 py-2.5 bg-sidebar border-b border-line flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-muted">Filtrar prioridade:</span>
          <div className="inline-flex items-center p-0.5 rounded-[9px] bg-canvas border border-line">
            {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityGroupFilter(p)}
                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  priorityGroupFilter === p
                    ? "bg-surface text-brand border border-line/80 shadow-xs-subtle"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {p === "ALL" ? "Todas" : p}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDetailOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border text-xs font-semibold transition-colors cursor-pointer ${
            isDetailOpen
              ? "bg-lavender-soft border-lavender-mid text-brand"
              : "bg-surface border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
          }`}
        >
          {isDetailOpen ? (
            <>
              <PanelRightClose className="w-3.5 h-3.5" />
              <span>Recolher detalhes (Largura total)</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="w-3.5 h-3.5" />
              <span>Painel de detalhes</span>
            </>
          )}
        </button>
      </div>

      {/* Independent Kanban Board (same source of truth) */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
        <KanbanView
          tasks={filteredTasks}
          accountFilter={accountFilter}
          onSelectTask={(task) => {
            setSelectedTaskId(task.id);
            setIsDetailOpen(true);
          }}
          onUpdateStatus={handleUpdateStatus}
          onQuickCreateTask={async (title, status) => {
            await handleQuickCreateTask(title, status, "P3");
          }}
          onOpenNewTaskModal={() => openNewTaskModal()}
          onRequestCancelTask={requestCancelTask}
        />
      </div>
    </div>
  );

  if (!isDetailOpen) {
    return boardNode;
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
      <SplitView
        ratio={100 - prefs.splitRatios.kanbanDetail}
        onRatioChange={(leftPct) => setSplitRatio("kanbanDetail", 100 - leftPct)}
        defaultRatio={62}
        minLeftPct={42}
        maxLeftPct={76}
        mobileShowRight={isDetailOpen && Boolean(selectedTask)}
        onMobileBack={() => setIsDetailOpen(false)}
        mobileBackLabel="Voltar ao Kanban"
        ariaLabel="Redimensionar quadro Kanban e detalhes"
        left={boardNode}
        right={
          <TaskDetailPanel
            task={selectedTask}
            onClosePanel={() => setIsDetailOpen(false)}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        }
      />
    </div>
  );
}

