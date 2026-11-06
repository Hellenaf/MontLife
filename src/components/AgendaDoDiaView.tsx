"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Task, AccountType, ItemType, Priority } from "@/types";
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
  addWeeks,
  subWeeks,
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
}

export function AgendaDoDiaView({
  tasks,
  accountFilter = "all",
  selectedTaskId,
  onSelectTask,
  onOpenNewTaskModal,
}: AgendaDoDiaViewProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Strict mutual exclusion helper for work vs personal
  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  // Filter tasks based on global sidebar workspace filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const f = (accountFilter || "all").toLowerCase().trim();
      if (f === "all") return true;
      if (f === "work" || f.includes("trab") || f.includes("notre") || f.includes("haferreira")) {
        return isWorkTask(t);
      }
      if (f === "personal" || f.includes("pess") || f.includes("hellen")) {
        return !isWorkTask(t);
      }
      if (t.account_type && t.account_type.toLowerCase() === f) return true;
      return true;
    });
  }, [tasks, accountFilter]);

  // Week calculation (Monday to Sunday) based on calendarDate
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month calculation based on calendarDate
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Tasks scheduled for the currently selected day
  const tasksForSelectedDay = useMemo(() => {
    return filteredTasks
      .filter((t) => isTaskScheduledForDay(t, calendarDate))
      .sort((a, b) => {
        const dateA = new Date(getTaskScheduleDate(a)).getTime();
        const dateB = new Date(getTaskScheduleDate(b)).getTime();
        return dateA - dateB;
      });
  }, [filteredTasks, calendarDate]);

  // Tasks count for current month
  const monthTasksCount = useMemo(() => {
    return filteredTasks.filter((t) => {
      try {
        const sched = getTaskScheduleDate(t);
        return isSameMonth(parseISO(sched), calendarDate);
      } catch {
        return false;
      }
    }).length;
  }, [filteredTasks, calendarDate]);

  // Navigation handlers for month
  const handlePrevMonth = () => {
    setCalendarDate((d) => subMonths(d, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-3 sm:p-5 bg-slate-100/50 dark:bg-[#0c0d13] space-y-4 custom-scrollbar transition-colors">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* 1. AGENDA TOOLBAR */}
        <div className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          {/* Left Side: + Nova Demanda + Hoje + Month Chevrons + Date Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {onOpenNewTaskModal && (
              <button
                type="button"
                onClick={onOpenNewTaskModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Demanda</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              Hoje
            </button>

            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#181926] p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês Anterior"
                title="Mês Anterior"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo Mês"
                title="Próximo Mês"
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize leading-tight flex items-center gap-2">
                <span>{format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                Dia selecionado: <strong className="text-indigo-600 dark:text-indigo-400">{format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</strong>
              </p>
            </div>
          </div>

          {/* Right Side: Month Total Indicator & Workspace Context */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                <strong className="text-slate-900 dark:text-white font-mono font-bold">{monthTasksCount}</strong> demandas em {format(calendarDate, "MMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        {/* 2. SIDE-BY-SIDE INTEGRATED GRID: MÊS (ESQUERDA) + SEMANA & DIA (DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ========================================================================= */}
          {/* PAINEL ESQUERDO: TABELA DO MÊS (COL-SPAN-5) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col">
              {/* Header do Calendário Mensal */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#151622] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Visão Mensal
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                  {format(calendarDate, "MMMM yyyy", { locale: ptBR })}
                </span>
              </div>

              {/* Dias da Semana (SEG -> DOM) */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-zinc-800/80 bg-slate-100/50 dark:bg-[#10111a] text-center">
                {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((wd) => (
                  <div
                    key={wd}
                    className="py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Grade de Dias do Mês */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-zinc-800/60 p-1">
                {monthGridDays.map((day) => {
                  const tasksForDay = filteredTasks.filter((t) => isTaskScheduledForDay(t, day));
                  const isDayInCurrentMonth = isSameMonth(day, calendarDate);
                  const isDayToday = isToday(day);
                  const isDaySelected = isSameDay(day, calendarDate);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setCalendarDate(day)}
                      className={`h-14 sm:h-16 p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer relative group ${
                        isDaySelected
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-[1.02] z-10"
                          : isDayToday
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-bold ring-1 ring-indigo-500/40"
                          : !isDayInCurrentMonth
                          ? "bg-white/40 dark:bg-[#0e0f16]/40 text-slate-300 dark:text-zinc-600 hover:bg-white dark:hover:bg-[#141520]"
                          : "bg-white dark:bg-[#13141f] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#181926]"
                      }`}
                    >
                      {/* Número do dia */}
                      <span
                        className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 ${
                          isDaySelected
                            ? "bg-white text-indigo-700 font-black shadow-xs"
                            : isDayToday
                            ? "bg-indigo-600 text-white font-black"
                            : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {/* Indicador de demandas agendadas */}
                      <div className="h-4 flex items-center justify-center w-full pb-1">
                        {tasksForDay.length > 0 ? (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold leading-none ${
                              isDaySelected
                                ? "bg-white/20 text-white"
                                : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80"
                            }`}
                            title={`${tasksForDay.length} demanda(s)`}
                          >
                            {tasksForDay.length}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legenda rápida */}
              <div className="p-2.5 border-t border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-[#10111a] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Hoje
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-300" />
                  Selecionado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold">#</span>
                  Com Demandas
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAINEL DIREITO: VISÃO DA SEMANA + COMPROMISSOS DO DIA (COL-SPAN-7) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Faixa Horizontal da Semana Ativa (7 dias: Seg -> Dom) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Semana Selecionada
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {format(weekStart, "d 'de' MMM", { locale: ptBR })} — {format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}
                </span>
              </div>

              {/* Botões dos 7 dias da semana */}
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, calendarDate);
                  const isDayToday = isToday(day);
                  const tasksForDay = filteredTasks.filter((t) => isTaskScheduledForDay(t, day));
                  const hasTasks = tasksForDay.length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setCalendarDate(day)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-[1.02]"
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
                      <div className="h-2 flex items-center justify-center mt-1">
                        {hasTasks ? (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-white" : "bg-indigo-500"
                            }`}
                            title={`${tasksForDay.length} demanda(s)`}
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Lista de Demandas Agendadas para o Dia Selecionado */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tasksForSelectedDay.length === 1
                        ? "1 demanda agendada para esta data"
                        : `${tasksForSelectedDay.length} demandas agendadas para esta data`}
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

              {/* Lista com Scroll */}
              <div className="space-y-2 pt-1 max-h-[460px] overflow-y-auto custom-scrollbar">
                {tasksForSelectedDay.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2.5">
                    <Clock className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Nenhuma demanda ou compromisso agendado para este dia.
                    </p>
                    {onOpenNewTaskModal && (
                      <button
                        type="button"
                        onClick={onOpenNewTaskModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agendar Nova Demanda
                      </button>
                    )}
                  </div>
                ) : (
                  tasksForSelectedDay.map((task) => {
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
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
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
                          <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[100px]">
                            {task.category}
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
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
