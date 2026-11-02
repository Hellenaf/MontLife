"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
  placeholder = "Selecione ou digite a categoria...",
  className = "",
  autoFocus = false,
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes((value || "").toLowerCase())
  );

  const displayList = filteredCategories.length > 0 ? filteredCategories : categories;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Single Unified Input & Menu Button */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-9 pl-3 pr-8 text-xs rounded-xl bg-slate-50 dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-medium transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          title="Ver todas as categorias"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180 text-purple-500" : ""}`} />
        </button>
      </div>

      {/* Floating Menu with all categories */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-[#16152a] border border-slate-200 dark:border-[#282647] shadow-xl py-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-purple-300/60 border-b border-slate-100 dark:border-[#282647]/50 mb-1">
            Categorias ({categories.length})
          </div>
          {displayList.map((cat) => {
            const isSelected = value.trim().toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange(cat);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <span>{cat}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

