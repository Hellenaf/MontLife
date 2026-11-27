"use client";

import React, { useState } from "react";
import { CheckSquare, Maximize2, Minimize2, PanelRightClose, Plus } from "lucide-react";
import { CentralQuadrant } from "@/components/CentralQuadrant";
import { EmptyState } from "@/components/ui/WorkspacePrimitives";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Task } from "@/types";

interface TaskDetailPanelProps {
  task: Task | null;
  isFocusExpanded?: boolean;
  onToggleFocusExpanded?: () => void;
  onClosePanel?: () => void;
  onSelectTask?: (task: Task) => void;
}

export function TaskDetailPanel({
  task,
  isFocusExpanded = false,
  onToggleFocusExpanded,
  onClosePanel,
  onSelectTask,
}: TaskDetailPanelProps) {
  const {
    tasks,
    requestResolution,
    requestExtendDeadline,
    requestCancelTask,
    handleReopenTask,
    handleUpdateStatus,
    handleUpdateItemType,
    handleUpdateTaskFields,
    handleTransferTask,
    setSelectedTaskId,
    openNewTaskModal,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<"details" | "study">("details");

  if (!task) {
    return (
      <div className="h-full w-full flex flex-col bg-surface border-l border-line">
        <EmptyState
          className="flex-1"
          icon={<CheckSquare className="w-5 h-5" />}
          title="Selecione uma demanda"
          description="Clique em qualquer item na lista ao lado para visualizar e editar todos os detalhes, checklist, SLA, anexos e Assistente IA sem sair da tela."
          action={
            <button
              type="button"
              onClick={() => openNewTaskModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar nova demanda</span>
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      {/* Subtle Top Layout Controls Bar (Desktop) */}
      {(onToggleFocusExpanded || onClosePanel) && (
        <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-sidebar border-b border-line shrink-0">
          <span className="text-[11px] font-medium text-ink-muted truncate">
            Detalhes da demanda • Edição direta
          </span>
          <div className="flex items-center gap-1">
            {onToggleFocusExpanded && (
              <button
                type="button"
                onClick={onToggleFocusExpanded}
                title={
                  isFocusExpanded
                    ? "Sair do modo foco"
                    : "Expandir detalhes (Modo Foco)"
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] text-[11px] font-medium text-ink-muted hover:text-brand hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                {isFocusExpanded ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>Restaurar</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>Foco</span>
                  </>
                )}
              </button>
            )}
            {onClosePanel && (
              <button
                type="button"
                onClick={onClosePanel}
                title="Recolher painel de detalhes"
                className="p-1 rounded-[7px] text-ink-muted hover:text-brand hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reused Full-Featured Task Details Workspace */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CentralQuadrant
          selectedTask={task}
          allTasks={tasks}
          onRequestResolution={requestResolution}
          onRequestExtendDeadline={requestExtendDeadline}
          onRequestCancelTask={requestCancelTask}
          onReopenTask={handleReopenTask}
          onUpdateStatus={handleUpdateStatus}
          onUpdateItemType={handleUpdateItemType}
          onUpdateTaskFields={handleUpdateTaskFields}
          onTransferTask={handleTransferTask}
          onSelectTask={(nextTask) => {
            if (onSelectTask) {
              onSelectTask(nextTask);
            } else {
              setSelectedTaskId(nextTask.id);
            }
          }}
          onOpenNewTaskModal={() => openNewTaskModal()}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}

