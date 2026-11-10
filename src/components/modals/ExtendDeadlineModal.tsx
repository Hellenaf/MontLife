"use client";

import React, { useState } from "react";
import { Clock, Calendar, AlertTriangle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task } from "@/types";

interface ExtendDeadlineModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDueDateIso: string, reason: string) => Promise<void>;
}

export function ExtendDeadlineModal({
  task,
  isOpen,
  onClose,
  onConfirm,
}: ExtendDeadlineModalProps) {
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  let currentDueFormatted = task.current_due_date;
  try {
    currentDueFormatted = format(
      parseISO(task.current_due_date),
      "dd/MM/yyyy 'às' HH:mm",
      { locale: ptBR }
    );
  } catch {
    // fallback
  }

  let originalDueFormatted = task.original_due_date;
  try {
    originalDueFormatted = format(
      parseISO(task.original_due_date),
      "dd/MM/yyyy 'às' HH:mm",
      { locale: ptBR }
    );
  } catch {
    // fallback
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueDate) return;

    setIsSubmitting(true);
    try {
      const isoString = new Date(newDueDate).toISOString();
      await onConfirm(isoString, reason);
      setReason("");
      setNewDueDate("");
      onClose();
    } catch (err) {
      console.error("Error extending deadline:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl transition-all custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#101118]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Adiar / Estender Prazo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O prazo original é preservado para auditoria e histórico de SLA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
              {task.title}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-zinc-800">
              <span>Prazo Original:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{originalDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Prazo Atual:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{currentDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Extensões anteriores:</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                {task.extension_count || 0} vez(es)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Novo Prazo de Conclusão:
            </label>
            <input
              type="datetime-local"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Motivo do Adiamento:
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Aguardando retorno do fornecedor ou validação da diretoria..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
            />
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              A nova data será registrada no banco de dados, preservando o histórico de adiamentos e auditoria de SLA.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newDueDate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              {isSubmitting ? "Atualizando..." : "Confirmar Nova Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
