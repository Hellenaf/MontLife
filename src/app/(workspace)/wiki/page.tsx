"use client";

import React from "react";
import { WikiTechnicalView } from "@/components/WikiTechnicalView";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function WikiPage() {
  const { tasks } = useWorkspace();

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-y-auto px-4 sm:px-6 py-5 bg-canvas">
      <WikiTechnicalView tasks={tasks} />
    </div>
  );
}
