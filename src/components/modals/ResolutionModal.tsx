"use client";

import React, { useState } from "react";
import { CheckCircle2, Sparkles, X, BookOpen } from "lucide-react";
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
      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#9D8DF1", "#7B61FF", "#10B981", "#F59E0B"],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#1A1829] border border-[#2E2B44] shadow-2xl overflow-hidden glow-lavender">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2E2B44] bg-[#141221]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#EAE9FC]">
                Concluir Tarefa com Resolução
              </h3>
              <p className="text-xs text-[#9490AC]">
                Alimente a Wiki Técnica do Mont Ops para buscas futuras da IA
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
          <div className="p-3 rounded-xl bg-[#0F0E17] border border-[#2E2B44]">
            <span className="text-xs font-medium text-[#9D8DF1] uppercase tracking-wider">
              {task.category} • {task.account_type === "work" ? "Trabalho" : "Pessoal"}
            </span>
            <h4 className="text-sm font-semibold text-[#EAE9FC] mt-1">
              {task.title}
            </h4>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-medium text-[#EAE9FC]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#9D8DF1]" />
                Como foi resolvido? (Resumo da Solução)
              </span>
              <span className="text-[11px] text-[#9490AC]">
                Recomendado para histórico técnico
              </span>
            </label>
            <textarea
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ex: Reiniciado o serviço TOTVSHost, limpa tabela GLOCK e ajustado timeout do pool de conexões..."
              className="w-full px-4 py-3 text-sm rounded-xl bg-[#0F0E17] border border-[#2E2B44] text-[#EAE9FC] placeholder-[#9490AC]/60 focus:outline-none focus:border-[#9D8DF1] focus:ring-1 focus:ring-[#9D8DF1] transition-all resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2E2B44]">
            <button
              type="button"
              onClick={() => {
                onConfirm("Concluído sem notas adicionais.");
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-medium text-[#9490AC] hover:text-[#EAE9FC] transition-colors"
            >
              Concluir sem Notas
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white font-medium text-xs shadow-lg shadow-[#7B61FF]/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? "Salvando..." : "Salvar Resolução & Finalizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

