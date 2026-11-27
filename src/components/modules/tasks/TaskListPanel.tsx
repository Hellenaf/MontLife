"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  Filter,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Video,
  Briefcase,
  User,
  X,
  ArrowUpDown,
  AlignJustify,
  LayoutList,
  Layers,
  CheckSquare,
  Square,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  PanelRightOpen,
} from "lucide-react";
import { Task, TaskStatus, Priority, ItemType } from "@/types";
import {
  useWorkspace,
  isTaskMatchingWorkspace,
  STATUS_LABELS,
} from "@/context/WorkspaceContext";
import { EmptyState, ConfirmDialog } from "@/components/ui/WorkspacePrimitives";
import { isTaskOverdue } from "@/lib/sla";
import {
  getTaskScheduleDate,
  formatTaskTimeRange,
  isTaskScheduledForDay,
} from "@/lib/taskSchedule";
import { format, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TaskQuickFilter =
  | "open"
  | "today"
  | "overdue"
  | "in_progress"
  | "critical"
  | "completed"
  | "canceled";

type GroupByOption = "none" | "status" | "priority" | "category" | "due";
type SortByOption = "due_asc" | "priority" | "recent";

const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };

interface TaskListPanelProps {
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  initialQuickFilter?: TaskQuickFilter;
  isDetailCollapsed?: boolean;
  onRestoreDetail?: () => void;
}

export function TaskListPanel({
  selectedTaskId,
  onSelectTask,
  initialQuickFilter = "open",
  isDetailCollapsed = false,
  onRestoreDetail,
}: TaskListPanelProps) {
  const {
    tasks,
    allCategories,
    accountFilter,
    prefs,
    setTaskDensity,
    handleQuickCreateTask,
    handleUpdateStatus,
    handleBulkUpdateStatus,
    handleBulkTransfer,
    handleBulkDelete,
    loadTasks,
    openNewTaskModal,
  } = useWorkspace();

  const [quickTab, setQuickTab] = useState<TaskQuickFilter>(initialQuickFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [sortBy, setSortBy] = useState<SortByOption>("due_asc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Quick-add inline
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P3");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  const tabCounts = useMemo(() => {
    const open = scopedTasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
    );
    return {
      open: open.length,
      today: open.filter((t) => isTaskScheduledForDay(t, today)).length,
      overdue: open.filter((t) =>
        isTaskOverdue(t.current_due_date || t.original_due_date, t.status)
      ).length,
      in_progress: open.filter((t) => t.status === "IN_PROGRESS").length,
      critical: open.filter((t) => t.priority === "P1" || t.priority === "P2").length,
      completed: scopedTasks.filter((t) => t.status === "COMPLETED").length,
      canceled: scopedTasks.filter((t) => t.status === "CANCELED").length,
    };
  }, [scopedTasks, today]);

  const visibleTasks = useMemo(() => {
    const filtered = scopedTasks.filter((t) => {
      if (quickTab === "open" && (t.status === "COMPLETED" || t.status === "CANCELED"))
        return false;
      if (
        quickTab === "today" &&
        (t.status === "COMPLETED" ||
          t.status === "CANCELED" ||
          !isTaskScheduledForDay(t, today))
      )
        return false;
      if (
        quickTab === "overdue" &&
        (t.status === "COMPLETED" ||
          t.status === "CANCELED" ||
          !isTaskOverdue(t.current_due_date || t.original_due_date, t.status))
      )
        return false;
      if (quickTab === "in_progress" && t.status !== "IN_PROGRESS") return false;
      if (
        quickTab === "critical" &&
        (t.status === "COMPLETED" ||
          t.status === "CANCELED" ||
          (t.priority !== "P1" && t.priority !== "P2"))
      )
        return false;
      if (quickTab === "completed" && t.status !== "COMPLETED") return false;
      if (quickTab === "canceled" && t.status !== "CANCELED") return false;

      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && (t.category || "Geral") !== categoryFilter)
        return false;
      if (itemTypeFilter !== "ALL" && (t.item_type || "task") !== itemTypeFilter)
        return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        const diff = (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
        if (diff !== 0) return diff;
      }
      if (sortBy === "recent") {
        return (
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
      }
      const dueA = new Date(getTaskScheduleDate(a) || 0).getTime();
      const dueB = new Date(getTaskScheduleDate(b) || 0).getTime();
      if (dueA !== dueB) return dueA - dueB;
      return (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
    });
  }, [
    scopedTasks,
    quickTab,
    priorityFilter,
    categoryFilter,
    itemTypeFilter,
    searchTerm,
    sortBy,
    today,
  ]);

  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items: visibleTasks }];
    }
    const map = new Map<string, { label: string; items: Task[] }>();

    for (const task of visibleTasks) {
      let key = "";
      let label = "";
      if (groupBy === "status") {
        key = task.status;
        label = STATUS_LABELS[task.status] || task.status;
      } else if (groupBy === "priority") {
        key = task.priority;
        label =
          task.priority === "P1"
            ? "P1 — Crítica"
            : task.priority === "P2"
            ? "P2 — Alta"
            : task.priority === "P3"
            ? "P3 — Média"
            : "P4 — Baixa";
      } else if (groupBy === "category") {
        key = task.category || "Sem categoria";
        label = key;
      } else if (groupBy === "due") {
        if (isTaskOverdue(task.current_due_date || task.original_due_date, task.status)) {
          key = "0-overdue";
          label = "Atrasadas";
        } else if (isTaskScheduledForDay(task, today)) {
          key = "1-today";
          label = "Para hoje";
        } else {
          key = "2-upcoming";
          label = "Próximos dias";
        }
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(task);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, label: v.label, items: v.items }));
  }, [visibleTasks, groupBy, today]);

  const activeAdvancedCount =
    (priorityFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0) +
    (itemTypeFilter !== "ALL" ? 1 : 0);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isSubmittingQuick) return;
    setIsSubmittingQuick(true);
    try {
      const created = await handleQuickCreateTask(
        quickTitle,
        quickTab === "in_progress" ? "IN_PROGRESS" : "TODO",
        quickPriority
      );
      if (created) {
        onSelectTask(created);
        setQuickTitle("");
      }
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const toggleSelectId = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleTasks.map((t) => t.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const handleCycleStatus = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const map: Record<TaskStatus, TaskStatus> = {
      TRIAGE: "IN_PROGRESS",
      TODO: "IN_PROGRESS",
      IN_PROGRESS: "WAITING",
      WAITING: "TODO",
      COMPLETED: "TODO",
      CANCELED: "TODO",
    };
    handleUpdateStatus(task.id, map[task.status] || "IN_PROGRESS");
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (visibleTasks.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = visibleTasks.findIndex((t) => t.id === selectedTaskId);
      const nextIdx =
        e.key === "ArrowDown"
          ? idx < visibleTasks.length - 1
            ? idx + 1
            : 0
          : idx > 0
          ? idx - 1
          : visibleTasks.length - 1;
      onSelectTask(visibleTasks[nextIdx]);
    }
  };

  const handleAiCategorize = async () => {
    setIsAiCategorizing(true);
    try {
      const res = await fetch("/api/tasks/ai-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) await loadTasks();
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const isCompact = prefs.taskDensity === "compact";

  const statusPill = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-lavender-soft text-brand border-lavender-mid";
      case "WAITING":
        return "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25";
      case "COMPLETED":
        return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
      case "CANCELED":
        return "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25";
      default:
        return "bg-sidebar text-ink-muted border-line";
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-surface border-r border-line overflow-hidden">
      {/* 1. Module Toolbar */}
      <div className="px-4 py-3 border-b border-line bg-sidebar space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar demandas, tags ou categorias..."
                className="w-full h-8.5 py-1.5 pl-8 pr-7 rounded-[9px] ml-input text-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Collapsible Advanced Filters */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-[8px] border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFiltersOpen || activeAdvancedCount > 0
                  ? "bg-lavender-soft border-brand text-brand"
                  : "bg-surface border-line text-ink-muted hover:text-ink"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeAdvancedCount > 0 && (
                <span className="px-1 rounded-full bg-brand text-brand-fg text-[10px] font-mono">
                  {activeAdvancedCount}
                </span>
              )}
            </button>

            {/* Density Toggle */}
            <button
              type="button"
              onClick={() => setTaskDensity(isCompact ? "comfortable" : "compact")}
              title={isCompact ? "Modo confortável" : "Modo compacto"}
              className="w-8 h-8 rounded-[8px] border border-line bg-surface text-ink-muted hover:text-brand hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer"
            >
              {isCompact ? (
                <LayoutList className="w-3.5 h-3.5" />
              ) : (
                <AlignJustify className="w-3.5 h-3.5" />
              )}
            </button>

            {/* AI Auto-Categorize */}
            <button
              type="button"
              onClick={handleAiCategorize}
              disabled={isAiCategorizing}
              title="Organizar categorias com IA"
              className="w-8 h-8 rounded-[8px] border border-line bg-surface text-ink-muted hover:text-brand hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              {isAiCategorizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </button>

            {isDetailCollapsed && onRestoreDetail && (
              <button
                type="button"
                onClick={onRestoreDetail}
                title="Abrir painel de detalhes"
                className="hidden lg:inline-flex items-center gap-1 h-8 px-2.5 rounded-[8px] bg-lavender-soft border border-lavender-mid text-brand text-[11px] font-semibold cursor-pointer"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
                <span>Detalhes</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {(
            [
              { id: "open", label: "Abertas", count: tabCounts.open },
              { id: "today", label: "Hoje", count: tabCounts.today },
              { id: "overdue", label: "Atrasadas", count: tabCounts.overdue },
              { id: "in_progress", label: "Em andamento", count: tabCounts.in_progress },
              { id: "critical", label: "P1/P2", count: tabCounts.critical },
              { id: "completed", label: "Concluídas", count: tabCounts.completed },
              { id: "canceled", label: "Canceladas", count: tabCounts.canceled },
            ] as const
          ).map((tab) => {
            const active = quickTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQuickTab(tab.id)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? "bg-lavender-soft text-ink border border-lavender-mid"
                    : "text-ink-muted hover:text-ink hover:bg-surface"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-80">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters + Sort + GroupBy */}
        {isFiltersOpen && (
          <div className="pt-2 border-t border-line grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as "ALL" | Priority)}
              className="h-8 px-2 rounded-[8px] ml-input text-[11px] font-medium"
            >
              <option value="ALL">Prioridade: Todas</option>
              <option value="P1">P1 — Crítica</option>
              <option value="P2">P2 — Alta</option>
              <option value="P3">P3 — Média</option>
              <option value="P4">P4 — Baixa</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2 rounded-[8px] ml-input text-[11px] font-medium"
            >
              <option value="ALL">Categoria: Todas</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value as "ALL" | ItemType)}
              className="h-8 px-2 rounded-[8px] ml-input text-[11px] font-medium"
            >
              <option value="ALL">Tipo: Todos</option>
              <option value="task">Tarefa</option>
              <option value="activity">Atividade</option>
              <option value="reminder">Lembrete</option>
            </select>

            <div className="relative">
              <ArrowUpDown className="w-3 h-3 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByOption)}
                className="w-full h-8 pl-6 pr-2 rounded-[8px] ml-input text-[11px] font-medium"
              >
                <option value="due_asc">Ordenar: Prazo</option>
                <option value="priority">Ordenar: Prioridade</option>
                <option value="recent">Ordenar: Recentes</option>
              </select>
            </div>

            <div className="relative">
              <Layers className="w-3 h-3 text-ink-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                className="w-full h-8 pl-6 pr-2 rounded-[8px] ml-input text-[11px] font-medium"
              >
                <option value="none">Agrupar: Nenhum</option>
                <option value="status">Agrupar: Status</option>
                <option value="priority">Agrupar: Prioridade</option>
                <option value="category">Agrupar: Categoria</option>
                <option value="due">Agrupar: Prazo</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Inline 1-Line Quick Create */}
      <form
        onSubmit={handleQuickAdd}
        className="px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={toggleSelectAllVisible}
          title="Selecionar/desmarcar todas visíveis"
          className="text-ink-muted hover:text-brand transition-colors cursor-pointer shrink-0"
        >
          {visibleTasks.length > 0 &&
          visibleTasks.every((t) => selectedIds.includes(t.id)) ? (
            <CheckSquare className="w-4 h-4 text-brand" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Adicionar demanda rápida e pressionar Enter..."
          className="flex-1 min-w-0 h-8 px-2.5 rounded-[8px] ml-input text-xs"
          disabled={isSubmittingQuick}
        />

        <div className="hidden sm:inline-flex items-center p-0.5 rounded-[8px] bg-canvas border border-line shrink-0">
          {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setQuickPriority(p)}
              className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                quickPriority === p
                  ? "bg-brand text-brand-fg"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!quickTitle.trim() || isSubmittingQuick}
          className="h-8 px-2.5 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Criar</span>
        </button>
      </form>

      {/* 3. Multi-Select Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2 bg-lavender-soft border-b border-lavender-mid flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-bold text-ink">
            {selectedIds.length} selecionada(s)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={async () => {
                await handleBulkUpdateStatus(selectedIds, "COMPLETED");
                setSelectedIds([]);
              }}
              className="px-2.5 py-1 rounded-[7px] bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" /> Concluir
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleBulkUpdateStatus(selectedIds, "IN_PROGRESS");
                setSelectedIds([]);
              }}
              className="px-2.5 py-1 rounded-[7px] bg-surface border border-line text-ink hover:border-brand text-[11px] font-semibold cursor-pointer"
            >
              Em Andamento
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleBulkTransfer(selectedIds, "work");
                setSelectedIds([]);
              }}
              className="px-2 py-1 rounded-[7px] bg-surface border border-line text-ink hover:border-brand text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
              title="Mover para Trabalho"
            >
              <ArrowRightLeft className="w-3 h-3" /> Trabalho
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleBulkTransfer(selectedIds, "personal");
                setSelectedIds([]);
              }}
              className="px-2 py-1 rounded-[7px] bg-surface border border-line text-ink hover:border-brand text-[11px] font-medium cursor-pointer"
              title="Mover para Pessoal"
            >
              Pessoal
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-2 py-1 rounded-[7px] bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Excluir
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1 text-ink-muted hover:text-ink cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Independently Scrollable Task List */}
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        className="flex-1 min-h-0 overflow-y-auto focus:outline-none"
      >
        {visibleTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-5 h-5" />}
            title="Nenhuma demanda encontrada"
            description="Ajuste os filtros ou crie uma nova demanda rapidamente na barra acima."
            action={
              <button
                type="button"
                onClick={() => openNewTaskModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nova demanda
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {groupedTasks.map((group) => (
              <div key={group.key}>
                {group.label && (
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-sidebar/95 backdrop-blur-xs border-b border-line flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                    <span>{group.label}</span>
                    <span className="font-mono">{group.items.length}</span>
                  </div>
                )}

                <div className="divide-y divide-line/80">
                  {group.items.map((task) => {
                    const isSelected = task.id === selectedTaskId;
                    const isChecked = selectedIds.includes(task.id);
                    const isDone = task.status === "COMPLETED";
                    const overdue = isTaskOverdue(
                      task.current_due_date || task.original_due_date,
                      task.status
                    );
                    const schedIso = getTaskScheduleDate(task);
                    const timeRange = formatTaskTimeRange(task);
                    let dueLabel = "";
                    if (schedIso) {
                      try {
                        const parsed = parseISO(schedIso);
                        dueLabel = isToday(parsed)
                          ? timeRange || "Hoje"
                          : format(parsed, "dd MMM", { locale: ptBR });
                      } catch {}
                    }
                    const isPersonal =
                      (task.account_type || "").toLowerCase().includes("pess") ||
                      task.transferred_to === "personal";

                    const priorityBar =
                      task.priority === "P1"
                        ? "bg-rose-500"
                        : task.priority === "P2"
                        ? "bg-amber-500"
                        : task.priority === "P3"
                        ? "bg-brand"
                        : "bg-line-strong";

                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectTask(task)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTask(task);
                          }
                        }}
                        className={`group relative flex items-center gap-2.5 px-3.5 transition-colors cursor-pointer ${
                          isCompact ? "py-2" : "py-3"
                        } ${
                          isSelected
                            ? "bg-lavender-soft/80"
                            : "hover:bg-lavender-soft/35"
                        }`}
                      >
                        {/* Priority Left Accent Strip */}
                        <span
                          className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${priorityBar}`}
                        />

                        {/* Multi-Select Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectId(e, task.id)}
                          aria-label="Selecionar demanda"
                          className={`shrink-0 transition-opacity cursor-pointer ${
                            isChecked
                              ? "opacity-100 text-brand"
                              : "opacity-35 group-hover:opacity-100 text-ink-muted hover:text-brand"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* 1-Click Complete Circle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(
                              task.id,
                              isDone ? "TODO" : "COMPLETED"
                            );
                          }}
                          title={isDone ? "Reabrir demanda" : "Concluir demanda"}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-line-strong hover:border-brand hover:bg-surface"
                          }`}
                        >
                          {isDone && <Check className="w-2.5 h-2.5" />}
                        </button>

                        {/* Title + Metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-[13px] font-semibold truncate ${
                                isDone ? "line-through text-ink-muted" : "text-ink"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.meet_link && (
                              <a
                                href={task.meet_link}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Entrar no Google Meet"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[6px] bg-lavender-soft text-brand text-[10px] font-semibold shrink-0 hover:bg-lavender-mid"
                              >
                                <Video className="w-2.5 h-2.5" />
                                Meet
                              </a>
                            )}
                          </div>

                          {!isCompact && (
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-ink-muted">
                              <span className="inline-flex items-center gap-1">
                                {isPersonal ? (
                                  <User className="w-3 h-3" />
                                ) : (
                                  <Briefcase className="w-3 h-3" />
                                )}
                                {isPersonal ? "Pessoal" : "Trabalho"}
                              </span>
                              <span className="truncate max-w-[160px]">
                                {task.category || "Geral"}
                              </span>
                              {dueLabel && (
                                <span
                                  className={`inline-flex items-center gap-1 font-mono ${
                                    overdue
                                      ? "text-rose-600 dark:text-rose-400 font-semibold"
                                      : ""
                                  }`}
                                >
                                  {overdue ? (
                                    <AlertCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {dueLabel}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Priority & Clickable Status */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-mono font-bold ${
                              task.priority === "P1"
                                ? "bg-rose-500/12 text-rose-600 dark:text-rose-400"
                                : task.priority === "P2"
                                ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                                : "bg-lavender-soft text-brand"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCycleStatus(e, task)}
                            title="Clique para avançar status"
                            className={`hidden sm:inline-flex px-2 py-0.5 rounded-[7px] border text-[10px] font-semibold transition-colors cursor-pointer ${statusPill(
                              task.status
                            )}`}
                          >
                            {STATUS_LABELS[task.status] || task.status}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        title={`Excluir ${selectedIds.length} demanda(s)?`}
        description="Esta ação removerá permanentemente as demandas selecionadas."
        confirmLabel="Excluir selecionadas"
        onCancel={() => setIsBulkDeleteOpen(false)}
        onConfirm={async () => {
          const ids = [...selectedIds];
          setIsBulkDeleteOpen(false);
          setSelectedIds([]);
          await handleBulkDelete(ids);
        }}
      />
    </div>
  );
}
