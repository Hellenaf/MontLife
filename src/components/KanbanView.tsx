"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Paperclip,
  CheckSquare,
  Repeat,
  ChevronRight,
  ExternalLink,
  Briefcase,
  User,
  Layers,
  GripVertical,
  Ban,
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType } from "@/types";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenNewTaskModal: (initialStatus?: TaskStatus) => void;
  onRequestCancelTask?: (task: Task) => void;
}

interface ColumnDef {
  id: string;
  title: string;
  statuses: TaskStatus[];
  accentColor: string;
  badgeBg: string;
  headerBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "todo",
    title: "A Fazer & Triagem",
    statuses: ["TODO", "TRIAGE"],
    accentColor: "border-slate-400 dark:border-zinc-500",
    badgeBg: "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700/60 shadow-xs",
    headerBg: "bg-slate-200/70 dark:bg-zinc-950/40",
  },
  {
    id: "in_progress",
    title: "Em Andamento",
    statuses: ["IN_PROGRESS"],
    accentColor: "border-blue-500 dark:border-indigo-500",
    badgeBg: "bg-white dark:bg-indigo-950 text-blue-700 dark:text-indigo-300 border border-blue-200 dark:border-indigo-800/60 shadow-xs",
    headerBg: "bg-blue-100/60 dark:bg-indigo-950/20",
  },
  {
    id: "waiting",
    title: "Aguardando / Validação",
    statuses: ["WAITING"],
    accentColor: "border-amber-500",
    badgeBg: "bg-white dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs",
    headerBg: "bg-amber-100/60 dark:bg-amber-950/20",
  },
  {
    id: "completed",
    title: "Concluído",
    statuses: ["COMPLETED"],
    accentColor: "border-emerald-500",
    badgeBg: "bg-white dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs",
    headerBg: "bg-emerald-100/60 dark:bg-emerald-950/20",
  },
];

export function KanbanView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onOpenNewTaskModal,
  onRequestCancelTask,
}: KanbanViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");

  // Drag-and-drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === "CANCELED") return false;

      if (accountFilter !== "all" && task.account_type !== accountFilter) {
        return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || "").toLowerCase().includes(q);
        const matchDesc = (task.description || "").toLowerCase().includes(q);
        const matchCat = (task.category || "").toLowerCase().includes(q);
        const matchTag = (task.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCat && !matchTag) return false;
      }
      return true;
    });
  }, [tasks, accountFilter, priorityFilter, searchQuery]);

  const handleDropOnColumn = (taskId: string, targetCol: ColumnDef) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetStatus = targetCol.statuses[0];
    if (task.status !== targetStatus) {
      onUpdateStatus(taskId, targetStatus);
    }
  };

  const renderPriorityDot = (p: Priority) => {
    switch (p) {
      case "P1":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            P1
          </span>
        );
      case "P2":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            P2
          </span>
        );
      case "P3":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0" />
            P3
          </span>
        );
      case "P4":
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />
            P4
          </span>
        );
    }
  };

  const renderDueDateBadge = (dueDateIso?: string) => {
    if (!dueDateIso) return null;
    try {
      const date = parseISO(dueDateIso);
      const overdue = isPast(date) && !isToday(date);
      const today = isToday(date);

      return (
        <span
          className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            overdue
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
              : today
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
              : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
          }`}
        >
          <Clock className="w-2.5 h-2.5" />
          {format(date, "dd/MM", { locale: ptBR })}
        </span>
      );
    } catch {
      return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3.5 select-none overflow-hidden">
      {/* Top Filter and Command Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-zinc-800/80 shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar tarefas no Kanban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Workspace Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900/90 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setAccountFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                accountFilter === "all"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("work")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                accountFilter === "work"
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <Briefcase className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span>Trabalho</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("personal")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                accountFilter === "personal"
                  ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <User className="w-3 h-3 text-purple-500 dark:text-emerald-400" />
              <span>Pessoal</span>
            </button>
          </div>

          {/* Priority Quick Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-hidden cursor-pointer shrink-0 shadow-xs"
          >
            <option value="all">Todas Prioridades</option>
            <option value="P1">P1 - Crítica</option>
            <option value="P2">P2 - Alta</option>
            <option value="P3">P3 - Média</option>
            <option value="P4">P4 - Baixa</option>
          </select>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={() => onOpenNewTaskModal()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid with Native Drag & Drop */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));
          const isOverThisCol = draggedOverColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (draggedOverColId !== col.id) {
                  setDraggedOverColId(col.id);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDraggedOverColId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggedOverColId(null);
                setDraggingTaskId(null);
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) {
                  handleDropOnColumn(taskId, col);
                }
              }}
              className={`flex flex-col rounded-2xl bg-slate-100/90 dark:bg-[#0b0c10] border transition-all duration-200 overflow-hidden min-w-[280px] shadow-xs ${
                isOverThisCol
                  ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-[#10121d]"
                  : "border-slate-200/90 dark:border-zinc-800/80"
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3 border-b border-slate-200/90 dark:border-zinc-800/80 flex items-center justify-between border-t-2 ${col.accentColor} ${col.headerBg}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                    {col.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal(col.statuses[0])}
                  className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Criar tarefa nesta etapa"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar transition-colors">
                {colTasks.length === 0 && !isOverThisCol ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl text-slate-400 dark:text-zinc-500 text-xs bg-white/40 dark:bg-transparent">
                    <span>Nenhuma demanda nesta etapa</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">Arraste uma demanda para cá</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const totalValidation = task.validation_steps?.length || 0;
                    const doneValidation =
                      task.validation_steps?.filter((s) => s.completed).length || 0;
                    const attachmentsCount =
                      (task.attachments?.length || 0) +
                      (task.resolution_attachments?.length || 0);
                    const isDraggingThis = draggingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", task.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDraggedOverColId(null);
                        }}
                        onClick={() => onSelectTask(task)}
                        className={`group relative p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-xs space-y-2 ${
                          isDraggingThis
                            ? "opacity-35 scale-95 border-dashed border-indigo-500 bg-slate-50 dark:bg-zinc-900"
                            : "bg-white dark:bg-[#111217] hover:bg-slate-50/80 dark:hover:bg-[#161820] border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md"
                        }`}
                        title="Clique para abrir detalhes, ou clique e arraste para mudar de etapa"
                      >
                        {/* Drag Handle & Top Meta */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="w-3 h-3 text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                            {renderPriorityDot(task.priority)}
                            <span className="text-[10px] text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900/90 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800/80 truncate max-w-[130px] font-medium">
                              {task.category}
                            </span>
                          </div>

                          {/* Recurrence Badge if > 1 */}
                          {(task.recurrence_count || 1) > 1 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold"
                              title={`${task.recurrence_count} ocorrências registradas nesta demanda`}
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              {task.recurrence_count}x
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-white leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Description Snippet */}
                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Checklist progress if present */}
                        {totalValidation > 0 && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{
                                  width: `${Math.round(
                                    (doneValidation / totalValidation) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-500 font-medium">
                              {doneValidation}/{totalValidation}
                            </span>
                          </div>
                        )}

                        {/* Bottom Row: Due Date + Indicators + Quick Move */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/60 text-[10px] text-slate-500 dark:text-zinc-400">
                          <div className="flex items-center gap-2 min-w-0">
                            {renderDueDateBadge(task.current_due_date)}
                            {attachmentsCount > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-slate-400 dark:text-zinc-500 font-mono"
                                title={`${attachmentsCount} anexo(s) ou links`}
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                {attachmentsCount}
                              </span>
                            )}
                          </div>

                          {/* Quick Advance Button (Alternative to Drag & Drop) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
                          >
                            {onRequestCancelTask && (
                              <button
                                type="button"
                                onClick={() => onRequestCancelTask(task)}
                                className="p-1 rounded bg-slate-100 dark:bg-zinc-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-transparent transition-all text-[10px] font-mono flex items-center gap-0.5 cursor-pointer"
                                title="Cancelar esta demanda"
                              >
                                <Ban className="w-2.5 h-2.5" />
                              </button>
                            )}

                            {task.status !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (task.status === "TODO" || task.status === "TRIAGE") {
                                    onUpdateStatus(task.id, "IN_PROGRESS");
                                  } else if (task.status === "IN_PROGRESS") {
                                    onUpdateStatus(task.id, "WAITING");
                                  } else if (task.status === "WAITING") {
                                    onUpdateStatus(task.id, "COMPLETED");
                                  }
                                }}
                                className="p-1 rounded bg-slate-100 dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-transparent transition-all text-[10px] font-mono flex items-center gap-0.5 cursor-pointer"
                                title="Avançar status para a próxima etapa"
                              >
                                <span>Avançar</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Drop Zone Target Indicator when dragging over this column */}
                {isOverThisCol && draggingTaskId && (
                  <div className="p-3.5 rounded-xl border-2 border-dashed border-indigo-500/80 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold text-center animate-pulse flex items-center justify-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Solte para mover para {col.title}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
