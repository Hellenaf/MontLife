"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftOpen, ArrowLeft } from "lucide-react";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio: number;
  onRatioChange: (nextRatio: number) => void;
  defaultRatio?: number;
  minLeftPct?: number;
  maxLeftPct?: number;
  isLeftCollapsed?: boolean;
  onToggleLeftCollapsed?: () => void;
  isRightCollapsed?: boolean;
  onToggleRightCollapsed?: () => void;
  mobileShowRight?: boolean;
  onMobileBack?: () => void;
  mobileBackLabel?: string;
  ariaLabel?: string;
  className?: string;
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
  mobileShowRight = false,
  onMobileBack,
  mobileBackLabel = "Voltar para lista",
  ariaLabel = "Redimensionar painéis",
  className = "",
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
  const bothOpen = !isLeftCollapsed && !isRightCollapsed;

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden ${className}`}
    >
      {/* Left / Master Pane */}
      <section
        aria-label="Painel principal"
        style={
          bothOpen
            ? ({ "--split-left": `${clampedRatio}%` } as React.CSSProperties)
            : undefined
        }
        className={`${mobileShowRight ? "hidden" : "flex flex-1"
          } ${isLeftCollapsed
            ? "lg:hidden"
            : isRightCollapsed
              ? "lg:flex lg:flex-1 lg:w-full"
              : "lg:flex lg:flex-none lg:w-[var(--split-left)] lg:shrink-0"
          } min-h-0 min-w-0 h-full flex-col overflow-hidden`}
      >
        {left}
      </section>

      {/* Desktop Resizable Separator */}
      {bothOpen && (
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
          className={`hidden lg:flex group relative w-2 shrink-0 items-center justify-center cursor-col-resize select-none transition-colors duration-150 bg-canvas ${isDragging ? "bg-lavender-soft" : "hover:bg-lavender-soft/70"
            }`}
        >
          <div
            className={`w-[2px] rounded-full transition-all duration-150 ${isDragging
                ? "h-24 bg-brand"
                : "h-12 bg-line-strong/80 group-hover:h-20 group-hover:bg-brand"
              }`}
          />
        </div>
      )}

      {/* Collapsed Left Restore Slim Rail (Desktop Focus Mode) */}
      {isLeftCollapsed && onToggleLeftCollapsed && (
        <div className="hidden lg:flex shrink-0 flex-col items-center py-3 px-1.5 bg-sidebar border-r border-line">
          <button
            type="button"
            onClick={onToggleLeftCollapsed}
            title="Mostrar lista lateral"
            aria-label="Mostrar lista lateral"
            className="w-8 h-8 rounded-[9px] bg-surface border border-line text-ink-muted hover:text-brand hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right / Detail Pane (always flex-1 so left + divider + right === 100% exactly!) */}
      <section
        aria-label="Painel de detalhes"
        className={`${mobileShowRight ? "flex flex-1" : "hidden"
          } ${isRightCollapsed ? "lg:hidden" : "lg:flex lg:flex-1"
          } min-h-0 min-w-0 h-full flex-col overflow-hidden`}
      >
        {/* Mobile Back Header */}
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

        <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
          {right}
        </div>
      </section>
    </div>
  );
}
