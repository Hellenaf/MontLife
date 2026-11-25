"use client";

import React from "react";
import {
  Home,
  BookOpen,
  Settings,
  Briefcase,
  User,
  BarChart3,
  LogOut,
  Calendar,
  CheckSquare,
  Sparkles,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  StickyNote,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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
  onOpenReportModal,
  selectedAccountFilter = "all",
  onSelectAccountFilter,
  onLogout,
  completedTasksCount = 0,
  notesCount = 0,
  currentUser,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarNavProps) {
  // Display user information
  const displayName = currentUser?.name || "Usuário MontLife";
  const safeAccountsList = Array.isArray(accounts) ? accounts.filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object")) : [];
  const displayEmail =
    currentUser?.email ||
    safeAccountsList.find((a) => typeof a.email === "string" && a.email)?.email ||
    "usuario@montlife.com";

  const userInitials = displayName
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

  // Helper to identify Work vs Personal with strict mutual exclusion
  const isWorkTask = (t: Task): boolean => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  const isPersonalTask = (t: Task): boolean => {
    return !isWorkTask(t);
  };

  // Helper to match task against workspace
  const isTaskInWorkspace = (t: Task, accId: string, label: string, email?: string) => {
    const fId = (accId || "").toLowerCase();
    const fLabel = (label || "").toLowerCase();
    const fEmail = (email || "").toLowerCase();

    // If Trabalho / Work
    if (fId.includes("work") || fLabel.includes("trab") || fEmail.includes("notredame") || fEmail.includes("haferreira")) {
      return isWorkTask(t);
    }

    // If Pessoal / Personal
    if (fId.includes("person") || fLabel.includes("pess") || fEmail.includes("hellen")) {
      return isPersonalTask(t);
    }

    const tEmail = (t.account_email || "").toLowerCase().trim();
    const tType = (t.account_type || "").toLowerCase().trim();
    if (email && tEmail === fEmail) return true;
    if (tType === fId || tType === fLabel) return true;

    return false;
  };

  // Derive dynamic list of workspaces from connected accounts
  const dynamicWorkspaces = React.useMemo(() => {
    const list: { id: string; label: string; email?: string; count: number }[] = [];
    const seen = new Set<string>();

    const safeList = Array.isArray(accounts)
      ? accounts.filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
      : [];
    const connected = safeList.filter((a) => Boolean(a.is_connected || a.access_token || a.refresh_token) && typeof a.email === "string" && a.email);

    for (const acc of connected) {
      const accId = typeof acc.id === "string" ? acc.id.toLowerCase() : "";
      const accLabel = typeof acc.label === "string" ? acc.label.toLowerCase() : "";
      const accEmail = typeof acc.email === "string" ? acc.email.toLowerCase() : "";

      const isWork = accId.includes("work") || accLabel.includes("trab") || accEmail.includes("notredame");
      const isPersonal = accId.includes("personal") || accLabel.includes("pess") || accEmail.includes("hellen");
      const isHellenUser = currentUser?.email?.toLowerCase().includes("hellen") || currentUser?.email?.toLowerCase().includes("notredame");
      const defaultWorkLabel = isHellenUser ? "Trabalho (Notre Dame)" : "Trabalho";
      const standardId = isWork ? "work" : isPersonal ? "personal" : (acc.id || accEmail || "geral");
      const lbl = typeof acc.label === "string" && acc.label.trim()
        ? acc.label.trim()
        : (isWork ? defaultWorkLabel : isPersonal ? "Pessoal" : "Geral");

      if (!seen.has(standardId)) {
        seen.add(standardId);
        const count = tasks.filter((t) => isTaskInWorkspace(t, acc.id, lbl, acc.email)).length;
        list.push({ id: standardId, label: lbl, email: acc.email, count });
      }
    }

    if (list.length === 0) {
      const isHellenUser = currentUser?.email?.toLowerCase().includes("hellen") || currentUser?.email?.toLowerCase().includes("notredame");
      const workLabel = isHellenUser ? "Trabalho (Notre Dame)" : "Trabalho";
      const workEmail = isHellenUser ? "haferreira@notredamecampinas.net.br" : (currentUser?.email || undefined);
      const personalEmail = isHellenUser ? "hellenalvesferreira.s2@gmail.com" : (currentUser?.email || undefined);
      const workCount = tasks.filter((t) => isTaskInWorkspace(t, "work", workLabel, workEmail)).length;
      const personalCount = tasks.filter((t) => isTaskInWorkspace(t, "personal", "Pessoal", personalEmail)).length;
      return [
        { id: "work", label: workLabel, count: workCount },
        { id: "personal", label: "Pessoal", count: personalCount },
      ];
    }

    return list;
  }, [accounts, tasks]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      className={`h-full flex flex-col bg-white dark:bg-[#0b0a17] border-r border-slate-200/90 dark:border-[#1e1c36] text-slate-700 dark:text-slate-200 shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? "w-[72px]" : "w-full lg:w-[236px] xl:w-[248px]"
      }`}
    >
      {/* 1. Brand Logo & Title (MontLife) + Collapse Toggle */}
      <div
        className={`h-16 flex items-center border-b border-slate-200/80 dark:border-[#1e1c36]/80 shrink-0 ${
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
            <MontLifeLogo size="md" />
          </button>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight">
                MontLife
              </span>
              <p className="text-[11px] text-indigo-600/80 dark:text-purple-300/70 truncate">
                Gestão & Produtividade
              </p>
            </div>
          )}
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          onToggleCollapse &&
          !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Recolher menu lateral ([)"
              aria-label="Recolher menu lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && onToggleCollapse && (
        <div className="px-2 pt-2.5 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-10 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Expandir menu lateral ([)"
            aria-label="Expandir menu lateral"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scrollable Body */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-4 ${isCollapsed ? "p-2" : "p-3"}`}>
        {/* 2. Main Navigation Links */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-purple-300/60">
              Navegação
            </div>
          )}

          {/* Minhas Demandas (Opção Principal) */}
          <button
            type="button"
            onClick={() => onSelectNav("tarefas")}
            title={isCollapsed ? `Minhas Demandas (${pendingTasks} abertas)` : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "tarefas" || activeNav === "inicio"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckSquare
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "tarefas" || activeNav === "inicio"
                    ? "text-white"
                    : "text-indigo-500 dark:text-blue-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Minhas Demandas</span>}
            </div>
            {!isCollapsed ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {pendingTasks > 0 ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      activeNav === "tarefas" || activeNav === "inicio"
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-500/30"
                    }`}
                  >
                    {pendingTasks}
                  </span>
                ) : (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 font-mono">
                    {totalTasks}
                  </span>
                )}
              </div>
            ) : (
              pendingTasks > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingTasks}
                </span>
              )
            )}
          </button>

          {/* Fluxo Kanban */}
          <button
            type="button"
            onClick={() => onSelectNav("kanban")}
            title={isCollapsed ? "Fluxo Kanban" : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "kanban"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <LayoutGrid
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "kanban" ? "text-white" : "text-purple-500 dark:text-purple-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Fluxo Kanban</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  activeNav === "kanban"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-purple-500/20 text-slate-600 dark:text-purple-300"
                }`}
              >
                Board
              </span>
            )}
          </button>

          {/* Agenda do Dia */}
          <button
            type="button"
            onClick={() => onSelectNav("agenda")}
            title={isCollapsed ? "Agenda do Dia" : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "agenda"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "agenda" ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Agenda do Dia</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  activeNav === "agenda"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                Hoje
              </span>
            )}
          </button>

          {/* Bloco de Notas */}
          <button
            type="button"
            onClick={() => onSelectNav("notas")}
            title={isCollapsed ? `Bloco de Notas (${notesCount})` : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "notas"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <StickyNote
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "notas" ? "text-white" : "text-amber-500 dark:text-amber-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Bloco de Notas</span>}
            </div>
            {!isCollapsed &&
              (notesCount > 0 ? (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    activeNav === "notas"
                      ? "bg-white/20 text-white"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30"
                  }`}
                >
                  {notesCount}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                    activeNav === "notas"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-purple-500/20 text-slate-600 dark:text-purple-300"
                  }`}
                >
                  IA
                </span>
              ))}
          </button>

          {/* Wiki Técnica */}
          <button
            type="button"
            onClick={() => onSelectNav("wiki")}
            title={isCollapsed ? "Wiki Técnica" : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "wiki"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "wiki" ? "text-white" : "text-sky-600 dark:text-sky-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Wiki Técnica</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  activeNav === "wiki"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-purple-500/20 text-slate-600 dark:text-purple-300"
                }`}
              >
                IA
              </span>
            )}
          </button>

          {/* Relatórios */}
          <button
            type="button"
            onClick={() => onSelectNav("relatorios")}
            title={isCollapsed ? `Relatórios (${slaOnTimePct}% SLA)` : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
            } ${
              activeNav === "relatorios"
                ? "bg-indigo-600 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BarChart3
                className={`w-4 h-4 shrink-0 ${
                  activeNav === "relatorios" ? "text-white" : "text-rose-500 dark:text-rose-400"
                }`}
              />
              {!isCollapsed && <span className="truncate">Relatórios</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[11px] font-mono font-bold ${
                  activeNav === "relatorios"
                    ? "text-white"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {slaOnTimePct}%
              </span>
            )}
          </button>
        </div>

        {/* 3. Espaços de Trabalho (Workspaces Dinâmicos com "Todos" em primeiro) */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-[#1e1c36]/60 space-y-1.5">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-purple-300/60 flex items-center justify-between">
              <span>Espaços</span>
              <button
                type="button"
                onClick={onOpenAccountsModal}
                className="text-[11px] font-semibold normal-case tracking-normal text-indigo-600 dark:text-purple-400 hover:underline transition-colors cursor-pointer"
                title="Gerenciar Contas"
              >
                + Vincular
              </button>
            </div>
          )}

          {/* Opção 1: Todos os Espaços */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("all")}
            className={`w-full flex items-center rounded-xl border transition-all text-left cursor-pointer ${
              isCollapsed ? "justify-center p-2" : "justify-between p-2"
            } ${
              selectedAccountFilter === "all"
                ? "bg-indigo-50 dark:bg-purple-600/25 border-indigo-300 dark:border-purple-500/60 text-indigo-950 dark:text-white shadow-2xs"
                : "bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-300"
            }`}
            title={`Todos os espaços (${totalTasks})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && (
                <div className="text-left min-w-0">
                  <span className="text-xs font-semibold block truncate">Todos</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    Visão Consolidada
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-indigo-100/80 dark:bg-purple-500/20 text-indigo-700 dark:text-purple-300">
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
            const isWorkWs = ws.label.toLowerCase().includes("trab");
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectAccountFilter?.(ws.id as any)}
                className={`w-full flex items-center rounded-xl border transition-all text-left cursor-pointer ${
                  isCollapsed ? "justify-center p-2" : "justify-between p-2"
                } ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-purple-600/25 border-indigo-300 dark:border-purple-500/60 text-indigo-950 dark:text-white shadow-2xs"
                    : "bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-300"
                }`}
                title={`${ws.label} (${ws.count})${ws.email ? ` • ${ws.email}` : ""}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isWorkWs
                        ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        : "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {isWorkWs ? (
                      <Briefcase className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="text-left min-w-0">
                      <span className="text-xs font-semibold block truncate">{ws.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {ws.email || "Workspace"}
                      </span>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-purple-500/20 text-slate-700 dark:text-purple-300">
                    {ws.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Saúde Operacional & Produtividade Card (Only in expanded mode) */}
        {!isCollapsed && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-[#1e1c36]/60">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/60 dark:from-purple-950/40 dark:via-[#181630] dark:to-indigo-950/40 border border-indigo-200/70 dark:border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                  <span className="text-xs">Produtividade</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs tabular-nums">
                  {completionPercentage}%
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                {completedTasks} de {totalTasks} demandas concluídas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Section: Configurações + Perfil */}
      <div
        className={`pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200/80 dark:border-[#1e1c36]/80 space-y-2 shrink-0 bg-slate-50/80 dark:bg-[#0d0c1b] ${
          isCollapsed ? "p-2 flex flex-col items-center" : "p-3"
        }`}
      >
        {/* Botão de Configurações */}
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className={`w-full flex items-center rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/5 transition-all shadow-2xs group cursor-pointer ${
            isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
          }`}
          title="Configurações & Contas Google"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-purple-500/20 flex items-center justify-center text-indigo-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <>
              <div className="text-left min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Configurações
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Contas & preferências
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </>
          )}
        </button>

        {/* Perfil do Usuário com botão direto de Sair */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1 w-full">
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={displayName}
                title={`${displayName} (${displayEmail})`}
                className="w-8 h-8 rounded-full border border-indigo-300 dark:border-purple-400/40 shadow-xs object-cover"
              />
            ) : (
              <div
                title={`${displayName} (${displayEmail})`}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-xs"
              >
                {userInitials}
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch (e) {
                  console.warn("Logout error:", e);
                }
                handleLogout();
              }}
              className="w-10 h-9 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="Sair para a tela de login"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={displayName}
                  className="w-8 h-8 rounded-full border border-indigo-200 dark:border-purple-400/40 shrink-0 shadow-xs object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {displayName}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-purple-300/60 block truncate">
                  {displayEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch (e) {
                  console.warn("Logout error:", e);
                }
                handleLogout();
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-200 dark:border-rose-500/20 hover:border-rose-500 transition-all shrink-0 active:scale-95 cursor-pointer"
              title="Sair para a tela de login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
