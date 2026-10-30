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

  // Format existing date for display
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#1A1829] border border-[#2E2B44] shadow-2xl overflow-hidden glow-lavender">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2E2B44] bg-[#141221]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#EAE9FC]">
                Estender Prazo de SLA
              </h3>
              <p className="text-xs text-[#9490AC]">
                O prazo original é preservado para a métrica de assertividade anual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9490AC] hover:text-white hover:bg-[#2E2B44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0F0E17] border border-[#2E2B44] space-y-2">
            <h4 className="text-sm font-medium text-[#EAE9FC] line-clamp-1">
              {task.title}
            </h4>
            <div className="flex items-center justify-between text-xs text-[#9490AC] pt-1 border-t border-[#2E2B44]/60">
              <span>Prazo Original (SLA {task.priority}):</span>
              <span className="font-semibold text-[#EAE9FC]">{originalDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#9490AC]">
              <span>Prazo Atual:</span>
              <span className="font-semibold text-amber-300">{currentDueFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#9490AC]">
              <span>Extensões anteriores:</span>
              <span className="px-2 py-0.5 rounded-full bg-[#2E2B44] text-[#EAE9FC] text-[11px]">
                {task.extension_count || 0} vez(es)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#EAE9FC] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#9D8DF1]" />
              Novo Prazo de Conclusão:
            </label>
            <input
              type="datetime-local"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#0F0E17] border border-[#2E2B44] text-[#EAE9FC] focus:outline-none focus:border-[#9D8DF1] focus:ring-1 focus:ring-[#9D8DF1] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#EAE9FC]">
              Motivo do Adiamento:
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Aguardando liberação do fornecedor da TOTVS / Dependência de validação da coordenação..."
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#0F0E17] border border-[#2E2B44] text-[#EAE9FC] placeholder-[#9490AC]/60 focus:outline-none focus:border-[#9D8DF1] focus:ring-1 focus:ring-[#9D8DF1] transition-all resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              A nova data será refletida imediatamente no Google Tasks e Google Calendar, preservando o histórico de extensões no Cloud Firestore.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2B44]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#9490AC] hover:text-[#EAE9FC] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newDueDate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-white font-medium text-xs shadow-lg shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-50"
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

