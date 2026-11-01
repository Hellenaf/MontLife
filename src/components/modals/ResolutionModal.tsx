"use client";

import React, { useState } from "react";
import { CheckCircle2, X, BookOpen, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { Task } from "@/types";

interface ResolutionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolutionNotes: string) => Promise<void>;
}

export function ResolutionModal({
  task,
  isOpen,
  onClose,
  onConfirm,
}: ResolutionModalProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(resolutionNotes);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#10B981", "#3B82F6", "#F59E0B"],
      });
      setResolutionNotes("");
      onClose();
    } catch (err) {
      console.error("Error submitting resolution:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#101118]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Concluir Demanda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione notas de resolução para o histórico de chamados do MontLife.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {task.category} &bull; {task.account_type === "work" ? "Trabalho" : "Pessoal"}
            </span>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">
              {task.title}
            </h4>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Como foi resolvido? (Resumo da Solução)
              </span>
            </label>
            <textarea
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ex: Reiniciado o serviço de integração, corrigida configuração no painel e testado com o usuário..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onConfirm("Concluído.");
                onClose();
              }}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Concluir sem Notas
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Salvando..." : "Salvar Resolução & Concluir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
