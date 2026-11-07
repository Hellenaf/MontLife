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
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType, ItemType, ConnectedAccount } from "@/types";
import { isTaskOverdue } from "@/lib/sla";
import { getAllCategories } from "@/lib/categories";
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
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isCanceledExpanded, setIsCanceledExpanded] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  // Split into Active tasks, Completed tasks and Canceled tasks
  const activeTasks = filteredTasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  );
  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED");
  const canceledTasks = filteredTasks.filter((t) => t.status === "CANCELED");

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
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
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
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-500/10 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700/60 tracking-tight"
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
      dueFormatted = format(parseISO(task.current_due_date), "dd/MM/yy", {
        locale: ptBR,
      });
    } catch {
      dueFormatted = "Data indefinida";
    }

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActiveMenuTaskId((prev) => (prev === task.id ? null : task.id));
        }}
        className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${isSelected
            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/20"
            : isCanceled
              ? "bg-rose-50/30 dark:bg-[#151014] border-rose-200/60 dark:border-rose-950/40 opacity-75 hover:opacity-100"
              : isCompleted
                ? "bg-slate-50/70 dark:bg-[#111218] border-slate-200/80 dark:border-zinc-800/80 opacity-70 hover:opacity-100"
                : "bg-white dark:bg-[#141520] border-slate-200 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
          }`}
      >
        <div className="flex items-start gap-2.5">
          {/* Circular status button */}
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
            className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all ${isCanceled
                ? "bg-rose-500 text-white shadow-sm"
                : isCompleted
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "border-2 border-slate-300 dark:border-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-transparent hover:text-emerald-500"
              }`}
          >
            {isCanceled ? (
              <Ban className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </button>

          {/* Main Task Content */}
          <div className="flex-1 min-w-0">
            {/* Top Badges */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {getItemTypeBadge(task.item_type)}

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getPriorityStyle(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>

                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#1a1b26] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-800 truncate max-w-[120px]"
                  title={task.category}
                >
                  {task.category}
                </span>

                {/* Subtle Kanban Stage Indicator */}
                {getKanbanStageBadge(task.status)}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {overdue && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3 h-3" />
                    Atrasada
                  </span>
                )}

                {/* 3-dots Menu Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuTaskId((prev) => (prev === task.id ? null : task.id));
                  }}
                  title="Opções da demanda"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Task Title */}
            <h4
              className={`text-xs font-semibold leading-snug line-clamp-2 ${isCompleted
                  ? "line-through text-slate-400 dark:text-zinc-500 font-normal"
                  : isCanceled
                    ? "line-through text-rose-500/80 dark:text-rose-400/80 font-normal"
                    : "text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                } transition-colors`}
            >
              {task.title}
            </h4>

            {/* Display cancel reason if canceled */}
            {isCanceled && task.cancel_reason && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/40 line-clamp-2 mt-1">
                <span className="font-semibold">Motivo:</span> {task.cancel_reason}
              </p>
            )}

            {/* Optional task description snippet */}
            {!isCanceled && task.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                {task.description.replace(/\*\*/g, "")}
              </p>
            )}

            {/* Tags preview */}
            {task.tags && task.tags.filter((t) => !t.includes("google-task")).length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {task.tags
                  .filter((t) => !t.includes("google-task"))
                  .slice(0, 3)
                  .map((tg, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-50 dark:bg-[#181926] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800/80"
                    >
                      #{tg}
                    </span>
                  ))}
              </div>
            )}

            {/* Footer Metadata */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                {dueFormatted}
              </span>

              <div className="flex items-center gap-1.5">
                {isWorkTask(task) ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60"
                    title={task.account_email || "Conta de Trabalho (Notre Dame)"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <Briefcase className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    <span>Trabalho</span>
                  </span>
                ) : isPersonalTask(task) ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60"
                    title={task.account_email || "Conta Pessoal (Mestre)"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <User className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                    <span>Pessoal</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                    title={task.account_email || task.account_type || "Outra Conta"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <Tag className="w-2.5 h-2.5 text-slate-500" />
                    <span>{task.account_type || "Geral"}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Context Dropdown Menu (via 3 dots or right click) */}
        {activeMenuTaskId === task.id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-8 z-30 w-48 rounded-xl bg-white dark:bg-[#181926] border border-slate-200 dark:border-zinc-700 shadow-2xl py-1 animate-in fade-in zoom-in-95"
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

            <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

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
    <aside className="w-full lg:w-[340px] xl:w-[380px] h-full flex flex-col border-r border-slate-200 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-[#0c0d13] shrink-0 overflow-hidden transition-colors duration-200">
      {/* Top Filter & Search Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#101118] space-y-2.5 shrink-0">
        {/* Search Bar + AI Categorize + Sync Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar demandas, tags..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-100 dark:bg-[#161722] border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleAiCategorize}
            disabled={isCategorizing}
            title="Classificar e organizar categorias e tags com IA"
            className="h-8 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-[11px] font-semibold shrink-0 transition-all active:scale-95 disabled:opacity-50"
          >
            {isCategorizing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-indigo-500" />
            )}
            <span className="hidden sm:inline">IA</span>
          </button>

          <button
            type="button"
            onClick={handleSyncGoogleTasks}
            disabled={isSyncing}
            title="Consolidar e Atualizar Demandas (Nativo MontLife)"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#161722] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-500" : ""}`} />
          </button>

          {onRequestNewTask && (
            <button
              type="button"
              onClick={onRequestNewTask}
              title="Nova Demanda"
              className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dynamic Category Selector */}
        {dynamicCategories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Categoria:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 h-7 px-2 rounded-lg bg-slate-100 dark:bg-[#161722] border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
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

        {/* Popular Tags Chips */}
        {dynamicTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
            <span className="text-slate-400 dark:text-slate-500 shrink-0 font-medium">Tags:</span>
            {selectedTagFilter && (
              <button
                type="button"
                onClick={() => setSelectedTagFilter(null)}
                className="px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 shrink-0"
              >
                Limpar tag ✕
              </button>
            )}
            {dynamicTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTagFilter(selectedTagFilter === t ? null : t)}
                className={`px-1.5 py-0.5 rounded font-medium shrink-0 transition-colors ${selectedTagFilter === t
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-zinc-800"
                  }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Status feedback message */}
        {statusMessage && (
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 text-center animate-in fade-in">
            {statusMessage}
          </div>
        )}

        {/* Item Type Selector Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
          <button
            onClick={() => setItemTypeFilter("ALL")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors ${itemTypeFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setItemTypeFilter("task")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${itemTypeFilter === "task"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <ListTodo className="w-3 h-3" /> Tarefas
          </button>
          <button
            onClick={() => setItemTypeFilter("activity")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${itemTypeFilter === "activity"
                ? "bg-purple-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <Activity className="w-3 h-3" /> Atividades
          </button>
          <button
            onClick={() => setItemTypeFilter("reminder")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${itemTypeFilter === "reminder"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <Bell className="w-3 h-3" /> Lembretes
          </button>
        </div>
      </div>

      {/* Task List (Google Tasks Style) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 lg:pb-3">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <Filter className="w-8 h-8 mb-2 opacity-30 text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma demanda encontrada
            </p>
            <p className="text-[11px] mt-1 max-w-[240px] leading-relaxed">
              Tente mudar o filtro de categoria ou sincronizar tarefas do Google.
            </p>
            {onRequestNewTask && (
              <button
                type="button"
                onClick={onRequestNewTask}
                className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all"
              >
                + Criar Nova Demanda
              </button>
            )}
          </div>
        ) : statusFilter === "COMPLETED" ? (
          completedTasks.map((task) => renderTaskCard(task, true))
        ) : (
          <>
            {/* Active Tasks */}
            {activeTasks.length === 0 && completedTasks.length > 0 ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-600 dark:text-slate-400 shadow-sm">
                🎉 Todas as tarefas ativas estão concluídas!
              </div>
            ) : (
              activeTasks.map((task) => renderTaskCard(task, false))
            )}

            {/* Collapsible Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 mt-3">
                <button
                  type="button"
                  onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${isCompletedExpanded ? "" : "-rotate-90"
                        }`}
                    />
                    <span>Concluídas</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400">
                      {completedTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {isCompletedExpanded ? "Ocultar" : "Mostrar"}
                  </span>
                </button>

                {isCompletedExpanded && (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-150">
                    {completedTasks.map((task) => renderTaskCard(task, true))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Canceled Tasks Section */}
            {canceledTasks.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCanceledExpanded(!isCanceledExpanded)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-rose-500 transition-transform duration-200 ${isCanceledExpanded ? "" : "-rotate-90"
                        }`}
                    />
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                    <span>Canceladas</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      {canceledTasks.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    {isCanceledExpanded ? "Ocultar" : "Mostrar"}
                  </span>
                </button>

                {isCanceledExpanded && (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-150">
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
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161724] border border-slate-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
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
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-zinc-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/60 line-clamp-2">
                  {taskToDelete.title}
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  ⚠️ Esta ação removerá a demanda permanentemente do banco de dados e não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
