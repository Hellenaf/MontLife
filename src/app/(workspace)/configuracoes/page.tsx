"use client";

import React, { Suspense } from "react";
import { SettingsWorkspaceView } from "@/components/modules/settings/SettingsWorkspaceView";
import { LoadingSkeleton } from "@/components/ui/WorkspacePrimitives";

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <SettingsWorkspaceView />
    </Suspense>
  );
}

