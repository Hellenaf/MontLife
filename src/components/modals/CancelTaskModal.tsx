"use client";

import React, { useState } from "react";
import {
  Ban,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Task } from "@/types";

interface CancelTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, cancelReason: string) => Promise<void>;
}

const QUICK_REASONS = [
  "Solicitado pelo usuário/solicitante",
  "Demanda duplicada / Já resolvida em outro chamado",
  "Escopo alterado ou despriorizado pela gestão",
  "Inviabilidade técnica ou falta de pré-requisitos",
  "Cadastro indevido / Erro de lançamento",
];

export function CancelTaskModal({
  task,
  isOpen,
  onClose,
  onConfirm,
}: CancelTaskModalProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setError("Por favor, informe uma justificativa para o cancelamento.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(task.id, trimmed);
      setCancelReason("");
      onClose();
    } catch (err) {
      console.error("Error canceling task:", err);
      setError("Falha ao cancelar a demanda. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickReason = (reason: string) => {
    setCancelReason((prev) => {
      if (!prev) return reason;
      return `${prev} - ${reason}`;
    });
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[92dvh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Cancelar Demanda
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informe a justificativa do cancelamento para registro histórico.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="cancel-task-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left custom-scrollbar"
        >
          {/* Target Task Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Demanda selecionada
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-medium">
                {task.category}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
              {task.title}
            </p>
          </div>

          {/* Attention Banner */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold block">Atenção:</span>
              <span className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
                Esta demanda sairá da fila ativa de trabalho e do quadro Kanban, mas permanecerá salva no seu histórico com a justificativa registrada.
              </span>
            </div>
          </div>

          {/* Quick Reasons Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Motivos rápidos sugeridos (clique para preencher):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleSelectQuickReason(reason)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:border-rose-800 text-slate-700 dark:text-slate-300 transition-colors text-left flex items-center gap-1"
                >
                  <span className="text-rose-500 font-bold">+</span> {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Cancel Reason Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Motivo detalhado do cancelamento *</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Obrigatório
              </span>
            </label>
            <textarea
              required
              rows={4}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex: O usuário solicitou o cancelamento pois a impressora voltou a operar normalmente após troca de toner..."
              className="w-full p-3 rounded-2xl bg-white dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium animate-in fade-in">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] flex flex-wrap-reverse items-center justify-between shrink-0 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Manter Demanda
          </button>

          <button
            type="submit"
            form="cancel-task-form"
            disabled={isSubmitting || !cancelReason.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelando...</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Confirmar Cancelamento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

