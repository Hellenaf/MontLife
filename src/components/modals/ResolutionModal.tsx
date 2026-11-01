"use client";

import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  X,
  BookOpen,
  Check,
  Paperclip,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Task, TaskAttachment } from "@/types";
import { processFileToAttachment, formatFileSize } from "@/lib/attachmentUtils";

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
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !task) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFile(true);
    try {
      const newAttachments: TaskAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const att = await processFileToAttachment(file, "resolution");
        newAttachments.push(att);
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      console.error("Erro ao processar anexo:", err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Concluir Demanda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione notas e comprovantes da solução para o histórico.
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

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {task.category} &bull; {task.account_type === "work" ? "Trabalho" : "Pessoal"}
            </span>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">
              {task.title}
            </h4>
          </div>

          {/* Solution notes */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Como foi resolvido? (Resumo da Solução)
              </span>
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Ex: Reiniciado o serviço de integração, corrigida configuração no painel e validado com o solicitante..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              autoFocus
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                Comprovantes / Evidências da Solução (Opcional):
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {isProcessingFile ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>+ Anexar Arquivo</>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {attachments.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0c0d13]/50 text-center cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Clique aqui para anexar print, comprovante ou PDF</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att) => {
                  const isImg = att.type.startsWith("image/");
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isImg ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {att.name}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {formatFileSize(att.size)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <button
            type="button"
            onClick={() => {
              onConfirm("Concluído.", attachments);
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Concluir sem Notas
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Salvar Resolução & Concluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
