"use client";

import React, { useState } from "react";
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
  selectedTaskId?: string | null;
  onSelectTask: (task: Task) => void;
  onOpenNewTaskModal?: () => void;
}

export function AgendaDoDiaView({
  tasks,
  selectedTaskId,
  onSelectTask,
  onOpenNewTaskModal,
}: AgendaDoDiaViewProps) {
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<"all" | AccountType>("all");

  // Filter tasks based on source filter
  const filteredTasks = tasks.filter((t) => {
    if (calendarSourceFilter === "all") return true;
    return t.account_type === calendarSourceFilter;
  });

  // Week calculation (Monday to Sunday)
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Tasks scheduled for the currently selected day
  const tasksForSelectedDay = React.useMemo(() => {
    return filteredTasks
      .filter((t) => isTaskScheduledForDay(t, calendarDate))
      .sort((a, b) => {
        const dateA = new Date(getTaskScheduleDate(a)).getTime();
        const dateB = new Date(getTaskScheduleDate(b)).getTime();
        return dateA - dateB;
      });
  }, [filteredTasks, calendarDate]);

  // Month calculation
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Navigation handlers
  const handlePrev = () => {
    if (calendarViewMode === "week") setCalendarDate((d) => subWeeks(d, 1));
    else setCalendarDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (calendarViewMode === "week") setCalendarDate((d) => addWeeks(d, 1));
    else setCalendarDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-6 bg-slate-100/50 dark:bg-[#0c0d13] space-y-4 custom-scrollbar transition-colors">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 1. AGENDA TOOLBAR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          {/* Left Side: + Nova Demanda + Hoje + Chevrons + Date Title */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {onOpenNewTaskModal && (
              <button
                type="button"
                onClick={onOpenNewTaskModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Demanda</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors shadow-2xs active:scale-95"
            >
              Hoje
            </button>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Anterior"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Próximo"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize leading-tight">
                {calendarViewMode === "week"
                  ? format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                  : format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <p className="text-[11px] text-slate-400 capitalize">
                {calendarViewMode === "week"
                  ? `Semana de ${format(weekStart, "d 'de' MMM", { locale: ptBR })} a ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`
                  : `${monthGridDays.filter((d) => isSameMonth(d, calendarDate)).length} dias no mês`}
              </p>
            </div>
          </div>

          {/* Right Side: Account Filter & 2 Modes Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Account Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-[#1a1b26] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setCalendarSourceFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  calendarSourceFilter === "all"
                    ? "bg-white dark:bg-[#202230] text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCalendarSourceFilter("work")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  calendarSourceFilter === "work"
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block" />
                Trabalho
              </button>
              <button
                type="button"
                onClick={() => setCalendarSourceFilter("personal")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  calendarSourceFilter === "personal"
                    ? "bg-purple-600 text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 inline-block" />
                Pessoal
              </button>
            </div>

            {/* View Mode Switcher (Semana / Dia vs Mês) */}
            <div className="flex items-center rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#181926] p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setCalendarViewMode("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  calendarViewMode === "week"
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Semana / Dia</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewMode("month")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  calendarViewMode === "month"
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Mês</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. MODO 1: SEMANA / DIA */}
        {calendarViewMode === "week" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Horizontal Week Strip (7 dias da semana: Seg -> Dom) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, calendarDate);
                  const isDayToday = isToday(day);
                  const hasTasks = filteredTasks.some((t) => isTaskScheduledForDay(t, day));
                  const tasksCount = filteredTasks.filter((t) => isTaskScheduledForDay(t, day)).length;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setCalendarDate(day)}
                      className={`flex-1 min-w-[56px] py-3 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-[1.02]"
                          : isDayToday
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                          : "bg-slate-50 dark:bg-[#0c0d13] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">
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
                            title={`${tasksCount} demanda(s)`}
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Scheduled Tasks List for Selected Day */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {tasksForSelectedDay.length === 1
                        ? "1 demanda agendada para hoje"
                        : `${tasksForSelectedDay.length} demandas agendadas para hoje`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCalendarViewMode("month")}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Ver calendário do mês completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 pt-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                {tasksForSelectedDay.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 dark:text-slate-500 space-y-2">
                    <Clock className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
                    <p className="text-xs font-medium">
                      Nenhuma tarefa ou compromisso agendado para este dia.
                    </p>
                    {onOpenNewTaskModal && (
                      <button
                        type="button"
                        onClick={onOpenNewTaskModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agendar Demanda
                      </button>
                    )}
                  </div>
                ) : (
                  tasksForSelectedDay.map((task) => {
                    const isAllDay = isTaskAllDay(task);
                    const timeText = isAllDay
                      ? "Dia inteiro"
                      : format(parseISO(getTaskScheduleDate(task)), "HH:mm");
                    const isCurrentSelected = selectedTaskId === task.id;

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
                        <div className="flex items-center gap-3 min-w-0">
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
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              task.account_type === "work"
                                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                                : "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20"
                            }`}
                          >
                            {task.account_type === "work" ? "Trabalho" : "Pessoal"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {task.category}
                          </span>
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
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
        )}

        {/* 3. MODO 2: VISÃO MENSAL (GRADE COMPLETA DO MÊS) */}
        {calendarViewMode === "month" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#151622] text-center">
                {["SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB.", "DOM."].map((wd) => (
                  <div
                    key={wd}
                    className="py-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 auto-rows-fr">
                {monthGridDays.map((day) => {
                  const tasksForDay = filteredTasks.filter((t) => isTaskScheduledForDay(t, day));
                  const isDayInCurrentMonth = isSameMonth(day, calendarDate);
                  const isDayToday = isToday(day);
                  const isDaySelected = isSameDay(day, calendarDate);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setCalendarDate(day)}
                      className={`min-h-[110px] sm:min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-zinc-800/70 flex flex-col justify-start transition-all cursor-pointer relative group ${
                        isDaySelected
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-500"
                          : !isDayInCurrentMonth
                          ? "bg-slate-50/40 dark:bg-zinc-950/20 text-slate-400"
                          : "bg-white dark:bg-[#12131A] hover:bg-slate-50/80 dark:hover:bg-[#171824]"
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between pb-1">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform ${
                            isDayToday
                              ? "bg-indigo-600 text-white font-bold shadow-xs"
                              : isDaySelected
                              ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold"
                              : isDayInCurrentMonth
                              ? "text-slate-700 dark:text-slate-300 font-medium"
                              : "text-slate-300 dark:text-zinc-600 font-normal"
                          }`}
                        >
                          {format(day, "d")}
                        </span>

                        {tasksForDay.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {tasksForDay.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="space-y-1 overflow-hidden flex-1">
                        {tasksForDay.slice(0, 2).map((task) => {
                          const isWork = task.account_type === "work";
                          return (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTask(task);
                              }}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate flex items-center gap-1 transition-all ${
                                isWork
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              }`}
                              title={task.title}
                            >
                              <span className="truncate">{task.title}</span>
                            </div>
                          );
                        })}

                        {tasksForDay.length > 2 && (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block px-1">
                            +{tasksForDay.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda Drawer in Month View */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Demandas de {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })} ({tasksForSelectedDay.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode("week")}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir visualização semanal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {tasksForSelectedDay.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Nenhuma demanda agendada para este dia.
                  </p>
                ) : (
                  tasksForSelectedDay.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-[#0c0d13] flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          {isTaskAllDay(task)
                            ? "Dia todo"
                            : format(parseISO(getTaskScheduleDate(task)), "HH:mm")}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            task.account_type === "work"
                              ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                              : "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20"
                          }`}
                        >
                          {task.account_type === "work" ? "Trabalho" : "Pessoal"}
                        </span>
                        <span className="text-xs text-indigo-500 font-semibold flex items-center gap-0.5">
                          Ver <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
