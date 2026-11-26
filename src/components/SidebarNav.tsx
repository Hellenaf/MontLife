"use client";

import React from "react";
import {
  BookOpen,
  Settings,
  Briefcase,
  User,
  BarChart3,
  LogOut,
  Calendar,
  CheckSquare,
  Layers,
  LayoutGrid,
  StickyNote,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { ConnectedAccount, Task, AccountType } from "@/types";
import { MontLifeLogo } from "@/components/MontLifeLogo";

interface SidebarNavProps {
  accounts: ConnectedAccount[];
  tasks?: Task[];
  activeNav: string;
  onSelectNav: (nav: string) => void;
  onOpenAccountsModal: () => void;
  onOpenReportModal: () => void;
  selectedAccountFilter?: "all" | AccountType;
  onSelectAccountFilter?: (filter: "all" | AccountType) => void;
  onLogout?: () => void;
  completedTasksCount?: number;
  notesCount?: number;
  currentUser?: {
    userId: string;
    email: string;
    name: string;
    picture?: string;
  } | null;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({
  accounts,
  tasks = [],
  activeNav,
  onSelectNav,
  onOpenAccountsModal,
  selectedAccountFilter = "all",
  onSelectAccountFilter,
  onLogout,
  notesCount = 0,
  currentUser,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarNavProps) {
  const displayName = currentUser?.name || "Usuário MontLife";
  const safeAccountsList = Array.isArray(accounts)
    ? accounts.filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
    : [];
  const displayEmail =
    currentUser?.email ||
    safeAccountsList.find((a) => typeof a.email === "string" && a.email)?.email ||
    "usuario@montlife.com";

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "ML";

  // Operational metrics
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  ).length;
  const completedList = tasks.filter((t) => t.status === "COMPLETED");
  const completedTasks = completedList.length;
  const slaOnTimeCount = completedList.filter(
    (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
  ).length;
  const slaOnTimePct =
    completedTasks > 0 ? Math.round((slaOnTimeCount / completedTasks) * 100) : 100;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const isWorkTask = (t: Task): boolean => {
    if (t.transferred_to === "personal") return false;
    if (
      t.manually_assigned &&
      (t.account_type === "personal" || t.account_type === "Pessoal")
    )
      return false;
    return true;
  };

  const isPersonalTask = (t: Task): boolean => !isWorkTask(t);

  const isTaskInWorkspace = (
    t: Task,
    accId: string,
    label: string,
    email?: string
  ) => {
    const fId = (accId || "").toLowerCase();
    const fLabel = (label || "").toLowerCase();
    const fEmail = (email || "").toLowerCase();

    if (
      fId.includes("work") ||
      fLabel.includes("trab") ||
      fEmail.includes("notredame") ||
      fEmail.includes("haferreira")
    ) {
      return isWorkTask(t);
    }

    if (
      fId.includes("person") ||
      fLabel.includes("pess") ||
      fEmail.includes("hellen")
    ) {
      return isPersonalTask(t);
    }

    const tEmail = (t.account_email || "").toLowerCase().trim();
    const tType = (t.account_type || "").toLowerCase().trim();
    if (email && tEmail === fEmail) return true;
    if (tType === fId || tType === fLabel) return true;

    return false;
  };

  const dynamicWorkspaces = React.useMemo(() => {
    const list: { id: string; label: string; email?: string; count: number }[] = [];
    const seen = new Set<string>();

    const safeList = Array.isArray(accounts)
      ? accounts.filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
      : [];
    const connected = safeList.filter(
      (a) =>
        Boolean(a.is_connected || a.access_token || a.refresh_token) &&
        typeof a.email === "string" &&
        a.email
    );

    for (const acc of connected) {
      const accId = typeof acc.id === "string" ? acc.id.toLowerCase() : "";
      const accLabel = typeof acc.label === "string" ? acc.label.toLowerCase() : "";
      const accEmail = typeof acc.email === "string" ? acc.email.toLowerCase() : "";

      const isWork =
        accId.includes("work") ||
        accLabel.includes("trab") ||
        accEmail.includes("notredame");
      const isPersonal =
        accId.includes("personal") ||
        accLabel.includes("pess") ||
        accEmail.includes("hellen");
      const isHellenUser =
        currentUser?.email?.toLowerCase().includes("hellen") ||
        currentUser?.email?.toLowerCase().includes("notredame");
      const defaultWorkLabel = isHellenUser ? "Trabalho (Notre Dame)" : "Trabalho";
      const standardId = isWork
        ? "work"
        : isPersonal
        ? "personal"
        : acc.id || accEmail || "geral";
      const lbl =
        typeof acc.label === "string" && acc.label.trim()
          ? acc.label.trim()
          : isWork
          ? defaultWorkLabel
          : isPersonal
          ? "Pessoal"
          : "Geral";

      if (!seen.has(standardId)) {
        seen.add(standardId);
        const count = tasks.filter((t) =>
          isTaskInWorkspace(t, acc.id, lbl, acc.email)
        ).length;
        list.push({ id: standardId, label: lbl, email: acc.email, count });
      }
    }

    if (list.length === 0) {
      const isHellenUser =
        currentUser?.email?.toLowerCase().includes("hellen") ||
        currentUser?.email?.toLowerCase().includes("notredame");
      const workLabel = isHellenUser ? "Trabalho (Notre Dame)" : "Trabalho";
      const workEmail = isHellenUser
        ? "haferreira@notredamecampinas.net.br"
        : currentUser?.email || undefined;
      const personalEmail = isHellenUser
        ? "hellenalvesferreira.s2@gmail.com"
        : currentUser?.email || undefined;
      const workCount = tasks.filter((t) =>
        isTaskInWorkspace(t, "work", workLabel, workEmail)
      ).length;
      const personalCount = tasks.filter((t) =>
        isTaskInWorkspace(t, "personal", "Pessoal", personalEmail)
      ).length;
      return [
        { id: "work", label: workLabel, count: workCount },
        { id: "personal", label: "Pessoal", count: personalCount },
      ];
    }

    return list;
  }, [accounts, tasks, currentUser?.email]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const navItems: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeAccent?: boolean;
    isActive: boolean;
    tooltip: string;
  }[] = [
    {
      id: "tarefas",
      label: "Minhas Demandas",
      icon: CheckSquare,
      badge: pendingTasks > 0 ? pendingTasks : totalTasks > 0 ? totalTasks : undefined,
      badgeAccent: pendingTasks > 0,
      isActive: activeNav === "tarefas" || activeNav === "inicio",
      tooltip: `Minhas Demandas (${pendingTasks} abertas)`,
    },
    {
      id: "kanban",
      label: "Fluxo Kanban",
      icon: LayoutGrid,
      isActive: activeNav === "kanban",
      tooltip: "Fluxo Kanban",
    },
    {
      id: "agenda",
      label: "Agenda do Dia",
      icon: Calendar,
      isActive: activeNav === "agenda",
      tooltip: "Agenda do Dia",
    },
    {
      id: "notas",
      label: "Anotações",
      icon: StickyNote,
      badge: notesCount > 0 ? notesCount : undefined,
      isActive: activeNav === "notas",
      tooltip: `Anotações (${notesCount})`,
    },
    {
      id: "wiki",
      label: "Wiki Técnica",
      icon: BookOpen,
      isActive: activeNav === "wiki",
      tooltip: "Wiki Técnica",
    },
    {
      id: "relatorios",
      label: "Relatórios",
      icon: BarChart3,
      badge: completedTasks > 0 ? `${slaOnTimePct}%` : undefined,
      isActive: activeNav === "relatorios",
      tooltip: `Relatórios (${slaOnTimePct}% SLA)`,
    },
  ];

  return (
    <aside
      className={`h-full flex flex-col bg-[#ECE9E1] dark:bg-[#191F2C] border-r border-[#DCD7CC] dark:border-[#2E384D] text-slate-700 dark:text-slate-300 shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? "w-[68px]" : "w-full lg:w-[232px] xl:w-[244px]"
      }`}
    >
      {/* 1. Brand Bar (Exact h-14 alignment with Top Header) */}
      <div
        className={`h-14 flex items-center border-b border-[#DCD7CC]/75 dark:border-[#2E384D] shrink-0 ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => isCollapsed && onToggleCollapse?.()}
            className={isCollapsed ? "cursor-pointer" : "cursor-default"}
            title={isCollapsed ? "Expandir menu lateral ([)" : "MontLife"}
          >
            <MontLifeLogo size="sm" />
          </button>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-zinc-100 block leading-none">
                MontLife
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 block mt-0.5 truncate">
                Workspace Operacional
              </span>
            </div>
          )}
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#DDD8CD]/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          onToggleCollapse &&
          !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-[#DDD8CD]/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
              title="Recolher menu lateral ([)"
              aria-label="Recolher menu lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {isCollapsed && onToggleCollapse && (
        <div className="px-2 pt-2.5 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-9 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-[#DDD8CD]/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Expandir menu lateral ([)"
            aria-label="Expandir menu lateral"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scrollable Navigation */}
      <div
        className={`flex-1 overflow-y-auto space-y-5 ${
          isCollapsed ? "px-2 py-3" : "px-3 py-3.5"
        }`}
      >
        {/* 2. Primary Views */}
        <div className="space-y-0.5">
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Menu
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                title={isCollapsed ? item.tooltip : undefined}
                className={`group relative w-full flex items-center rounded-lg text-[13px] transition-all cursor-pointer ${
                  isCollapsed
                    ? "justify-center h-9"
                    : "justify-between px-2.5 h-9"
                } ${
                  item.isActive
                    ? "bg-[#E2DED4]/85 dark:bg-white/[0.08] text-slate-950 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-[#DDD8CD]/45 dark:hover:bg-white/[0.04] font-medium"
                }`}
              >
                {/* Crisp left accent bar for active route */}
                {item.isActive && !isCollapsed && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                )}

                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      item.isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                      item.isActive
                        ? "bg-[#F7F6F1]/90 dark:bg-white/10 text-indigo-700 dark:text-indigo-300 font-semibold"
                        : item.badgeAccent
                        ? "text-slate-600 dark:text-zinc-300 font-semibold"
                        : "text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isCollapsed && item.id === "tarefas" && pendingTasks > 0 && (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingTasks > 99 ? "99" : pendingTasks}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Workspaces Section */}
        <div className="pt-4 border-t border-[#DCD7CC]/70 dark:border-[#2E384D] space-y-0.5">
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Espaços
              </span>
              <button
                type="button"
                onClick={onOpenAccountsModal}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                title="Gerenciar contas vinculadas"
              >
                <Plus className="w-3 h-3" />
                <span>Conta</span>
              </button>
            </div>
          )}

          {/* Todos */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("all")}
            title={`Todos os espaços (${totalTasks})`}
            className={`w-full flex items-center rounded-lg text-[13px] transition-all cursor-pointer ${
              isCollapsed ? "justify-center h-9" : "justify-between px-2.5 h-8"
            } ${
              selectedAccountFilter === "all"
                ? "bg-[#E2DED4]/85 dark:bg-white/[0.08] text-slate-950 dark:text-white font-semibold"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-[#DDD8CD]/45 dark:hover:bg-white/[0.04] font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Layers
                className={`w-3.5 h-3.5 shrink-0 ${
                  selectedAccountFilter === "all"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 dark:text-zinc-500"
                }`}
              />
              {!isCollapsed && <span className="truncate">Todos os espaços</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-zinc-500">
                {totalTasks}
              </span>
            )}
          </button>

          {dynamicWorkspaces.map((ws) => {
            const isSelected =
              selectedAccountFilter.toLowerCase() === ws.id.toLowerCase() ||
              (ws.id === "work" &&
                (selectedAccountFilter.toLowerCase().includes("trab") ||
                  selectedAccountFilter.toLowerCase().includes("work") ||
                  selectedAccountFilter.toLowerCase().includes("notre"))) ||
              (ws.id === "personal" &&
                (selectedAccountFilter.toLowerCase().includes("pess") ||
                  selectedAccountFilter.toLowerCase().includes("person") ||
                  selectedAccountFilter.toLowerCase().includes("hellen")));
            const isWorkWs =
              ws.id === "work" || ws.label.toLowerCase().includes("trab");

            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectAccountFilter?.(ws.id as AccountType)}
                title={`${ws.label} (${ws.count})${ws.email ? ` • ${ws.email}` : ""}`}
                className={`w-full flex items-center rounded-lg text-[13px] transition-all cursor-pointer ${
                  isCollapsed ? "justify-center h-9" : "justify-between px-2.5 h-8"
                } ${
                  isSelected
                    ? "bg-[#E2DED4]/85 dark:bg-white/[0.08] text-slate-950 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-[#DDD8CD]/45 dark:hover:bg-white/[0.04] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCollapsed ? (
                    isWorkWs ? (
                      <Briefcase
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-zinc-500"
                        }`}
                      />
                    ) : (
                      <User
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-slate-400 dark:text-zinc-500"
                        }`}
                      />
                    )
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isWorkWs ? "bg-blue-500" : "bg-violet-500"
                      }`}
                    />
                  )}
                  {!isCollapsed && <span className="truncate">{ws.label}</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-zinc-500 shrink-0">
                    {ws.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Whisper-Quiet Productivity Meter */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-[#DCD7CC]/70 dark:border-[#2E384D] px-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-500 dark:text-zinc-400">
                Taxa de conclusão
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums">
              {completedTasks} de {totalTasks} demandas entregues
            </p>
          </div>
        )}
      </div>

      {/* 5. Minimal Executive Footer */}
      <div
        className={`pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[#DCD7CC]/75 dark:border-[#2E384D] shrink-0 space-y-1.5 ${
          isCollapsed ? "p-2 flex flex-col items-center" : "p-3"
        }`}
      >
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className={`w-full flex items-center rounded-lg text-[13px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-[#DDD8CD]/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer ${
            isCollapsed ? "justify-center h-9" : "gap-2.5 px-2.5 h-8"
          }`}
          title="Configurações & Contas Google"
        >
          <Settings className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
          {!isCollapsed && <span className="truncate">Configurações</span>}
        </button>

        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1 w-full">
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={displayName}
                title={`${displayName} (${displayEmail})`}
                className="w-7 h-7 rounded-full border border-[#DCD7CC] dark:border-white/10 object-cover"
              />
            ) : (
              <div
                title={`${displayName} (${displayEmail})`}
                className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold"
              >
                {userInitials}
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {}
                handleLogout();
              }}
              className="w-9 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[#DDD8CD]/40 dark:hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={displayName}
                  className="w-7 h-7 rounded-full border border-[#DCD7CC] dark:border-white/10 shrink-0 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 block truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block truncate leading-tight mt-0.5">
                  {displayEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {}
                handleLogout();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
