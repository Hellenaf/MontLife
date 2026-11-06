"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  Sparkles,
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

export interface ColumnDef {
  id: string;
  title: string;
  statuses: TaskStatus[];
  accentColor: string;
  badgeBg: string;
  headerBg: string;
  isCustom?: boolean;
  targetStatus: TaskStatus;
}

export interface ColorPreset {
  name: string;
  accentColor: string;
  badgeBg: string;
  headerBg: string;
  previewBg: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Azul (Trabalho)",
    accentColor: "border-blue-500",
    badgeBg: "bg-white dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-xs",
    headerBg: "bg-blue-100/60 dark:bg-blue-950/20",
    previewBg: "bg-blue-500",
  },
  {
    name: "Índigo (Foco)",
    accentColor: "border-indigo-500",
    badgeBg: "bg-white dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-xs",
    headerBg: "bg-indigo-100/60 dark:bg-indigo-950/20",
    previewBg: "bg-indigo-500",
  },
  {
    name: "Âmbar (Validação)",
    accentColor: "border-amber-500",
    badgeBg: "bg-white dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs",
    headerBg: "bg-amber-100/60 dark:bg-amber-950/20",
    previewBg: "bg-amber-500",
  },
  {
    name: "Esmeralda (Conclusão)",
    accentColor: "border-emerald-500",
    badgeBg: "bg-white dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs",
    headerBg: "bg-emerald-100/60 dark:bg-emerald-950/20",
    previewBg: "bg-emerald-500",
  },
  {
    name: "Roxo (Criativo)",
    accentColor: "border-purple-500",
    badgeBg: "bg-white dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-xs",
    headerBg: "bg-purple-100/60 dark:bg-purple-950/20",
    previewBg: "bg-purple-500",
  },
  {
    name: "Ciano (Operações)",
    accentColor: "border-cyan-500",
    badgeBg: "bg-white dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs",
    headerBg: "bg-cyan-100/60 dark:bg-cyan-950/20",
    previewBg: "bg-cyan-500",
  },
  {
    name: "Rosa (Crítico)",
    accentColor: "border-rose-500",
    badgeBg: "bg-white dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-xs",
    headerBg: "bg-rose-100/60 dark:bg-rose-950/20",
    previewBg: "bg-rose-500",
  },
  {
    name: "Neutro (Backlog)",
    accentColor: "border-slate-400 dark:border-zinc-500",
    badgeBg: "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700/60 shadow-xs",
    headerBg: "bg-slate-200/70 dark:bg-zinc-950/40",
    previewBg: "bg-slate-500",
  },
];

const DEFAULT_COLUMNS: ColumnDef[] = [
  {
    id: "todo",
    title: "A Fazer & Triagem",
    statuses: ["TODO", "TRIAGE"],
    accentColor: "border-slate-400 dark:border-zinc-500",
    badgeBg: "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700/60 shadow-xs",
    headerBg: "bg-slate-200/70 dark:bg-zinc-950/40",
    targetStatus: "TODO",
  },
  {
    id: "in_progress",
    title: "Em Andamento",
    statuses: ["IN_PROGRESS"],
    accentColor: "border-blue-500 dark:border-indigo-500",
    badgeBg: "bg-white dark:bg-indigo-950 text-blue-700 dark:text-indigo-300 border border-blue-200 dark:border-indigo-800/60 shadow-xs",
    headerBg: "bg-blue-100/60 dark:bg-indigo-950/20",
    targetStatus: "IN_PROGRESS",
  },
  {
    id: "waiting",
    title: "Aguardando / Validação",
    statuses: ["WAITING"],
    accentColor: "border-amber-500",
    badgeBg: "bg-white dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs",
    headerBg: "bg-amber-100/60 dark:bg-amber-950/20",
    targetStatus: "WAITING",
  },
  {
    id: "completed",
    title: "Concluído",
    statuses: ["COMPLETED"],
    accentColor: "border-emerald-500",
    badgeBg: "bg-white dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs",
    headerBg: "bg-emerald-100/60 dark:bg-emerald-950/20",
    targetStatus: "COMPLETED",
  },
];

const KANBAN_STORAGE_KEY = "montlife_kanban_columns_v3";

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

  // Dynamic columns state with local persistence
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Column Title Editing State
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");

  // Add Section Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [newColStatus, setNewColStatus] = useState<TaskStatus>("IN_PROGRESS");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  // Load custom columns from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(KANBAN_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setColumns(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to load kanban columns from storage:", e);
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);

  // Save columns helper
  const persistColumns = (updated: ColumnDef[]) => {
    setColumns(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save kanban columns:", e);
      }
    }
  };

  // Drag-and-drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  // Strict mutual exclusion helpers
  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === "CANCELED") return false;

      // Strict account filtering
      if (accountFilter === "work" || accountFilter === "trabalho") {
        if (!isWorkTask(task)) return false;
      } else if (accountFilter === "personal" || accountFilter === "pessoal") {
        if (isWorkTask(task)) return false;
      } else if (accountFilter !== "all" && task.account_type !== accountFilter) {
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

  // Handle Drag & Drop to target column
  const handleDropOnColumn = (taskId: string, targetCol: ColumnDef) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetStatus = targetCol.targetStatus || targetCol.statuses[0];
    if (task.status !== targetStatus) {
      onUpdateStatus(taskId, targetStatus);
    }
  };

  // Rename Section
  const handleStartEditTitle = (col: ColumnDef) => {
    setEditingColId(col.id);
    setEditingTitleText(col.title);
  };

  const handleSaveTitle = (colId: string) => {
    const trimmed = editingTitleText.trim();
    if (trimmed) {
      const updated = columns.map((c) =>
        c.id === colId ? { ...c, title: trimmed } : c
      );
      persistColumns(updated);
    }
    setEditingColId(null);
  };

  const handleCancelEditTitle = () => {
    setEditingColId(null);
    setEditingTitleText("");
  };

  // Delete Custom Column
  const handleDeleteColumn = (colId: string) => {
    const updated = columns.filter((c) => c.id !== colId);
    persistColumns(updated);
  };

  // Restore Default Columns
  const handleResetColumns = () => {
    if (typeof window !== "undefined") {
      if (window.confirm("Deseja restaurar as seções padrão do Kanban? Suas alterações serão redefinidas.")) {
        persistColumns(DEFAULT_COLUMNS);
      }
    }
  };

  // Add New Section
  const handleAddNewSection = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newColTitle.trim();
    if (!title) return;

    const preset = COLOR_PRESETS[selectedColorIdx] || COLOR_PRESETS[0];
    const newCol: ColumnDef = {
      id: `custom_col_${Date.now()}`,
      title,
      statuses: [newColStatus],
      accentColor: preset.accentColor,
      badgeBg: preset.badgeBg,
      headerBg: preset.headerBg,
      isCustom: true,
      targetStatus: newColStatus,
    };

    persistColumns([...columns, newCol]);
    setIsAddModalOpen(false);
    setNewColTitle("");
    setNewColStatus("IN_PROGRESS");
    setSelectedColorIdx(0);
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

        {/* Filter Pills and Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
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
                accountFilter === "work" || accountFilter === "trabalho"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <Briefcase className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              <span>Trabalho</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("personal")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                accountFilter === "personal" || accountFilter === "pessoal"
                  ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              <User className="w-3 h-3 text-purple-500 dark:text-purple-400" />
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

          {/* Add Section Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all shrink-0 cursor-pointer"
            title="Adicionar uma nova seção customizada ao fluxo Kanban"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nova Seção</span>
          </button>

          {/* Reset Columns Button (if modified) */}
          {(columns.length !== DEFAULT_COLUMNS.length ||
            columns.some((c, i) => c.title !== DEFAULT_COLUMNS[i]?.title)) && (
            <button
              type="button"
              onClick={handleResetColumns}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
              title="Restaurar seções originais do Kanban"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

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

      {/* Kanban Horizontal Scrollable Columns Container (Occupies 100% width, dynamic flex sizing) */}
      <div className="w-full flex-1 flex gap-4 min-h-0 overflow-x-auto pb-3 items-stretch custom-scrollbar">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));
          const isOverThisCol = draggedOverColId === col.id;
          const isEditing = editingColId === col.id;

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
              className={`flex flex-col rounded-2xl bg-slate-100/90 dark:bg-[#0b0c10] border transition-all duration-200 overflow-hidden flex-1 min-w-[280px] shadow-xs ${
                isOverThisCol
                  ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-[#10121d]"
                  : "border-slate-200/90 dark:border-zinc-800/80"
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3 border-b border-slate-200/90 dark:border-zinc-800/80 flex items-center justify-between border-t-2 ${col.accentColor} ${col.headerBg}`}
              >
                {isEditing ? (
                  /* Inline Renaming Input */
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle(col.id);
                        if (e.key === "Escape") handleCancelEditTitle();
                      }}
                      className="w-full text-xs font-bold px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-indigo-500 text-slate-900 dark:text-zinc-100 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTitle(col.id)}
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Salvar título"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditTitle}
                      className="p-1 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Regular Header */
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                    <span
                      onClick={() => handleStartEditTitle(col)}
                      className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate cursor-pointer hover:underline"
                      title="Clique duas vezes ou no lápis para renomear esta seção"
                    >
                      {col.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>

                    {/* Rename Button (Pencil) */}
                    <button
                      type="button"
                      onClick={() => handleStartEditTitle(col)}
                      className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/80 dark:hover:bg-zinc-800 transition-colors opacity-60 hover:opacity-100"
                      title="Renomear esta seção"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete Custom Column Button */}
                    {col.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-60 hover:opacity-100"
                        title="Remover esta seção customizada"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Add Task inside Column */}
                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal(col.targetStatus || col.statuses[0])}
                  className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
                  title={`Criar nova demanda na etapa ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar transition-colors">
                {colTasks.length === 0 && !isOverThisCol ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl text-slate-400 dark:text-zinc-500 text-xs bg-white/40 dark:bg-transparent">
                    <span>Nenhuma demanda nesta etapa</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1">
                      Arraste uma demanda para cá
                    </span>
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
                        title="Clique para abrir detalhes, ou arraste para mudar de etapa"
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

                          {/* Account badge */}
                          {isWorkTask(task) ? (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50"
                              title={task.account_email || "haferreira@notredamecampinas.net.br"}
                            >
                              Trabalho
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/50"
                              title={task.account_email || "hellenalvesferreira.s2@gmail.com"}
                            >
                              Pessoal
                            </span>
                          )}

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

                          {/* Quick Advance Button */}
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

      {/* Modal: Adicionar Nova Seção */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#12131c] border border-slate-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nova Seção no Kanban
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Amplie seu quadro com etapas customizadas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddNewSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Título da Seção <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Homologação, Revisão TI, Backlog..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Status Base do Fluxo
                </label>
                <select
                  value={newColStatus}
                  onChange={(e) => setNewColStatus(e.target.value as TaskStatus)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="IN_PROGRESS">Em Andamento (Trabalho ativo)</option>
                  <option value="WAITING">Aguardando / Validação (Dependência externa)</option>
                  <option value="TODO">A Fazer (Pronto para início)</option>
                  <option value="TRIAGE">Triagem (Aguardando análise inicial)</option>
                  <option value="COMPLETED">Concluído (Etapa de entrega final)</option>
                </select>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  Demandas arrastadas para esta coluna receberão este status operacional.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tema Visual da Seção
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                        selectedColorIdx === idx
                          ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${preset.previewBg}`} />
                      <span className="truncate">{preset.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newColTitle.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-all"
                >
                  Adicionar Seção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
