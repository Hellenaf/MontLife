"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CheckSquare,
  Sunrise,
  StickyNote,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  Layers,
  Briefcase,
  User,
  Search,
} from "lucide-react";
import { ConnectedAccount, Task, AccountType } from "@/types";
import { MontLifeLogo } from "@/components/MontLifeLogo";
import { useTheme } from "@/context/ThemeContext";

interface CommandRailProps {
  accounts: ConnectedAccount[];
  tasks: Task[];
  activeNav: string;
  onSelectNav: (nav: string) => void;
  selectedAccountFilter: "all" | AccountType;
  onSelectAccountFilter: (filter: "all" | AccountType) => void;
  onOpenAccountsModal: () => void;
  onOpenCommandPalette: () => void;
  onToggleMetricsDrawer: () => void;
  isMetricsOpen: boolean;
  onLogout: () => void;
  notesCount: number;
  currentUser?: {
    userId: string;
    email: string;
    name: string;
    picture?: string;
  } | null;
}

export function CommandRail({
  accounts,
  tasks,
  activeNav,
  onSelectNav,
  selectedAccountFilter,
  onSelectAccountFilter,
  onOpenAccountsModal,
  onOpenCommandPalette,
  onToggleMetricsDrawer,
  isMetricsOpen,
  onLogout,
  notesCount,
  currentUser,
}: CommandRailProps) {
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isProfileOpen]);

  const openTasksCount = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  ).length;

  const connectedAccountsCount = accounts.filter(
    (a) => a && Boolean(a.is_connected || a.access_token || a.refresh_token) && Boolean(a.email)
  ).length;

  const displayName = currentUser?.name || "Usuário MontLife";
  const displayEmail =
    currentUser?.email ||
    accounts.find((a) => typeof a.email === "string" && a.email)?.email ||
    "usuario@montlife.com";

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "ML";

  const isExecActive =
    activeNav === "tarefas" ||
    activeNav === "inicio" ||
    activeNav === "kanban" ||
    activeNav === "agenda";

  const navButtons = [
    {
      id: "tarefas",
      label: "Execução (Lista · Kanban · Agenda)",
      shortLabel: "Execução",
      icon: CheckSquare,
      isActive: isExecActive,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
    },
    {
      id: "hoje",
      label: "Meu Dia (Cockpit de Foco)",
      shortLabel: "Meu Dia",
      icon: Sunrise,
      isActive: activeNav === "hoje",
    },
    {
      id: "notas",
      label: "Anotações Rápidas & IA",
      shortLabel: "Notas",
      icon: StickyNote,
      isActive: activeNav === "notas",
      badge: notesCount > 0 ? notesCount : undefined,
    },
    {
      id: "wiki",
      label: "Wiki Técnica",
      shortLabel: "Wiki",
      icon: BookOpen,
      isActive: activeNav === "wiki",
    },
    {
      id: "relatorios",
      label: "Relatórios & SLA",
      shortLabel: "Relatórios",
      icon: BarChart3,
      isActive: activeNav === "relatorios",
    },
  ];

  const isWorkFilter =
    selectedAccountFilter === "work" ||
    selectedAccountFilter.toLowerCase().includes("trab") ||
    selectedAccountFilter.toLowerCase().includes("notre");
  const isPersonalFilter =
    selectedAccountFilter === "personal" ||
    selectedAccountFilter.toLowerCase().includes("pess") ||
    selectedAccountFilter.toLowerCase().includes("hellen");

  return (
    <aside className="hidden lg:flex flex-col items-center justify-between w-[66px] h-full py-3 bg-[#EFECE4] dark:bg-[#1B2130] border-r border-[#DCD6CA] dark:border-[#2E384D] shrink-0 select-none z-30 transition-colors duration-200">
      {/* Top: Brand + Primary Navigation Icons */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          type="button"
          onClick={() => onSelectNav("tarefas")}
          className="p-1 rounded-xl hover:bg-[#E3DFD5] dark:hover:bg-[#273043] transition-colors cursor-pointer"
          title="MontLife — Quadro de Execução"
        >
          <MontLifeLogo size="sm" />
        </button>

        {/* Quick Command Search Icon */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-10 h-9 rounded-xl bg-[#E7E3DA] dark:bg-[#232B3C] hover:bg-[#DDD8CD] dark:hover:bg-[#2D374D] border border-[#D8D2C6] dark:border-[#323D54] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          title="Busca global e comandos (Ctrl+K)"
          aria-label="Busca global (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-[#DCD6CA] dark:bg-[#2E384D]" />

        {/* Primary Icon Navigation */}
        <nav className="flex flex-col items-center gap-1.5 w-full" aria-label="Navegação principal">
          {navButtons.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  item.isActive
                    ? "bg-[#4B55D6] dark:bg-[#6673F5] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#E4E0D6] dark:hover:bg-[#273043]"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-[#EFECE4] dark:ring-[#1B2130] ${
                      item.isActive
                        ? "bg-[#FCFBF7] text-[#4B55D6]"
                        : "bg-[#4B55D6] dark:bg-[#6673F5] text-white"
                    }`}
                  >
                    {item.badge > 99 ? "99" : item.badge}
                  </span>
                )}

                {/* Crisp Hover Tooltip */}
                <span className="pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 absolute left-[56px] z-50 px-2.5 py-1.5 rounded-lg bg-[#1E2330] dark:bg-[#2D374D] text-[#F6F4EE] text-[11px] font-medium whitespace-nowrap shadow-popover border border-white/10">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="w-6 h-px bg-[#DCD6CA] dark:bg-[#2E384D] my-0.5" />

        {/* Quick 1-Click Workspace Filter Dots */}
        <div className="flex flex-col items-center gap-1 w-full">
          {[
            {
              id: "all" as const,
              label: "Todos os Espaços",
              active: selectedAccountFilter === "all",
              icon: Layers,
              dotClass: "bg-indigo-500",
            },
            {
              id: "work" as const,
              label: "Espaço Trabalho",
              active: isWorkFilter,
              icon: Briefcase,
              dotClass: "bg-blue-500",
            },
            {
              id: "personal" as const,
              label: "Espaço Pessoal",
              active: isPersonalFilter,
              icon: User,
              dotClass: "bg-violet-500",
            },
          ].map((ws) => {
            const WsIcon = ws.icon;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectAccountFilter(ws.id)}
                title={ws.label}
                aria-label={ws.label}
                className={`group relative w-10 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  ws.active
                    ? "bg-[#FCFBF7] dark:bg-[#2B354B] text-slate-900 dark:text-white border border-[#D4CEC0] dark:border-[#3D4B68] shadow-xs-subtle"
                    : "text-slate-500 dark:text-slate-400 hover:bg-[#E4E0D6] dark:hover:bg-[#273043]"
                }`}
              >
                <WsIcon className="w-3.5 h-3.5" />
                {ws.active && (
                  <span
                    className={`absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full ${ws.dotClass}`}
                  />
                )}
                <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-[52px] z-50 px-2.5 py-1 rounded-lg bg-[#1E2330] dark:bg-[#2D374D] text-[#F6F4EE] text-[11px] font-medium whitespace-nowrap shadow-popover border border-white/10">
                  {ws.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Utility Cluster */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        {/* Metrics & AI Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleMetricsDrawer}
          title="Métricas & Briefing IA"
          aria-label="Métricas e Briefing IA"
          className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isMetricsOpen
              ? "bg-indigo-500/15 text-[#4B55D6] dark:text-[#8692FF] border border-indigo-400/40"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#E4E0D6] dark:hover:bg-[#273043]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-[54px] z-50 px-2.5 py-1 rounded-lg bg-[#1E2330] dark:bg-[#2D374D] text-[#F6F4EE] text-[11px] font-medium whitespace-nowrap shadow-popover border border-white/10">
            Métricas & Briefing IA
          </span>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          aria-label="Alternar tema"
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#E4E0D6] dark:hover:bg-[#273043] transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-[54px] z-50 px-2.5 py-1 rounded-lg bg-[#1E2330] dark:bg-[#2D374D] text-[#F6F4EE] text-[11px] font-medium whitespace-nowrap shadow-popover border border-white/10">
            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
          </span>
        </button>

        {/* Settings / Google Accounts */}
        <button
          type="button"
          onClick={onOpenAccountsModal}
          title={`Contas Google & Configurações (${connectedAccountsCount} conectada${connectedAccountsCount === 1 ? "" : "s"})`}
          aria-label="Configurações e contas Google"
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#E4E0D6] dark:hover:bg-[#273043] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span
            className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-[#EFECE4] dark:ring-[#1B2130] ${
              connectedAccountsCount > 0 ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-[54px] z-50 px-2.5 py-1 rounded-lg bg-[#1E2330] dark:bg-[#2D374D] text-[#F6F4EE] text-[11px] font-medium whitespace-nowrap shadow-popover border border-white/10">
            Configurações & Google
          </span>
        </button>

        {/* User Avatar + Popover */}
        <div ref={profileRef} className="relative pt-1">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            title={`${displayName} (${displayEmail})`}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#DCD6CA] dark:border-[#37435C] hover:border-[#4B55D6] dark:hover:border-[#7380FF] transition-colors cursor-pointer flex items-center justify-center bg-[#4B55D6] text-white text-xs font-bold"
          >
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              userInitials
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute left-[54px] bottom-0 z-50 w-64 rounded-2xl bg-[#FCFBF7] dark:bg-[#252E40] border border-[#DCD6CA] dark:border-[#36425A] shadow-popover p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E5E0D6] dark:border-[#323D54]">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#4B55D6] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {currentUser?.picture ? (
                    <img
                      src={currentUser.picture}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {displayEmail}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onOpenAccountsModal();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[#EFECE4] dark:hover:bg-[#2F3A50] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Gerenciar contas Google
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {connectedAccountsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsProfileOpen(false);
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch {}
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

