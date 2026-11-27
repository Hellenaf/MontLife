"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SplitView } from "@/components/ui/SplitView";
import { TaskListPanel, TaskScopeFilter } from "@/components/modules/tasks/TaskListPanel";
import { TaskDetailPanel } from "@/components/modules/tasks/TaskDetailPanel";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";

export function TasksWorkspaceView() {
  const searchParams = useSearchParams();
  const {
    tasks,
    accountFilter,
    selectedTaskId,
    setSelectedTaskId,
    prefs,
    setSplitRatio,
  } = useWorkspace();

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const initialFilterParam = searchParams?.get("filter");
  const initialScopeFilter: TaskScopeFilter =
    initialFilterParam === "overdue" ||
    initialFilterParam === "today" ||
    initialFilterParam === "critical"
      ? initialFilterParam
      : "all";

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  useEffect(() => {
    if (scopedTasks.length === 0) return;
    if (!selectedTaskId || !tasks.some((t) => t.id === selectedTaskId)) {
      const firstOpen =
        scopedTasks.find(
          (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
        ) || scopedTasks[0];
      if (firstOpen) setSelectedTaskId(firstOpen.id);
    }
  }, [scopedTasks, tasks, selectedTaskId, setSelectedTaskId]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || scopedTasks[0] || null,
    [tasks, scopedTasks, selectedTaskId]
  );

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
      <SplitView
        ratio={prefs.splitRatios.demandas}
        onRatioChange={(next) => setSplitRatio("demandas", next)}
        defaultRatio={55}
        minLeftPct={32}
        maxLeftPct={72}
        isLeftCollapsed={isLeftCollapsed}
        onToggleLeftCollapsed={() => {
          setIsLeftCollapsed((prev) => !prev);
          setIsRightCollapsed(false);
        }}
        isRightCollapsed={isRightCollapsed}
        onToggleRightCollapsed={() => {
          setIsRightCollapsed((prev) => !prev);
          setIsLeftCollapsed(false);
        }}
        mobileShowRight={mobileShowDetail}
        onMobileBack={() => setMobileShowDetail(false)}
        mobileBackLabel="Voltar para demandas"
        ariaLabel="Redimensionar lista e detalhes de demandas"
        left={
          <TaskListPanel
            selectedTaskId={selectedTask?.id || null}
            initialScopeFilter={initialScopeFilter}
            isDetailCollapsed={isRightCollapsed}
            onRestoreDetail={() => setIsRightCollapsed(false)}
            onSelectTask={(task) => {
              setSelectedTaskId(task.id);
              setIsRightCollapsed(false);
              setMobileShowDetail(true);
            }}
          />
        }
        right={
          <TaskDetailPanel
            task={selectedTask}
            isFocusExpanded={isLeftCollapsed}
            onToggleFocusExpanded={() => {
              setIsLeftCollapsed((prev) => !prev);
              setIsRightCollapsed(false);
            }}
            onClosePanel={() => setIsRightCollapsed(true)}
            onSelectTask={(task) => {
              setSelectedTaskId(task.id);
              setMobileShowDetail(true);
            }}
          />
        }
      />
    </div>
  );
}
