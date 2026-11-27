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
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4] dark:border-[#44394F] shadow-popover transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E0D6] dark:border-[#44394F] bg-[#FAF6EF] dark:bg-[#241F2D]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#392D4B] dark:text-white">
                Adiar / Estender Prazo
              </h3>
              <p className="text-xs text-[#756B80] dark:text-[#B6A9C3]">
                O prazo original é preservado para auditoria e histórico de SLA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-[#756B80] dark:hover:text-white hover:bg-[#E7DFF5] dark:hover:bg-[#3D344C] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#FAF6EF] dark:bg-[#1D1925] border border-[#E4DCE4] dark:border-[#44394F] space-y-2">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-[#F5F1E8] line-clamp-1">
              {task.title}
            </h4>
            <div className="flex items-center justify-between text-xs text-[#756B80] dark:text-[#B6A9C3] pt-1 border-t border-[#E4DCE4] dark:border-[#44394F]">
              <span>Prazo Original:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{originalDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#756B80] dark:text-[#B6A9C3]">
              <span>Prazo Atual:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{currentDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#756B80] dark:text-[#B6A9C3]">
              <span>Extensões anteriores:</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#352D42] text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                {task.extension_count || 0} vez(es)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#7455AD]" />
              Novo Prazo de Conclusão:
            </label>
            <input
              type="datetime-local"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#FAF6EF] dark:bg-[#1D1925] border border-[#E4DCE4] dark:border-[#44394F] text-[#392D4B] dark:text-white focus:outline-none focus:border-[#7455AD]"
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
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#FAF6EF] dark:bg-[#1D1925] border border-[#E4DCE4] dark:border-[#44394F] text-[#392D4B] dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#7455AD] resize-none font-sans"
            />
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              A nova data será registrada no banco de dados, preservando o histórico de adiamentos e auditoria de SLA.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E0D6] dark:border-[#44394F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#756B80] hover:text-slate-800 dark:text-[#B6A9C3] dark:hover:text-white transition-colors"
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
