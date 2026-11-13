"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  X,
  BookOpen,
  Check,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Task, TaskAttachment } from "@/types";
import { AttachmentManager } from "@/components/AttachmentManager";
import { MediaLightboxModal, MediaItem } from "@/components/modals/MediaLightboxModal";

interface ResolutionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    resolutionNotes: string,
    resolutionAttachments?: TaskAttachment[]
  ) => Promise<void>;
}

export function ResolutionModal({
  task,
  isOpen,
  onClose,
  onConfirm,
}: ResolutionModalProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(
        resolutionNotes.trim() || "Demanda concluída com sucesso.",
        attachments
      );
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#10B981", "#3B82F6", "#F59E0B"],
      });
      setResolutionNotes("");
      setAttachments([]);
      onClose();
    } catch (err) {
      console.error("Error submitting resolution:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[92dvh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Finalizar Demanda & Salvar na Wiki
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documente a resolução para alimentar o acervo técnico e consultas futuras.
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

        {/* Form Body - Scrollable */}
        <form
          id="resolution-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left custom-scrollbar"
        >
          {/* Context box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Demanda a ser finalizada
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Validation Steps checklist review */}
          {task.validation_steps && task.validation_steps.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  Etapas de Validação ({task.validation_steps.filter((s) => s.completed).length}/
                  {task.validation_steps.length} concluídas):
                </span>
              </div>
              <div className="space-y-1">
                {task.validation_steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] ${
                        step.completed
                          ? "bg-indigo-600 text-white"
                          : "border border-indigo-300 dark:border-indigo-700 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={
                        step.completed
                          ? "line-through text-indigo-950/60 dark:text-indigo-300/60"
                          : "text-indigo-900 dark:text-indigo-200"
                      }
                    >
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solution notes text area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Procedimento Técnico & Solução:</span>
              </label>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                Opcional
              </span>
            </div>
            <textarea
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Descreva a solução aplicada se desejar salvar na base de conhecimento (opcional). Se preferir, pode deixar em branco e concluir diretamente..."
              className="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Anexos e Links Externos */}
          <div className="pt-1">
            <AttachmentManager
              attachments={attachments}
              onChange={setAttachments}
              stage="resolution"
              label="Comprovantes & Links da Solução (Opcional)"
              onPreviewMedia={(media) => setPreviewMedia(media)}
            />
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex items-center justify-between gap-2 p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="resolution-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Concluindo...</span>
              </>
            ) : resolutionNotes.trim() ? (
              <>
                <Check className="w-4 h-4" />
                <span>Concluir e Salvar na Wiki</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Concluir Demanda</span>
              </>
            )}
          </button>
        </div>

        {/* Lightbox Preview Modal for Attachments */}
        <MediaLightboxModal
          isOpen={Boolean(previewMedia)}
          onClose={() => setPreviewMedia(null)}
          media={previewMedia}
        />
      </div>
    </div>
  );
}
