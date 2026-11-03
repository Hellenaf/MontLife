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
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType } from "@/types";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenNewTaskModal: (initialStatus?: TaskStatus) => void;
}

interface ColumnDef {
  id: string;
  title: string;
  statuses: TaskStatus[];
  accentColor: string;
  badgeBg: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "todo",
    title: "A Fazer & Triagem",
    statuses: ["TODO", "TRIAGE"],
    accentColor: "border-zinc-500",
    badgeBg: "bg-zinc-800 text-zinc-300",
  },
  {
    id: "in_progress",
    title: "Em Andamento",
    statuses: ["IN_PROGRESS"],
    accentColor: "border-indigo-500",
    badgeBg: "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60",
  },
  {
    id: "waiting",
    title: "Aguardando / Validação",
    statuses: ["WAITING"],
    accentColor: "border-amber-500",
    badgeBg: "bg-amber-950/80 text-amber-300 border border-amber-800/60",
  },
  {
    id: "completed",
    title: "Concluído",
    statuses: ["COMPLETED"],
    accentColor: "border-emerald-500",
    badgeBg: "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60",
  },
];

export function KanbanView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onOpenNewTaskModal,
}: KanbanViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");

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

  const renderPriorityDot = (p: Priority) => {
    switch (p) {
      case "P1":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            P1
          </span>
        );
      case "P2":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            P2
          </span>
        );
      case "P3":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
            P3
          </span>
        );
      case "P4":
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
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
              ? "bg-rose-950/40 text-rose-400 border-rose-800/50"
              : today
              ? "bg-amber-950/40 text-amber-400 border-amber-800/50"
              : "bg-zinc-900 text-zinc-400 border-zinc-800"
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0c10] border border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar tarefas no Kanban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Workspace Filter */}
          <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setAccountFilter("all")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                accountFilter === "all"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("work")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                accountFilter === "work"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Briefcase className="w-3 h-3 text-indigo-400" />
              <span>Trabalho</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("personal")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                accountFilter === "personal"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span>Pessoal</span>
            </button>
          </div>

          {/* Priority Quick Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-hidden cursor-pointer shrink-0"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-xl bg-[#0b0c10] border border-zinc-800/80 overflow-hidden min-w-[280px]"
            >
              {/* Column Header */}
              <div
                className={`p-3 border-b border-zinc-800/80 flex items-center justify-between border-t-2 ${col.accentColor} bg-zinc-950/40`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {col.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${col.badgeBg}`}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal(col.statuses[0])}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Criar tarefa nesta etapa"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800/80 rounded-lg text-zinc-500 text-xs">
                    <span>Nenhuma demanda nesta etapa</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const totalValidation = task.validation_steps?.length || 0;
                    const doneValidation =
                      task.validation_steps?.filter((s) => s.completed).length || 0;
                    const attachmentsCount =
                      (task.attachments?.length || 0) +
                      (task.resolution_attachments?.length || 0);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="group relative p-3 rounded-lg bg-[#111217] hover:bg-[#161820] border border-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer shadow-xs space-y-2 hover:shadow-md"
                      >
                        {/* Top Meta: Priority + Category */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {renderPriorityDot(task.priority)}
                            <span className="text-[10px] text-zinc-400 bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-800/80 truncate max-w-[140px]">
                              {task.category}
                            </span>
                          </div>

                          {/* Recurrence Badge if > 1 */}
                          {(task.recurrence_count || 1) > 1 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                              title={`${task.recurrence_count} ocorrências registradas nesta demanda`}
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              {task.recurrence_count}x
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-white leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Description Snippet */}
                        {task.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Checklist progress if present */}
                        {totalValidation > 0 && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{
                                  width: `${Math.round(
                                    (doneValidation / totalValidation) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {doneValidation}/{totalValidation}
                            </span>
                          </div>
                        )}

                        {/* Bottom Row: Due Date + Indicators + Quick Move */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-2 min-w-0">
                            {renderDueDateBadge(task.current_due_date)}
                            {attachmentsCount > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-zinc-500 font-mono"
                                title={`${attachmentsCount} anexo(s) ou links`}
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                {attachmentsCount}
                              </span>
                            )}
                          </div>

                          {/* Quick Advance Button */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                          >
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
                                className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-[10px] font-mono flex items-center gap-0.5"
                                title="Avançar status"
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

