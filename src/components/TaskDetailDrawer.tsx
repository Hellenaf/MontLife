"use client";

import React, { useEffect } from "react";
import { CentralQuadrant } from "@/components/CentralQuadrant";
import { Task, TaskStatus, ItemType } from "@/types";

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask: Task | null;
  allTasks: Task[];
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onRequestCancelTask?: (task: Task) => void;
  onReopenTask?: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateItemType?: (taskId: string, itemType: ItemType) => void;
  onUpdateTaskFields?: (taskId: string, fields: Partial<Task>) => Promise<void> | void;
  onTransferTask?: (task: Task, targetAccount: "work" | "personal" | string) => void;
  onSelectTask?: (task: Task) => void;
  onOpenNewTaskModal?: () => void;
  activeTab?: "details" | "study";
  onTabChange?: (tab: "details" | "study") => void;
}

export function TaskDetailDrawer({
  isOpen,
  onClose,
  selectedTask,
  allTasks,
  onRequestResolution,
  onRequestExtendDeadline,
  onRequestCancelTask,
  onReopenTask,
  onUpdateStatus,
  onUpdateItemType,
  onUpdateTaskFields,
  onTransferTask,
  onSelectTask,
  onOpenNewTaskModal,
  activeTab,
  onTabChange,
}: TaskDetailDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen || !selectedTask) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/35 dark:bg-[#0B0F19]/60 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[92vw] lg:w-[780px] xl:w-[920px] max-w-[96vw] h-full flex flex-col bg-[#F6F4EE] dark:bg-[#212838] border-l border-[#DCD6CA] dark:border-[#323D54] shadow-2xl overflow-hidden animate-drawer-right"
      >
        <CentralQuadrant
          selectedTask={selectedTask}
          allTasks={allTasks}
          onRequestResolution={onRequestResolution}
          onRequestExtendDeadline={onRequestExtendDeadline}
          onRequestCancelTask={onRequestCancelTask}
          onReopenTask={onReopenTask}
          onUpdateStatus={onUpdateStatus}
          onUpdateItemType={onUpdateItemType}
          onUpdateTaskFields={onUpdateTaskFields}
          onTransferTask={onTransferTask}
          onSelectTask={onSelectTask}
          onOpenNewTaskModal={onOpenNewTaskModal}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onBackToTasks={onClose}
          onCloseDrawer={onClose}
        />
      </div>
    </div>
  );
}

