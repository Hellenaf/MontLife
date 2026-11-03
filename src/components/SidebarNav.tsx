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
  ChevronRight,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";
import { ConnectedAccount, Task, AccountType } from "@/types";

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
}: SidebarNavProps) {
  const workAcc = accounts.find((a) => a.id === "work");
  const personalAcc = accounts.find((a) => a.id === "personal");

  // Operational metrics
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const workTasksCount = tasks.filter((t) => t.account_type === "work").length;
  const personalTasksCount = tasks.filter((t) => t.account_type === "personal").length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-60 xl:w-64 h-full flex flex-col bg-[#0b0c10] border-r border-zinc-800/60 text-zinc-300 shrink-0 select-none transition-colors duration-200">
      {/* 1. Brand Logo & Title (Linear / Minimalist Style) */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-white text-xs shadow-xs">
            M
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm tracking-tight text-zinc-100 block truncate">
              MontLife
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-900/60 border border-zinc-800">
          PROD
        </span>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-4">
        {/* 2. Main Navigation Links */}
        <div className="space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Menu
          </div>

          {/* Minhas Demandas */}
          <button
            type="button"
            onClick={() => onSelectNav("tarefas")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === "tarefas" || activeNav === "inicio"
                ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate">Minhas Demandas</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {pendingTasks > 0 ? (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-700/50 text-zinc-300">
                  {pendingTasks}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500">
                  {totalTasks}
                </span>
              )}
            </div>
          </button>

          {/* Fluxo Kanban */}
          <button
            type="button"
            onClick={() => onSelectNav("kanban")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === "kanban"
                ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate">Fluxo Kanban</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-800/80">
              Board
            </span>
          </button>

          {/* Agenda do Dia */}
          <button
            type="button"
            onClick={() => onSelectNav("agenda")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === "agenda"
                ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate">Agenda do Dia</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-800/80">
              Hoje
            </span>
          </button>

          {/* Wiki Técnica */}
          <button
            type="button"
            onClick={() => onSelectNav("wiki")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === "wiki"
                ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate">Wiki Técnica</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-800/80">
              Acervo
            </span>
          </button>

          {/* Relatórios */}
          <button
            type="button"
            onClick={() => onSelectNav("relatorios")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNav === "relatorios"
                ? "bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="truncate">Relatórios</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">
              {completionPercentage}%
            </span>
          </button>
        </div>

        {/* 3. Espaços de Trabalho (Workspaces) */}
        <div className="pt-2 border-t border-zinc-800/60 space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Contextos</span>
            <Layers className="w-3 h-3 text-zinc-600" />
          </div>

          {/* Corporativo / Trabalho */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("work")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              selectedAccountFilter === "work"
                ? "bg-zinc-800/90 border-zinc-700/80 text-white shadow-xs"
                : "bg-zinc-900/30 hover:bg-zinc-900/70 border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-blue-400 shrink-0">
                <Briefcase className="w-3 h-3" />
              </div>
              <span className="text-xs truncate">Trabalho</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {workTasksCount}
            </span>
          </button>

          {/* Vida Pessoal */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("personal")}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              selectedAccountFilter === "personal"
                ? "bg-zinc-800/90 border-zinc-700/80 text-white shadow-xs"
                : "bg-zinc-900/30 hover:bg-zinc-900/70 border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-purple-400 shrink-0">
                <User className="w-3 h-3" />
              </div>
              <span className="text-xs truncate">Pessoal</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {personalTasksCount}
            </span>
          </button>
        </div>

        {/* 4. Resumo de Produtividade (Discreto e elegante) */}
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Eficiência
            </span>
            <span className="text-xs font-bold font-mono text-zinc-100">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">
            {completedTasks} de {totalTasks} demandas concluídas
          </p>
        </div>
      </div>

      {/* 5. Bottom Section: Configurações & Perfil */}
      <div className="p-2.5 border-t border-zinc-800/60 space-y-1.5 shrink-0 bg-[#090a0d]">
        {/* Botão de Configurações */}
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors group"
          title="Vincular contas e preferências"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="truncate">Configurações</span>
          </div>
          <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </button>

        {/* Perfil do Usuário */}
        <div className="px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-zinc-800/30 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-[10px] font-semibold shrink-0">
              HF
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-zinc-200 block truncate leading-tight">
                Hellen Ferreira
              </span>
              <span className="text-[10px] text-zinc-500 block truncate">
                {workAcc?.email || personalAcc?.email || "hellen@montlife.com"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Sair para a tela de login"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
