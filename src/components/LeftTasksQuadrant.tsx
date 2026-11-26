import React, { useState, useMemo } from "react";
import {
  Briefcase,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  Calendar,
  Check,
  Trash2,
  Activity,
  ListTodo,
  Bell,
  Plus,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Tag,
  Loader2,
  Ban,
  RotateCcw,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
  Globe,
  Video,
  ArrowUpDown,
  AlignJustify,
  LayoutList,
  X,
  TrendingUp,
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType, ItemType, ConnectedAccount } from "@/types";
import { isTaskOverdue } from "@/lib/sla";
import { getAllCategories } from "@/lib/categories";
import {
  formatReminderLeadTime,
  formatTaskTimeRange,
  getTaskScheduleDate,
  hasScheduledTimeRange,
  isTaskAllDay,
} from "@/lib/taskSchedule";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeftTasksQuadrantProps {
  tasks: Task[];
  accounts?: ConnectedAccount[];
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (
    taskId: string,
    status: TaskStatus,
    resolutionNotes?: string,
    cancelReason?: string
  ) => void;
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onRequestCancelTask?: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTransferTask?: (task: Task, target: "work" | "personal") => void;
  onRequestNewTask?: () => void;
  onRefreshTasks?: () => Promise<void> | void;
  accountFilter?: "all" | AccountType;
  onAccountFilterChange?: (filter: "all" | AccountType) => void;
  onOpenMobileMetrics?: () => void;
}

export function LeftTasksQuadrant({
  tasks,
  accounts = [],
  selectedTaskId,
  onSelectTask,
  onUpdateStatus,
  onRequestResolution,
  onRequestExtendDeadline,
  onRequestCancelTask,
  onDeleteTask,
  onTransferTask,
  onRequestNewTask,
  onRefreshTasks,
  accountFilter: propAccountFilter,
  onAccountFilterChange,
  onOpenMobileMetrics,
}: LeftTasksQuadrantProps) {
  const [internalAccountFilter, setInternalAccountFilter] = useState<"all" | AccountType>("all");
  const accountFilter = propAccountFilter !== undefined ? propAccountFilter : internalAccountFilter;
  const setAccountFilter = (filter: "all" | AccountType) => {
    setInternalAccountFilter(filter);
    onAccountFilterChange?.(filter);
  };

  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  React.useEffect(() => {
    const handleCloseMenu = () => setActiveMenuTaskId(null);
    if (activeMenuTaskId) {
      window.addEventListener("click", handleCloseMenu);
      return () => window.removeEventListener("click", handleCloseMenu);
    }
  }, [activeMenuTaskId]);

  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  const isPersonalTask = (t: Task) => !isWorkTask(t);

  // Helper to match task against context filter (account_type, account_email, or specific ID)
  const isTaskMatchingFilter = (task: Task, filter: "all" | string): boolean => {
    if (!filter || filter === "all") return true;
    const f = filter.toLowerCase().trim();

    // Check for Work / Trabalho
    if (
      f === "work" ||
      f.includes("trab") ||
      f.includes("notre") ||
      f.includes("notredame") ||
      f.includes("haferreira")
    ) {
      return isWorkTask(task);
    }

    // Check for Personal / Pessoal
    if (
      f === "personal" ||
      f.includes("pess") ||
      f.includes("hellen")
    ) {
      return isPersonalTask(task);
    }

    const taskType = (task.account_type || "").toLowerCase().trim();
    const taskEmail = (task.account_email || "").toLowerCase().trim();

    if (taskEmail && (taskEmail === f || f.includes(taskEmail) || taskEmail.includes(f))) return true;
    if (taskType && (taskType === f || f.includes(taskType))) return true;
    if (task.account_id && task.account_id.toLowerCase() === f) return true;

    return false;
  };

  // Derive dynamic list of workspaces/accounts from connected accounts
  const dynamicAccounts = useMemo(() => {
    const list: { id: string; label: string; email?: string }[] = [];
    const seen = new Set<string>();

    const safeAccountsList = Array.isArray(accounts)
      ? accounts.filter((a): a is ConnectedAccount => Boolean(a && typeof a === "object"))
      : [];

    const isHellen = safeAccountsList.some((a) => {
      const e = (a.email || "").toLowerCase();
      return e.includes("hellen") || e.includes("notredame");
    });

    if (safeAccountsList.length > 0) {
      for (const acc of safeAccountsList) {
        if (!acc || typeof acc !== "object" || typeof acc.email !== "string" || !acc.email.trim()) continue;
        const emailLower = acc.email.toLowerCase().trim();
        const accLabel = typeof acc.label === "string" && acc.label.trim()
          ? acc.label.trim()
          : emailLower.split("@")[0];

        const isWork = (acc.id || "").includes("work") || accLabel.toLowerCase().includes("trab") || emailLower.includes("notredame");
        const isPersonal = (acc.id || "").includes("personal") || accLabel.toLowerCase().includes("pess") || emailLower.includes("hellen");
        const standardId = isWork ? "work" : isPersonal ? "personal" : emailLower;

        if (!seen.has(standardId)) {
          seen.add(standardId);
          list.push({
            id: standardId,
            label: accLabel,
            email: acc.email,
          });
        }
      }
    }

    if (list.length === 0) {
      if (isHellen) {
        list.push(
          { id: "work", label: "Trabalho", email: "haferreira@notredamecampinas.net.br" },
          { id: "personal", label: "Pessoal", email: "hellenalvesferreira.s2@gmail.com" }
        );
      } else {
        list.push(
          { id: "work", label: "Trabalho" },
          { id: "personal", label: "Pessoal" }
        );
      }
    }

    return list;
  }, [accounts]);
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"due_asc" | "priority" | "recent">("due_asc");
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isCanceledExpanded, setIsCanceledExpanded] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("montlife_list_compact");
      if (saved === "true") setIsCompactMode(true);
    } catch {}
  }, []);

  const toggleCompactMode = () => {
    setIsCompactMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("montlife_list_compact", String(next));
        } catch {}
      }
      return next;
    });
  };

  const activeFiltersCount =
    (itemTypeFilter !== "ALL" ? 1 : 0) +
    (priorityFilter !== "ALL" ? 1 : 0) +
    (categoryFilter !== "ALL" ? 1 : 0) +
    (selectedTagFilter !== null ? 1 : 0);

  const clearAllFilters = () => {
    setItemTypeFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
    setSelectedTagFilter(null);
    setStatusFilter("ALL");
  };

  // Extract unique categories dynamically from tasks + standard list
  const dynamicCategories = useMemo(() => {
    return getAllCategories(tasks);
  }, [tasks]);

  // Extract popular tags
  const dynamicTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    for (const t of tasks) {
      for (const tag of t.tags || []) {
        if (!tag || tag === "google-tasks" || tag === "google-tasks-sync") continue;
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [tasks]);

  // Trigger AI auto-categorization
  const handleAiCategorize = async () => {
    setIsCategorizing(true);
    setStatusMessage("IA analisando e organizando demandas...");
    try {
      const res = await fetch("/api/tasks/ai-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || "Tarefas organizadas com IA!");
        if (onRefreshTasks) await onRefreshTasks();
      } else {
        setStatusMessage("Não foi possível categorizar agora.");
      }
    } catch {
      setStatusMessage("Erro ao executar IA.");
    } finally {
      setIsCategorizing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Trigger full demand consolidation
  const handleSyncGoogleTasks = async () => {
    setIsSyncing(true);
    setStatusMessage("Consolidando demandas...");
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Demandas atualizadas e consolidadas!`);
        if (onRefreshTasks) await onRefreshTasks();
      } else {
        setStatusMessage("Erro ao consolidar demandas.");
      }
    } catch {
      setStatusMessage("Falha na consolidação.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (accountFilter !== "all" && !isTaskMatchingFilter(task, accountFilter)) {
      return false;
    }
    if (itemTypeFilter !== "ALL" && (task.item_type || "task") !== itemTypeFilter) {
      return false;
    }
    if (statusFilter !== "ALL" && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
      return false;
    }
    if (categoryFilter !== "ALL" && task.category !== categoryFilter) {
      return false;
    }
    if (selectedTagFilter && !task.tags?.includes(selectedTagFilter)) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchCat = task.category.toLowerCase().includes(q);
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
      const matchEmail = (task.account_email || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchTag && !matchEmail) return false;
    }
    return true;
  });

  // Sort filtered tasks according to active sort order
  const PRIORITY_WEIGHT: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === "priority") {
        const diff = (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
        if (diff !== 0) return diff;
      }
      if (sortBy === "recent") {
        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();
        return createdB - createdA;
      }
      // Default: due_asc (earliest schedule/due date first)
      const dueA = new Date(getTaskScheduleDate(a) || 0).getTime();
      const dueB = new Date(getTaskScheduleDate(b) || 0).getTime();
      if (dueA !== dueB) return dueA - dueB;
      return (PRIORITY_WEIGHT[a.priority] || 4) - (PRIORITY_WEIGHT[b.priority] || 4);
    });
  }, [filteredTasks, sortBy]);

  // Split into Active tasks, Completed tasks and Canceled tasks
  const activeTasks = sortedTasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  );
  const completedTasks = sortedTasks.filter((t) => t.status === "COMPLETED");
  const canceledTasks = sortedTasks.filter((t) => t.status === "CANCELED");

  const getPriorityStripeClass = (p: Priority) => {
    switch (p) {
      case "P1":
        return "border-l-[3px] border-l-rose-500";
      case "P2":
        return "border-l-[3px] border-l-amber-500";
      case "P3":
        return "border-l-[3px] border-l-indigo-500/80";
      case "P4":
      default:
        return "border-l-[3px] border-l-slate-300 dark:border-l-zinc-700";
    }
  };

  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case "P1":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30";
      case "P2":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
      case "P3":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30";
      case "P4":
      default:
        return "bg-[#E7E3DA] text-slate-700 border-[#DCD7CC] dark:bg-[#293244] dark:text-zinc-400 dark:border-[#404D68]";
    }
  };

  const getItemTypeBadge = (type?: ItemType) => {
    switch (type) {
      case "activity":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
            Atividade
          </span>
        );
      case "reminder":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 flex items-center gap-1">
            <Bell className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            Lembrete
          </span>
        );
      case "task":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 flex items-center gap-1">
            <ListTodo className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
            Tarefa
          </span>
        );
    }
  };

  const getKanbanStageBadge = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 border border-indigo-500/30 tracking-tight"
            title="Etapa no Kanban: Em Andamento"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Em Andamento
          </span>
        );
      case "WAITING":
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 tracking-tight"
            title="Etapa no Kanban: Aguardando / Validação"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Aguardando
          </span>
        );
      case "COMPLETED":
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 tracking-tight"
            title="Etapa no Kanban: Concluído"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Concluído
          </span>
        );
      case "TRIAGE":
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 tracking-tight"
            title="Etapa no Kanban: Triagem Inicial"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Triagem
          </span>
        );
      case "CANCELED":
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 tracking-tight"
            title="Etapa: Cancelada"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Cancelada
          </span>
        );
      case "TODO":
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-500/10 dark:bg-[#293244] text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-[#404D68]/60 tracking-tight"
            title="Etapa no Kanban: A Fazer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-400" />
            A Fazer
          </span>
        );
    }
  };

  const renderTaskCard = (task: Task, isCompletedCard: boolean = false) => {
    const isSelected = selectedTaskId === task.id;
    const isCompleted = task.status === "COMPLETED";
    const isCanceled = task.status === "CANCELED";
    const overdue = !isCompleted && !isCanceled && isTaskOverdue(task.current_due_date, task.status);

    let dueFormatted = "";
    try {
      const schedIso = getTaskScheduleDate(task);
      const parsedSched = parseISO(schedIso);
      const hasExplicitRange = hasScheduledTimeRange(task) || (Boolean(task.scheduled_start) && !isTaskAllDay(task));
      dueFormatted = hasExplicitRange
        ? `${format(parsedSched, "dd/MM", { locale: ptBR })} • ${formatTaskTimeRange(task)}`
        : format(parsedSched, "dd/MM/yy", { locale: ptBR });
    } catch {
      dueFormatted = "Data indefinida";
    }

    const priorityTextColor =
      task.priority === "P1"
        ? "text-rose-600 dark:text-rose-400"
        : task.priority === "P2"
        ? "text-amber-600 dark:text-amber-400"
        : task.priority === "P3"
        ? "text-indigo-600 dark:text-indigo-400"
        : "text-slate-400 dark:text-zinc-500";

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActiveMenuTaskId((prev) => (prev === task.id ? null : task.id));
        }}
        className={`group relative transition-colors cursor-pointer ${
          isCompactMode ? "px-3.5 py-2.5" : "px-4 py-3"
        } ${
          isSelected
            ? "bg-indigo-500/[0.09] dark:bg-indigo-500/[0.16]"
            : isCanceled
            ? "bg-rose-50/20 dark:bg-rose-950/15 opacity-70 hover:opacity-100 hover:bg-[#EBE7DE] dark:hover:bg-white/[0.04]"
            : isCompleted
            ? "opacity-65 hover:opacity-100 hover:bg-[#EBE7DE]/80 dark:hover:bg-white/[0.04]"
            : "hover:bg-[#ECE8DF]/80 dark:hover:bg-white/[0.04]"
        }`}
      >
        {/* Crisp Left Active Indicator */}
        {isSelected && (
          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-600 dark:bg-indigo-400" />
        )}

        <div className="flex items-start gap-2.5">
          {/* Circular status button with comfortable mobile touch hitbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isCanceled || isCompleted) {
                onUpdateStatus(task.id, "TODO");
              } else {
                onUpdateStatus(task.id, "COMPLETED");
              }
            }}
            title={
              isCanceled
                ? "Reabrir demanda cancelada"
                : isCompleted
                  ? "Reabrir tarefa"
                  : "Concluir tarefa"
            }
            className="p-1.5 -m-1.5 mt-0 shrink-0 flex items-center justify-center rounded-full cursor-pointer"
          >
            <span
              className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
                isCanceled
                  ? "bg-rose-500 text-white"
                  : isCompleted
                    ? "bg-emerald-500 text-white"
                    : "border-[1.5px] border-slate-300 dark:border-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-transparent hover:text-emerald-500"
              }`}
            >
              {isCanceled ? <Ban className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
            </span>
          </button>

          {/* Main Task Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Title + Overdue + Menu */}
            <div className="flex items-start justify-between gap-1.5">
              <h4
                className={`${isCompactMode ? "text-xs line-clamp-1" : "text-[13px] line-clamp-2"} font-semibold leading-snug flex-1 min-w-0 ${
                  isCompleted
                    ? "line-through text-slate-400 dark:text-zinc-500 font-normal"
                    : isCanceled
                      ? "line-through text-rose-500/80 dark:text-rose-400/80 font-normal"
                      : isSelected
                        ? "text-indigo-950 dark:text-white"
                        : "text-slate-900 dark:text-zinc-100 group-hover:text-indigo-700 dark:group-hover:text-white"
                } transition-colors`}
              >
                {task.title}
              </h4>

              <div className="flex items-center gap-1 shrink-0 -mt-0.5">
                {overdue && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-[10px] font-semibold text-rose-600 dark:text-rose-400"
                    title="Demanda atrasada"
                  >
                    <AlertCircle className="w-2.5 h-2.5" />
                    {!isCompactMode && <span>Atrasada</span>}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuTaskId((prev) => (prev === task.id ? null : task.id));
                  }}
                  title="Opções da demanda"
                  className="p-1 -mr-1 rounded-md text-slate-400 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-[#DDD8CD]/60 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isCompactMode && isCanceled && task.cancel_reason && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 px-2 py-1 rounded line-clamp-1 mt-1">
                <span className="font-semibold">Motivo:</span> {task.cancel_reason}
              </p>
            )}

            {!isCompactMode && !isCanceled && task.description && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5 font-normal">
                {task.description.replace(/\*\*/g, "")}
              </p>
            )}

            {/* Row 2: Clean Consolidated Metadata */}
            <div
              className={`flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-zinc-500 ${
                isCompactMode ? "mt-1" : "mt-2"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`flex items-center gap-1 font-mono truncate tabular-nums ${
                    overdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  <Clock className="w-3 h-3 shrink-0 opacity-70" />
                  {dueFormatted}
                </span>

                {task.reminder_enabled && (
                  <span
                    className="inline-flex items-center text-indigo-500 dark:text-indigo-400 shrink-0"
                    title={`Lembrete: ${formatReminderLeadTime(task.reminder_minutes_before ?? 30)}`}
                  >
                    <Bell className="w-3 h-3" />
                  </span>
                )}

                {task.meet_link && (
                  <a
                    href={task.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors"
                    title="Entrar na reunião do Google Meet"
                  >
                    <Video className="w-2.5 h-2.5" />
                    <span>Meet</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isCompactMode && (task.status === "IN_PROGRESS" || task.status === "WAITING") && (
                  getKanbanStageBadge(task.status)
                )}

                {!isCompactMode && (
                  <span
                    className="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-[92px]"
                    title={task.category}
                  >
                    {task.category}
                  </span>
                )}

                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isWorkTask(task) ? "bg-blue-500" : "bg-violet-500"
                  }`}
                  title={
                    isWorkTask(task)
                      ? `Trabalho (${task.priority})`
                      : `Pessoal (${task.priority})`
                  }
                />
                <span className={`font-mono text-[10px] font-semibold ${priorityTextColor}`}>
                  {task.priority}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Context Dropdown Menu */}
        {activeMenuTaskId === task.id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-8 z-30 w-48 rounded-xl bg-[#F7F6F1] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#343F56] shadow-popover py-1 animate-in fade-in zoom-in-95"
          >
            {!isCompleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuTaskId(null);
                  onRequestResolution(task);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Concluir</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuTaskId(null);
                onRequestExtendDeadline(task);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Adiar prazo</span>
            </button>

            {onRequestCancelTask && !isCanceled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuTaskId(null);
                  onRequestCancelTask(task);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 transition-colors"
              >
                <Ban className="w-3.5 h-3.5 text-amber-500" />
                <span>Cancelar demanda</span>
              </button>
            )}

            {onTransferTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuTaskId(null);
                  const target = isWorkTask(task) ? "personal" : "work";
                  onTransferTask(task, target);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 dark:hover:text-purple-300 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {isWorkTask(task) ? "Transferir para Pessoal" : "Transferir para Trabalho"}
                </span>
              </button>
            )}

            <div className="my-1 border-t border-[#E5E0D6] dark:border-[#343F56]" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuTaskId(null);
                setTaskToDelete(task);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Excluir demanda...</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full lg:w-[332px] xl:w-[368px] h-full flex flex-col border-r border-[#DCD7CC] dark:border-[#2E384D] bg-[#F3F1EB] dark:bg-[#1E2534] shrink-0 overflow-hidden transition-colors duration-200">
      {/* Top Filter & Search Bar */}
      <div className="px-3.5 py-3 border-b border-[#DCD7CC]/80 dark:border-[#2E384D] bg-[#F3F1EB] dark:bg-[#1E2534] space-y-2.5 shrink-0">
        {/* Primary Row: Search + Filters Trigger + Density + Sync */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar demandas..."
              className="w-full h-8.5 h-8 pl-8 pr-7 rounded-lg bg-[#E7E3DA]/80 dark:bg-[#293244] border border-[#DCD7CC]/80 dark:border-[#343F56] focus:bg-[#FBF9F5] dark:focus:bg-[#262F40] text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            title="Filtros e ordenação"
            className={`h-8 px-2.5 rounded-lg border flex items-center gap-1 text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              isFiltersOpen || activeFiltersCount > 0 || accountFilter !== "all"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-[#F7F6F1] dark:bg-[#293244] text-slate-600 dark:text-zinc-300 border-[#DCD7CC]/80 dark:border-[#343F56] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {(activeFiltersCount > 0 || accountFilter !== "all") && (
              <span className="px-1 rounded bg-white/25 text-[10px] font-mono font-bold">
                {activeFiltersCount + (accountFilter !== "all" ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCompactMode}
            title={isCompactMode ? "Mudar para lista detalhada" : "Mudar para lista compacta"}
            className={`hidden sm:flex w-8 h-8 rounded-lg border items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isCompactMode
                ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30"
                : "bg-[#F7F6F1] dark:bg-[#293244] text-slate-500 dark:text-zinc-400 border-[#DCD7CC]/80 dark:border-[#343F56] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D]"
            }`}
          >
            {isCompactMode ? <AlignJustify className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
          </button>

          {onOpenMobileMetrics && (
            <button
              type="button"
              onClick={onOpenMobileMetrics}
              title="Abrir Métricas & Briefing IA"
              className="lg:hidden h-8 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>IA</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncGoogleTasks}
            disabled={isSyncing}
            title="Atualizar e consolidar demandas"
            className="w-8 h-8 rounded-lg bg-[#F7F6F1] dark:bg-[#293244] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D] text-slate-500 dark:text-zinc-400 border border-[#DCD7CC]/80 dark:border-[#343F56] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>

        {/* Sub-row: Open Count + Sort */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-500 dark:text-zinc-400 font-medium">
            <strong className="text-slate-900 dark:text-zinc-100 font-mono tabular-nums">
              {activeTasks.length}
            </strong>{" "}
            {activeTasks.length === 1 ? "aberta" : "abertas"}
          </span>

          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Ordenar demandas"
              className="bg-transparent text-[11px] font-medium text-slate-600 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="due_asc" className="dark:bg-[#222938]">Prazo mais próximo</option>
              <option value="priority" className="dark:bg-[#222938]">Prioridade (P1→P4)</option>
              <option value="recent" className="dark:bg-[#222938]">Mais recentes</option>
            </select>
          </div>
        </div>

        {/* Active filter removable chips (only shown when filters are applied) */}
        {(activeFiltersCount > 0 || accountFilter !== "all") && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {accountFilter !== "all" && (
              <button
                type="button"
                onClick={() => setAccountFilter("all")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold cursor-pointer"
              >
                <span>{accountFilter === "work" ? "Trabalho" : accountFilter === "personal" ? "Pessoal" : accountFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {itemTypeFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setItemTypeFilter("ALL")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold cursor-pointer"
              >
                <span>
                  {itemTypeFilter === "task" ? "Tarefas" : itemTypeFilter === "activity" ? "Atividades" : "Lembretes"}
                </span>
                <X className="w-3 h-3" />
              </button>
            )}
            {priorityFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setPriorityFilter("ALL")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold cursor-pointer"
              >
                <span>{priorityFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {categoryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300 border border-[#DCD7CC] dark:border-[#404D68] text-[11px] font-semibold cursor-pointer"
              >
                <span className="truncate max-w-[110px]">{categoryFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {selectedTagFilter && (
              <button
                type="button"
                onClick={() => setSelectedTagFilter(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold cursor-pointer"
              >
                <span>#{selectedTagFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                clearAllFilters();
                setAccountFilter("all");
              }}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Desktop Collapsible Filter Panel */}
        {isFiltersOpen && (
          <div className="hidden lg:block pt-2.5 mt-1 border-t border-[#E5E0D6] dark:border-[#343F56]/80 space-y-2.5 animate-in fade-in duration-150">
            {/* Tipo */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Tipo de Item
              </span>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "task", label: "Tarefa" },
                  { id: "activity", label: "Ativ." },
                  { id: "reminder", label: "Lembr." },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setItemTypeFilter(opt.id as any)}
                    className={`py-1 px-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                      itemTypeFilter === opt.id
                        ? "bg-indigo-600 text-white"
                        : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Prioridade
              </span>
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriorityFilter(p)}
                    className={`py-1 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                      priorityFilter === p
                        ? "bg-indigo-600 text-white"
                        : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {p === "ALL" ? "Todas" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            {dynamicCategories.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Categoria
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#E7E3DA] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#343F56] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL">Todas as categorias ({dynamicCategories.length})</option>
                  {dynamicCategories.map((cat) => {
                    const count = tasks.filter((t) => t.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} {count > 0 ? `(${count})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Popular Tags */}
            {dynamicTags.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Tags
                </span>
                <div className="flex items-center gap-1 flex-wrap text-[11px]">
                  {dynamicTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTagFilter(selectedTagFilter === t ? null : t)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        selectedTagFilter === t
                          ? "bg-indigo-600 text-white"
                          : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-[#DCD7CC]/70 dark:border-[#343F56]"
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Organize Action */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAiCategorize}
                disabled={isCategorizing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isCategorizing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                )}
                <span>Organizar Categorias c/ IA</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Status feedback message */}
        {statusMessage && (
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 text-center animate-in fade-in">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet for Filters & Workspace (frees ~35% screen height on phones!) */}
      {isFiltersOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsFiltersOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[82dvh] overflow-y-auto rounded-t-3xl bg-[#F7F6F1] dark:bg-[#222938] border-t border-[#DCD7CC] dark:border-[#343F56] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                Filtros & Visualização
              </h3>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Espaço / Conta */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Espaço de Trabalho</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAccountFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    accountFilter === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Todos
                </button>
                {dynamicAccounts.map((acc) => {
                  const isSel = accountFilter === acc.id || accountFilter === acc.email;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccountFilter(acc.id as AccountType)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        isSel
                          ? "bg-indigo-600 text-white"
                          : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {acc.id === "work" ? <Briefcase className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tipo de Item</span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "task", label: "Tarefas" },
                  { id: "activity", label: "Ativ." },
                  { id: "reminder", label: "Lembr." },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setItemTypeFilter(opt.id as any)}
                    className={`py-2 rounded-xl font-semibold cursor-pointer ${
                      itemTypeFilter === opt.id
                        ? "bg-indigo-600 text-white"
                        : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Prioridade</span>
              <div className="grid grid-cols-5 gap-1.5 text-xs">
                {(["ALL", "P1", "P2", "P3", "P4"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriorityFilter(p)}
                    className={`py-2 rounded-xl font-mono font-semibold cursor-pointer ${
                      priorityFilter === p
                        ? "bg-indigo-600 text-white"
                        : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {p === "ALL" ? "Todas" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            {dynamicCategories.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#E7E3DA] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#404D68] text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="ALL">Todas as categorias</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Densidade */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D6] dark:border-[#343F56]">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modo de lista compacta
              </span>
              <button
                type="button"
                onClick={toggleCompactMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  isCompactMode
                    ? "bg-indigo-600 text-white"
                    : "bg-[#E7E3DA] dark:bg-[#293244] text-slate-600 dark:text-slate-300"
                }`}
              >
                {isCompactMode ? "Ativado" : "Desativado"}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  clearAllFilters();
                  setAccountFilter("all");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#E7E3DA] dark:bg-[#293244] text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Ver {activeTasks.length} demanda{activeTasks.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flush Seamless Task List */}
      <div className="flex-1 overflow-y-auto pb-6 lg:pb-3">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-zinc-500">
            <Filter className="w-7 h-7 mb-2 opacity-30 text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Nenhuma demanda encontrada
            </p>
            <p className="text-[11px] mt-1 max-w-[230px] leading-relaxed">
              Ajuste os filtros aplicados ou adicione uma nova demanda.
            </p>
            {onRequestNewTask && (
              <button
                type="button"
                onClick={onRequestNewTask}
                className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                + Nova Demanda
              </button>
            )}
          </div>
        ) : statusFilter === "COMPLETED" ? (
          <div className="divide-y divide-[#E6E2D8] dark:divide-[#2E384D]">
            {completedTasks.map((task) => renderTaskCard(task, true))}
          </div>
        ) : (
          <>
            {/* Active Tasks */}
            {activeTasks.length === 0 && completedTasks.length > 0 ? (
              <div className="m-4 p-4 rounded-xl bg-[#F0EDE6] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] text-center text-xs text-slate-600 dark:text-zinc-400">
                Todas as demandas ativas estão concluídas.
              </div>
            ) : (
              <div className="divide-y divide-[#E6E2D8] dark:divide-[#2E384D]">
                {activeTasks.map((task) => renderTaskCard(task, false))}
              </div>
            )}

            {/* Collapsible Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div className="border-t border-[#DCD7CC]/80 dark:border-[#2E384D]">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F0EDE6] dark:bg-[#222938] hover:bg-[#E4E0D6]/80 dark:hover:bg-[#2F394D] text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isCompletedExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <span>Concluídas</span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">
                      {completedTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {isCompletedExpanded ? "Ocultar" : "Ver"}
                  </span>
                </button>

                {isCompletedExpanded && (
                  <div className="divide-y divide-[#E6E2D8] dark:divide-[#2E384D] border-t border-[#E5E0D6] dark:border-[#2E384D] animate-in fade-in duration-150">
                    {completedTasks.map((task) => renderTaskCard(task, true))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Canceled Tasks Section */}
            {canceledTasks.length > 0 && (
              <div className="border-t border-[#DCD7CC]/80 dark:border-[#2E384D]">
                <button
                  type="button"
                  onClick={() => setIsCanceledExpanded(!isCanceledExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F0EDE6] dark:bg-[#222938] hover:bg-[#E4E0D6]/80 dark:hover:bg-[#2F394D] text-xs font-medium text-rose-600/90 dark:text-rose-400/90 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-rose-400 transition-transform duration-200 ${
                        isCanceledExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Canceladas</span>
                    <span className="text-[11px] font-mono text-rose-500/80 tabular-nums">
                      {canceledTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {isCanceledExpanded ? "Ocultar" : "Ver"}
                  </span>
                </button>

                {isCanceledExpanded && (
                  <div className="divide-y divide-[#E6E2D8] dark:divide-[#2E384D] border-t border-[#E5E0D6] dark:border-[#2E384D] animate-in fade-in duration-150">
                    {canceledTasks.map((task) => renderTaskCard(task, true))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {taskToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setTaskToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#F7F6F1] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#343F56] p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Confirmar Exclusão de Demanda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tem certeza que deseja excluir permanentemente esta demanda?
                </p>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-[#E7E3DA] dark:bg-[#293244]/80 p-2.5 rounded-lg border border-[#DCD7CC] dark:border-[#404D68]/60 line-clamp-2">
                  {taskToDelete.title}
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  ⚠️ Esta ação removerá a demanda permanentemente do banco de dados e não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0D6] dark:border-[#343F56]">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#E7E3DA] dark:bg-[#293244] hover:bg-[#DDD8CD] dark:hover:bg-[#38445C] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all cursor-pointer"
              >
                Sim, Excluir Demanda
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
