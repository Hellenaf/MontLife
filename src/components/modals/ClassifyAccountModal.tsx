"use client";

import React, { useState } from "react";
import {
  Briefcase,
  User,
  GraduationCap,
  Rocket,
  Bookmark,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Palette,
} from "lucide-react";
import { AccountType } from "@/types";

interface ClassifyAccountModalProps {
  isOpen: boolean;
  email: string;
  ticketId?: string;
  accountId?: string;
  onClassified: (label: string, importedCount: number) => void;
  onClose?: () => void;
}

const QUICK_SUGGESTIONS = [
  {
    label: "Trabalho",
    icon: Briefcase,
    desc: "Rotinas profissionais, TOTVS, TI e demandas corporativas",
    color: "indigo",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
  },
  {
    label: "Pessoal",
    icon: User,
    desc: "Vida pessoal, compromissos diários e organização individual",
    color: "purple",
    badgeClass: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
  },
  {
    label: "Estudos",
    icon: GraduationCap,
    desc: "Faculdade, cursos, pós-graduação, artigos e certificações",
    color: "emerald",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Projetos",
    icon: Rocket,
    desc: "Iniciativas paralelas, consultorias e novos empreendimentos",
    color: "amber",
    badgeClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Geral",
    icon: Bookmark,
    desc: "Caixa de entrada universal e tarefas do dia a dia",
    color: "cyan",
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
  },
];

const COLOR_OPTIONS = [
  { id: "indigo", label: "Índigo", bg: "bg-indigo-500", ring: "ring-indigo-500" },
  { id: "purple", label: "Roxo", bg: "bg-purple-500", ring: "ring-purple-500" },
  { id: "emerald", label: "Esmeralda", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { id: "amber", label: "Âmbar", bg: "bg-amber-500", ring: "ring-amber-500" },
  { id: "rose", label: "Rosa", bg: "bg-rose-500", ring: "ring-rose-500" },
  { id: "cyan", label: "Ciano", bg: "bg-cyan-500", ring: "ring-cyan-500" },
];

export function ClassifyAccountModal({
  isOpen,
  email,
  ticketId,
  accountId,
  onClassified,
  onClose,
}: ClassifyAccountModalProps) {
  const [selectedLabel, setSelectedLabel] = useState<string>("Trabalho");
  const [customLabel, setCustomLabel] = useState<string>("Trabalho");
  const [selectedColor, setSelectedColor] = useState<string>("indigo");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectQuick = (label: string, color: string) => {
    setSelectedLabel(label);
    setCustomLabel(label);
    setSelectedColor(color);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalLabel = (customLabel.trim() || selectedLabel.trim() || "Geral");

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/accounts/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: finalLabel,
          color: selectedColor,
          email,
          ticket: ticketId,
          account_id: accountId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao definir o contexto da conta.");
      }

      onClassified(finalLabel, data.imported_count || 0);
    } catch (err: any) {
      console.error("Error classifying account:", err);
      setErrorMsg(err.message || "Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#141326] border border-slate-200 dark:border-[#282647] shadow-2xl p-6 sm:p-7 space-y-5 text-left transition-all">
        {/* Top Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-purple-600/30 shrink-0">
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold mb-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Autenticação Concluída</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Defina o Espaço de Trabalho
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Conta: <strong className="text-slate-800 dark:text-slate-200">{email || "sua conta Google"}</strong>
            </p>
          </div>
        </div>

        {/* Prompt question */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Como você deseja categorizar esta conta?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Selecione uma sugestão rápida ou digite um nome personalizado para o seu espaço de trabalho.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Sugestões Rápidas:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_SUGGESTIONS.map((sug) => {
              const Icon = sug.icon;
              const isSelected = selectedLabel === sug.label;
              return (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => handleSelectQuick(sug.label, sug.color)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold"
                      : "bg-slate-50 dark:bg-[#18172e] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500/30"
                  }`}
                >
                  <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs truncate">{sug.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input Field */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Nome do Rótulo / Espaço:
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => {
                setCustomLabel(e.target.value);
                setSelectedLabel(e.target.value);
              }}
              placeholder="Ex: Faculdade, TI Escolar, Freelance, Geral..."
              maxLength={35}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#18172e] border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Você pode vincular quantas contas Google desejar e renomear os rótulos a qualquer momento.
            </p>
          </div>

          {/* Color Badges */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Palette className="w-3 h-3" />
              <span>Cor de Destaque:</span>
            </div>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.bg} transition-all cursor-pointer ${
                    selectedColor === c.id
                      ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#141326] ${c.ring} scale-110`
                      : "opacity-60 hover:opacity-100"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading || !customLabel.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-purple-600/30 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Configurando e Sincronizando...</span>
              </>
            ) : (
              <>
                <span>Confirmar e Sincronizar Tarefas</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
