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
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  };

  const textMap = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 3D Stylized M Brand Logo Icon */}
      <div
        className={`${sizeMap[size]} shrink-0 rounded-xl overflow-hidden shadow-lg shadow-purple-900/30 border border-purple-500/25 bg-[#10101a] flex items-center justify-center relative group select-none`}
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
          <span className={`font-bold ${textMap[size]} tracking-tight text-white block truncate`}>
            MontLife
          </span>
        </div>
      )}
    </div>
  );
}
