"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, ArrowLeft } from "lucide-react";

interface SplitViewProps {
  /** Left / master pane content */
  left: React.ReactNode;
  /** Right / detail pane content */
  right: React.ReactNode;
  /** Controlled percentage width of the left pane (20-80) */
  ratio: number;
  /** Callback when user drags divider or double-clicks to reset */
  onRatioChange: (nextRatio: number) => void;
  /** Default ratio restored on divider double-click */
  defaultRatio?: number;
  /** Min/max bounds for left pane percentage */
  minLeftPct?: number;
  maxLeftPct?: number;
  /** Optional collapse state controlled from parent or internally */
  isLeftCollapsed?: boolean;
  onToggleLeftCollapsed?: () => void;
  isRightCollapsed?: boolean;
  onToggleRightCollapsed?: () => void;
  /** Mobile navigation state: whether mobile currently displays the right (detail) pane */
  mobileShowRight?: boolean;
  onMobileBack?: () => void;
  mobileBackLabel?: string;
  /** Optional ARIA label for the resize separator */
  ariaLabel?: string;
  /** Optional extra classes on outer wrapper */
  className?: string;
  /** Optional flag to show floating collapse handles on desktop divider */
  showDividerControls?: boolean;
}

export function SplitView({
  left,
  right,
  ratio,
  onRatioChange,
  defaultRatio = 55,
  minLeftPct = 24,
  maxLeftPct = 76,
  isLeftCollapsed = false,
  onToggleLeftCollapsed,
  isRightCollapsed = false,
  onToggleRightCollapsed,
  mobileShowRight = false,
  onMobileBack,
  mobileBackLabel = "Voltar para lista",
  ariaLabel = "Redimensionar painéis",
  className = "",
  showDividerControls = false,
}: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = useCallback(
    (value: number) => Math.max(minLeftPct, Math.min(maxLeftPct, value)),
    [minLeftPct, maxLeftPct]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      onRatioChange(clamp(Math.round(pct * 2) / 2));
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging, clamp, onRatioChange]);

  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onRatioChange(clamp(ratio - 3));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onRatioChange(clamp(ratio + 3));
    } else if (e.key === "Home") {
      e.preventDefault();
      onRatioChange(minLeftPct);
    } else if (e.key === "End") {
      e.preventDefault();
      onRatioChange(maxLeftPct);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRatioChange(defaultRatio);
    }
  };

  const clampedRatio = clamp(ratio);
  const effectiveLeftPct = isLeftCollapsed ? 0 : isRightCollapsed ? 100 : clampedRatio;
  const effectiveRightPct = isRightCollapsed ? 0 : isLeftCollapsed ? 100 : 100 - clampedRatio;

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden ${className}`}
    >
      {/* Left / Master Pane */}
      <section
        aria-label="Painel principal"
        style={
          !isLeftCollapsed && !isRightCollapsed
            ? ({ "--split-left": `${effectiveLeftPct}%` } as React.CSSProperties)
            : undefined
        }
        className={`${
          mobileShowRight ? "hidden lg:flex" : "flex"
        } ${
          isLeftCollapsed
            ? "lg:hidden"
            : isRightCollapsed
            ? "lg:flex lg:w-full"
            : "lg:flex lg:w-[var(--split-left)]"
        } flex-1 lg:flex-none min-h-0 min-w-0 h-full flex-col overflow-hidden`}
      >
        {left}
      </section>

      {/* Desktop Resizable Separator */}
      {!isLeftCollapsed && !isRightCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={ariaLabel}
          aria-valuemin={minLeftPct}
          aria-valuemax={maxLeftPct}
          aria-valuenow={Math.round(clampedRatio)}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onDoubleClick={() => onRatioChange(defaultRatio)}
          onKeyDown={handleDividerKeyDown}
          title="Arraste para redimensionar • Duplo clique para restaurar proporção"
          className={`hidden lg:flex group relative w-2.5 shrink-0 items-center justify-center cursor-col-resize select-none transition-colors duration-150 ${
            isDragging ? "bg-lavender-soft/80" : "hover:bg-lavender-soft/60"
          }`}
        >
          <div
            className={`w-[2px] rounded-full transition-all duration-150 ${
              isDragging
                ? "h-24 bg-brand"
                : "h-12 bg-line-strong/80 group-hover:h-20 group-hover:bg-brand"
            }`}
          />

          {showDividerControls && (onToggleLeftCollapsed || onToggleRightCollapsed) && (
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute top-3 z-20 flex flex-col gap-1 transition-opacity duration-150">
              {onToggleLeftCollapsed && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onToggleLeftCollapsed}
                  title="Expandir painel direito (Modo Foco)"
                  className="w-6 h-6 rounded-md bg-surface border border-line shadow-xs-subtle flex items-center justify-center text-ink-muted hover:text-brand hover:border-brand cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              )}
              {onToggleRightCollapsed && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onToggleRightCollapsed}
                  title="Recolher painel direito"
                  className="w-6 h-6 rounded-md bg-surface border border-line shadow-xs-subtle flex items-center justify-center text-ink-muted hover:text-brand hover:border-brand cursor-pointer"
                >
                  <PanelLeftClose className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsed Left Restore Floating Trigger (Desktop) */}
      {isLeftCollapsed && onToggleLeftCollapsed && (
        <div className="hidden lg:flex shrink-0 flex-col items-center py-3 px-1.5 bg-sidebar border-r border-line">
          <button
            type="button"
            onClick={onToggleLeftCollapsed}
            title="Restaurar painel esquerdo"
            className="w-8 h-8 rounded-[9px] bg-surface border border-line text-ink-muted hover:text-brand hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right / Detail Pane */}
      <section
        aria-label="Painel de detalhes"
        style={
          !isLeftCollapsed && !isRightCollapsed
            ? ({ "--split-right": `${effectiveRightPct}%` } as React.CSSProperties)
            : undefined
        }
        className={`${
          mobileShowRight ? "flex" : "hidden lg:flex"
        } ${
          isRightCollapsed
            ? "lg:hidden"
            : isLeftCollapsed
            ? "lg:flex lg:flex-1"
            : "lg:flex lg:w-[var(--split-right)]"
        } flex-1 lg:flex-none min-h-0 min-w-0 h-full flex-col overflow-hidden`}
      >
        {/* Mobile Back Header when viewing Detail Pane */}
        {mobileShowRight && onMobileBack && (
          <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-sidebar border-b border-line shrink-0">
            <button
              type="button"
              onClick={onMobileBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-xs font-semibold text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand" />
              <span>{mobileBackLabel}</span>
            </button>
          </div>
        )}

        {/* Desktop Focus Mode Exit Bar */}
        {isLeftCollapsed && onToggleLeftCollapsed && (
          <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-lavender-soft/60 border-b border-line shrink-0">
            <span className="text-[11px] font-medium text-ink-muted">
              Visualização focada ativa — painel esquerdo recolhido
            </span>
            <button
              type="button"
              onClick={onToggleLeftCollapsed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-surface border border-line text-[11px] font-semibold text-ink hover:border-brand transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3 h-3 text-brand" />
              <span>Mostrar lista lateral</span>
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{right}</div>
      </section>
    </div>
  );
}

