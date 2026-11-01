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
  MoreVertical,
  XCircle,
  Tag,
  Check,
  RotateCcw,
  Calendar,
  Trash2,
  ListTodo,
  Activity,
  Bell,
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
}

export function LeftTasksQuadrant({
  tasks,
  selectedTaskId,
  onSelectTask,
  onUpdateStatus,
  onRequestResolution,
  onRequestExtendDeadline,
  onDeleteTask,
}: LeftTasksQuadrantProps) {
  const [accountFilter, setAccountFilter] = useState<"all" | AccountType>("all");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

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

  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case "P1":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "P2":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "P3":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "P4":
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    }
  };

  const getItemTypeBadge = (itemType?: ItemType) => {
    switch (itemType) {
      case "reminder":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <Bell className="w-2.5 h-2.5" /> Lembrete
          </span>
        );
      case "activity":
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <Activity className="w-2.5 h-2.5" /> Atividade
          </span>
        );
      case "task":
      default:
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
            <ListTodo className="w-2.5 h-2.5" /> Tarefa
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Em Execução
          </span>
        );
      case "WAITING":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Em Espera
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Concluída
          </span>
        );
      case "CANCELED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Cancelada
          </span>
        );
      case "TODO":
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#242038] text-[#9490AC] border border-[#2E2B44]">
            Pendente
          </span>
        );
    }
  };

  return (
    <aside className="w-[340px] xl:w-[380px] h-full flex flex-col border-r border-[#242038] bg-[#0E0C18] shrink-0 overflow-hidden">
      {/* Top Filter & Search Bar */}
      <div className="p-3.5 border-b border-[#242038] bg-[#12101F] space-y-2.5 shrink-0">
        {/* Context Selector: Todas, Trabalho, Pessoal */}
        <div className="grid grid-cols-3 gap-1 bg-[#090810] p-1 rounded-xl border border-[#242038]">
          <button
            onClick={() => setAccountFilter("all")}
            className={`py-1 text-xs font-semibold rounded-lg transition-all ${
              accountFilter === "all"
                ? "bg-[#242038] text-white shadow-sm"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setAccountFilter("work")}
            className={`py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "work"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <Briefcase className="w-3 h-3" /> Trabalho
          </button>
          <button
            onClick={() => setAccountFilter("personal")}
            className={`py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "personal"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <User className="w-3 h-3" /> Pessoal
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9490AC]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, categoria ou tag..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#090810] border border-[#242038] text-xs text-[#EAE9FC] placeholder-[#9490AC]/50 focus:outline-none focus:border-[#7B61FF]"
          />
        </div>

        {/* Item Type Selector Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
          <button
            onClick={() => setItemTypeFilter("ALL")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors ${
              itemTypeFilter === "ALL"
                ? "bg-[#7B61FF] text-white"
                : "bg-[#090810] text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setItemTypeFilter("task")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "task"
                ? "bg-indigo-600 text-white"
                : "bg-[#090810] text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <ListTodo className="w-3 h-3" /> Tarefas
          </button>
          <button
            onClick={() => setItemTypeFilter("activity")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "activity"
                ? "bg-purple-600 text-white"
                : "bg-[#090810] text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <Activity className="w-3 h-3" /> Atividades
          </button>
          <button
            onClick={() => setItemTypeFilter("reminder")}
            className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
              itemTypeFilter === "reminder"
                ? "bg-amber-600 text-white"
                : "bg-[#090810] text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <Bell className="w-3 h-3" /> Lembretes
          </button>
        </div>

        {/* Status & Priority Filter Pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-[10px]">
          <div className="flex items-center gap-1">
            {(["ALL", "TODO", "IN_PROGRESS", "WAITING", "COMPLETED"] as (
              | "ALL"
              | TaskStatus
            )[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-1.5 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? "bg-[#9D8DF1] text-black font-bold"
                    : "bg-[#090810] text-[#9490AC] hover:text-[#EAE9FC]"
                }`}
              >
                {st === "ALL"
                  ? "Status: Todos"
                  : st === "TODO"
                  ? "Pendente"
                  : st === "IN_PROGRESS"
                  ? "Executando"
                  : st === "WAITING"
                  ? "Espera"
                  : "Concluído"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-[#242038]">
            {(["ALL", "P1", "P2", "P3", "P4"] as ("ALL" | Priority)[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                  priorityFilter === p
                    ? "bg-[#242038] text-[#EAE9FC]"
                    : "text-[#9490AC]/70 hover:text-[#EAE9FC]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List (Clean, Uncluttered Cards) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#9490AC]">
            <Filter className="w-8 h-8 mb-2 opacity-30 text-[#9D8DF1]" />
            <p className="text-xs font-medium">Nenhum item encontrado</p>
            <p className="text-[11px] opacity-60">
              Crie uma tarefa, atividade ou lembrete na barra superior com auxílio da IA.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            const overdue = isTaskOverdue(task.current_due_date, task.status);

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
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1A1829] border-[#7B61FF] shadow-lg shadow-[#7B61FF]/10 glow-lavender"
                    : "bg-[#12101F] border-[#242038] hover:border-[#383353] hover:bg-[#161426]"
                }`}
              >
                {/* Header: Item Type + Account Badge + Priority */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getItemTypeBadge(task.item_type)}

                    {task.account_type === "work" ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300">
                        <Briefcase className="w-2.5 h-2.5" /> Trab.
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300">
                        <User className="w-2.5 h-2.5" /> Pess.
                      </span>
                    )}

                    <span className="text-[10px] text-[#9490AC] truncate max-w-[100px]">
                      {task.category}
                    </span>
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
                  className={`text-xs font-medium leading-snug line-clamp-2 ${
                    task.status === "COMPLETED"
                      ? "line-through text-[#9490AC]"
                      : task.status === "CANCELED"
                      ? "line-through text-rose-400/70"
                      : "text-[#EAE9FC]"
                  }`}
                >
                  {task.title}
                </h4>

                {/* Status & SLA Due Date */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#242038]/60">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(task.status)}
                    {task.extension_count > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        title={`${task.extension_count} adiamento(s)`}
                      >
                        +{task.extension_count}
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-1 text-[11px] font-medium ${
                      overdue
                        ? "text-rose-400 font-bold"
                        : "text-[#9490AC]"
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{dueFormatted}</span>
                  </div>
                </div>

                {/* Subtle Action Toolbar (Clean on hover / selection) */}
                <div
                  className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-[#242038]/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "IN_PROGRESS")}
                      title="Iniciar Execução"
                      className="px-2 py-0.5 rounded-md bg-[#090810] text-[#9D8DF1] hover:bg-[#7B61FF] hover:text-white transition-colors border border-[#242038] text-[10px] flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Iniciar
                    </button>
                  )}

                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "WAITING")}
                      title="Pausar / Aguardando"
                      className="px-2 py-0.5 rounded-md bg-[#090810] text-amber-400 hover:bg-amber-600 hover:text-white transition-colors border border-[#242038] text-[10px] flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" /> Pausar
                    </button>
                  )}

                  {task.status !== "COMPLETED" && (
                    <button
                      onClick={() => onRequestResolution(task)}
                      title="Concluir"
                      className="px-2 py-0.5 rounded-md bg-[#090810] text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors border border-[#242038] text-[10px] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Concluir
                    </button>
                  )}

                  <button
                    onClick={() => onRequestExtendDeadline(task)}
                    title="Adiar prazo"
                    className="p-1 rounded-md text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#242038] transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    title="Excluir"
                    className="p-1 rounded-md text-[#9490AC] hover:text-rose-400 hover:bg-[#242038] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
