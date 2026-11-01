"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Briefcase,
  User,
  AlertCircle,
  Tag,
  Check,
  Calendar,
  Trash2,
  ListTodo,
  Activity,
  Bell,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType, ItemType } from "@/types";
import { isTaskOverdue } from "@/lib/sla";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeftTasksQuadrantProps {
  tasks: Task[];
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
  onDeleteTask: (taskId: string) => void;
  onRequestNewTask?: () => void;
}

export function LeftTasksQuadrant({
  tasks,
  selectedTaskId,
  onSelectTask,
  onUpdateStatus,
  onRequestResolution,
  onRequestExtendDeadline,
  onDeleteTask,
  onRequestNewTask,
}: LeftTasksQuadrantProps) {
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (accountFilter !== "all" && task.account_type !== accountFilter) {
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
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchCat = task.category.toLowerCase().includes(q);
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCat && !matchTag) return false;
    }
    return true;
  });

  // Split into Active tasks and Completed tasks
  const activeTasks = filteredTasks.filter((t) => t.status !== "COMPLETED");
  const completedTasks = filteredTasks.filter((t) => t.status === "COMPLETED");

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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30">
            Executando
          </span>
        );
      case "WAITING":
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
            Aguardando
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            Concluída
          </span>
        );
      case "CANCELED":
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
            Cancelada
          </span>
        );
      case "TODO":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
            Pendente
          </span>
        );
    }
  };

  const renderTaskCard = (task: Task, isCompletedCard: boolean = false) => {
    const isSelected = selectedTaskId === task.id;
    const isCompleted = task.status === "COMPLETED";
    const overdue = !isCompleted && isTaskOverdue(task.current_due_date, task.status);

    let dueFormatted = "";
    try {
      dueFormatted = format(parseISO(task.current_due_date), "dd/MM HH:mm", {
        locale: ptBR,
      });
    } catch {
      dueFormatted = "Data indefinida";
    }

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task)}
        className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
          isSelected
            ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/20"
            : isCompleted
            ? "bg-slate-50/70 dark:bg-[#111218] border-slate-200/80 dark:border-zinc-800/80 opacity-70 hover:opacity-100"
            : "bg-white dark:bg-[#141520] border-slate-200 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
        }`}
      >
        <div className="flex items-start gap-2.5">
          {/* Circular Google Tasks-style checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isCompleted) {
                onUpdateStatus(task.id, "TODO");
              } else {
                onRequestResolution(task);
              }
            }}
            title={isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
            className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all ${
              isCompleted
                ? "bg-emerald-500 text-white shadow-sm"
                : "border-2 border-slate-300 dark:border-zinc-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-transparent hover:text-emerald-500"
            }`}
          >
            <Check className="w-3 h-3" />
          </button>

          {/* Main Task Content */}
          <div className="flex-1 min-w-0">
            {/* Top Badges */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1 flex-wrap">
                {getItemTypeBadge(task.item_type)}

                {task.account_type === "work" ? (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <Briefcase className="w-2.5 h-2.5" /> Trabalho
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                    <User className="w-2.5 h-2.5" /> Pessoal
                  </span>
                )}
              </div>

              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
            </div>

            {/* Title */}
            <h4
              className={`text-xs font-semibold leading-snug line-clamp-2 ${
                isCompleted
                  ? "line-through text-slate-400 dark:text-slate-500"
                  : task.status === "CANCELED"
                  ? "line-through text-rose-500 dark:text-rose-400"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {task.title}
            </h4>

            {/* Bottom Meta & Due Date */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[95px]">{task.category}</span>
                {getStatusBadge(task.status)}
              </div>

              <div
                className={`flex items-center gap-1 text-[10px] font-medium ${
                  overdue
                    ? "text-rose-600 dark:text-rose-400 font-bold"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span>{dueFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
            <button
              onClick={() => onUpdateStatus(task.id, "IN_PROGRESS")}
              title="Iniciar Execução"
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors border border-slate-200 dark:border-zinc-700 text-[10px] flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Iniciar
            </button>
          )}

          {task.status === "IN_PROGRESS" && (
            <button
              onClick={() => onUpdateStatus(task.id, "WAITING")}
              title="Pausar / Aguardando"
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white transition-colors border border-slate-200 dark:border-zinc-700 text-[10px] flex items-center gap-1"
            >
              <Pause className="w-3 h-3" /> Pausar
            </button>
          )}

          <button
            onClick={() => onRequestExtendDeadline(task)}
            title="Adiar prazo"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteTask(task.id)}
            title="Excluir"
            className="p-1 rounded-md text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-[340px] xl:w-[380px] h-full flex flex-col border-r border-slate-200 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-[#0c0d13] shrink-0 overflow-hidden transition-colors duration-200">
      {/* Top Filter & Search Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#101118] space-y-2.5 shrink-0">
        {/* Context Selector: Todas, Trabalho, Pessoal */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#161722] p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setAccountFilter("all")}
            className={`py-1 text-xs font-semibold rounded-lg transition-all ${
              accountFilter === "all"
                ? "bg-white dark:bg-[#202230] text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setAccountFilter("work")}
            className={`py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "work"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-3 h-3" /> Trabalho
          </button>
          <button
            onClick={() => setAccountFilter("personal")}
            className={`py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "personal"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-3 h-3" /> Pessoal
          </button>
        </div>

        {/* Search Bar + Quick Add Button */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar demandas ou tags..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-100 dark:bg-[#161722] border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {onRequestNewTask && (
            <button
              type="button"
              onClick={onRequestNewTask}
              title="Nova Demanda Detalhada"
              className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Item Type Selector Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
          <button
            onClick={() => setItemTypeFilter("ALL")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
              itemTypeFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setItemTypeFilter("task")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "task"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ListTodo className="w-3 h-3" /> Tarefas
          </button>
          <button
            onClick={() => setItemTypeFilter("activity")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "activity"
                ? "bg-purple-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Activity className="w-3 h-3" /> Atividades
          </button>
          <button
            onClick={() => setItemTypeFilter("reminder")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "reminder"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bell className="w-3 h-3" /> Lembretes
          </button>
        </div>
      </div>

      {/* Task List (Google Tasks Style) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <Filter className="w-8 h-8 mb-2 opacity-30 text-indigo-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma demanda cadastrada
            </p>
            <p className="text-[11px] mt-1 max-w-[240px] leading-relaxed">
              Suas tarefas sincronizadas do Google Tasks ou criadas manualmente aparecerão aqui.
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
                      className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${
                        isCompletedExpanded ? "" : "-rotate-90"
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
          </>
        )}
      </div>
    </aside>
  );
}
