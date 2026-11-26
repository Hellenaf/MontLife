"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Undo2, X, AlertTriangle, Trash2, Info } from "lucide-react";

export interface UndoToastData {
  id: string;
  message: string;
  detail?: string;
  variant?: "default" | "success" | "warning" | "danger";
  onUndo?: () => void | Promise<void>;
  durationMs?: number;
}

interface UndoToastProps {
  toast: UndoToastData | null;
  onDismiss: () => void;
}

export function UndoToast({ toast, onDismiss }: UndoToastProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setIsUndoing(false);
    const ms = toast.durationMs ?? 5000;
    const timer = setTimeout(() => {
      onDismiss();
    }, ms);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const variant = toast.variant || "default";

  const icon =
    variant === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : variant === "warning" ? (
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
    ) : variant === "danger" ? (
      <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
    ) : (
      <Info className="w-4 h-4 text-indigo-400 shrink-0" />
    );

  const handleUndoClick = async () => {
    if (!toast.onUndo || isUndoing) return;
    setIsUndoing(true);
    try {
      await toast.onUndo();
    } finally {
      onDismiss();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print fixed z-[95] bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-950/95 dark:bg-[#293244]/95 text-white border border-slate-800 dark:border-[#343F56] shadow-popover backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white leading-snug truncate">
              {toast.message}
            </p>
            {toast.detail && (
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {toast.detail}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {toast.onUndo && (
            <button
              type="button"
              disabled={isUndoing}
              onClick={handleUndoClick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{isUndoing ? "Desfazendo..." : "Desfazer"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
            aria-label="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

