"use client";

import React from "react";

interface MontLifeLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export function MontLifeLogo({
  size = "md",
  showText = false,
  subtitle,
  className = "",
}: MontLifeLogoProps) {
  const sizeMap = {
    sm: "w-7 h-7 rounded-[8px]",
    md: "w-8 h-8 rounded-[10px]",
    lg: "w-10 h-10 rounded-[12px]",
    xl: "w-12 h-12 rounded-[14px]",
  };

  const textMap = {
    sm: "text-sm",
    md: "text-[15px]",
    lg: "text-lg",
    xl: "text-xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeMap[size]} shrink-0 overflow-hidden shadow-xs-subtle border border-line bg-elevated flex items-center justify-center relative group select-none`}
      >
        <img
          src="/brand-logo-square.png"
          alt="MontLife Logo"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-150"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="min-w-0">
          <span
            className={`font-bold ${textMap[size]} tracking-tight text-ink block truncate leading-tight`}
          >
            MontLife
          </span>
          {subtitle && (
            <span className="text-[11px] font-medium text-ink-muted block truncate leading-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
