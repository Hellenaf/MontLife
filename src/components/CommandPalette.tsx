"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Sparkles,
  CheckSquare,
  LayoutGrid,
  Calendar,
  StickyNote,
  BookOpen,
  BarChart3,
  Settings,
  Plus,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
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
  onSelectNote?: () => void;
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
  badgeTone?: "rose" | "amber" | "indigo" | "emerald" | "slate" | "purple";
  icon: React.ReactNode;
  onSelect: () => void;
}

const GROUP_LABELS: Record<PaletteItem["group"], string> = {
  ai: "Criar com Inteligência Artificial",
  tasks: "Demandas",
  notes: "Bloco de Notas",
  wiki: "Wiki Técnica (Soluções)",
  nav: "Navegar para",
  actions: "Ações Rápidas",
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
  onToggleKpiPanel,
  theme,
  isSidebarCollapsed,
  isKpiPanelOpen,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteItem[] = [];

    // 1. Direct AI creation action when typing text
    if (q.length >= 2) {
      list.push({
        id: "ai-create",
        group: "ai",
        title: `Criar demanda com IA: "${query.trim()}"`,
        subtitle: "Abrir triagem inteligente preenchida com este texto",
        badge: "IA",
        badgeTone: "purple",
        icon: <Sparkles className="w-4 h-4 text-purple-500" />,
        onSelect: () => {
          onClose();
          onOpenNewTaskModal(query.trim());
        },
      });
    }

    // 2. Matching Tasks
    const matchedTasks = tasks
      .filter((t) => {
        if (!q) return t.status !== "COMPLETED" && t.status !== "CANCELED";
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .slice(0, q ? 6 : 4);

    for (const task of matchedTasks) {
      let dueLabel = "";
      try {
        dueLabel = format(parseISO(getTaskScheduleDate(task)), "dd/MM", { locale: ptBR });
      } catch {
        dueLabel = "";
      }
      list.push({
        id: `task-${task.id}`,
        group: "tasks",
        title: task.title,
        subtitle: `${task.category}${dueLabel ? ` • ${dueLabel}` : ""}`,
        badge: task.priority,
        badgeTone:
          task.priority === "P1"
            ? "rose"
            : task.priority === "P2"
            ? "amber"
            : task.priority === "P3"
            ? "indigo"
            : "slate",
        icon: <CheckSquare className="w-4 h-4 text-indigo-500" />,
        onSelect: () => {
          onClose();
          onSelectTask(task);
        },
      });
    }

    // 3. Matching Notes
    if (q) {
      const matchedNotes = notes
        .filter(
          (n) =>
            !n.archived &&
            ((n.title || "").toLowerCase().includes(q) ||
              (n.content || "").toLowerCase().includes(q) ||
              (n.tags || []).some((tag) => tag.toLowerCase().includes(q)))
        )
        .slice(0, 4);

      for (const note of matchedNotes) {
        list.push({
          id: `note-${note.id}`,
          group: "notes",
          title: note.title || "Nota sem título",
          subtitle: (note.content || "").slice(0, 72),
          badge: "Nota",
          badgeTone: "amber",
          icon: <StickyNote className="w-4 h-4 text-amber-500" />,
          onSelect: () => {
            onClose();
            if (onSelectNote) onSelectNote();
            else onNavigate("notas");
          },
        });
      }

      // 4. Matching Wiki Solutions
      const matchedWiki = tasks
        .filter(
          (t) =>
            t.status === "COMPLETED" &&
            Boolean(t.resolution_notes) &&
            (t.title.toLowerCase().includes(q) ||
              (t.resolution_notes || "").toLowerCase().includes(q))
        )
        .slice(0, 3);

      for (const wt of matchedWiki) {
        list.push({
          id: `wiki-${wt.id}`,
          group: "wiki",
          title: wt.title,
          subtitle: (wt.resolution_notes || "").slice(0, 80),
          badge: "Solução",
          badgeTone: "emerald",
          icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
          onSelect: () => {
            onClose();
            onSelectTask(wt);
          },
        });
      }
    }

    // 5. Navigation items
    const navItems: PaletteItem[] = [
      {
        id: "nav-tarefas",
        group: "nav",
        title: "Minhas Demandas",
        subtitle: "Lista, detalhes e checklist operacional",
        icon: <CheckSquare className="w-4 h-4 text-indigo-500" />,
        onSelect: () => {
          onClose();
          onNavigate("tarefas");
        },
      },
      {
        id: "nav-kanban",
        group: "nav",
        title: "Fluxo Kanban",
        subtitle: "Quadro visual por etapas com drag-and-drop",
        icon: <LayoutGrid className="w-4 h-4 text-purple-500" />,
        onSelect: () => {
          onClose();
          onNavigate("kanban");
        },
      },
      {
        id: "nav-agenda",
        group: "nav",
        title: "Agenda do Dia",
        subtitle: "Demandas agendadas + Google Calendar",
        icon: <Calendar className="w-4 h-4 text-emerald-500" />,
        onSelect: () => {
          onClose();
          onNavigate("agenda");
        },
      },
      {
        id: "nav-notas",
        group: "nav",
        title: "Bloco de Notas",
        subtitle: "Anotações de reunião, ideias e extração com IA",
        icon: <StickyNote className="w-4 h-4 text-amber-500" />,
        onSelect: () => {
          onClose();
          onNavigate("notas");
        },
      },
      {
        id: "nav-wiki",
        group: "nav",
        title: "Wiki Técnica",
        subtitle: "Base de soluções já resolvidas",
        icon: <BookOpen className="w-4 h-4 text-sky-500" />,
        onSelect: () => {
          onClose();
          onNavigate("wiki");
        },
      },
      {
        id: "nav-relatorios",
        group: "nav",
        title: "Relatórios & Prestação de Contas",
        subtitle: "SLA, Lead Time e exportação executiva",
        icon: <BarChart3 className="w-4 h-4 text-rose-500" />,
        onSelect: () => {
          onClose();
          onNavigate("relatorios");
        },
      },
    ];

    // 6. Quick Actions
    const actionItems: PaletteItem[] = [
      {
        id: "act-new-task",
        group: "actions",
        title: "Nova Demanda Detalhada",
        subtitle: "Abrir formulário completo com IA, horário e Google Meet",
        icon: <Plus className="w-4 h-4 text-indigo-500" />,
        onSelect: () => {
          onClose();
          onOpenNewTaskModal("");
        },
      },
      {
        id: "act-theme",
        group: "actions",
        title: theme === "dark" ? "Mudar para Tema Claro" : "Mudar para Tema Escuro",
        subtitle: "Alternar aparência da interface",
        icon:
          theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
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
              title: isSidebarCollapsed ? "Expandir Menu Lateral" : "Recolher Menu Lateral",
              subtitle: "Atalho de teclado: [",
              icon: <PanelLeft className="w-4 h-4 text-slate-500" />,
              onSelect: () => {
                onToggleSidebar();
                onClose();
              },
            },
          ]
        : []),
      ...(onToggleKpiPanel
        ? [
            {
              id: "act-kpi",
              group: "actions" as const,
              title: isKpiPanelOpen ? "Ocultar Painel de Métricas" : "Mostrar Painel de Métricas",
              subtitle: "Ampliar área de leitura dos detalhes",
              icon: <PanelRight className="w-4 h-4 text-slate-500" />,
              onSelect: () => {
                onToggleKpiPanel();
                onClose();
              },
            },
          ]
        : []),
      {
        id: "act-accounts",
        group: "actions",
        title: "Gerenciar Contas Google & Configurações",
        subtitle: "Vincular workspaces Trabalho / Pessoal",
        icon: <Settings className="w-4 h-4 text-slate-500" />,
        onSelect: () => {
          onClose();
          onOpenAccountsModal();
        },
      },
    ];

    const filterStatic = (item: PaletteItem) =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.subtitle || "").toLowerCase().includes(q);

    list.push(...navItems.filter(filterStatic));
    list.push(...actionItems.filter(filterStatic));

    return list;
  }, [
    query,
    tasks,
    notes,
    theme,
    isSidebarCollapsed,
    isKpiPanelOpen,
    onClose,
    onSelectTask,
    onSelectNote,
    onNavigate,
    onOpenNewTaskModal,
    onOpenAccountsModal,
    onToggleTheme,
    onToggleSidebar,
    onToggleKpiPanel,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen || typeof document === "undefined") return null;

  const badgeToneClasses: Record<NonNullable<PaletteItem["badgeTone"]>, string> = {
    rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
    slate: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };

  // Group items preserving order
  const grouped: { group: PaletteItem["group"]; entries: { item: PaletteItem; flatIdx: number }[] }[] = [];
  items.forEach((item, flatIdx) => {
    const existing = grouped.find((g) => g.group === item.group);
    if (existing) existing.entries.push({ item, flatIdx });
    else grouped.push({ group: item.group, entries: [{ item, flatIdx }] });
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[13vh] px-3 bg-slate-950/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#13131A] border border-slate-200 dark:border-[#262632] shadow-popover overflow-hidden flex flex-col max-h-[74vh] animate-in zoom-in-95 duration-150"
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/90">
          <Search className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar demandas, notas, Wiki ou digitar ação..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center space-y-1.5 text-slate-400">
              <Clock className="w-6 h-6 mx-auto opacity-40" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nenhum resultado encontrado
              </p>
              <p className="text-[11px]">
                Tente outro termo ou pressione Enter para criar uma nova demanda.
              </p>
            </div>
          ) : (
            grouped.map(({ group, entries }) => (
              <div key={group} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {GROUP_LABELS[group]}
                </div>
                {entries.map(({ item, flatIdx }) => {
                  const isSelected = flatIdx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-idx={flatIdx}
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-white dark:bg-[#1a1b2b] border-indigo-200 dark:border-indigo-500/40 shadow-2xs"
                              : "bg-slate-50 dark:bg-zinc-900/70 border-slate-200/70 dark:border-zinc-800"
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold font-mono ${
                              badgeToneClasses[item.badgeTone || "slate"]
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-zinc-800/90 bg-slate-50/70 dark:bg-[#0e0f18] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono text-[10px]">
                ↑↓
              </kbd>
              Navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono text-[10px] inline-flex items-center">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              Abrir
            </span>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
            MontLife Command
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

