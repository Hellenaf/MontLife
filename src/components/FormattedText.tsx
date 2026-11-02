"use client";

import React from "react";

interface FormattedTextProps {
  text?: string | null;
  className?: string;
}

/**
 * Renders text with support for:
 * - Markdown bold (**texto**) converted to bold <strong> elements (removing raw asterisks)
 * - Line breaks (\n) rendered as <br />
 * - Preserves spacing and emojis cleanly
 */
export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, lIdx) => {
        const parts: React.ReactNode[] = [];
        let lastIdx = 0;
        const regex = /\*\*(.+?)\*\*/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          if (match.index > lastIdx) {
            parts.push(line.substring(lastIdx, match.index));
          }
          parts.push(
            <strong
              key={`b-${lIdx}-${match.index}`}
              className="font-semibold text-slate-900 dark:text-slate-100"
            >
              {match[1]}
            </strong>
          );
          lastIdx = regex.lastIndex;
        }

        if (lastIdx < line.length) {
          parts.push(line.substring(lastIdx));
        }

        return (
          <React.Fragment key={`l-${lIdx}`}>
            {parts.length > 0 ? parts : line}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}

