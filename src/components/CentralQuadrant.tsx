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
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Sparkles,
  History,
  Tag,
  Share2,
  ListTodo,
  Activity,
  Bell,
  Play,
  Pause,
  XCircle,
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
    <main className="flex-1 h-full flex flex-col bg-[#0A0912] overflow-hidden">
      {/* Top Tab Bar */}
      <div className="h-12 border-b border-[#242038] px-6 flex items-center justify-between shrink-0 bg-[#0F0D1B]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "details"
                ? "bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/20"
                : "text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#1E1B2E]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Detalhes do Registro
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "timeline"
                ? "bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/20"
                : "text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#1E1B2E]"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Agenda & Timeline do Dia
          </button>

          <button
            onClick={() => setActiveTab("study")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "study"
                ? "bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/20"
                : "text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#1E1B2E]"
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-400" />
            Estudo & Melhoria
            {selectedTask?.learning_resources?.youtube_videos?.length ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ) : null}
          </button>
        </div>

        {selectedTask && (
          <div className="flex items-center gap-2 text-xs text-[#9490AC]">
            <span>ID:</span>
            <span className="font-mono text-[11px] text-[#9D8DF1]">
              {selectedTask.id.slice(0, 12)}
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Content (Inner Scroll) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* TAB 1: DETAILS */}
        {activeTab === "details" && (
          <div>
            {!selectedTask ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-[#9490AC] space-y-3">
                <FileText className="w-12 h-12 opacity-30 text-[#9D8DF1]" />
                <h3 className="text-sm font-semibold text-[#EAE9FC]">
                  Nenhum item selecionado
                </h3>
                <p className="text-xs max-w-sm opacity-70">
                  Selecione um card na lista à esquerda para ver os detalhes, alternar tipo entre Tarefa, Atividade ou Lembrete, estender prazos e ver vídeos recomendados.
                </p>
              </div>
            ) : (
              <div className="max-w-3xl space-y-5">
                {/* Header card of selected item */}
                <div className="p-5 rounded-2xl bg-[#131122] border border-[#242038] space-y-4">
                  {/* Top Bar with Context + Type Switcher + Priority */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242038]/60 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedTask.account_type === "work" ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <Briefcase className="w-3.5 h-3.5" /> Trabalho
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <User className="w-3.5 h-3.5" /> Pessoal
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1F1C33] text-[#EAE9FC] border border-[#2E2B44]">
                        {selectedTask.category}
                      </span>
                    </div>

                    {/* INTERACTIVE ITEM TYPE SWITCHER */}
                    <div className="flex items-center gap-1 bg-[#090810] p-1 rounded-xl border border-[#242038]">
                      <span className="text-[10px] text-[#9490AC] px-1.5 font-medium hidden sm:inline">Tipo:</span>
                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "task")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          (selectedTask.item_type || "task") === "task"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-[#9490AC] hover:text-[#EAE9FC]"
                        }`}
                      >
                        <ListTodo className="w-3 h-3" /> Tarefa
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "activity")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          selectedTask.item_type === "activity"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-[#9490AC] hover:text-[#EAE9FC]"
                        }`}
                      >
                        <Activity className="w-3 h-3" /> Atividade
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateItemType?.(selectedTask.id, "reminder")}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          selectedTask.item_type === "reminder"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "text-[#9490AC] hover:text-[#EAE9FC]"
                        }`}
                      >
                        <Bell className="w-3 h-3" /> Lembrete
                      </button>
                    </div>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold text-[#EAE9FC] leading-snug">
                    {selectedTask.title}
                  </h1>

                  {/* Raw input reference */}
                  <div className="p-2.5 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#9490AC] flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#9D8DF1] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#EAE9FC]">Comando Original: </span>
                      <span className="italic">&quot;{selectedTask.raw_input}&quot;</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-[#9490AC] uppercase tracking-wide">
                      Descrição & Detalhes Operacionais:
                    </h3>
                    <div className="p-4 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#EAE9FC] leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedTask.description || "Nenhuma descrição fornecida."}
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedTask.tags?.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Tag className="w-3.5 h-3.5 text-[#9490AC]" />
                      {selectedTask.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-[#1F1C33] border border-[#2E2B44] text-[10px] text-[#9D8DF1]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* SLA & Deadlines Card */}
                <div className="p-5 rounded-2xl bg-[#131122] border border-[#242038] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#EAE9FC] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#9D8DF1]" />
                      Prazos e Histórico de SLA
                    </h3>
                    {selectedTask.status !== "COMPLETED" && (
                      <button
                        onClick={() => onRequestExtendDeadline(selectedTask)}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                      >
                        Adiar / Estender Prazo
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#090810] border border-[#242038]">
                      <span className="text-[11px] text-[#9490AC] block">Criado em</span>
                      <span className="text-xs font-semibold text-[#EAE9FC]">
                        {format(parseISO(selectedTask.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090810] border border-[#242038]">
                      <span className="text-[11px] text-[#9490AC] block">
                        Prazo Original (SLA {selectedTask.priority})
                      </span>
                      <span className="text-xs font-semibold text-[#EAE9FC]">
                        {format(parseISO(selectedTask.original_due_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090810] border border-[#242038]">
                      <span className="text-[11px] text-[#9490AC] block">
                        Prazo Atual {selectedTask.extension_count > 0 ? `(${selectedTask.extension_count}x estendido)` : ""}
                      </span>
                      <span className="text-xs font-semibold text-amber-300">
                        {format(parseISO(selectedTask.current_due_date), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Extension history table */}
                  {selectedTask.deadline_extensions?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#242038]">
                      <span className="text-[11px] font-semibold text-[#9490AC] flex items-center gap-1">
                        <History className="w-3.5 h-3.5" /> Histórico de Adiamentos Justificados:
                      </span>
                      <div className="space-y-1.5">
                        {selectedTask.deadline_extensions.map((ext, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-[#090810] border border-[#242038] text-[11px] flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[#9D8DF1] font-semibold">
                                {format(parseISO(ext.extended_at), "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}
                                :
                              </span>{" "}
                              <span className="text-[#EAE9FC]">{ext.reason}</span>
                            </div>
                            <span className="text-[#9490AC]">
                              Novo prazo: {format(parseISO(ext.new_date), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolution Notes (Knowledge Base) */}
                <div className="p-5 rounded-2xl bg-[#131122] border border-[#242038] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#EAE9FC] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#9D8DF1]" />
                      Wiki Técnica — Resolução do Problema
                    </h3>
                    {selectedTask.status !== "COMPLETED" ? (
                      <button
                        onClick={() => onRequestResolution(selectedTask)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors"
                      >
                        Concluir com Solução
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registrado no Histórico
                      </span>
                    )}
                  </div>

                  {selectedTask.resolution_notes ? (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed font-sans">
                      {selectedTask.resolution_notes}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#9490AC] italic text-center">
                      Nenhuma nota de resolução registrada ainda. Conclua a tarefa para salvar a solução na base de conhecimento.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIMELINE DO DIA */}
        {activeTab === "timeline" && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#131122] border border-[#242038]">
              <div>
                <h3 className="text-sm font-semibold text-[#EAE9FC]">
                  Agenda Unificada do Dia (Trabalho + Pessoal)
                </h3>
                <p className="text-xs text-[#9490AC]">
                  Visualização integrada de eventos e compromissos sincronizados com o Google Calendar
                </p>
              </div>
              <span className="text-xs font-semibold text-[#9D8DF1] px-3 py-1 rounded-full bg-[#1F1C33] border border-[#2E2B44]">
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
                    className="flex gap-4 p-2.5 rounded-xl border border-[#242038]/50 bg-[#12101F] hover:bg-[#161426] transition-colors"
                  >
                    <span className="w-14 text-xs font-mono font-semibold text-[#9490AC] pt-1">
                      {hourFormatted}
                    </span>

                    <div className="flex-1 space-y-1.5">
                      {tasksInHour.length === 0 ? (
                        <div className="h-6 flex items-center text-[11px] text-[#9490AC]/40 italic">
                          Sem atividades agendadas
                        </div>
                      ) : (
                        tasksInHour.map((task) => (
                          <div
                            key={task.id}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              task.account_type === "work"
                                ? "bg-indigo-950/30 border-indigo-500/40 text-indigo-200"
                                : "bg-purple-950/30 border-purple-500/40 text-purple-200"
                            }`}
                          >
                            <span className="font-semibold">{task.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40">
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
          <div className="max-w-3xl space-y-5">
            <div className="p-4 rounded-xl bg-[#131122] border border-[#242038]">
              <h3 className="text-sm font-semibold text-[#EAE9FC] flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-500" />
                Curadoria de Aprendizado (YouTube)
              </h3>
              <p className="text-xs text-[#9490AC] mt-1">
                Tutoriais e materiais recomendados pela IA para executar ou automatizar esta tarefa com eficiência máxima
              </p>
            </div>

            {!selectedTask ? (
              <div className="p-8 text-center text-[#9490AC] text-xs">
                Selecione um item à esquerda para ver os vídeos recomendados.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search queries recommended by Gemini */}
                {selectedTask.learning_resources?.search_queries?.length > 0 && (
                  <div className="p-4 rounded-xl bg-[#12101F] border border-[#242038] space-y-2">
                    <span className="text-xs font-semibold text-[#9D8DF1] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Termos de Busca Recomendados:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.learning_resources.search_queries.map((q, idx) => (
                        <a
                          key={idx}
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                            q
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090810] border border-[#242038] hover:border-[#7B61FF] text-xs text-[#EAE9FC] transition-colors"
                        >
                          <span>{q}</span>
                          <ExternalLink className="w-3 h-3 text-[#9D8DF1]" />
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
                        className="group block rounded-xl overflow-hidden bg-[#131122] border border-[#242038] hover:border-[#7B61FF] transition-all shadow-lg hover:shadow-[#7B61FF]/20"
                      >
                        <div className="relative aspect-video w-full bg-black overflow-hidden">
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
                          <h4 className="text-xs font-semibold text-[#EAE9FC] line-clamp-2 group-hover:text-[#9D8DF1] transition-colors">
                            {vid.title}
                          </h4>
                          <span className="text-[11px] text-[#9490AC] block">
                            Canal: {vid.channel}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 p-6 rounded-xl bg-[#12101F] border border-[#242038] text-center text-xs text-[#9490AC]">
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
