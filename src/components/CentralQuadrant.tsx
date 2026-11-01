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
}

export function CentralQuadrant({
  selectedTask,
  allTasks,
  onRequestResolution,
  onRequestExtendDeadline,
  onUpdateStatus,
  onUpdateItemType,
}: CentralQuadrantProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "study">("details");

  // Timeline events for today (tasks due today or active)
  const todayTasks = allTasks.filter((t) => {
    try {
      return isToday(parseISO(t.current_due_date)) || t.status === "IN_PROGRESS";
    } catch {
      return false;
    }
  });

  const hoursArray = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00

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
                  {/* Top Bar with Context + Type Switcher + Priority */}
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

                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1f2130] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700">
                        {selectedTask.category}
                      </span>
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

                  {/* Tags */}
                  {selectedTask.tags?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {selectedTask.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
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
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {format(parseISO(selectedTask.current_due_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Extension history */}
                  {selectedTask.deadline_extensions?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <History className="w-3.5 h-3.5" /> Histórico de Adiamentos Justificados:
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
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-sans">
                      {selectedTask.resolution_notes}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-slate-400 italic text-center">
                      Nenhuma nota de resolução registrada ainda. Conclua a tarefa para salvar a solução no histórico.
                    </div>
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
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              task.account_type === "work"
                                ? "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-500/40 dark:text-blue-200"
                                : "bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950/30 dark:border-purple-500/40 dark:text-purple-200"
                            }`}
                          >
                            <span className="font-semibold">{task.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-black/40">
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
