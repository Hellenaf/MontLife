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
} from "lucide-react";
import { Task, TaskStatus, Priority, AccountType } from "@/types";
import { isTaskOverdue, getGoogleTaskPrefix } from "@/lib/sla";
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (accountFilter !== "all" && task.account_type !== accountFilter) {
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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            [▶️] Em Execução
          </span>
        );
      case "WAITING":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            [⏳] Aguardando
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            [✅] Concluída
          </span>
        );
      case "CANCELED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            Cancelada
          </span>
        );
      case "TODO":
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2E2B44] text-[#9490AC] border border-[#2E2B44]">
            A Fazer
          </span>
        );
    }
  };

  return (
    <aside className="w-[380px] xl:w-[420px] h-full flex flex-col border-r border-[#2E2B44] bg-[#141221] shrink-0 overflow-hidden">
      {/* Top Filter Header */}
      <div className="p-4 border-b border-[#2E2B44] space-y-3 shrink-0 bg-[#161424]">
        {/* Account Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#0F0E17] p-1 rounded-xl border border-[#2E2B44]">
          <button
            onClick={() => setAccountFilter("all")}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              accountFilter === "all"
                ? "bg-[#7B61FF] text-white shadow"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setAccountFilter("work")}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "work"
                ? "bg-indigo-600 text-white shadow"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Trabalho
          </button>
          <button
            onClick={() => setAccountFilter("personal")}
            className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
              accountFilter === "personal"
                ? "bg-purple-600 text-white shadow"
                : "text-[#9490AC] hover:text-[#EAE9FC]"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Pessoal
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
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#0F0E17] border border-[#2E2B44] text-xs text-[#EAE9FC] placeholder-[#9490AC]/60 focus:outline-none focus:border-[#9D8DF1]"
          />
        </div>

        {/* Status & Priority filter pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 text-[11px]">
          <div className="flex items-center gap-1">
            {(["ALL", "TODO", "IN_PROGRESS", "WAITING", "COMPLETED"] as (
              | "ALL"
              | TaskStatus
            )[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? "bg-[#9D8DF1] text-black font-bold"
                    : "bg-[#0F0E17] text-[#9490AC] hover:text-[#EAE9FC]"
                }`}
              >
                {st === "ALL"
                  ? "Todos"
                  : st === "TODO"
                  ? "A Fazer"
                  : st === "IN_PROGRESS"
                  ? "Executando"
                  : st === "WAITING"
                  ? "Espera"
                  : "Concluído"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-[#2E2B44]">
            {(["ALL", "P1", "P2", "P3", "P4"] as ("ALL" | Priority)[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  priorityFilter === p
                    ? "bg-[#2E2B44] text-[#EAE9FC]"
                    : "text-[#9490AC]/70 hover:text-[#EAE9FC]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List (Independent Inner Scroll) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#9490AC]">
            <Filter className="w-8 h-8 mb-2 opacity-40 text-[#9D8DF1]" />
            <p className="text-xs font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-[11px] opacity-70">
              Digite um comando na barra superior para criar uma nova tarefa com IA
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
                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1F1C33] border-[#9D8DF1] shadow-lg shadow-[#7B61FF]/10 glow-lavender"
                    : "bg-[#1A1829] border-[#2E2B44] hover:border-[#3E3A5E] hover:bg-[#1E1B30]"
                }`}
              >
                {/* Account & Priority Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {task.account_type === "work" ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        <Briefcase className="w-2.5 h-2.5" /> Trabalho
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <User className="w-2.5 h-2.5" /> Pessoal
                      </span>
                    )}

                    <span className="text-[10px] text-[#9490AC] truncate max-w-[120px]">
                      {task.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4
                  className={`text-xs font-semibold leading-snug line-clamp-2 ${
                    task.status === "COMPLETED"
                      ? "line-through text-[#9490AC]"
                      : "text-[#EAE9FC]"
                  }`}
                >
                  {task.title}
                </h4>

                {/* Status & SLA Due Date */}
                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#2E2B44]/60">
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(task.status)}
                    {task.extension_count > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        title={`${task.extension_count} adiamentos registrados`}
                      >
                        +{task.extension_count}x
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-1 text-[11px] font-medium ${
                      overdue
                        ? "text-rose-400 font-bold animate-pulse"
                        : "text-[#9490AC]"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{dueFormatted}</span>
                  </div>
                </div>

                {/* Quick Action Buttons on hover or selection */}
                <div
                  className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-[#2E2B44]/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "IN_PROGRESS")}
                      title="Iniciar Execução [▶️]"
                      className="p-1 rounded-lg bg-[#0F0E17] text-[#9D8DF1] hover:bg-[#7B61FF] hover:text-white transition-colors border border-[#2E2B44]"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "WAITING")}
                      title="Pausar / Aguardando [⏳]"
                      className="p-1 rounded-lg bg-[#0F0E17] text-amber-400 hover:bg-amber-600 hover:text-white transition-colors border border-[#2E2B44]"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {task.status !== "COMPLETED" && (
                    <button
                      onClick={() => onRequestResolution(task)}
                      title="Concluir com Resolução Técnica [✅]"
                      className="p-1 rounded-lg bg-[#0F0E17] text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors border border-[#2E2B44]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {task.status === "COMPLETED" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "TODO")}
                      title="Reabrir Tarefa"
                      className="p-1 rounded-lg bg-[#0F0E17] text-[#9490AC] hover:text-[#EAE9FC] transition-colors border border-[#2E2B44]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {task.status !== "COMPLETED" && (
                    <button
                      onClick={() => onRequestExtendDeadline(task)}
                      title="Estender Prazo (SLA)"
                      className="p-1 rounded-lg bg-[#0F0E17] text-amber-400 hover:bg-amber-600 hover:text-white transition-colors border border-[#2E2B44]"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Deseja excluir a tarefa "${task.title}"?`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    title="Excluir Tarefa"
                    className="p-1 rounded-lg bg-[#0F0E17] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-[#2E2B44]"
                  >
                    <XCircle className="w-3.5 h-3.5" />
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

