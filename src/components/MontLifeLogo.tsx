"use client";

import React from "react";

interface MontLifeLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function MontLifeLogo({
  size = "md",
  showText = false,
  className = "",
}: MontLifeLogoProps) {
  const sizeMap = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-8 h-8 rounded-lg",
    lg: "w-10 h-10 rounded-xl",
    xl: "w-12 h-12 rounded-xl",
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
        className={`${sizeMap[size]} shrink-0 overflow-hidden shadow-xs border border-slate-200/80 dark:border-white/10 bg-[#101014] flex items-center justify-center relative group select-none`}
      >
        <img
          src="/brand-logo-square.png"
          alt="MontLife Logo"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="min-w-0">
          <span
            className={`font-semibold ${textMap[size]} tracking-tight text-slate-900 dark:text-zinc-100 block truncate`}
          >
            MontLife
          </span>
        </div>
      )}
    </div>
  );
}
