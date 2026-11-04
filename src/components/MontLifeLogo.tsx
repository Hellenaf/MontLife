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
      {/* SVG Icon with summit peak M geometry and vibrant glow */}
      <div
        className={`${sizeMap[size]} shrink-0 rounded-xl overflow-hidden shadow-md shadow-purple-600/30 flex items-center justify-center relative group`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f0c29" />
              <stop offset="50%" stopColor="#18153a" />
              <stop offset="100%" stopColor="#0a0818" />
            </linearGradient>
            <linearGradient id="logoGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>

          {/* Background fill */}
          <rect width="100" height="100" rx="24" fill="url(#logoBg)" />
          <rect
            width="98"
            height="98"
            x="1"
            y="1"
            rx="23"
            stroke="rgba(168, 85, 247, 0.3)"
            strokeWidth="1.5"
          />

          {/* Left Peak */}
          <path
            d="M20 74 L37 36 C38 33 42 33 43 36 L50 52 L35 74 Z"
            fill="url(#logoGrad1)"
            opacity="0.85"
          />

          {/* Center Ascending Summit */}
          <path
            d="M50 24 L67 62 L54 74 L46 74 L38 62 Z"
            fill="url(#logoGrad2)"
          />

          {/* Primary Stylized M Path */}
          <path
            d="M21 75 L36 38 C37 35 41 35 42 38 L50 56 L58 38 C59 35 63 35 64 38 L79 75"
            stroke="url(#logoGrad1)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak Ascent Arrow */}
          <path d="M50 25 L60 43 L50 39 L40 43 Z" fill="#FFFFFF" />

          {/* Summit Star */}
          <circle cx="50" cy="19" r="3" fill="#38BDF8" />
        </svg>
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

