"use client";

import React from "react";
import { NotesView } from "@/components/NotesView";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function AnotacoesPage() {
  const {
    notes,
    tasks,
    accountFilter,
    selectedNoteId,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleCreateTasksFromNote,
    openNewTaskModal,
    openTaskInModule,
  } = useWorkspace();

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-hidden p-3 sm:p-4 bg-canvas">
      <NotesView
        notes={notes}
        tasks={tasks}
        accountFilter={accountFilter}
        initialSelectedNoteId={selectedNoteId}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onCreateTasksFromNote={handleCreateTasksFromNote}
        onOpenNewTaskModalWithDraft={(draft, sourceNoteId, checklistItemId) =>
          openNewTaskModal({
            initialDraft: draft,
            sourceNoteId,
            checklistItemId,
          })
        }
        onSelectTask={(task) => openTaskInModule(task, "/demandas")}
      />
    </div>
  );
}

