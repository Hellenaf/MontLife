"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sunrise,
  CheckSquare,
  Kanban,
  Calendar,
  StickyNote,
  BookOpen,
  Sparkles,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { MontLifeLogo } from "@/components/MontLifeLogo";
import { useWorkspace, isTaskMatchingWorkspace, isNoteMatchingWorkspace } from "@/context/WorkspaceContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface GlobalSidebarProps {
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
}

export function GlobalSidebar({
  isMobileDrawer = false,
  onCloseMobile,
}: GlobalSidebarProps) {
  const pathname = usePathname();
  const { tasks, notes, accountFilter, prefs, toggleSidebar } = useWorkspace();

  const collapsed = isMobileDrawer ? false : prefs.sidebarCollapsed;

  const scopedTasks = tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter));
  const openTasksCount = scopedTasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  ).length;
  const activeNotesCount = notes.filter(
    (n) => !n.archived && isNoteMatchingWorkspace(n, accountFilter)
  ).length;

  const groups: NavGroup[] = [
    {
      title: "WORKSPACE",
      items: [
        { href: "/", label: "Visão geral", icon: LayoutDashboard },
        { href: "/meu-dia", label: "Meu dia", icon: Sunrise },
      ],
    },
    {
      title: "ORGANIZAÇÃO",
      items: [
        {
          href: "/demandas",
          label: "Demandas",
          icon: CheckSquare,
          badge: openTasksCount > 0 ? openTasksCount : undefined,
        },
        { href: "/kanban", label: "Kanban", icon: Kanban },
        { href: "/agenda", label: "Agenda", icon: Calendar },
      ],
    },
    {
      title: "CONHECIMENTO",
      items: [
        {
          href: "/anotacoes",
          label: "Anotações",
          icon: StickyNote,
          badge: activeNotesCount > 0 ? activeNotesCount : undefined,
        },
        { href: "/wiki", label: "Wiki técnica", icon: BookOpen },
      ],
    },
    {
      title: "INTELIGÊNCIA",
      items: [
        { href: "/assistente-ia", label: "Assistente IA", icon: Sparkles },
        { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      ],
    },
    {
      title: "SISTEMA",
      items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      aria-label="Navegação principal"
      className={`no-print h-full flex flex-col bg-sidebar border-r border-line text-ink select-none shrink-0 transition-[width] duration-200 ease-out ${
        isMobileDrawer ? "w-[264px]" : collapsed ? "w-[64px]" : "w-[232px]"
      }`}
    >
      {/* Top Brand + Collapse Control */}
      <div
        className={`h-[56px] flex items-center border-b border-line shrink-0 ${
          collapsed ? "justify-center px-2" : "justify-between px-3.5"
        }`}
      >
        <Link
          href="/"
          onClick={() => onCloseMobile?.()}
          className="flex items-center gap-2.5 min-w-0 rounded-[9px] focus-visible:outline-none"
          title="MontLife — Visão geral"
        >
          <MontLifeLogo
            size="sm"
            showText={!collapsed}
            subtitle={!collapsed ? "Workspace Modular" : undefined}
          />
        </Link>

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Recolher sidebar"
              title="Recolher sidebar ([)"
              className="w-7 h-7 rounded-[8px] flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {collapsed && !isMobileDrawer && (
        <div className="pt-2.5 px-2 flex justify-center">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expandir sidebar"
            title="Expandir sidebar ([)"
            className="w-9 h-8 rounded-[9px] flex items-center justify-center text-ink-muted hover:text-brand hover:bg-lavender-soft transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-4 ${collapsed ? "px-2" : "px-2.5"}`}>
        {groups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {!collapsed ? (
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {group.title}
              </div>
            ) : (
              <div className="mx-2 my-1.5 h-px bg-line" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onCloseMobile?.()}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center rounded-[10px] text-[13px] transition-colors duration-150 ${
                    collapsed
                      ? "justify-center h-9 w-full"
                      : "justify-between px-2.5 h-9 w-full"
                  } ${
                    active
                      ? "bg-lavender-soft text-ink font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-lavender-soft/60 font-medium"
                  }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      strokeWidth={active ? 2 : 1.75}
                      className={`w-[17px] h-[17px] shrink-0 transition-colors ${
                        active
                          ? "text-brand"
                          : "text-ink-muted group-hover:text-ink"
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-mono tabular px-1.5 py-0.5 rounded-[7px] shrink-0 ${
                        active
                          ? "bg-surface text-brand font-semibold border border-line"
                          : "text-ink-muted"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}

                  {collapsed && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Subtle Footer Keyboard Hint */}
      {!collapsed && (
        <div className="px-3.5 py-2.5 border-t border-line shrink-0 flex items-center justify-between text-[11px] text-ink-muted">
          <span>Atalho rápido</span>
          <kbd className="px-1.5 py-0.5 rounded-[6px] bg-surface border border-line font-mono text-[10px] text-ink">
            Ctrl K
          </kbd>
        </div>
      )}
    </aside>
  );
}

