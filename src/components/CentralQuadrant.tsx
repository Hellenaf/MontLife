"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  FileText,
  Youtube,
  Clock,
  Briefcase,
  User,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Sparkles,
  History,
  Tag,
  ListTodo,
  Activity,
  Bell,
  Edit2,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Task, TaskStatus, ItemType, AccountType } from "@/types";
import {
  format,
  parseISO,
  isToday,
  getHours,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface CentralQuadrantProps {
  selectedTask: Task | null;
  allTasks: Task[];
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateItemType?: (taskId: string, itemType: ItemType) => void;
  onUpdateTaskFields?: (taskId: string, fields: Partial<Task>) => Promise<void> | void;
  onSelectTask?: (task: Task) => void;
}

const CATEGORY_SUGGESTIONS = [
  "BI & Analytics",
  "Sistemas ERP",
  "Gestão & Contratos",
  "Comunicação & Mensagens",
  "Finanças & Tesouraria",
  "Infraestrutura & Redes",
  "Engenharia & Automações",
  "Gestão Educacional",
  "Eventos & Vendas",
  "Estudos & Capacitação",
  "Saúde & Bem-estar",
  "Vida Pessoal & Casa",
  "Suporte & Demandas",
  "Agenda & Compromissos",
];

export function CentralQuadrant({
  selectedTask,
  allTasks,
  onRequestResolution,
  onRequestExtendDeadline,
  onUpdateStatus,
  onUpdateItemType,
  onUpdateTaskFields,
  onSelectTask,
}: CentralQuadrantProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "study">("details");

  // Category and Tag Editing States
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // Calendar States (Dia | Semana | Mês)
  const [calendarViewMode, setCalendarViewMode] = useState<"day" | "week" | "month">("week");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarAccountFilter, setCalendarAccountFilter] = useState<"all" | AccountType>("all");

  // Filter tasks for calendar based on account filter
  const calendarTasks = allTasks.filter((t) => {
    if (calendarAccountFilter === "all") return true;
    return t.account_type === calendarAccountFilter;
  });

  // Hours array for Day view (07:00 to 22:00)
  const dayHours = Array.from({ length: 16 }, (_, i) => i + 7);

  // Week calculation
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 0 }); // Saturday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month calculation
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Calendar Navigation
  const handlePrev = () => {
    if (calendarViewMode === "day") setCalendarDate((d) => subDays(d, 1));
    else if (calendarViewMode === "week") setCalendarDate((d) => subWeeks(d, 1));
    else setCalendarDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (calendarViewMode === "day") setCalendarDate((d) => addDays(d, 1));
    else if (calendarViewMode === "week") setCalendarDate((d) => addWeeks(d, 1));
    else setCalendarDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Category change handler
  const handleSaveCategory = async () => {
    const clean = tempCategory.trim();
    if (!clean || !selectedTask) return;
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { category: clean });
    }
    setIsEditingCategory(false);
  };

  // Tag add handler
  const handleAddTag = async () => {
    const clean = newTagInput.trim().replace(/^#/, "");
    if (!clean || !selectedTask) return;
    const currentTags = selectedTask.tags || [];
    if (!currentTags.includes(clean)) {
      const updatedTags = [...currentTags, clean];
      if (onUpdateTaskFields) {
        await onUpdateTaskFields(selectedTask.id, { tags: updatedTags });
      }
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  // Tag remove handler
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedTask) return;
    const currentTags = selectedTask.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { tags: updatedTags });
    }
  };

  // Helper to get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return calendarTasks.filter((t) => {
      try {
        return isSameDay(parseISO(t.current_due_date), day);
      } catch {
        return false;
      }
    });
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-slate-100/50 dark:bg-[#0c0d13] overflow-hidden transition-colors duration-200">
      {/* Top Tab Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-zinc-800/80 px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#101118]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "details"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Detalhes da Demanda
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "timeline"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Agenda & Calendário
          </button>

          <button
            onClick={() => setActiveTab("study")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "study"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-500" />
            Estudo & Tutoriais
            {selectedTask?.learning_resources?.youtube_videos?.length ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ) : null}
          </button>
        </div>

        {selectedTask && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>ID:</span>
            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              {selectedTask.id.slice(0, 12)}
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* TAB 1: DETAILS */}
        {activeTab === "details" && (
          <div>
            {!selectedTask ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-3">
                <FileText className="w-12 h-12 opacity-30 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma demanda selecionada
                </h3>
                <p className="text-xs max-w-sm leading-relaxed">
                  Selecione um card na lista à esquerda para ver os detalhes, alterar o tipo, estender prazos e registrar a solução.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Header card of selected item */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  {/* Top Bar with Context + Category Editor + Type Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedTask.account_type === "work" ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">
                          <Briefcase className="w-3.5 h-3.5" /> Trabalho
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                          <User className="w-3.5 h-3.5" /> Pessoal
                        </span>
                      )}

                      {/* Interactive Editable Category */}
                      {isEditingCategory ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <input
                            list="central-category-datalist"
                            type="text"
                            value={tempCategory}
                            onChange={(e) => setTempCategory(e.target.value)}
                            placeholder="Nome da categoria..."
                            className="h-7 px-2.5 text-xs rounded-lg bg-white dark:bg-[#1f2130] border border-indigo-500 text-slate-900 dark:text-white focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCategory();
                              if (e.key === "Escape") setIsEditingCategory(false);
                            }}
                          />
                          <datalist id="central-category-datalist">
                            {CATEGORY_SUGGESTIONS.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                          <button
                            type="button"
                            onClick={handleSaveCategory}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            title="Salvar Categoria"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingCategory(false)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempCategory(selectedTask.category);
                            setIsEditingCategory(true);
                          }}
                          className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1f2130] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer"
                          title="Clique para editar a categoria"
                        >
                          <span>{selectedTask.category}</span>
                          <Edit2 className="w-3 h-3 opacity-40 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Interactive Item Type Switcher */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0c0d13] p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 font-medium hidden sm:inline">
                        Tipo:
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "task")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                          (selectedTask.item_type || "task") === "task"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <ListTodo className="w-3 h-3" /> Tarefa
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "activity")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                          selectedTask.item_type === "activity"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Activity className="w-3 h-3" /> Atividade
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "reminder")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                          selectedTask.item_type === "reminder"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Bell className="w-3 h-3" /> Lembrete
                      </button>
                    </div>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedTask.title}
                  </h1>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Descrição & Detalhes:
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedTask.description || "Nenhuma descrição fornecida."}
                    </div>
                  </div>

                  {/* Interactive Tags Section */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Tags da Demanda:</span>
                      </div>
                      {!isAddingTag && (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Tag
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedTask.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1a1b26] border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            title={`Remover tag #${tag}`}
                            className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {isAddingTag && (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            placeholder="Nova tag..."
                            className="h-7 px-2 text-xs rounded-lg bg-white dark:bg-[#12131a] border border-indigo-500 text-slate-900 dark:text-white focus:outline-none w-28 sm:w-36"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddTag();
                              if (e.key === "Escape") {
                                setIsAddingTag(false);
                                setNewTagInput("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="h-7 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
                          >
                            Adicionar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingTag(false);
                              setNewTagInput("");
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {(!selectedTask.tags || selectedTask.tags.length === 0) && !isAddingTag && (
                        <span className="text-[11px] text-slate-400 italic">
                          Nenhuma tag atribuída. Clique em &quot;Adicionar Tag&quot; para definir tags personalizadas.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SLA & Deadlines Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Prazos & Linha do Tempo (SLA)
                    </h3>
                    {selectedTask.status !== "COMPLETED" && (
                      <button
                        onClick={() => onRequestExtendDeadline(selectedTask)}
                        className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium transition-colors"
                      >
                        Adiar / Estender Prazo
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Criado em</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(selectedTask.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Prazo Original (SLA {selectedTask.priority})
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(selectedTask.original_due_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Prazo Atual {selectedTask.extension_count > 0 ? `(${selectedTask.extension_count}x estendido)` : ""}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(selectedTask.current_due_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Extension history if any */}
                  {selectedTask.deadline_extensions?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-amber-500" />
                        Histórico de Adiamentos:
                      </span>
                      <div className="space-y-1.5">
                        {selectedTask.deadline_extensions.map((ext, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-[11px] flex items-center justify-between"
                          >
                            <div>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {format(parseISO(ext.extended_at), "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}
                                :
                              </span>{" "}
                              <span className="text-slate-800 dark:text-slate-200">{ext.reason}</span>
                            </div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Novo prazo: {format(parseISO(ext.new_date), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolution Notes */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Resolução & Histórico da Demanda
                    </h3>
                    {selectedTask.status !== "COMPLETED" ? (
                      <button
                        onClick={() => onRequestResolution(selectedTask)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium transition-colors"
                      >
                        Concluir com Solução
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                      </span>
                    )}
                  </div>

                  {selectedTask.resolution_notes ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      {selectedTask.resolution_notes}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Nenhuma anotação de resolução registrada até o momento.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CALENDAR & TIMELINE (DIA | SEMANA | MÊS) */}
        {activeTab === "timeline" && (
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Header with Navigation and View Modes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: View title + Prev/Next buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 dark:bg-[#1a1b26] p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#202230] text-slate-600 dark:text-slate-300 transition-all"
                      title="Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-2.5 py-1 text-xs font-semibold hover:bg-white dark:hover:bg-[#202230] text-slate-700 dark:text-slate-200 rounded-lg transition-all"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#202230] text-slate-600 dark:text-slate-300 transition-all"
                      title="Próximo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white capitalize">
                    {calendarViewMode === "day" &&
                      format(calendarDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {calendarViewMode === "week" &&
                      `Semana de ${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`}
                    {calendarViewMode === "month" &&
                      format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>

                {/* Right: Switcher (Dia | Semana | Mês) + Context Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Context selector: Todas | Trabalho | Pessoal */}
                  <div className="flex items-center bg-slate-100 dark:bg-[#1a1b26] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCalendarAccountFilter("all")}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                        calendarAccountFilter === "all"
                          ? "bg-white dark:bg-[#202230] text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarAccountFilter("work")}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                        calendarAccountFilter === "work"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Briefcase className="w-2.5 h-2.5" /> Trabalho
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarAccountFilter("personal")}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                        calendarAccountFilter === "personal"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <User className="w-2.5 h-2.5" /> Pessoal
                    </button>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center bg-slate-100 dark:bg-[#1a1b26] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("day")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        calendarViewMode === "day"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("week")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        calendarViewMode === "week"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("month")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        calendarViewMode === "month"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Mês
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tarefas, compromissos e eventos sincronizados com o Google Agenda e Google Tasks.
              </p>
            </div>

            {/* 1. DAY VIEW */}
            {calendarViewMode === "day" && (
              <div className="space-y-2 animate-in fade-in">
                {dayHours.map((hour) => {
                  const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;
                  const dayTasks = getTasksForDay(calendarDate);
                  const tasksInHour = dayTasks.filter((t) => {
                    try {
                      return getHours(parseISO(t.current_due_date)) === hour;
                    } catch {
                      return false;
                    }
                  });

                  return (
                    <div
                      key={hour}
                      className="flex gap-4 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#141520] hover:bg-slate-50 dark:hover:bg-[#181926] transition-colors shadow-sm"
                    >
                      <span className="w-14 text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 pt-1 shrink-0">
                        {hourFormatted}
                      </span>

                      <div className="flex-1 space-y-1.5">
                        {tasksInHour.length === 0 ? (
                          <div className="h-6 flex items-center text-[11px] text-slate-400 dark:text-slate-600 italic">
                            Sem compromissos
                          </div>
                        ) : (
                          tasksInHour.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => onSelectTask?.(task)}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 text-xs flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all shadow-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {task.item_type === "activity" ? (
                                  <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                ) : task.item_type === "reminder" ? (
                                  <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                ) : (
                                  <ListTodo className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {task.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    task.account_type === "work"
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                                      : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                                  }`}
                                >
                                  {task.account_type === "work" ? "Trabalho" : "Pessoal"}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. WEEK VIEW */}
            {calendarViewMode === "week" && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 animate-in fade-in">
                {weekDays.map((day) => {
                  const tasksForThisDay = getTasksForDay(day);
                  const isDayToday = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`rounded-2xl border p-3 flex flex-col space-y-2.5 transition-all min-h-[300px] ${
                        isDayToday
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500/70 shadow-sm"
                          : "bg-white dark:bg-[#141520] border-slate-200 dark:border-zinc-800 shadow-sm"
                      }`}
                    >
                      {/* Day Column Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                            {format(day, "EEE", { locale: ptBR })}
                          </span>
                          <span
                            className={`text-sm font-black ${
                              isDayToday
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {format(day, "dd/MM")}
                          </span>
                        </div>

                        {tasksForThisDay.length > 0 && (
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1a1b26] text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                            {tasksForThisDay.length}
                          </span>
                        )}
                      </div>

                      {/* Day Tasks Cards */}
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-[460px] no-scrollbar">
                        {tasksForThisDay.length === 0 ? (
                          <div className="h-20 flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-600 italic">
                            Livre
                          </div>
                        ) : (
                          tasksForThisDay.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => onSelectTask?.(task)}
                              className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1b26] border border-slate-200 dark:border-zinc-800 hover:border-indigo-500 transition-all cursor-pointer shadow-sm space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono text-slate-400">
                                  {format(parseISO(task.current_due_date), "HH:mm")}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    task.account_type === "work" ? "bg-blue-500" : "bg-purple-500"
                                  }`}
                                  title={task.account_type === "work" ? "Trabalho" : "Pessoal"}
                                />
                              </div>

                              <h5 className="text-[11px] font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                                {task.title}
                              </h5>

                              <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">
                                {task.category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. MONTH VIEW */}
            {calendarViewMode === "month" && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141520] p-4 shadow-sm space-y-2 animate-in fade-in">
                {/* Month Day-of-week header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {monthGridDays.map((day) => {
                    const tasksForDay = getTasksForDay(day);
                    const isDayInCurrentMonth = isSameMonth(day, calendarDate);
                    const isDayToday = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          setCalendarDate(day);
                          setCalendarViewMode("day");
                        }}
                        className={`min-h-[90px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 ${
                          !isDayInCurrentMonth
                            ? "opacity-30 bg-slate-50/50 dark:bg-zinc-900/30 border-slate-100 dark:border-zinc-900"
                            : isDayToday
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/70 dark:border-indigo-500/50"
                            : "bg-slate-50/60 dark:bg-[#181926] border-slate-200/80 dark:border-zinc-800/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDayToday
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {tasksForDay.length > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {tasksForDay.length}
                            </span>
                          )}
                        </div>

                        {/* Preview badges */}
                        <div className="space-y-1 mt-1 overflow-hidden">
                          {tasksForDay.slice(0, 2).map((t) => (
                            <div
                              key={t.id}
                              className={`truncate px-1.5 py-0.5 rounded text-[9px] font-medium leading-none ${
                                t.account_type === "work"
                                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                                  : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                              }`}
                              title={t.title}
                            >
                              {t.title}
                            </div>
                          ))}
                          {tasksForDay.length > 2 && (
                            <span className="text-[9px] text-slate-400 font-medium pl-1 block">
                              +{tasksForDay.length - 2} mais
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ESTUDO & YOUTUBE */}
        {activeTab === "study" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-500" />
                Curadoria de Aprendizado & Tutoriais
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Materiais recomendados para executar ou solucionar esta demanda
              </p>
            </div>

            {!selectedTask ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                Selecione uma demanda à esquerda para ver os vídeos recomendados.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search queries */}
                {selectedTask.learning_resources?.search_queries?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Termos de Busca Recomendados:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.learning_resources.search_queries.map((q, idx) => (
                        <a
                          key={idx}
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 hover:border-indigo-500 text-xs text-slate-800 dark:text-slate-200 transition-colors"
                        >
                          <span>{q}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube Video Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedTask.learning_resources?.youtube_videos?.length > 0 ? (
                    selectedTask.learning_resources.youtube_videos.map((vid, i) => (
                      <a
                        key={i}
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block rounded-2xl overflow-hidden bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 hover:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={vid.thumbnail}
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
                              <Youtube className="w-5 h-5 fill-current" />
                            </div>
                          </div>
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {vid.title}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Canal: {vid.channel}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-500 shadow-sm">
                      Nenhum vídeo adicional disponível para esta atividade.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
