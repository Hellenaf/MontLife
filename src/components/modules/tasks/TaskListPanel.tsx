"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  PanelRightOpen,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Play,
  Pause,
  CalendarClock,
  Ban,
  RotateCcw,
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

export type TaskScopeFilter = "all" | "today" | "overdue" | "critical";
type SortByOption = "due_asc" | "priority" | "recent";
type SectionKey = "open" | "completed" | "canceled";

const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };

interface TaskListPanelProps {
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  initialScopeFilter?: TaskScopeFilter;
  isDetailCollapsed?: boolean;
  onRestoreDetail?: () => void;
}

export function TaskListPanel({
  selectedTaskId,
  onSelectTask,
  initialScopeFilter = "all",
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
    handleTransferTask,
    handleDeleteTask,
    handleReopenTask,
    requestResolution,
    requestExtendDeadline,
    requestCancelTask,
    loadTasks,
    openNewTaskModal,
  } = useWorkspace();

  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<TaskScopeFilter>(initialScopeFilter);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [sortBy, setSortBy] = useState<SortByOption>("due_asc");
  const [isFiltersOpen, setIsFiltersOpen] = useState(initialScopeFilter !== "all");

  // 3 clean collapsible sections: Abertas, Concluídas, Canceladas
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    open: true,
    completed: false,
    canceled: false,
  });

  // Inline Quick-Add
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P3");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Per-row Action Popover + Delete Confirmation
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!activeActionMenuId) return;
    const onOutside = () => setActiveActionMenuId(null);
    document.addEventListener("click", onOutside);
    return () => document.removeEventListener("click", onOutside);
  }, [activeActionMenuId]);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  const filteredTasks = useMemo(() => {
    const filtered = scopedTasks.filter((t) => {
      if (scopeFilter === "today" && !isTaskScheduledForDay(t, today)) return false;
      if (
        scopeFilter === "overdue" &&
        !isTaskOverdue(t.current_due_date || t.original_due_date, t.status)
      ) {
        return false;
      }
      if (scopeFilter === "critical" && t.priority !== "P1" && t.priority !== "P2") {
        return false;
      }

      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && (t.category || "Geral") !== categoryFilter) {
        return false;
      }
      if (itemTypeFilter !== "ALL" && (t.item_type || "task") !== itemTypeFilter) {
        return false;
      }

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
        const diff =
          (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
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
    scopeFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    itemTypeFilter,
    searchTerm,
    sortBy,
    today,
  ]);

  const sections = useMemo(() => {
    const open = filteredTasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
    );
    const completed = filteredTasks.filter((t) => t.status === "COMPLETED");
    const canceled = filteredTasks.filter((t) => t.status === "CANCELED");

    return [
      {
        key: "open" as SectionKey,
        label: "Abertas",
        dotClass: "bg-brand",
        items: open,
      },
      {
        key: "completed" as SectionKey,
        label: "Concluídas",
        dotClass: "bg-emerald-500",
        items: completed,
      },
      {
        key: "canceled" as SectionKey,
        label: "Canceladas",
        dotClass: "bg-rose-500",
        items: canceled,
      },
    ];
  }, [filteredTasks]);

  const flatExpandedTasks = useMemo(
    () => sections.flatMap((s) => (openSections[s.key] ? s.items : [])),
    [sections, openSections]
  );

  const activeFiltersCount =
    (scopeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (priorityFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0) +
    (itemTypeFilter !== "ALL" ? 1 : 0);

  const clearAllFilters = () => {
    setScopeFilter("all");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
    setItemTypeFilter("ALL");
  };

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isSubmittingQuick) return;
    setIsSubmittingQuick(true);
    try {
      const created = await handleQuickCreateTask(quickTitle, "TODO", quickPriority);
      if (created) {
        setOpenSections((prev) => ({ ...prev, open: true }));
        onSelectTask(created);
        setQuickTitle("");
      }
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleCycleOpenStatus = (e: React.MouseEvent, task: Task) => {
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

  const getOpenStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-lavender-soft text-brand border-lavender-mid";
      case "WAITING":
        return "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25";
      case "TRIAGE":
        return "bg-lavender-soft/60 text-ink-muted border-line";
      default:
        return "bg-sidebar text-ink-muted border-line";
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (flatExpandedTasks.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = flatExpandedTasks.findIndex((t) => t.id === selectedTaskId);
      const nextIdx =
        e.key === "ArrowDown"
          ? idx < flatExpandedTasks.length - 1
            ? idx + 1
            : 0
          : idx > 0
          ? idx - 1
          : flatExpandedTasks.length - 1;
      onSelectTask(flatExpandedTasks[nextIdx]);
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

  return (
    <div className="h-full w-full flex flex-col bg-surface border-r border-line overflow-hidden">
      {/* 1. Compact Toolbar: Search + Collapsible Filters + Density + AI */}
      <div className="px-4 py-3 border-b border-line bg-sidebar space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 min-w-0">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              className={`h-8 px-2.5 rounded-[8px] border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFiltersOpen || activeFiltersCount > 0
                  ? "bg-lavender-soft border-brand text-brand"
                  : "bg-surface border-line text-ink-muted hover:text-ink"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="px-1 rounded-full bg-brand text-brand-fg text-[10px] font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>

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

        {/* Collapsible Filter Panel (Hoje, Atrasadas, Críticas, Prioridade, Categoria, Tipo, Ordenação) */}
        {isFiltersOpen && (
          <div className="pt-2.5 border-t border-line space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "Todos os prazos" },
                  { id: "today", label: "Para hoje" },
                  { id: "overdue", label: "Atrasadas" },
                  { id: "critical", label: "Críticas (P1/P2)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScopeFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border transition-colors cursor-pointer ${
                    scopeFilter === opt.id
                      ? "bg-lavender-soft border-brand text-brand"
                      : "bg-surface border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-auto text-[11px] font-semibold text-brand hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | TaskStatus)}
                className="h-8 px-2 rounded-[8px] ml-input text-[11px] font-medium"
              >
                <option value="ALL">Status: Todos</option>
                <option value="TODO">A Fazer</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="WAITING">Aguardando</option>
                <option value="COMPLETED">Concluídas</option>
                <option value="CANCELED">Canceladas</option>
              </select>

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
            </div>
          </div>
        )}
      </div>

      {/* 2. Inline 1-Line Quick Create */}
      <form
        onSubmit={handleQuickAdd}
        className="px-4 py-2.5 border-b border-line bg-surface flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Adicionar demanda rápida e pressionar Enter..."
          className="flex-1 min-w-0 h-8 px-3 rounded-[8px] ml-input text-xs"
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

      {/* 3. Collapsible Status Dropdown Accordions (A Fazer, Em Andamento, Aguardando, Concluídas, Canceladas) */}
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        className="flex-1 min-h-0 overflow-y-auto focus:outline-none p-2.5 space-y-2 bg-canvas/40"
      >
        {scopedTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Nenhuma demanda cadastrada"
            description="Crie sua primeira demanda usando a barra rápida acima ou o botão Criar."
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
          sections.map((section) => {
            const isOpen = openSections[section.key];
            return (
              <div
                key={section.key}
                className="rounded-[11px] bg-surface border border-line overflow-visible"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={isOpen}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer rounded-t-[11px] ${
                    isOpen ? "bg-sidebar border-b border-line" : "hover:bg-sidebar rounded-b-[11px]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    )}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${section.dotClass}`} />
                    <span className="text-xs font-bold text-ink truncate">
                      {section.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[7px] bg-canvas border border-line text-[10px] font-mono font-semibold text-ink-muted shrink-0">
                    {section.items.length}
                  </span>
                </button>

                {/* Accordion Items */}
                {isOpen && (
                  <div className="divide-y divide-line/80">
                    {section.items.length === 0 ? (
                      <div className="px-4 py-3 text-[11px] text-ink-muted italic">
                        Nenhuma demanda em {section.label.toLowerCase()}.
                      </div>
                    ) : (
                      section.items.map((task) => {
                        const isSelected = task.id === selectedTaskId;
                        const isDone = task.status === "COMPLETED";
                        const isCanceled = task.status === "CANCELED";
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

                        const menuOpen = activeActionMenuId === task.id;

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
                              isCompact ? "py-2" : "py-2.5"
                            } ${
                              isSelected
                                ? "bg-lavender-soft/80"
                                : "hover:bg-lavender-soft/35"
                            }`}
                          >
                            {/* Priority Accent */}
                            <span
                              className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${priorityBar}`}
                            />

                            {/* ONLY the circular completion button (bolinha!) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDone || isCanceled) {
                                  handleReopenTask(task.id);
                                } else {
                                  handleUpdateStatus(task.id, "COMPLETED");
                                }
                              }}
                              title={
                                isDone || isCanceled
                                  ? "Reabrir demanda"
                                  : "Concluir demanda rapidamente"
                              }
                              className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                isDone
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : isCanceled
                                  ? "bg-rose-500/15 border-rose-500/40 text-rose-500"
                                  : "border-line-strong hover:border-brand hover:bg-surface"
                              }`}
                            >
                              {isDone && <Check className="w-2.5 h-2.5" />}
                              {isCanceled && <X className="w-2.5 h-2.5" />}
                            </button>

                            {/* Main Title + Metadata */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs sm:text-[13px] font-semibold truncate ${
                                    isDone || isCanceled
                                      ? "line-through text-ink-muted"
                                      : "text-ink"
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
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-ink-muted">
                                  <span className="inline-flex items-center gap-1">
                                    {isPersonal ? (
                                      <User className="w-3 h-3" />
                                    ) : (
                                      <Briefcase className="w-3 h-3" />
                                    )}
                                    {isPersonal ? "Pessoal" : "Trabalho"}
                                  </span>
                                  <span className="truncate max-w-[150px]">
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

                            {/* Status Indicator (inside Abertas) + Priority Badge + Row Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isDone && !isCanceled && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCycleOpenStatus(e, task)}
                                  title="Clique para alternar status (A Fazer → Em Andamento → Aguardando)"
                                  className={`px-2 py-0.5 rounded-[7px] border text-[10px] font-semibold transition-colors cursor-pointer ${getOpenStatusBadge(
                                    task.status
                                  )}`}
                                >
                                  {STATUS_LABELS[task.status] || "A Fazer"}
                                </button>
                              )}

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

                              {/* Quick inline play/pause or complete with notes + Actions Menu */}
                              {!isDone && !isCanceled && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(
                                      task.id,
                                      task.status === "IN_PROGRESS" ? "WAITING" : "IN_PROGRESS"
                                    );
                                  }}
                                  title={
                                    task.status === "IN_PROGRESS"
                                      ? "Mover para Aguardando"
                                      : "Iniciar (Em Andamento)"
                                  }
                                  className="hidden sm:flex w-7 h-7 rounded-[7px] items-center justify-center text-ink-muted hover:text-brand hover:bg-surface transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                >
                                  {task.status === "IN_PROGRESS" ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(menuOpen ? null : task.id);
                                  }}
                                  title="Ações da demanda"
                                  aria-label="Ações da demanda"
                                  className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors cursor-pointer ${
                                    menuOpen
                                      ? "bg-surface text-brand border border-line"
                                      : "text-ink-muted hover:text-ink hover:bg-surface"
                                  }`}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {menuOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-[calc(100%+4px)] w-52 rounded-[11px] bg-surface border border-line shadow-popover p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                                  >
                                    {!isDone && !isCanceled ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveActionMenuId(null);
                                            requestResolution(task);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Concluir com solução</span>
                                        </button>

                                        {task.status !== "IN_PROGRESS" && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleUpdateStatus(task.id, "IN_PROGRESS");
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft cursor-pointer"
                                          >
                                            <Play className="w-3.5 h-3.5 text-brand" />
                                            <span>Mover para Em andamento</span>
                                          </button>
                                        )}

                                        {task.status !== "WAITING" && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleUpdateStatus(task.id, "WAITING");
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft cursor-pointer"
                                          >
                                            <Pause className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Mover para Aguardando</span>
                                          </button>
                                        )}

                                        {task.status !== "TODO" && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              handleUpdateStatus(task.id, "TODO");
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft cursor-pointer"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
                                            <span>Voltar para A fazer</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveActionMenuId(null);
                                            requestExtendDeadline(task);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft cursor-pointer"
                                        >
                                          <CalendarClock className="w-3.5 h-3.5 text-brand" />
                                          <span>Adiar / Estender prazo</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleReopenTask(task.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold text-brand hover:bg-lavender-soft cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Reabrir demanda</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleTransferTask(
                                          task,
                                          isPersonal ? "work" : "personal"
                                        );
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                                      <span>
                                        Mover para {isPersonal ? "Trabalho" : "Pessoal"}
                                      </span>
                                    </button>

                                    <div className="my-1 h-px bg-line" />

                                    {!isCanceled && !isDone && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          requestCancelTask(task);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Cancelar demanda</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setTaskPendingDelete(task);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Excluir demanda</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskPendingDelete)}
        title="Excluir demanda?"
        description="Você terá 5 segundos para desfazer logo após confirmar."
        highlight={taskPendingDelete?.title}
        confirmLabel="Excluir"
        onCancel={() => setTaskPendingDelete(null)}
        onConfirm={async () => {
          if (!taskPendingDelete) return;
          const id = taskPendingDelete.id;
          setTaskPendingDelete(null);
          await handleDeleteTask(id);
        }}
      />
    </div>
  );
}
