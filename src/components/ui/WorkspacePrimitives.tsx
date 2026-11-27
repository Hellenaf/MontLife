"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-surface border-b border-line shrink-0 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-ink truncate">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-8 px-4" : "py-14 px-6"
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-[12px] bg-lavender-soft border border-line text-brand flex items-center justify-center mb-3.5">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-xs text-ink-muted mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 p-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-[10px] bg-lavender-soft/60 border border-line"
        />
      ))}
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  highlight?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  highlight,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1D1925]/55 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[14px] bg-surface border border-line p-5 shadow-popover space-y-4"
      >
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <p className="text-xs text-ink-muted leading-relaxed">{description}</p>
          {highlight && (
            <div className="mt-2 p-2.5 rounded-[10px] bg-sidebar border border-line text-xs font-semibold text-ink line-clamp-2">
              {highlight}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-[9px] text-xs font-medium bg-sidebar border border-line text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-white transition-colors cursor-pointer ${
              tone === "danger"
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-brand hover:bg-brand-hover text-brand-fg"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

