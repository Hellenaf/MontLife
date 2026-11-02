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
  onOpenReportModal,
  selectedAccountFilter = "all",
  onSelectAccountFilter,
  onLogout,
  completedTasksCount = 0,
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
    <aside className="w-60 xl:w-64 h-full flex flex-col bg-[#0b0a17] border-r border-[#1e1c36] text-slate-200 shrink-0 select-none transition-all duration-200">
      {/* 1. Brand Logo & Title (MontLife) */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1e1c36]/80 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-600/30">
          M
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-white">
              MontLife
            </span>
          </div>
          <p className="text-[10px] text-purple-300/70 truncate">
            Gestão & Produtividade
          </p>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* 2. Main Navigation Links */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-300/60">
            Navegação Principal
          </div>

          {/* Início */}
          <button
            type="button"
            onClick={() => onSelectNav("inicio")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeNav === "inicio"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Home className="w-4 h-4 text-purple-400" />
              <span className="truncate">Início</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
              {totalTasks}
            </span>
          </button>

          {/* Minhas Demandas */}
          <button
            type="button"
            onClick={() => onSelectNav("tarefas")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeNav === "tarefas"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span className="truncate">Minhas Demandas</span>
            </div>
            {pendingTasks > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {pendingTasks}
              </span>
            )}
          </button>

          {/* Google Agenda */}
          <button
            type="button"
            onClick={() => onSelectNav("agenda")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeNav === "agenda"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="truncate">Agenda do Dia</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
              Hoje
            </span>
          </button>

          {/* Wiki Técnica */}
          <button
            type="button"
            onClick={() => onSelectNav("wiki")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeNav === "wiki"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="truncate">Wiki Técnica</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              IA
            </span>
          </button>

          {/* Relatórios */}
          <button
            type="button"
            onClick={onOpenReportModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              <span className="truncate">Relatórios</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              100% SLA
            </span>
          </button>
        </div>

        {/* 3. Espaços de Trabalho (Workspaces) */}
        <div className="pt-2 border-t border-[#1e1c36]/60 space-y-1.5">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-300/60 flex items-center justify-between">
            <span>Espaços de Trabalho</span>
            <Layers className="w-3 h-3 text-purple-400/50" />
          </div>

          {/* Corporativo / Trabalho */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("work")}
            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${
              selectedAccountFilter === "work"
                ? "bg-blue-600/20 border-blue-500/50 text-white shadow-sm"
                : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-slate-300"
            }`}
            title="Filtrar demandas corporativas de trabalho (TOTVS, relatórios, TI)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-semibold block truncate">Trabalho</span>
                <span className="text-[9px] text-slate-400 block truncate">
                  TOTVS RM & TI
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {workTasksCount}
            </span>
          </button>

          {/* Vida Pessoal */}
          <button
            type="button"
            onClick={() => onSelectAccountFilter?.("personal")}
            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${
              selectedAccountFilter === "personal"
                ? "bg-purple-600/20 border-purple-500/50 text-white shadow-sm"
                : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-slate-300"
            }`}
            title="Filtrar tarefas pessoais e rotinas"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs font-semibold block truncate">Pessoal</span>
                <span className="text-[9px] text-slate-400 block truncate">
                  Rotinas & Estudos
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {personalTasksCount}
            </span>
          </button>

          {/* Ver Todos */}
          {selectedAccountFilter !== "all" && (
            <button
              type="button"
              onClick={() => onSelectAccountFilter?.("all")}
              className="w-full py-1 text-center text-[10px] font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            >
              ← Mostrar todos os espaços ({totalTasks})
            </button>
          )}
        </div>

        {/* 4. Saúde Operacional & Produtividade Card */}
        <div className="pt-2 border-t border-[#1e1c36]/60">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#181630] to-indigo-950/40 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded-lg bg-amber-500/20 text-[11px]">🚀</span>
                <span className="text-[11px]">Produtividade</span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px]">
                {completionPercentage}%
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-300 leading-tight">
              {completedTasks} de {totalTasks} demandas entregues no prazo!
            </p>
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Configurações logo acima do perfil de login */}
      <div className="p-3 border-t border-[#1e1c36]/80 space-y-2 shrink-0 bg-[#0d0c1b]">
        {/* Botão de Configurações (Posicionado logo acima do email de login) */}
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all shadow-xs group"
          title="Vincular Contas Google, Microsoft Reminder e Preferências"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <span className="block text-xs font-semibold text-white">Configurações</span>
            <span className="block text-[10px] text-slate-400 truncate">
              Vincular contas & preferências
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
        </button>

        {/* Perfil do Usuário com botão direto de Sair */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold border border-purple-400/40 shrink-0 shadow-sm">
              HF
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                Hellen Ferreira
              </span>
              <span className="text-[10px] text-purple-300/60 block truncate">
                {workAcc?.email || personalAcc?.email || "hellen@montlife.com"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-all shrink-0 active:scale-95"
            title="Sair para a tela de login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
