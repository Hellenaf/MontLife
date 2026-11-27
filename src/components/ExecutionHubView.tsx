"use client";

import React, { useState, useMemo } from "react";
import {
  ListTodo,
  LayoutGrid,
  Calendar,
  Search,
  Filter,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Video,
  Bell,
  Briefcase,
  User,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  ArrowRightLeft,
  Trash2,
  Sparkles,
  RefreshCw,
  Loader2,
  X,
  ArrowUpDown,
  AlignJustify,
  LayoutList,
  CheckSquare,
  Flame,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType, ItemType } from "@/types";
import { KanbanView } from "@/components/KanbanView";
import { AgendaDoDiaView } from "@/components/AgendaDoDiaView";
import { isTaskOverdue } from "@/lib/sla";
import { getAllCategories } from "@/lib/categories";
import {
  formatReminderLeadTime,
  formatTaskTimeRange,
  getTaskScheduleDate,
  hasScheduledTimeRange,
  isTaskAllDay,
  isTaskScheduledForDay,
} from "@/lib/taskSchedule";
import { format, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ExecutionMode = "list" | "kanban" | "agenda";

interface ExecutionHubViewProps {
  tasks: Task[];
  accountFilter: "all" | AccountType;
  selectedTaskId: string | null;
  executionMode: ExecutionMode;
  onChangeExecutionMode: (mode: ExecutionMode) => void;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (
    taskId: string,
    status: TaskStatus,
    resolutionNotes?: string,
    cancelReason?: string
  ) => void;
  onQuickCreateTask: (title: string, status?: TaskStatus, priority?: Priority) => Promise<void> | void;
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onRequestCancelTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTransferTask: (task: Task, target: "work" | "personal") => void;
  onOpenNewTaskModal: (prefillDate?: Date) => void;
  onTaskCreated: (task: Task) => void;
  onRefreshTasks: () => Promise<void> | void;
  onOpenMetricsDrawer: () => void;
}

type QuickTab = "open" | "today" | "overdue" | "in_progress" | "critical" | "completed" | "canceled";

const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };

export function ExecutionHubView({
  tasks,
  accountFilter,
  selectedTaskId,
  executionMode,
  onChangeExecutionMode,
  onSelectTask,
  onUpdateStatus,
  onQuickCreateTask,
  onRequestResolution,
  onRequestExtendDeadline,
  onRequestCancelTask,
  onDeleteTask,
  onTransferTask,
  onOpenNewTaskModal,
  onTaskCreated,
  onRefreshTasks,
  onOpenMetricsDrawer,
}: ExecutionHubViewProps) {
  const [quickTab, setQuickTab] = useState<QuickTab>("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"due_asc" | "priority" | "recent">("due_asc");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);

  // 1-Line Instant Capture Bar state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P3");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Sync & AI categorize feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Row dropdown & delete confirm
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  React.useEffect(() => {
    if (!activeMenuId) return;
    const close = () => setActiveMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [activeMenuId]);

  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) {
      return false;
    }
    return true;
  };

  // Scope-filtered base tasks
  const scopedTasks = useMemo(() => {
    const f = (accountFilter || "all").toLowerCase().trim();
    if (f === "all") return tasks;
    return tasks.filter((t) => {
      if (f === "work" || f.includes("trab") || f.includes("notre") || f.includes("haferreira")) {
        return isWorkTask(t);
      }
      if (f === "personal" || f.includes("pess") || f.includes("hellen")) {
        return !isWorkTask(t);
      }
      return (t.account_type || "").toLowerCase() === f;
    });
  }, [tasks, accountFilter]);

  const dynamicCategories = useMemo(() => getAllCategories(scopedTasks), [scopedTasks]);

  // Real-time Bento Pulse KPIs
  const pulse = useMemo(() => {
    const now = new Date();
    const open = scopedTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED");
    const completed = scopedTasks.filter((t) => t.status === "COMPLETED");
    const canceled = scopedTasks.filter((t) => t.status === "CANCELED");
    const todayOpen = open.filter((t) => isTaskScheduledForDay(t, now));
    const overdue = open.filter((t) => isTaskOverdue(t.current_due_date, t.status));
    const inProgress = open.filter((t) => t.status === "IN_PROGRESS");
    const critical = open.filter((t) => t.priority === "P1" || t.priority === "P2");

    const nextMeetTask =
      open
        .filter((t) => Boolean(t.meet_link))
        .sort(
          (a, b) =>
            new Date(getTaskScheduleDate(a) || 0).getTime() -
            new Date(getTaskScheduleDate(b) || 0).getTime()
        )[0] || null;

    const onTimeCount = completed.filter(
      (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
    ).length;
    const slaPct =
      completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 100;

    return {
      openCount: open.length,
      completedCount: completed.length,
      canceledCount: canceled.length,
      todayCount: todayOpen.length,
      overdueCount: overdue.length,
      inProgressCount: inProgress.length,
      criticalCount: critical.length,
      nextMeetTask,
      slaPct,
    };
  }, [scopedTasks]);

  // Filtered & sorted rows for List Mode
  const visibleTasks = useMemo(() => {
    const now = new Date();
    const filtered = scopedTasks.filter((t) => {
      if (quickTab === "open" && (t.status === "COMPLETED" || t.status === "CANCELED")) return false;
      if (quickTab === "today") {
        if (t.status === "COMPLETED" || t.status === "CANCELED") return false;
        if (!isTaskScheduledForDay(t, now)) return false;
      }
      if (quickTab === "overdue") {
        if (t.status === "COMPLETED" || t.status === "CANCELED") return false;
        if (!isTaskOverdue(t.current_due_date, t.status)) return false;
      }
      if (quickTab === "in_progress" && t.status !== "IN_PROGRESS") return false;
      if (quickTab === "critical") {
        if (t.status === "COMPLETED" || t.status === "CANCELED") return false;
        if (t.priority !== "P1" && t.priority !== "P2") return false;
      }
      if (quickTab === "completed" && t.status !== "COMPLETED") return false;
      if (quickTab === "canceled" && t.status !== "CANCELED") return false;

      if (itemTypeFilter !== "ALL" && (t.item_type || "task") !== itemTypeFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hit =
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        const diff = (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
        if (diff !== 0) return diff;
      }
      if (sortBy === "recent") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      const dueA = new Date(getTaskScheduleDate(a) || 0).getTime();
      const dueB = new Date(getTaskScheduleDate(b) || 0).getTime();
      if (dueA !== dueB) return dueA - dueB;
      return (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
    });
  }, [scopedTasks, quickTab, itemTypeFilter, priorityFilter, categoryFilter, searchTerm, sortBy]);

  const activeExtraFilters =
    (itemTypeFilter !== "ALL" ? 1 : 0) +
    (priorityFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickTitle.trim();
    if (!clean || isSubmittingQuick) return;
    setIsSubmittingQuick(true);
    try {
      const targetStatus: TaskStatus = quickTab === "in_progress" ? "IN_PROGRESS" : "TODO";
      await onQuickCreateTask(clean, targetStatus, quickPriority);
      setQuickTitle("");
      setQuickPriority("P3");
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleCycleStatus = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const nextMap: Record<TaskStatus, TaskStatus> = {
      TRIAGE: "IN_PROGRESS",
      TODO: "IN_PROGRESS",
      IN_PROGRESS: "WAITING",
      WAITING: "TODO",
      COMPLETED: "TODO",
      CANCELED: "TODO",
    };
    onUpdateStatus(task.id, nextMap[task.status] || "IN_PROGRESS");
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setFeedbackMsg("Atualizando demandas...");
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg("Demandas atualizadas!");
        await onRefreshTasks();
      } else {
        setFeedbackMsg("Não foi possível atualizar agora.");
      }
    } catch {
      setFeedbackMsg("Erro ao atualizar demandas.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleAiCategorize = async () => {
    setIsCategorizing(true);
    setFeedbackMsg("IA organizando categorias...");
    try {
      const res = await fetch("/api/tasks/ai-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(data.message || "Categorias organizadas pela IA!");
        await onRefreshTasks();
      } else {
        setFeedbackMsg("Falha ao categorizar com IA.");
      }
    } catch {
      setFeedbackMsg("Erro ao chamar IA.");
    } finally {
      setIsCategorizing(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const getStatusChip = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return {
          label: "Em Andamento",
          dot: "bg-indigo-500",
          cls: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
        };
      case "WAITING":
        return {
          label: "Aguardando",
          dot: "bg-amber-500",
          cls: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
        };
      case "COMPLETED":
        return {
          label: "Concluída",
          dot: "bg-emerald-500",
          cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        };
      case "CANCELED":
        return {
          label: "Cancelada",
          dot: "bg-rose-500",
          cls: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
        };
      default:
        return {
          label: "A Fazer",
          dot: "bg-slate-400",
          cls: "bg-[#EAE6DC] dark:bg-[#2A3347] text-slate-600 dark:text-slate-300 border-[#D8D2C6] dark:border-[#3A4660]",
        };
    }
  };

  return (
    <div className="h-full flex flex-col gap-3.5 max-w-[1640px] mx-auto w-full min-h-0">
      {/* 1. UNIFIED BENTO EXECUTION SWITCHER BAR (Lista · Kanban · Agenda na mesma tela!) */}
      <div className="bento-card px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left: Instant Mode Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#EAE6DC] dark:bg-[#181E2B] border border-[#DCD6CA] dark:border-[#2E384D]">
            {[
              { id: "list" as const, label: "Lista", icon: ListTodo },
              { id: "kanban" as const, label: "Kanban", icon: LayoutGrid },
              { id: "agenda" as const, label: "Agenda", icon: Calendar },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = executionMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeExecutionMode(mode.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#FCFBF7] dark:bg-[#2A3347] text-slate-950 dark:text-white shadow-xs-subtle"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-[#4B55D6] dark:text-[#8692FF]" : ""
                    }`}
                  />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {executionMode === "list" && (
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {visibleTasks.length}
              </span>
              <span>{visibleTasks.length === 1 ? "item exibido" : "itens exibidos"}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Search + Filters (List mode) + Metrics Trigger */}
        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end min-w-0">
          {executionMode === "list" && (
            <>
              <div className="relative flex-1 sm:w-56 md:w-64 min-w-[140px]">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar lista..."
                  className="w-full h-8.5 h-8 pl-8 pr-7 rounded-xl bg-[#EAE6DC] dark:bg-[#181E2B] focus:bg-[#FCFBF7] dark:focus:bg-[#252E40] border border-[#DCD6CA] dark:border-[#2E384D] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#4B55D6] dark:focus:border-[#7380FF] transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFiltersOpen((prev) => !prev)}
                className={`h-8 px-2.5 rounded-xl border inline-flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isFiltersOpen || activeExtraFilters > 0
                    ? "bg-[#4B55D6] dark:bg-[#6673F5] text-white border-transparent"
                    : "bg-[#EFECE4] dark:bg-[#252E40] border-[#DCD6CA] dark:border-[#323D54] text-slate-600 dark:text-slate-300 hover:bg-[#E4E0D6] dark:hover:bg-[#2F3A50]"
                }`}
                title="Filtros avançados e ordenação"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {activeExtraFilters > 0 && (
                  <span className="px-1 rounded bg-white/25 font-mono text-[10px] font-bold">
                    {activeExtraFilters}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsCompactMode((prev) => !prev)}
                title={isCompactMode ? "Modo confortável" : "Modo compacto"}
                className="hidden sm:flex w-8 h-8 rounded-xl border border-[#DCD6CA] dark:border-[#323D54] bg-[#EFECE4] dark:bg-[#252E40] hover:bg-[#E4E0D6] dark:hover:bg-[#2F3A50] text-slate-600 dark:text-slate-300 items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                {isCompactMode ? (
                  <AlignJustify className="w-3.5 h-3.5" />
                ) : (
                  <LayoutList className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                title="Atualizar e consolidar demandas"
                className="w-8 h-8 rounded-xl border border-[#DCD6CA] dark:border-[#323D54] bg-[#EFECE4] dark:bg-[#252E40] hover:bg-[#E4E0D6] dark:hover:bg-[#2F3A50] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-500" : ""}`} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onOpenMetricsDrawer}
            className="h-8 px-2.5 rounded-xl border border-indigo-300/70 dark:border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/15 text-[#4B55D6] dark:text-[#96A0FF] inline-flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Abrir Briefing IA & Métricas"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Briefing IA</span>
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT BY SELECTED EXECUTION MODE */}
      {executionMode === "kanban" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <KanbanView
            tasks={tasks}
            accountFilter={accountFilter}
            onSelectTask={onSelectTask}
            onUpdateStatus={onUpdateStatus}
            onQuickCreateTask={(title, status) => onQuickCreateTask(title, status, "P3")}
            onOpenNewTaskModal={() => onOpenNewTaskModal()}
            onRequestCancelTask={onRequestCancelTask}
          />
        </div>
      ) : executionMode === "agenda" ? (
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <AgendaDoDiaView
            tasks={tasks}
            accountFilter={accountFilter}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            onOpenNewTaskModal={onOpenNewTaskModal}
            onTaskCreated={onTaskCreated}
          />
        </div>
      ) : (
        /* ============================================================== */
        /* LIST MODE — FULL-WIDTH BENTO EFFICIENCY WORKSPACE              */
        /* ============================================================== */
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-0.5 pb-4">
          {/* Interactive 4-Tile Bento Pulse Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            {/* Tile 1: Em Aberto */}
            <button
              type="button"
              onClick={() => setQuickTab("open")}
              className={`bento-card p-3.5 text-left transition-all cursor-pointer group ${
                quickTab === "open" ? "ring-2 ring-[#4B55D6]/35 dark:ring-[#7380FF]/40" : "hover:border-[#C7C0B3] dark:hover:border-[#43516E]"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Fila Aberta</span>
                <span className="w-2 h-2 rounded-full bg-[#4B55D6] dark:bg-[#7380FF]" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                  {pulse.openCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {pulse.inProgressCount} em andamento
                </span>
              </div>
            </button>

            {/* Tile 2: Foco de Hoje */}
            <button
              type="button"
              onClick={() => setQuickTab("today")}
              className={`bento-card p-3.5 text-left transition-all cursor-pointer group ${
                quickTab === "today" ? "ring-2 ring-[#4B55D6]/35 dark:ring-[#7380FF]/40" : "hover:border-[#C7C0B3] dark:hover:border-[#43516E]"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Para Hoje</span>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                  {pulse.todayCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                  {format(new Date(), "EEE, dd/MM", { locale: ptBR })}
                </span>
              </div>
            </button>

            {/* Tile 3: Atrasadas & Críticas */}
            <button
              type="button"
              onClick={() => setQuickTab(pulse.overdueCount > 0 ? "overdue" : "critical")}
              className={`bento-card p-3.5 text-left transition-all cursor-pointer group ${
                quickTab === "overdue" || quickTab === "critical"
                  ? "ring-2 ring-rose-500/40"
                  : "hover:border-[#C7C0B3] dark:hover:border-[#43516E]"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>{pulse.overdueCount > 0 ? "Atrasadas" : "Prioridade Alta"}</span>
                {pulse.overdueCount > 0 ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    pulse.overdueCount > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-900 dark:text-slate-50"
                  }`}
                >
                  {pulse.overdueCount > 0 ? pulse.overdueCount : pulse.criticalCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {pulse.criticalCount} críticas (P1/P2)
                </span>
              </div>
            </button>

            {/* Tile 4: Next Google Meet OR SLA Pulse */}
            {pulse.nextMeetTask ? (
              <div
                onClick={() => onSelectTask(pulse.nextMeetTask!)}
                className="bento-card p-3.5 flex flex-col justify-between cursor-pointer hover:border-emerald-400/70 transition-all"
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="flex items-center gap-1 truncate">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    Próxima Reunião
                  </span>
                  <a
                    href={pulse.nextMeetTask.meet_link!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shrink-0 transition-colors"
                  >
                    Entrar
                  </a>
                </div>
                <div className="mt-1.5 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {pulse.nextMeetTask.title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {formatTaskTimeRange(pulse.nextMeetTask)}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setQuickTab("completed")}
                className={`bento-card p-3.5 text-left transition-all cursor-pointer ${
                  quickTab === "completed" ? "ring-2 ring-emerald-500/40" : "hover:border-[#C7C0B3] dark:hover:border-[#43516E]"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>SLA & Entregas</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {pulse.slaPct}%
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {pulse.completedCount} concluídas
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Collapsible Advanced Filters Strip */}
          {isFiltersOpen && (
            <div className="bento-card p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value as any)}
                  className="h-8 px-2.5 rounded-lg bg-[#EAE6DC] dark:bg-[#181E2B] border border-[#DCD6CA] dark:border-[#323D54] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os tipos</option>
                  <option value="task">Tarefas</option>
                  <option value="activity">Atividades</option>
                  <option value="reminder">Lembretes</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="h-8 px-2.5 rounded-lg bg-[#EAE6DC] dark:bg-[#181E2B] border border-[#DCD6CA] dark:border-[#323D54] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todas prioridades</option>
                  <option value="P1">P1 - Crítica</option>
                  <option value="P2">P2 - Alta</option>
                  <option value="P3">P3 - Média</option>
                  <option value="P4">P4 - Baixa</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#EAE6DC] dark:bg-[#181E2B] border border-[#DCD6CA] dark:border-[#323D54] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[200px]"
                >
                  <option value="ALL">Todas categorias ({dynamicCategories.length})</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-[#EAE6DC] dark:bg-[#181E2B] border border-[#DCD6CA] dark:border-[#323D54]">
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="due_asc" className="dark:bg-[#212838]">Prazo mais próximo</option>
                    <option value="priority" className="dark:bg-[#212838]">Prioridade (P1→P4)</option>
                    <option value="recent" className="dark:bg-[#212838]">Mais recentes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiCategorize}
                  disabled={isCategorizing}
                  className="h-8 px-3 rounded-lg bg-indigo-500/12 hover:bg-indigo-500/20 text-[#4B55D6] dark:text-[#96A0FF] border border-indigo-400/30 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCategorizing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Organizar Categorias c/ IA</span>
                </button>

                {activeExtraFilters > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemTypeFilter("ALL");
                      setPriorityFilter("ALL");
                      setCategoryFilter("ALL");
                    }}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-1 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {feedbackMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-indigo-500/12 border border-indigo-400/30 text-xs font-medium text-[#4B55D6] dark:text-[#A4ADFF] text-center animate-in fade-in shrink-0">
              {feedbackMsg}
            </div>
          )}

          {/* MAIN BENTO EXECUTION CARD */}
          <div className="bento-card flex-1 min-h-[340px] flex flex-col overflow-hidden">
            {/* Smart Tabs + 1-Line Instant Capture */}
            <div className="px-4 pt-3 pb-3 border-b border-[#E4DFD4] dark:border-[#2E384D] space-y-3 shrink-0 bg-[#EFECE4]/55 dark:bg-[#1C2230]/60">
              {/* Efficiency Filter Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {[
                    { id: "open" as const, label: "Abertas", count: pulse.openCount },
                    { id: "today" as const, label: "Hoje", count: pulse.todayCount },
                    {
                      id: "overdue" as const,
                      label: "Atrasadas",
                      count: pulse.overdueCount,
                      alert: pulse.overdueCount > 0,
                    },
                    { id: "in_progress" as const, label: "Em Andamento", count: pulse.inProgressCount },
                    { id: "critical" as const, label: "P1/P2", count: pulse.criticalCount },
                    { id: "completed" as const, label: "Concluídas", count: pulse.completedCount },
                    ...(pulse.canceledCount > 0
                      ? [{ id: "canceled" as const, label: "Canceladas", count: pulse.canceledCount }]
                      : []),
                  ].map((tab) => {
                    const isActive = quickTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQuickTab(tab.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-[#FCFBF7] dark:bg-[#2A3347] text-slate-950 dark:text-white font-semibold shadow-xs-subtle border border-[#DCD6CA] dark:border-[#3A4660]"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#E7E3DA]/70 dark:hover:bg-[#252E40]"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md font-semibold ${
                            tab.alert && !isActive
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : isActive
                              ? "bg-[#4B55D6]/12 dark:bg-[#7380FF]/20 text-[#4B55D6] dark:text-[#A4ADFF]"
                              : "bg-[#E4E0D6] dark:bg-[#252E40] text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-Second Inline Quick-Add Form */}
              <form onSubmit={handleQuickAddSubmit} className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-3 h-9 rounded-xl bg-[#FCFBF7] dark:bg-[#19202E] border border-[#DCD6CA] dark:border-[#323D54] focus-within:border-[#4B55D6] dark:focus-within:border-[#7380FF] focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                  <Plus className="w-4 h-4 text-[#4B55D6] dark:text-[#8692FF] shrink-0" />
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Adicionar demanda rápida em 1 linha e pressionar Enter..."
                    disabled={isSubmittingQuick}
                    className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                  <div className="hidden sm:flex items-center gap-0.5 shrink-0">
                    {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickPriority(p)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                          quickPriority === p
                            ? p === "P1"
                              ? "bg-rose-600 text-white"
                              : p === "P2"
                              ? "bg-amber-500 text-white"
                              : p === "P3"
                              ? "bg-[#4B55D6] text-white"
                              : "bg-slate-600 text-white"
                            : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {quickTitle.trim() && (
                  <button
                    type="submit"
                    disabled={isSubmittingQuick}
                    className="h-9 px-3.5 rounded-xl bg-[#4B55D6] hover:bg-[#3F48C4] text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingQuick ? "Criando..." : "Adicionar"}
                  </button>
                )}
              </form>
            </div>

            {/* FULL-WIDTH SCANNABLE TASK ROWS */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E6E1D7] dark:divide-[#2C364A]">
              {visibleTasks.length === 0 ? (
                <div className="py-16 px-6 text-center space-y-2.5">
                  <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500/45" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {quickTab === "overdue"
                      ? "Nenhuma demanda atrasada!"
                      : quickTab === "today"
                      ? "Agenda livre por aqui hoje"
                      : "Nenhuma demanda encontrada neste filtro"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Use o campo acima para criar uma demanda em 1 segundo ou ajuste os filtros.
                  </p>
                </div>
              ) : (
                visibleTasks.map((task) => {
                  const isCompleted = task.status === "COMPLETED";
                  const isCanceled = task.status === "CANCELED";
                  const isSelected = selectedTaskId === task.id;
                  const overdue =
                    !isCompleted && !isCanceled && isTaskOverdue(task.current_due_date, task.status);
                  const statusChip = getStatusChip(task.status);
                  const stepsTotal = task.validation_steps?.length || 0;
                  const stepsDone = task.validation_steps?.filter((s) => s.completed).length || 0;

                  let dueLabel = "";
                  let dueIsToday = false;
                  try {
                    const schedIso = getTaskScheduleDate(task);
                    const parsed = parseISO(schedIso);
                    dueIsToday = isToday(parsed);
                    const showTime =
                      hasScheduledTimeRange(task) ||
                      (Boolean(task.scheduled_start) && !isTaskAllDay(task));
                    dueLabel = showTime
                      ? `${dueIsToday ? "Hoje" : format(parsed, "dd/MM", { locale: ptBR })} • ${formatTaskTimeRange(task)}`
                      : dueIsToday
                      ? "Hoje"
                      : format(parsed, "dd/MM/yy", { locale: ptBR });
                  } catch {
                    dueLabel = "Sem data";
                  }

                  const priorityPill =
                    task.priority === "P1"
                      ? "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25"
                      : task.priority === "P2"
                      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25"
                      : task.priority === "P3"
                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                      : "bg-[#EAE6DC] dark:bg-[#2A3347] text-slate-500 dark:text-slate-400 border-[#DCD6CA] dark:border-[#3A4660]";

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-4 transition-colors cursor-pointer ${
                        isCompactMode ? "py-2.5" : "py-3.5"
                      } ${
                        isSelected
                          ? "bg-indigo-500/[0.08] dark:bg-indigo-500/[0.15]"
                          : "hover:bg-[#EFECE4]/80 dark:hover:bg-[#273043]/80"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4B55D6] dark:bg-[#7380FF]" />
                      )}

                      {/* Left Primary Info: Check + Title + Subtitle */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCompleted || isCanceled) {
                              onUpdateStatus(task.id, "TODO");
                            } else {
                              onUpdateStatus(task.id, "COMPLETED");
                            }
                          }}
                          title={isCompleted || isCanceled ? "Reabrir" : "Marcar como concluída"}
                          className="p-1 -m-1 mt-0.5 sm:mt-0 shrink-0 cursor-pointer"
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isCanceled
                                ? "bg-rose-500 text-white"
                                : isCompleted
                                ? "bg-emerald-500 text-white"
                                : "border-[1.75px] border-[#C5BFB2] dark:border-[#495775] hover:border-emerald-500 hover:bg-emerald-500/10 text-transparent hover:text-emerald-500"
                            }`}
                          >
                            {isCanceled ? (
                              <Ban className="w-2.5 h-2.5" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </span>
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[13px] sm:text-sm font-semibold truncate ${
                                isCompleted
                                  ? "line-through text-slate-400 dark:text-slate-500 font-normal"
                                  : isCanceled
                                  ? "line-through text-rose-500/80 font-normal"
                                  : "text-slate-900 dark:text-slate-100 group-hover:text-[#4B55D6] dark:group-hover:text-[#96A0FF]"
                              } transition-colors`}
                            >
                              {task.title}
                            </span>

                            {overdue && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-semibold shrink-0">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Atrasada
                              </span>
                            )}

                            {stepsTotal > 0 && (
                              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                <CheckSquare className="w-3 h-3 text-indigo-500" />
                                {stepsDone}/{stepsTotal}
                              </span>
                            )}
                          </div>

                          {!isCompactMode && task.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {task.description.replace(/\*\*/g, "")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Structured Metadata Columns + 1-Click Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0 shrink-0 flex-wrap">
                        {/* 1-Click Google Meet Link */}
                        {task.meet_link && (
                          <a
                            href={task.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold transition-colors"
                            title="Entrar na sala do Google Meet"
                          >
                            <Video className="w-3 h-3" />
                            <span>Meet</span>
                          </a>
                        )}

                        {/* Category Pill (Desktop) */}
                        <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-md bg-[#EAE6DC] dark:bg-[#293244] text-slate-600 dark:text-slate-300 text-[11px] font-medium max-w-[130px] truncate">
                          {task.category}
                        </span>

                        {/* 1-Click Cycle Status Pill */}
                        <button
                          type="button"
                          onClick={(e) => handleCycleStatus(e, task)}
                          title="Clique para alternar etapa rapidamente"
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all cursor-pointer hover:brightness-95 dark:hover:brightness-110 ${statusChip.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusChip.dot}`} />
                          <span>{statusChip.label}</span>
                        </button>

                        {/* Date / Schedule */}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums min-w-[78px] justify-end ${
                            overdue
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : dueIsToday
                              ? "text-[#4B55D6] dark:text-[#96A0FF] font-semibold"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {task.reminder_enabled && (
                            <span
                              title={`Lembrete: ${formatReminderLeadTime(task.reminder_minutes_before ?? 30)}`}
                            >
                              <Bell className="w-3 h-3 text-indigo-500 shrink-0" />
                            </span>
                          )}
                          <Clock className="w-3 h-3 opacity-70 shrink-0" />
                          <span>{dueLabel}</span>
                        </span>

                        {/* Workspace Dot + Priority */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-bold ${priorityPill}`}
                          title={isWorkTask(task) ? "Trabalho" : "Pessoal"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isWorkTask(task) ? "bg-blue-500" : "bg-violet-500"
                            }`}
                          />
                          {task.priority}
                        </span>

                        {/* Overflow Quick Menu */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId((prev) => (prev === task.id ? null : task.id))
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-[#E3DFD5] dark:hover:bg-[#323D54] transition-colors cursor-pointer"
                            title="Ações rápidas"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeMenuId === task.id && (
                            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-[#FCFBF7] dark:bg-[#273043] border border-[#DCD6CA] dark:border-[#394660] shadow-popover py-1 z-30 animate-in fade-in zoom-in-95">
                              {!isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onRequestResolution(task);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Concluir c/ Solução</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRequestExtendDeadline(task);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-[#EFECE4] dark:hover:bg-[#323D54] cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                <span>Adiar prazo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onTransferTask(task, isWorkTask(task) ? "personal" : "work");
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-[#EFECE4] dark:hover:bg-[#323D54] cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                                <span>
                                  {isWorkTask(task) ? "Mover p/ Pessoal" : "Mover p/ Trabalho"}
                                </span>
                              </button>
                              {!isCanceled && !isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onRequestCancelTask(task);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Cancelar demanda</span>
                                </button>
                              )}
                              <div className="my-1 border-t border-[#E6E1D7] dark:border-[#323D54]" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setTaskToDelete(task);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir...</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="hidden sm:block w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#4B55D6] dark:group-hover:text-[#8692FF] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {taskToDelete && (
        <div
          className="fixed inset-0 bg-slate-950/50 dark:bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setTaskToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#FCFBF7] dark:bg-[#232B3B] border border-[#DCD6CA] dark:border-[#36425A] p-5 shadow-popover space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Excluir demanda?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Você terá 5 segundos para desfazer logo após confirmar.
                </p>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-[#EFECE4] dark:bg-[#1B2130] p-2.5 rounded-xl border border-[#DCD6CA] dark:border-[#323D54] line-clamp-2">
                  {taskToDelete.title}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E1D7] dark:border-[#323D54]">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#EAE6DC] dark:bg-[#2B354B] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = taskToDelete.id;
                  setTaskToDelete(null);
                  onDeleteTask(id);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

