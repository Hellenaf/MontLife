"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  StickyNote,
  Menu,
  Wifi,
  WifiOff,
} from "lucide-react";
import { GlobalSidebar } from "@/components/shell/GlobalSidebar";
import { GlobalHeader } from "@/components/shell/GlobalHeader";
import { CommandPalette } from "@/components/CommandPalette";
import { UndoToast } from "@/components/UndoToast";
import { ResolutionModal } from "@/components/modals/ResolutionModal";
import { ExtendDeadlineModal } from "@/components/modals/ExtendDeadlineModal";
import { AccountsModal } from "@/components/modals/AccountsModal";
import { NewTaskModal } from "@/components/modals/NewTaskModal";
import { ClassifyAccountModal } from "@/components/modals/ClassifyAccountModal";
import { CancelTaskModal } from "@/components/modals/CancelTaskModal";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";

const NAV_TO_ROUTE: Record<string, string> = {
  inicio: "/",
  visao: "/",
  hoje: "/meu-dia",
  "meu-dia": "/meu-dia",
  tarefas: "/demandas",
  demandas: "/demandas",
  kanban: "/kanban",
  agenda: "/agenda",
  notas: "/anotacoes",
  anotacoes: "/anotacoes",
  wiki: "/wiki",
  ia: "/assistente-ia",
  "assistente-ia": "/assistente-ia",
  relatorios: "/relatorios",
  config: "/configuracoes",
  configuracoes: "/configuracoes",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    tasks,
    notes,
    accounts,
    accountsLoaded,
    hasConnectedAccount,
    allCategories,
    accountFilter,
    isOnline,
    offlinePendingCount,
    offlineSyncMessage,
    setOfflineSyncMessage,
    oauthFeedback,
    setOauthFeedback,
    loadAccounts,
    handleCancelTask,
    openTaskInModule,
    openNoteInModule,
    openNewTaskModal,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isAccountsModalOpen,
    setIsAccountsModalOpen,
    modalState,
    undoToast,
    setUndoToast,
    prefs,
    toggleSidebar,
  } = useWorkspace();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openTasksCount = tasks.filter(
    (t) =>
      isTaskMatchingWorkspace(t, accountFilter) &&
      t.status !== "COMPLETED" &&
      t.status !== "CANCELED"
  ).length;

  return (
    <div className="w-full h-screen h-[100dvh] overflow-hidden flex bg-canvas text-ink transition-colors duration-200">
      {/* Desktop Collapsible Sidebar */}
      <div className="hidden lg:flex h-full shrink-0 no-print">
        <GlobalSidebar />
      </div>

      {/* Mobile Slide-Over Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-[#1D1925]/60 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full shadow-popover animate-in slide-in-from-left duration-200">
            <GlobalSidebar
              isMobileDrawer
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Fluid Column (100% available viewport width) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden pb-[calc(3.9rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <GlobalHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Status Banners */}
        {!isOnline && (
          <div className="no-print bg-amber-500/12 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Modo Offline:</strong> Alterações salvas localmente e sincronizadas ao reconectar.
              </span>
            </div>
            {offlinePendingCount > 0 && (
              <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
                {offlinePendingCount} na fila
              </span>
            )}
          </div>
        )}

        {offlineSyncMessage && (
          <div className="no-print bg-emerald-500/12 border-b border-emerald-500/30 text-emerald-900 dark:text-emerald-200 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{offlineSyncMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setOfflineSyncMessage(null)}
              className="px-2 py-0.5 text-xs hover:opacity-75 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {!hasConnectedAccount && accountsLoaded && (
          <div className="no-print bg-lavender-soft/80 border-b border-line px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink shrink-0">
            <span>
              <strong>Nenhuma conta Google vinculada.</strong> Conecte sua conta para sincronizar agenda e workspaces.
            </span>
            <Link
              href="/configuracoes?tab=contas"
              className="px-2.5 py-1 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-fg font-semibold text-[11px] transition-colors"
            >
              + Vincular Google
            </Link>
          </div>
        )}

        {oauthFeedback && (
          <div className="no-print bg-emerald-500/12 border-b border-emerald-500/30 px-4 py-1.5 flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200 shrink-0">
            <span>{oauthFeedback}</span>
            <button
              type="button"
              onClick={() => setOauthFeedback(null)}
              className="px-2 py-0.5 text-xs hover:opacity-75 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Module Viewport — Fluid Full Width */}
        <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-canvas">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navegação móvel"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 min-h-[60px] pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] bg-surface border-t border-line px-1.5 flex items-center justify-around z-40"
      >
        {[
          { href: "/", label: "Início", icon: LayoutDashboard },
          {
            href: "/demandas",
            label: "Demandas",
            icon: CheckSquare,
            badge: openTasksCount > 0 ? openTasksCount : undefined,
          },
          { href: "/agenda", label: "Agenda", icon: Calendar },
          { href: "/anotacoes", label: "Notas", icon: StickyNote },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-[58px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-[10px] transition-colors ${
                active ? "text-brand font-semibold" : "text-ink-muted"
              }`}
            >
              <div
                className={`relative px-2.5 py-1 rounded-[8px] ${
                  active ? "bg-lavender-soft" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-0.5 right-0 px-1 text-[9px] font-mono font-bold rounded-full bg-brand text-brand-fg leading-tight">
                    {item.badge > 99 ? "99" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`min-w-[58px] flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-[10px] transition-colors cursor-pointer ${
            isMobileMenuOpen ? "text-brand font-semibold" : "text-ink-muted"
          }`}
        >
          <div className="px-2.5 py-1 rounded-[8px]">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

      {/* Shared System Modals */}
      <ResolutionModal
        task={modalState.taskForResolution}
        isOpen={modalState.isResolutionModalOpen}
        onClose={modalState.closeResolution}
        onConfirm={modalState.confirmResolution}
      />

      <ExtendDeadlineModal
        task={modalState.taskForExtend}
        isOpen={modalState.isExtendModalOpen}
        onClose={modalState.closeExtend}
        onConfirm={modalState.confirmExtend}
      />

      <AccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={accounts}
        onRefreshAccounts={loadAccounts}
      />

      <NewTaskModal
        isOpen={modalState.isNewTaskModalOpen}
        onClose={modalState.closeNewTask}
        onTaskCreated={modalState.completeNewTaskFromModal}
        existingTasks={tasks}
        onSelectExistingTask={(task) => {
          openTaskInModule(task, "/demandas");
          modalState.closeNewTask();
        }}
        onTaskUpdated={modalState.updateTaskFromModal}
        initialText={modalState.newTaskInitialText}
        initialDate={modalState.newTaskInitialDate}
        initialDraft={modalState.newTaskInitialDraft}
        availableCategories={allCategories}
      />

      <ClassifyAccountModal
        isOpen={modalState.isClassifyModalOpen}
        email={modalState.classifyEmail}
        ticketId={modalState.classifyTicket}
        accountId={modalState.classifyAccountId}
        onClassified={modalState.handleClassified}
        onClose={modalState.closeClassify}
      />

      <CancelTaskModal
        task={modalState.taskForCancel}
        isOpen={modalState.isCancelModalOpen}
        onClose={modalState.closeCancel}
        onConfirm={async (taskId, reason) => {
          await handleCancelTask(taskId, reason);
        }}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        notes={notes}
        onSelectTask={(task) => openTaskInModule(task, "/demandas")}
        onSelectNote={(note) => {
          if (note?.id) {
            openNoteInModule(note.id);
          } else {
            router.push("/anotacoes");
          }
        }}
        onNavigate={(nav) => {
          const target = NAV_TO_ROUTE[nav] || "/";
          router.push(target);
        }}
        onOpenNewTaskModal={(prefill) =>
          openNewTaskModal({ initialText: prefill || "" })
        }
        onOpenAccountsModal={() => router.push("/configuracoes?tab=contas")}
        onToggleTheme={toggleTheme}
        onToggleSidebar={toggleSidebar}
        theme={theme}
        isSidebarCollapsed={prefs.sidebarCollapsed}
      />

      {/* Global Undo Toast */}
      <UndoToast toast={undoToast} onDismiss={() => setUndoToast(null)} />
    </div>
  );
}

