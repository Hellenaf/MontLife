"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Sparkles,
  LayoutDashboard,
  Sunrise,
  CheckSquare,
  Kanban,
  Calendar,
  StickyNote,
  BookOpen,
  BarChart3,
  Settings,
  Plus,
  Sun,
  Moon,
  PanelLeft,
  ArrowRight,
  Clock,
  X,
  CornerDownLeft,
} from "lucide-react";
import { Task, Note } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getTaskScheduleDate } from "@/lib/taskSchedule";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: Note[];
  onSelectTask: (task: Task) => void;
  onSelectNote?: (note?: Note) => void;
  onNavigate: (nav: string) => void;
  onOpenNewTaskModal: (initialText?: string) => void;
  onOpenAccountsModal: () => void;
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
  onToggleKpiPanel?: () => void;
  theme: "light" | "dark";
  isSidebarCollapsed?: boolean;
  isKpiPanelOpen?: boolean;
}

interface PaletteItem {
  id: string;
  group: "ai" | "tasks" | "notes" | "wiki" | "nav" | "actions";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "rose" | "amber" | "brand" | "emerald" | "muted";
  icon: React.ReactNode;
  onSelect: () => void;
}

const GROUP_LABELS: Record<PaletteItem["group"], string> = {
  ai: "Criação rápida",
  tasks: "Demandas",
  notes: "Anotações",
  wiki: "Wiki técnica",
  nav: "Ir para módulo",
  actions: "Ações rápidas",
};

export function CommandPalette({
  isOpen,
  onClose,
  tasks,
  notes,
  onSelectTask,
  onSelectNote,
  onNavigate,
  onOpenNewTaskModal,
  onOpenAccountsModal,
  onToggleTheme,
  onToggleSidebar,
  theme,
  isSidebarCollapsed,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    if (q.length >= 2) {
      result.push({
        id: "create-with-query",
        group: "ai",
        title: `Criar demanda: "${query.trim()}"`,
        subtitle: "Abrir formulário com título pré-preenchido",
        badge: "Nova",
        badgeTone: "brand",
        icon: <Plus className="w-4 h-4 text-brand" />,
        onSelect: () => {
          onOpenNewTaskModal(query.trim());
          onClose();
        },
      });
    }

    // Matching tasks
    const matchedTasks = tasks
      .filter((t) => {
        if (!q) return t.status !== "COMPLETED" && t.status !== "CANCELED";
        return (
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .slice(0, q ? 8 : 5);

    for (const t of matchedTasks) {
      const sched = getTaskScheduleDate(t);
      let dueLabel = "";
      if (sched) {
        try {
          dueLabel = format(parseISO(sched), "dd MMM HH:mm", { locale: ptBR });
        } catch {}
      }
      result.push({
        id: `task-${t.id}`,
        group: "tasks",
        title: t.title,
        subtitle: `${t.category || "Geral"}${dueLabel ? ` • ${dueLabel}` : ""}`,
        badge: t.priority,
        badgeTone:
          t.priority === "P1"
            ? "rose"
            : t.priority === "P2"
            ? "amber"
            : t.priority === "P3"
            ? "brand"
            : "muted",
        icon: <CheckSquare className="w-4 h-4 text-brand" />,
        onSelect: () => {
          onSelectTask(t);
          onClose();
        },
      });
    }

    // Matching notes
    const matchedNotes = notes
      .filter((n) => !n.archived)
      .filter((n) => {
        if (!q) return Boolean(n.pinned);
        return (
          (n.title || "").toLowerCase().includes(q) ||
          (n.content || "").toLowerCase().includes(q) ||
          (n.tags || []).some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .slice(0, q ? 5 : 2);

    for (const n of matchedNotes) {
      result.push({
        id: `note-${n.id}`,
        group: "notes",
        title: n.title || "Nota sem título",
        subtitle: (n.content || "").slice(0, 72) || "Anotação rápida",
        badge: n.pinned ? "Fixada" : "Nota",
        badgeTone: "muted",
        icon: <StickyNote className="w-4 h-4 text-brand" />,
        onSelect: () => {
          onSelectNote?.(n);
          onClose();
        },
      });
    }

    // Matching wiki resolutions
    if (q) {
      const wikiHits = tasks
        .filter(
          (t) =>
            t.resolution_notes &&
            ((t.title || "").toLowerCase().includes(q) ||
              t.resolution_notes.toLowerCase().includes(q))
        )
        .slice(0, 3);
      for (const w of wikiHits) {
        result.push({
          id: `wiki-${w.id}`,
          group: "wiki",
          title: w.title,
          subtitle: w.resolution_notes?.slice(0, 80),
          badge: "Solução",
          badgeTone: "emerald",
          icon: <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          onSelect: () => {
            onNavigate("wiki");
            onClose();
          },
        });
      }
    }

    // Navigation items (all 10 modules)
    const navList: { id: string; title: string; subtitle: string; icon: React.ReactNode }[] = [
      { id: "visao", title: "Visão geral", subtitle: "Central de acesso e resumo", icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: "meu-dia", title: "Meu dia", subtitle: "Planejamento e prioridades diárias", icon: <Sunrise className="w-4 h-4" /> },
      { id: "demandas", title: "Demandas", subtitle: "Gestão operacional Master-Detail", icon: <CheckSquare className="w-4 h-4" /> },
      { id: "kanban", title: "Kanban", subtitle: "Quadro visual por status", icon: <Kanban className="w-4 h-4" /> },
      { id: "agenda", title: "Agenda", subtitle: "Calendário mensal, semanal e diário", icon: <Calendar className="w-4 h-4" /> },
      { id: "anotacoes", title: "Anotações", subtitle: "Workspace editorial com IA", icon: <StickyNote className="w-4 h-4" /> },
      { id: "wiki", title: "Wiki técnica", subtitle: "Base de soluções e procedimentos", icon: <BookOpen className="w-4 h-4" /> },
      { id: "assistente-ia", title: "Assistente IA", subtitle: "Ambiente dedicado Gemini AI", icon: <Sparkles className="w-4 h-4" /> },
      { id: "relatorios", title: "Relatórios", subtitle: "Indicadores analíticos, SLA e PDF A4", icon: <BarChart3 className="w-4 h-4" /> },
      { id: "configuracoes", title: "Configurações", subtitle: "Perfil, tema, contas Google e layout", icon: <Settings className="w-4 h-4" /> },
    ];

    for (const nav of navList) {
      if (
        !q ||
        nav.title.toLowerCase().includes(q) ||
        nav.subtitle.toLowerCase().includes(q)
      ) {
        result.push({
          id: `nav-${nav.id}`,
          group: "nav",
          title: nav.title,
          subtitle: nav.subtitle,
          icon: <span className="text-brand">{nav.icon}</span>,
          onSelect: () => {
            onNavigate(nav.id);
            onClose();
          },
        });
      }
    }

    // Actions
    const actionsList: PaletteItem[] = [
      {
        id: "act-new-task",
        group: "actions",
        title: "Nova Demanda",
        subtitle: "Abrir formulário completo",
        icon: <Plus className="w-4 h-4 text-brand" />,
        onSelect: () => {
          onOpenNewTaskModal("");
          onClose();
        },
      },
      {
        id: "act-theme",
        group: "actions",
        title: theme === "dark" ? "Mudar para Modo Claro (Creme & Roxo)" : "Mudar para Modo Escuro (Roxo & Lavanda)",
        subtitle: "Alternar aparência global",
        icon:
          theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-brand" />
          ),
        onSelect: () => {
          onToggleTheme();
          onClose();
        },
      },
      ...(onToggleSidebar
        ? [
            {
              id: "act-sidebar",
              group: "actions" as const,
              title: isSidebarCollapsed ? "Expandir sidebar lateral" : "Recolher sidebar lateral",
              subtitle: "Atalho de teclado: [",
              icon: <PanelLeft className="w-4 h-4 text-brand" />,
              onSelect: () => {
                onToggleSidebar();
                onClose();
              },
            },
          ]
        : []),
      {
        id: "act-accounts",
        group: "actions",
        title: "Gerenciar Contas Google",
        subtitle: "Vincular ou sincronizar espaços",
        icon: <Settings className="w-4 h-4 text-brand" />,
        onSelect: () => {
          onOpenAccountsModal();
          onClose();
        },
      },
    ];

    for (const act of actionsList) {
      if (
        !q ||
        act.title.toLowerCase().includes(q) ||
        (act.subtitle || "").toLowerCase().includes(q)
      ) {
        result.push(act);
      }
    }

    return result;
  }, [
    query,
    tasks,
    notes,
    theme,
    isSidebarCollapsed,
    onOpenNewTaskModal,
    onSelectTask,
    onSelectNote,
    onNavigate,
    onToggleTheme,
    onToggleSidebar,
    onOpenAccountsModal,
    onClose,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0
        );
      } else if (e.key === "Enter" && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].onSelect();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const badgeClasses = (tone?: PaletteItem["badgeTone"]) => {
    switch (tone) {
      case "rose":
        return "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25";
      case "amber":
        return "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25";
      case "emerald":
        return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
      case "brand":
        return "bg-lavender-soft text-brand border-lavender-mid";
      default:
        return "bg-sidebar text-ink-muted border-line";
    }
  };

  let runningIndex = -1;
  const grouped = (["ai", "tasks", "notes", "wiki", "nav", "actions"] as const)
    .map((groupKey) => ({
      groupKey,
      label: GROUP_LABELS[groupKey],
      items: items.filter((i) => i.group === groupKey),
    }))
    .filter((g) => g.items.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-[#1D1925]/60 backdrop-blur-[2px] flex items-start justify-center pt-[11vh] px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[14px] bg-surface border border-line shadow-popover overflow-hidden flex flex-col max-h-[74vh]"
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-4 h-13 py-3 border-b border-line bg-sidebar">
          <Search className="w-4 h-4 text-brand shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar demandas, notas, wiki ou ir para um módulo..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded-[6px] bg-surface border border-line font-mono text-[10px] text-ink-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {grouped.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-muted">
              Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map((section) => (
              <div key={section.groupKey} className="space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-[9px] text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-lavender-soft text-ink"
                          : "text-ink hover:bg-lavender-soft/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-[8px] bg-sidebar border border-line flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[11px] text-ink-muted truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-[6px] border text-[10px] font-mono font-semibold ${badgeClasses(
                              item.badgeTone
                            )}`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {active && <ArrowRight className="w-3.5 h-3.5 text-brand" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-line bg-sidebar flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Abrir
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> ↑ ↓ Navegar
            </span>
          </div>
          <span className="font-mono text-[10px]">MontLife Command Palette</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
