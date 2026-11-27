"use client";

import React, { Suspense } from "react";
import { TasksWorkspaceView } from "@/components/modules/tasks/TasksWorkspaceView";
import { LoadingSkeleton } from "@/components/ui/WorkspacePrimitives";

export default function DemandasPage() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <TasksWorkspaceView />
    </Suspense>
  );
}

