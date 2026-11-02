"use client";

import React from "react";
import {
  Home,
  BookOpen,
  Award,
  Settings,
  Briefcase,
  User,
  TrendingUp,
  ChevronDown,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { ConnectedAccount } from "@/types";

interface SidebarNavProps {
  accounts: ConnectedAccount[];
  activeNav: string;
  onSelectNav: (nav: string) => void;
  onOpenAccountsModal: () => void;
  onOpenReportModal: () => void;
  completedTasksCount?: number;
}

export function SidebarNav({
  accounts,
  activeNav,
  onSelectNav,
  onOpenAccountsModal,
  onOpenReportModal,
  completedTasksCount = 0,
}: SidebarNavProps) {
  const workAcc = accounts.find((a) => a.id === "work");
  const personalAcc = accounts.find((a) => a.id === "personal");

  return (
    <aside className="w-56 xl:w-60 h-full flex flex-col bg-[#0e0d1d] border-r border-[#1f1d38] text-slate-200 shrink-0 select-none transition-all duration-200">
      {/* 1. Brand Logo & Title */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1f1d38]/80 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-500/20">
          M
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white">
              Mont Ops
            </span>
          </div>
          <p className="text-[10px] text-purple-300/70 truncate">
            Seu hub de produtividade
          </p>
        </div>
      </div>

      {/* 2. Main Navigation Links */}
      <div className="p-3 space-y-1">
        <button
          type="button"
          onClick={() => onSelectNav("inicio")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeNav === "inicio"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNav("wiki")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeNav === "wiki"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Wiki Técnica</span>
        </button>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Relatórios</span>
        </button>

        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
      </div>

      {/* 3. Contas Google Section */}
      <div className="px-4 py-3 border-t border-[#1f1d38]/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/70">
            Contas Google
          </span>
          <button
            type="button"
            onClick={onOpenAccountsModal}
            className="text-[10px] text-purple-400 hover:text-purple-200"
          >
            Gerenciar
          </button>
        </div>

        {/* Trabalho */}
        <div
          onClick={onOpenAccountsModal}
          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-left">
              <span className="text-xs font-medium text-slate-200 block">Trabalho</span>
              <span className="text-[10px] text-slate-500">
                {workAcc?.is_connected ? "Conectada" : "Desconectada"}
              </span>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              workAcc?.is_connected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"
            }`}
          />
        </div>

        {/* Pessoal */}
        <div
          onClick={onOpenAccountsModal}
          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-purple-400" />
            <div className="text-left">
              <span className="text-xs font-medium text-slate-200 block">Pessoal</span>
              <span className="text-[10px] text-slate-500">
                {personalAcc?.is_connected ? "Conectada" : "Desconectada"}
              </span>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              personalAcc?.is_connected ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"
            }`}
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* 4. Motivational Card */}
      <div className="p-3 mx-3 mb-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <span className="p-1 rounded-lg bg-amber-500/20">🚀</span>
          <span>Produtividade em alta!</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-tight">
          Você superou sua meta da semana!
        </p>
        <div className="flex items-end gap-1 pt-1 h-6">
          <div className="flex-1 bg-purple-500/40 rounded-t h-2" />
          <div className="flex-1 bg-purple-500/60 rounded-t h-3.5" />
          <div className="flex-1 bg-purple-500/80 rounded-t h-4" />
          <div className="flex-1 bg-indigo-500 rounded-t h-5" />
          <div className="flex-1 bg-purple-400 rounded-t h-6 shadow-sm" />
        </div>
      </div>

      {/* 5. User Profile Pill at Bottom */}
      <div className="p-3 border-t border-[#1f1d38]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold border border-purple-400/40 shrink-0">
            HF
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-white block truncate">
              Hellen Ferreira
            </span>
            <span className="text-[10px] text-purple-300/60 block truncate">
              {workAcc?.email || personalAcc?.email || "Administradora"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAccountsModal}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          title="Opções de conta"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

