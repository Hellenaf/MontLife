"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ListTodo,
  Activity,
  Bell,
  Briefcase,
  User,
  Sparkles,
  Check,
  Loader2,
  ExternalLink,
  MapPin,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Task, GoogleCalendarEventItem } from "@/types";
import {
  getTaskScheduleDate,
  isTaskScheduledForDay,
  isTaskAllDay,
} from "@/lib/taskSchedule";
import {
  format,
  parseISO,
  isToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendaDoDiaViewProps {
  tasks: Task[];
  accountFilter?: "all" | string;
  selectedTaskId?: string | null;
  onSelectTask: (task: Task) => void;
  onOpenNewTaskModal?: () => void;
  onTaskCreated?: (task: Task) => void;
}

/**
 * Verifica se um evento do Google Calendar ocorre no dia selecionado.
 */
function isGcalEventOnDay(event: GoogleCalendarEventItem, targetDay: Date): boolean {
  if (!event.start) return false;
  try {
    const targetYmd = format(targetDay, "yyyy-MM-dd");
    // Evento de dia inteiro (formato YYYY-MM-DD)
    if (!event.start.includes("T")) {
      return event.start.substring(0, 10) === targetYmd;
    }
    const eventDate = parseISO(event.start);
    return isSameDay(eventDate, targetDay);
  } catch {
    return false;
  }
}

/**
 * Formata o texto de horário para exibição amigável.
 */
function getGcalEventTimeText(event: GoogleCalendarEventItem): string {
  if (event.allDay || !event.start.includes("T")) {
    return "Dia todo";
  }
  try {
    const startStr = format(parseISO(event.start), "HH:mm");
    if (event.end && event.end.includes("T")) {
      const endStr = format(parseISO(event.end), "HH:mm");
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  } catch {
    return "Horário agendado";
  }
}

export function AgendaDoDiaView({
  tasks,
  accountFilter = "all",
  selectedTaskId,
  onSelectTask,
  onOpenNewTaskModal,
  onTaskCreated,
}: AgendaDoDiaViewProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [agendaSourceFilter, setAgendaSourceFilter] = useState<"all" | "work" | "personal" | "gcal">("all");

  // Estado dos eventos do Google Calendar
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingGcal, setIsLoadingGcal] = useState<boolean>(false);
  const [isSyncingGcal, setIsSyncingGcal] = useState<boolean>(false);
  const [convertingEventId, setConvertingEventId] = useState<string | null>(null);
  const [gcalStatusMessage, setGcalStatusMessage] = useState<string | null>(null);

  // Helper de checagem trabalho vs pessoal
  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  // Carrega os eventos da Agenda Pessoal do Google
  const fetchGoogleCalendarEvents = useCallback(async () => {
    setIsLoadingGcal(true);
    setGcalStatusMessage(null);
    try {
      const res = await fetch("/api/google/calendar");
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setGcalEvents(data.events);
      } else if (data.error) {
        setGcalStatusMessage(data.error);
      }
    } catch (err) {
      console.warn("Erro ao carregar eventos do Google Agenda:", err);
      setGcalStatusMessage("Não foi possível carregar a Agenda do Google.");
    } finally {
      setIsLoadingGcal(false);
      setIsSyncingGcal(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleCalendarEvents();
  }, [fetchGoogleCalendarEvents]);

  // Transformar evento do Google Agenda em Demanda MontLife
  const handleConvertToTask = async (event: GoogleCalendarEventItem) => {
    if (convertingEventId === event.id) return;
    setConvertingEventId(event.id);

    try {
      const res = await fetch("/api/google/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          location: event.location,
          accountType: event.isPersonal ? "Pessoal" : "Trabalho",
          accountEmail: event.accountEmail,
        }),
      });

      const data = await res.json();
      if (data.success && data.task) {
        // Confetti comemoração
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#10B981", "#6366F1", "#8B5CF6", "#3B82F6"],
        });

        // Atualiza a lista local de eventos do Google Calendar vinculando ao novo ID
        setGcalEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, linkedTaskId: data.task.id } : e
          )
        );

        // Notifica o app pai para registrar a nova demanda em tempo real
        if (onTaskCreated) {
          onTaskCreated(data.task);
        }
      }
    } catch (err) {
      console.error("Erro ao converter agendamento em demanda:", err);
    } finally {
      setConvertingEventId(null);
    }
  };

  // Na Agenda do Dia, o usuário precisa ver o dia unificado (Trabalho + Pessoal + Google Agenda)
  // O filtro de conta global da barra lateral NÃO deve esconder compromissos pessoais desta visão.
  const relevantMontLifeTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (agendaSourceFilter === "work") return isWorkTask(t);
      if (agendaSourceFilter === "personal") return !isWorkTask(t);
      if (agendaSourceFilter === "gcal") return false;
      return true; // "all"
    });
  }, [tasks, agendaSourceFilter]);

  // Cálculo do Mês Selecionado
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Cálculo da Semana Selecionada
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Demandas MontLife agendadas para o dia selecionado
  const tasksForSelectedDay = useMemo(() => {
    return relevantMontLifeTasks
      .filter((t) => isTaskScheduledForDay(t, calendarDate))
      .sort((a, b) => {
        const dateA = new Date(getTaskScheduleDate(a)).getTime();
        const dateB = new Date(getTaskScheduleDate(b)).getTime();
        return dateA - dateB;
      });
  }, [relevantMontLifeTasks, calendarDate]);

  // Eventos do Google Agenda Pessoal para o dia selecionado
  const gcalEventsForSelectedDay = useMemo(() => {
    if (agendaSourceFilter === "work") return [];
    return gcalEvents.filter((ev) => isGcalEventOnDay(ev, calendarDate));
  }, [gcalEvents, calendarDate, agendaSourceFilter]);

  // Total de itens combinados do dia selecionado
  const totalItemsForSelectedDay = tasksForSelectedDay.length + gcalEventsForSelectedDay.length;

  // Total de demandas no mês
  const monthTasksCount = useMemo(() => {
    return tasks.filter((t) => {
      try {
        const sched = getTaskScheduleDate(t);
        return isSameMonth(parseISO(sched), calendarDate);
      } catch {
        return false;
      }
    }).length;
  }, [tasks, calendarDate]);

  // Total de eventos Google no mês
  const monthGcalCount = useMemo(() => {
    return gcalEvents.filter((ev) => {
      try {
        const d = parseISO(ev.start);
        return isSameMonth(d, calendarDate);
      } catch {
        return false;
      }
    }).length;
  }, [gcalEvents, calendarDate]);

  // Navegação do Mês
  const handlePrevMonth = () => setCalendarDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCalendarDate((d) => addMonths(d, 1));
  const handleToday = () => setCalendarDate(new Date());

  return (
    <div className="w-full max-w-[1680px] mx-auto space-y-4 pb-12 transition-colors animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. AGENDA TOOLBAR EXPANDIDA */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Lado Esquerdo: + Nova Demanda + Hoje + Controles do Mês + Título */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
          {onOpenNewTaskModal && (
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Demanda</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-2 rounded-2xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shadow-2xs active:scale-95 cursor-pointer"
          >
            Hoje
          </button>

          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#181926] p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês Anterior"
              title="Mês Anterior"
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo Mês"
              title="Próximo Mês"
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white capitalize leading-tight flex items-center gap-2">
              <span>{format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              Dia em foco:{" "}
              <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </strong>
            </p>
          </div>
        </div>

        {/* Lado Direito: Filtros da Agenda do Dia + Indicador Google Calendar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de visualização exclusivo da Agenda do Dia */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#161724] p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setAgendaSourceFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                agendaSourceFilter === "all"
                  ? "bg-white dark:bg-[#202234] text-slate-900 dark:text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tudo ({tasksForSelectedDay.length + gcalEventsForSelectedDay.length})
            </button>
            <button
              type="button"
              onClick={() => setAgendaSourceFilter("work")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                agendaSourceFilter === "work"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Briefcase className="w-3 h-3" />
              <span>Trabalho</span>
            </button>
            <button
              type="button"
              onClick={() => setAgendaSourceFilter("personal")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                agendaSourceFilter === "personal"
                  ? "bg-purple-600 text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <User className="w-3 h-3" />
              <span>Pessoal</span>
            </button>
            <button
              type="button"
              onClick={() => setAgendaSourceFilter("gcal")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                agendaSourceFilter === "gcal"
                  ? "bg-amber-600 text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Exibir apenas os compromissos importados da sua Agenda Pessoal do Google"
            >
              <Calendar className="w-3 h-3 text-amber-500" />
              <span>Google Agenda</span>
            </button>
          </div>

          {/* Botão de sincronização manual do Google Calendar */}
          <button
            type="button"
            onClick={() => {
              setIsSyncingGcal(true);
              fetchGoogleCalendarEvents();
            }}
            disabled={isSyncingGcal || isLoadingGcal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#181926] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Atualizar agendamentos da Agenda Pessoal do Google"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGcal || isLoadingGcal ? "animate-spin text-amber-500" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Sincronizar Google</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRADE AMPLIADA: MÊS EXPANDIDO (ESQUERDA) + SEMANA & DIA (DIREITA) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* PAINEL ESQUERDO: CALENDÁRIO MENSAL AMPLIADO (COL-SPAN-7) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col">
            {/* Header do Calendário Mensal */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#151622] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Calendário Geral & Google Agenda
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clique em qualquer data para inspecionar os agendamentos corporativos e pessoais.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                  {monthTasksCount} demandas • {monthGcalCount} Google
                </span>
              </div>
            </div>

            {/* Cabeçalho dos Dias da Semana (SEG -> DOM) */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/60 dark:bg-[#10111a] text-center">
              {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((wd) => (
                <div
                  key={wd}
                  className="py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 tracking-wider"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Grade Ampliada de Dias do Mês */}
            <div className="grid grid-cols-7 gap-1 bg-slate-200/70 dark:bg-zinc-800/50 p-1.5 sm:p-2">
              {monthGridDays.map((day) => {
                const dayTasks = tasks.filter((t) => isTaskScheduledForDay(t, day));
                const dayGcal = gcalEvents.filter((ev) => isGcalEventOnDay(ev, day));
                const isDayInCurrentMonth = isSameMonth(day, calendarDate);
                const isDayToday = isToday(day);
                const isDaySelected = isSameDay(day, calendarDate);

                const hasWork = dayTasks.some((t) => isWorkTask(t));
                const hasPersonal = dayTasks.some((t) => !isWorkTask(t));
                const hasGcal = dayGcal.length > 0;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setCalendarDate(day)}
                    className={`min-h-[86px] sm:min-h-[96px] lg:min-h-[104px] p-2 rounded-2xl flex flex-col justify-between transition-all cursor-pointer relative group text-left ${
                      isDaySelected
                        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 scale-[1.01] z-10 ring-2 ring-indigo-400"
                        : isDayToday
                        ? "bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/50"
                        : !isDayInCurrentMonth
                        ? "bg-white/40 dark:bg-[#0e0f16]/40 text-slate-300 dark:text-zinc-600 hover:bg-white dark:hover:bg-[#141520]"
                        : "bg-white dark:bg-[#13141f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#181926]"
                    }`}
                  >
                    {/* Top Row: Número do dia + badges indicadores */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-bold rounded-xl w-6 h-6 flex items-center justify-center ${
                          isDaySelected
                            ? "bg-white text-indigo-700 font-black shadow-xs"
                            : isDayToday
                            ? "bg-indigo-600 text-white font-black"
                            : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {/* Total count badge */}
                      {(dayTasks.length > 0 || dayGcal.length > 0) && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold leading-none ${
                            isDaySelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                          }`}
                        >
                          {dayTasks.length + dayGcal.length}
                        </span>
                      )}
                    </div>

                    {/* Middle Area: Mini Indicadores / Pílulas Visuais */}
                    <div className="w-full space-y-1 my-1">
                      {/* Dots coloridos */}
                      <div className="flex items-center gap-1">
                        {hasWork && (
                          <span
                            className={`w-2 h-2 rounded-full ${isDaySelected ? "bg-white" : "bg-blue-500"}`}
                            title="Demandas de Trabalho"
                          />
                        )}
                        {hasPersonal && (
                          <span
                            className={`w-2 h-2 rounded-full ${isDaySelected ? "bg-white" : "bg-purple-500"}`}
                            title="Demandas Pessoais"
                          />
                        )}
                        {hasGcal && (
                          <span
                            className={`w-2 h-2 rounded-full ${isDaySelected ? "bg-white" : "bg-amber-400"}`}
                            title="Compromisso da Agenda Google Pessoal"
                          />
                        )}
                      </div>

                      {/* Preview em texto compacto de até 1 item para dias com conteúdo */}
                      {dayGcal.length > 0 ? (
                        <div
                          className={`truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium leading-tight flex items-center gap-1 ${
                            isDaySelected
                              ? "bg-white/20 text-white"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50"
                          }`}
                        >
                          <span className="shrink-0">📅</span>
                          <span className="truncate">{dayGcal[0].summary}</span>
                        </div>
                      ) : dayTasks.length > 0 ? (
                        <div
                          className={`truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium leading-tight ${
                            isDaySelected
                              ? "bg-white/20 text-white"
                              : hasWork
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                              : "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"
                          }`}
                        >
                          <span className="truncate">{dayTasks[0].title}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Status label */}
                    <div className="text-[10px] opacity-70 leading-none">
                      {isDayToday ? "Hoje" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legenda Informativa */}
            <div className="p-3 border-t border-slate-100 dark:border-zinc-800/60 bg-slate-50/60 dark:bg-[#10111a] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Trabalho
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Pessoal
                </span>
                <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Google Agenda Pessoal
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Visualização ampla de espaço corporativo
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAINEL DIREITO: SEMANA ATIVA + COMPROMISSOS DO DIA (COL-SPAN-5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Faixa da Semana Ativa */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Semana Selecionada
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {format(weekStart, "d 'de' MMM", { locale: ptBR })} —{" "}
                {format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* 7 Dias da Semana com contadores */}
            <div className="grid grid-cols-7 gap-1 pt-1">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, calendarDate);
                const isDayToday = isToday(day);
                const dayTasksCount = tasks.filter((t) => isTaskScheduledForDay(t, day)).length;
                const dayGcalCount = gcalEvents.filter((ev) => isGcalEventOnDay(ev, day)).length;
                const totalDayItems = dayTasksCount + dayGcalCount;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setCalendarDate(day)}
                    className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-[1.03]"
                        : isDayToday
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold"
                        : "bg-slate-50 dark:bg-[#0c0d13] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-800/60"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5 font-medium">
                      {format(day, "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-sm sm:text-base font-black leading-tight">
                      {format(day, "d")}
                    </span>
                    <div className="h-3 flex items-center justify-center mt-0.5">
                      {totalDayItems > 0 ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-white" : dayGcalCount > 0 ? "bg-amber-400" : "bg-indigo-500"
                          }`}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Lista Unificada de Demandas e Agendamentos do Dia Selecionado */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            {/* Header da Lista */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white capitalize">
                    {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalItemsForSelectedDay === 0
                      ? "Nenhum compromisso ou demanda para esta data"
                      : totalItemsForSelectedDay === 1
                      ? "1 item agendado para hoje"
                      : `${totalItemsForSelectedDay} itens agendados para este dia`}
                  </p>
                </div>
              </div>

              {onOpenNewTaskModal && (
                <button
                  type="button"
                  onClick={onOpenNewTaskModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              )}
            </div>

            {/* Aviso caso a Agenda Google esteja sincronizando ou com mensagem */}
            {gcalStatusMessage && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{gcalStatusMessage}</span>
                </div>
                <a
                  href="/api/google/auth?action=link"
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0 transition-colors"
                >
                  Reconectar Google
                </a>
              </div>
            )}

            {/* Lista com Rolagem Customizada */}
            <div className="space-y-3 pt-1 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
              {totalItemsForSelectedDay === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
                  <Clock className="w-9 h-9 mx-auto opacity-40 text-indigo-400" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Nenhuma demanda ou compromisso agendado para este dia.
                  </p>
                  {onOpenNewTaskModal && (
                    <button
                      type="button"
                      onClick={onOpenNewTaskModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agendar Nova Demanda
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* SEÇÃO 1: EVENTOS DO GOOGLE CALENDAR PESSOAL (COM OPÇÃO DE TRANSFORMAR EM DEMANDA) */}
                  {gcalEventsForSelectedDay.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Google Agenda Pessoal ({gcalEventsForSelectedDay.length})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Sincronizado via Google Calendar
                        </span>
                      </div>

                      {gcalEventsForSelectedDay.map((ev) => {
                        const timeText = getGcalEventTimeText(ev);
                        const isConverting = convertingEventId === ev.id;
                        const linkedTask = tasks.find(
                          (t) =>
                            t.id === ev.linkedTaskId ||
                            t.google_calendar_event_id === ev.id ||
                            (t.tags && t.tags.includes(`gcal-${ev.id}`))
                        );

                        return (
                          <div
                            key={ev.id}
                            className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-[#181622] border border-amber-200/70 dark:border-amber-800/40 space-y-2.5 transition-all hover:shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-300/80 dark:border-amber-800/70">
                                    {timeText}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                    Agenda Pessoal
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {ev.summary}
                                </h4>
                                {ev.description && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {ev.description}
                                  </p>
                                )}
                                {ev.location && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    <MapPin className="w-3 h-3 text-amber-600" />
                                    <span className="truncate">{ev.location}</span>
                                  </div>
                                )}
                              </div>

                              {ev.htmlLink && (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                                  title="Abrir no Google Calendar Oficial"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {/* AÇÃO PRINCIPAL: TRANSFORMAR EM DEMANDA */}
                            <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between gap-2 flex-wrap">
                              {linkedTask ? (
                                <div className="flex items-center justify-between w-full">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2.5 py-1 rounded-xl">
                                    <Check className="w-3.5 h-3.5" />
                                    Vinculado como Demanda
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onSelectTask(linkedTask)}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    Ver Detalhes <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Agendamento do Google disponível para gestão.
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isConverting}
                                    onClick={() => handleConvertToTask(ev)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                    title="Transformar este agendamento do Google em uma demanda corporativa/pessoal no MontLife"
                                  >
                                    {isConverting ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Transformando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Transformar em Demanda</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SEÇÃO 2: DEMANDAS MONTLIFE AGENDADAS */}
                  {tasksForSelectedDay.length > 0 && (
                    <div className="space-y-2">
                      {gcalEventsForSelectedDay.length > 0 && (
                        <div className="flex items-center justify-between px-1 pt-2">
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5" />
                            Demandas & Atividades MontLife ({tasksForSelectedDay.length})
                          </span>
                        </div>
                      )}

                      {tasksForSelectedDay.map((task) => {
                        const isAllDay = isTaskAllDay(task);
                        const timeText = isAllDay
                          ? "Dia todo"
                          : format(parseISO(getTaskScheduleDate(task)), "HH:mm");
                        const isCurrentSelected = selectedTaskId === task.id;
                        const isWork = isWorkTask(task);

                        return (
                          <div
                            key={task.id}
                            onClick={() => onSelectTask(task)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              isCurrentSelected
                                ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-[#141520] bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700"
                                : "bg-slate-50/70 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 shrink-0">
                                {timeText}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 shrink-0" />
                              <div className="flex items-center gap-2 min-w-0">
                                {task.item_type === "activity" ? (
                                  <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                ) : task.item_type === "reminder" ? (
                                  <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                ) : (
                                  <ListTodo className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                  {task.title}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${
                                  isWork
                                    ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                                    : "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20"
                                }`}
                              >
                                {isWork ? (
                                  <>
                                    <Briefcase className="w-2.5 h-2.5" />
                                    <span>Trabalho</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-2.5 h-2.5" />
                                    <span>Pessoal</span>
                                  </>
                                )}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-purple-600 dark:text-purple-400">
                                {task.priority}
                              </span>
                              <span className="text-[11px] text-indigo-500 font-semibold flex items-center gap-0.5 ml-1">
                                Abrir <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
