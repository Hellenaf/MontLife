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
} from "lucide-react";
import { Task, TaskStatus, ItemType } from "@/types";
import { format, parseISO, isToday, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CentralQuadrantProps {
  selectedTask: Task | null;
  allTasks: Task[];
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateItemType?: (taskId: string, itemType: ItemType) => void;
  onUpdateTaskFields?: (taskId: string, fields: Partial<Task>) => Promise<void> | void;
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
];

export function CentralQuadrant({
  selectedTask,
  allTasks,
  onRequestResolution,
  onRequestExtendDeadline,
  onUpdateStatus,
  onUpdateItemType,
  onUpdateTaskFields,
}: CentralQuadrantProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "study">("details");

  // Category and Tag Editing States
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // Timeline events for today (tasks due today or active)
  const todayTasks = allTasks.filter((t) => {
    try {
      return isToday(parseISO(t.current_due_date)) || t.status === "IN_PROGRESS";
    } catch {
      return false;
    }
  });

  const hoursArray = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

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
            Agenda do Dia
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

        {/* TAB 2: TIMELINE */}
        {activeTab === "timeline" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Agenda do Dia (Trabalho + Pessoal)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualização integrada de eventos e compromissos sincronizados com o Google Tasks
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
                Hoje: {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {/* Hourly schedule */}
            <div className="space-y-2">
              {hoursArray.map((hour) => {
                const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;
                const tasksInHour = todayTasks.filter((t) => {
                  try {
                    return getHours(parseISO(t.current_due_date)) === hour;
                  } catch {
                    return false;
                  }
                });

                return (
                  <div
                    key={hour}
                    className="flex gap-4 p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#141520] hover:bg-slate-50 dark:hover:bg-[#181926] transition-colors shadow-sm"
                  >
                    <span className="w-14 text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 pt-1">
                      {hourFormatted}
                    </span>

                    <div className="flex-1 space-y-1.5">
                      {tasksInHour.length === 0 ? (
                        <div className="h-6 flex items-center text-[11px] text-slate-400 dark:text-slate-600 italic">
                          Sem atividades agendadas
                        </div>
                      ) : (
                        tasksInHour.map((task) => (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 text-xs flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-md">
                              {task.title}
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
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
