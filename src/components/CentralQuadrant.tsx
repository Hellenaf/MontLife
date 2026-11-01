"use client";

import React, { useState, useEffect } from "react";
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
  Filter,
  MapPin,
  CheckSquare,
  Square,
} from "lucide-react";
import { Task, TaskStatus, ItemType, AccountType } from "@/types";
import {
  format,
  parseISO,
  isToday,
  getHours,
  getMinutes,
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
  onOpenNewTaskModal?: () => void;
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
  onOpenNewTaskModal,
}: CentralQuadrantProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "study">("timeline");

  // Category and Tag Editing States
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // Google Calendar View States (Mês | Semana | Dia | Programação)
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week" | "day" | "schedule">("month");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<"all" | "work" | "personal" | "agenda" | "samsung">("all");
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // Live timer for Google Calendar current-time red line
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks for calendar based on calendar source
  const calendarTasks = allTasks.filter((t) => {
    if (calendarSourceFilter === "all") return true;
    if (calendarSourceFilter === "work") return t.account_type === "work";
    if (calendarSourceFilter === "personal") return t.account_type === "personal";
    if (calendarSourceFilter === "agenda") return t.item_type === "activity" || t.tags?.includes("google-agenda");
    if (calendarSourceFilter === "samsung") return t.item_type === "reminder" || t.tags?.includes("samsung-reminder");
    return true;
  });

  // Hours array for Google Calendar timeline grid (06:00 to 23:00)
  const START_HOUR = 6;
  const END_HOUR = 23;
  const dayHours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  // Week calculation (Sunday to Saturday, like Google Calendar)
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month calculation
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Navigation handlers (Google Calendar style)
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

  // Helper: check if task is all-day (no specific hour or spans full day)
  const isAllDayTask = (task: Task): boolean => {
    try {
      const raw = task.current_due_date;
      if (!raw) return true;
      if (!raw.includes("T")) return true;
      const date = parseISO(raw);
      return getHours(date) === 0 && getMinutes(date) === 0;
    } catch {
      return true;
    }
  };

  // Helper: get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return calendarTasks.filter((t) => {
      try {
        return isSameDay(parseISO(t.current_due_date), day);
      } catch {
        return false;
      }
    });
  };

  // Helper: Google Calendar authentic color tokens
  const getGoogleCalendarColor = (task: Task) => {
    if (task.item_type === "activity" || task.tags?.includes("google-agenda")) {
      return {
        accent: "#0b8043", // Google Basil Green
        pillBg: "bg-[#0b8043] text-white hover:bg-[#09713a]",
        cardBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-[#0b8043] border-slate-200 dark:border-zinc-800",
        sourceName: "Google Agenda",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
        icon: <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (task.item_type === "reminder" || task.tags?.includes("samsung-reminder")) {
      return {
        accent: "#e37400", // Google Tangerine Orange
        pillBg: "bg-[#e37400] text-white hover:bg-[#c96600]",
        cardBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-[#e37400] border-slate-200 dark:border-zinc-800",
        sourceName: "Samsung Reminder",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        icon: <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (task.account_type === "work") {
      return {
        accent: "#1a73e8", // Google Blue
        pillBg: "bg-[#1a73e8] text-white hover:bg-[#1557b0]",
        cardBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-l-4 border-l-[#1a73e8] border-slate-200 dark:border-zinc-800",
        sourceName: "Google Tasks (Trabalho)",
        badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        icon: <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />,
      };
    }
    return {
      accent: "#8e24aa", // Google Grape Purple
      pillBg: "bg-[#8e24aa] text-white hover:bg-[#7b1fa2]",
      cardBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 border-l-4 border-l-[#8e24aa] border-slate-200 dark:border-zinc-800",
      sourceName: "Google Tasks (Pessoal)",
      badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
      icon: <User className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />,
    };
  };

  // Google Calendar current time red line position (in pixels, 56px per hour)
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isCurrentTimeInGrid = currentHour >= START_HOUR && currentHour <= END_HOUR;
  const currentTimeTopPx = (currentHour - START_HOUR) * 56 + (currentMinute / 60) * 56;

  return (
    <main className="flex-1 h-full flex flex-col bg-slate-100/50 dark:bg-[#0c0d13] overflow-hidden transition-colors duration-200">
      {/* Top Tab Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-zinc-800/80 px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#101118]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "timeline"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Google Agenda & Tarefas
          </button>

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
            <span>Demanda:</span>
            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[180px]">
              {selectedTask.title}
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {/* TAB 1: GOOGLE CALENDAR EXPERIENCE */}
        {activeTab === "timeline" && (
          <div className="max-w-7xl mx-auto space-y-3">
            {/* GOOGLE CALENDAR TOOLBAR */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {/* Left Side: + Criar button + Hoje + Chevrons + Date Title */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {onOpenNewTaskModal && (
                  <button
                    type="button"
                    onClick={onOpenNewTaskModal}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1a1b26] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-zinc-700 shadow-sm hover:shadow text-xs font-medium transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 36 36">
                      <path fill="#4285F4" d="M16 16v14h4V16h14v-4H20V-2h-4v14H2v4z" />
                      <path fill="#34A853" d="M30 16H20l-4-4h14z" />
                      <path fill="#FBBC05" d="M20 16v14l-4-4V16z" />
                      <path fill="#EA4335" d="M20 16H6l4-4h10z" />
                    </svg>
                    <span>Criar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-2xs active:scale-95"
                >
                  Hoje
                </button>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Anterior"
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Próximo"
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white capitalize">
                  {calendarViewMode === "month" &&
                    format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  {calendarViewMode === "week" &&
                    `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(
                      weekEnd,
                      "d 'de' MMM 'de' yyyy",
                      { locale: ptBR }
                    )}`}
                  {calendarViewMode === "day" &&
                    format(calendarDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {calendarViewMode === "schedule" &&
                    format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
              </div>

              {/* Right Side: Calendar Filters + View Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Source Filter Pills */}
                <div className="flex items-center bg-slate-100 dark:bg-[#1a1b26] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter("all")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                      calendarSourceFilter === "all"
                        ? "bg-white dark:bg-[#202230] text-slate-900 dark:text-white shadow-xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter("work")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      calendarSourceFilter === "work"
                        ? "bg-[#1a73e8] text-white shadow-xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#1a73e8] inline-block" />
                    Trabalho
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter("personal")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      calendarSourceFilter === "personal"
                        ? "bg-[#8e24aa] text-white shadow-xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#8e24aa] inline-block" />
                    Pessoal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter("agenda")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      calendarSourceFilter === "agenda"
                        ? "bg-[#0b8043] text-white shadow-xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0b8043] inline-block" />
                    Google Agenda
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter("samsung")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      calendarSourceFilter === "samsung"
                        ? "bg-[#e37400] text-white shadow-xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#e37400] inline-block" />
                    Samsung
                  </button>
                </div>

                {/* Google Calendar Mode Switcher */}
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#181926] p-0.5 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode("day")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === "day"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode("week")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === "week"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode("month")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === "month"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarViewMode("schedule")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === "schedule"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Programação
                  </button>
                </div>
              </div>
            </div>

            {/* 1. GOOGLE CALENDAR: MÊS (MONTH VIEW) */}
            {calendarViewMode === "month" && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                {/* 7 Days of Week Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#151622] text-center">
                  {["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."].map((wd) => (
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
                  {monthGridDays.map((day, idx) => {
                    const tasksForDay = getTasksForDay(day);
                    const isDayInCurrentMonth = isSameMonth(day, calendarDate);
                    const isDayToday = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[115px] sm:min-h-[125px] p-1.5 border-r border-b border-slate-100 dark:border-zinc-800/70 flex flex-col justify-start transition-colors relative group ${
                          !isDayInCurrentMonth
                            ? "bg-slate-50/40 dark:bg-zinc-950/20 text-slate-400"
                            : "bg-white dark:bg-[#12131A] hover:bg-slate-50/60 dark:hover:bg-[#171824]"
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-center pb-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarDate(day);
                              setCalendarViewMode("day");
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110 ${
                              isDayToday
                                ? "bg-[#1a73e8] text-white font-bold shadow-xs"
                                : isDayInCurrentMonth
                                ? "text-slate-700 dark:text-slate-300 font-medium"
                                : "text-slate-300 dark:text-zinc-600 font-normal"
                            }`}
                          >
                            {format(day, "d")}
                          </button>
                        </div>

                        {/* Event Chips (Exact Google Calendar Pill Style) */}
                        <div className="space-y-1 overflow-hidden flex-1">
                          {tasksForDay.slice(0, 3).map((task) => {
                            const colors = getGoogleCalendarColor(task);
                            const isAllDay = isAllDayTask(task);
                            const timeStr = !isAllDay
                              ? format(parseISO(task.current_due_date), "HH:mm")
                              : "";

                            return (
                              <div
                                key={task.id}
                                onClick={() => setPreviewTask(task)}
                                className={`rounded px-1.5 py-0.5 text-[11px] font-medium leading-snug truncate flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${colors.pillBg}`}
                                title={`${timeStr ? `${timeStr} ` : ""}${task.title}`}
                              >
                                {timeStr && (
                                  <span className="font-bold opacity-90 text-[10px] shrink-0">
                                    {timeStr}
                                  </span>
                                )}
                                <span className="truncate">{task.title}</span>
                              </div>
                            );
                          })}

                          {tasksForDay.length > 3 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarDate(day);
                                setCalendarViewMode("day");
                              }}
                              className="text-[11px] font-semibold text-[#1a73e8] dark:text-blue-400 hover:underline px-1 py-0.5 block text-left"
                            >
                              +{tasksForDay.length - 3} mais
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. GOOGLE CALENDAR: SEMANA (WEEK VIEW TIMELINE) */}
            {calendarViewMode === "week" && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                {/* Week Day Header */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#151622] sticky top-0 z-30">
                  <div className="p-2 border-r border-slate-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                    GMT-3
                  </div>
                  {weekDays.map((day) => {
                    const isDayToday = isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-2.5 text-center border-r border-slate-200/80 dark:border-zinc-800/80 ${
                          isDayToday ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCalendarDate(day);
                            setCalendarViewMode("day");
                          }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm mx-auto transition-transform hover:scale-105 ${
                            isDayToday
                              ? "bg-[#1a73e8] text-white font-bold shadow-xs"
                              : "text-slate-800 dark:text-slate-200 font-medium"
                          }`}
                        >
                          {format(day, "d")}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* All-Day (Dia Inteiro) Row */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 dark:border-zinc-800 bg-slate-50/30 dark:bg-[#141520] min-h-[44px]">
                  <div className="p-2 border-r border-slate-200 dark:border-zinc-800 text-[10px] font-medium text-slate-400 flex items-center justify-center">
                    dia todo
                  </div>
                  {weekDays.map((day) => {
                    const allDayTasks = getTasksForDay(day).filter(isAllDayTask);
                    return (
                      <div
                        key={`all-day-${day.toISOString()}`}
                        className="p-1 border-r border-slate-100 dark:border-zinc-800/60 space-y-1 overflow-hidden"
                      >
                        {allDayTasks.map((t) => {
                          const colors = getGoogleCalendarColor(t);
                          return (
                            <div
                              key={t.id}
                              onClick={() => setPreviewTask(t)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer shadow-2xs ${colors.pillBg}`}
                              title={t.title}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Timed Grid (Scrollable, with Current Time Red Line) */}
                <div className="relative max-h-[620px] overflow-y-auto">
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                    {/* Time Gutter Column */}
                    <div className="border-r border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-[#12131A] select-none">
                      {dayHours.map((h) => (
                        <div
                          key={h}
                          className="h-14 border-b border-slate-100 dark:border-zinc-800/60 pr-2 text-right text-[11px] font-mono text-slate-400 flex items-start justify-end -translate-y-2.5"
                        >
                          {`${h.toString().padStart(2, "0")}:00`}
                        </div>
                      ))}
                    </div>

                    {/* 7 Days Hour Slots */}
                    {weekDays.map((day) => {
                      const isDayToday = isToday(day);
                      const timedTasks = getTasksForDay(day).filter((t) => !isAllDayTask(t));

                      return (
                        <div
                          key={day.toISOString()}
                          className={`border-r border-slate-100 dark:border-zinc-800/60 relative ${
                            isDayToday ? "bg-blue-50/10 dark:bg-blue-950/10" : ""
                          }`}
                        >
                          {/* Hour lines */}
                          {dayHours.map((h) => (
                            <div
                              key={h}
                              className="h-14 border-b border-slate-100 dark:border-zinc-800/60"
                            />
                          ))}

                          {/* Current Time Red Line if Today */}
                          {isDayToday && isCurrentTimeInGrid && (
                            <div
                              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                              style={{ top: `${currentTimeTopPx}px` }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shrink-0 shadow-xs" />
                              <div className="flex-1 h-[2px] bg-red-500" />
                            </div>
                          )}

                          {/* Timed Event Blocks */}
                          {timedTasks.map((t) => {
                            const colors = getGoogleCalendarColor(t);
                            const date = parseISO(t.current_due_date);
                            const h = getHours(date);
                            const m = getMinutes(date);
                            if (h < START_HOUR || h > END_HOUR) return null;

                            const topPx = (h - START_HOUR) * 56 + (m / 60) * 56;
                            const timeFormatted = format(date, "HH:mm");

                            return (
                              <div
                                key={t.id}
                                onClick={() => setPreviewTask(t)}
                                style={{ top: `${topPx}px` }}
                                className={`absolute left-1 right-1 rounded-lg p-1.5 cursor-pointer shadow-xs border transition-all hover:scale-[1.01] hover:z-30 overflow-hidden ${colors.cardBg}`}
                              >
                                <div className="flex items-center gap-1 text-[10px] font-bold">
                                  <span>{timeFormatted}</span>
                                </div>
                                <h4 className="text-[11px] font-semibold truncate leading-tight mt-0.5">
                                  {t.title}
                                </h4>
                                <span className="text-[9px] opacity-80 block truncate">
                                  {t.category}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. GOOGLE CALENDAR: DIA (DAY VIEW) */}
            {calendarViewMode === "day" && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                {/* Day Header */}
                <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-[#151622] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        isToday(calendarDate)
                          ? "bg-[#1a73e8] text-white shadow-xs"
                          : "bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {format(calendarDate, "d")}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white capitalize">
                        {format(calendarDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getTasksForDay(calendarDate).length} demandas e eventos programados
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCalendarViewMode("month")}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Ver Mês Completo
                  </button>
                </div>

                {/* Day All-Day Tasks */}
                {getTasksForDay(calendarDate).filter(isAllDayTask).length > 0 && (
                  <div className="p-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-[#141520] space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                      Dia Inteiro
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {getTasksForDay(calendarDate)
                        .filter(isAllDayTask)
                        .map((t) => {
                          const colors = getGoogleCalendarColor(t);
                          return (
                            <div
                              key={t.id}
                              onClick={() => setPreviewTask(t)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs ${colors.pillBg}`}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Day Timed Grid */}
                <div className="relative max-h-[640px] overflow-y-auto p-4 space-y-2">
                  {dayHours.map((hour) => {
                    const hourFormatted = `${hour.toString().padStart(2, "0")}:00`;
                    const dayTasks = getTasksForDay(calendarDate);
                    const tasksInHour = dayTasks.filter((t) => {
                      if (isAllDayTask(t)) return false;
                      try {
                        return getHours(parseISO(t.current_due_date)) === hour;
                      } catch {
                        return false;
                      }
                    });

                    const isCurrentHourSlot =
                      isToday(calendarDate) && currentTime.getHours() === hour;

                    return (
                      <div
                        key={hour}
                        className={`flex gap-4 p-3 rounded-xl border transition-all ${
                          isCurrentHourSlot
                            ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-400/60 dark:border-blue-500/50"
                            : "bg-white dark:bg-[#141520] border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-[#181926]"
                        }`}
                      >
                        <span className="w-16 text-xs font-mono font-bold text-slate-400 dark:text-slate-500 pt-1 shrink-0">
                          {hourFormatted}
                        </span>

                        <div className="flex-1 space-y-2">
                          {tasksInHour.length === 0 ? (
                            <div className="h-6 flex items-center text-xs text-slate-400 dark:text-slate-600 italic">
                              Sem compromissos
                            </div>
                          ) : (
                            tasksInHour.map((task) => {
                              const colors = getGoogleCalendarColor(task);
                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setPreviewTask(task)}
                                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:shadow-md transition-all ${colors.cardBg}`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {colors.icon}
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {task.title}
                                      </h4>
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {format(parseISO(task.current_due_date), "HH:mm")} • {task.category}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors.badgeBg}`}>
                                      {colors.sourceName}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. GOOGLE CALENDAR: PROGRAMAÇÃO (SCHEDULE / AGENDA VIEW) */}
            {calendarViewMode === "schedule" && (
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] shadow-sm p-4 space-y-4 animate-in fade-in">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
                  Programação Mensal • {format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </h3>

                {monthGridDays
                  .filter((day) => isSameMonth(day, calendarDate) && getTasksForDay(day).length > 0)
                  .map((day) => {
                    const tasksForDay = getTasksForDay(day);
                    const isDayToday = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800/80 last:border-b-0"
                      >
                        {/* Day Column */}
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                              isDayToday
                                ? "bg-[#1a73e8] text-white shadow-xs"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white capitalize block">
                              {format(day, "EEEE", { locale: ptBR })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {format(day, "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>

                        {/* Events List */}
                        <div className="space-y-2">
                          {tasksForDay.map((task) => {
                            const colors = getGoogleCalendarColor(task);
                            const isAllDay = isAllDayTask(task);
                            const timeText = isAllDay
                              ? "Dia inteiro"
                              : format(parseISO(task.current_due_date), "HH:mm");

                            return (
                              <div
                                key={task.id}
                                onClick={() => setPreviewTask(task)}
                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:shadow-md transition-all ${colors.cardBg}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 shrink-0">
                                    {timeText}
                                  </span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                      {task.title}
                                    </h4>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                                      {task.category}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors.badgeBg}`}>
                                    {colors.sourceName}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILS OF SELECTED ITEM */}
        {activeTab === "details" && (
          <div>
            {!selectedTask ? (
              <div className="h-96 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-3">
                <FileText className="w-12 h-12 opacity-30 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma demanda selecionada
                </h3>
                <p className="text-xs max-w-sm leading-relaxed">
                  Selecione um compromisso ou tarefa na agenda para visualizar e editar todos os detalhes.
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
                            onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a1b26] text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <datalist id="central-category-datalist">
                            {CATEGORY_SUGGESTIONS.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                          <button
                            type="button"
                            onClick={handleSaveCategory}
                            className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                            title="Salvar categoria"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingCategory(false)}
                            className="p-1 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
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
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 transition-colors group"
                          title="Clique para editar a categoria"
                        >
                          <span>{selectedTask.category}</span>
                          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Item Type Selector */}
                    {onUpdateItemType && (
                      <div className="flex items-center bg-slate-100 dark:bg-[#0c0d13] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                        <button
                          type="button"
                          onClick={() => onUpdateItemType(selectedTask.id, "task")}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                            (selectedTask.item_type || "task") === "task"
                              ? "bg-white dark:bg-[#1a1b26] text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <ListTodo className="w-3.5 h-3.5" />
                          Tarefa
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateItemType(selectedTask.id, "activity")}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                            selectedTask.item_type === "activity"
                              ? "bg-white dark:bg-[#1a1b26] text-purple-600 dark:text-purple-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                          Atividade
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateItemType(selectedTask.id, "reminder")}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                            selectedTask.item_type === "reminder"
                              ? "bg-white dark:bg-[#1a1b26] text-amber-600 dark:text-amber-400 shadow-sm"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Lembrete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedTask.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedTask.description || "Nenhuma descrição fornecida."}
                    </p>
                  </div>

                  {/* Tags Manager with Autonomous AI and Manual Editing */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        Tags & Classificação Autônoma:
                      </span>
                      {!isAddingTag && (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Tag
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedTask.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            title={`Remover tag #${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {isAddingTag && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Nova tag..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                            className="px-2 py-0.5 rounded text-xs border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a1b26] text-slate-800 dark:text-slate-100 outline-none w-28"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="p-1 rounded bg-indigo-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingTag(false)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deadlines & SLA Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
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
                        {format(parseISO(selectedTask.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Prazo Original (SLA {selectedTask.priority})
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(selectedTask.original_due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Prazo Atual {selectedTask.extension_count > 0 ? `(${selectedTask.extension_count}x estendido)` : ""}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {format(parseISO(selectedTask.current_due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resolution Notes */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500" />
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

        {/* TAB 3: ESTUDO & TUTORIAIS */}
        {activeTab === "study" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Curadoria Automática de Aprendizado (YouTube)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vídeos e tutoriais selecionados para a demanda atual.
                    </p>
                  </div>
                </div>
              </div>

              {selectedTask?.learning_resources?.youtube_videos &&
              selectedTask.learning_resources.youtube_videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {selectedTask.learning_resources.youtube_videos.map((vid, idx) => (
                    <a
                      key={idx}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50/50 dark:bg-[#181926] hover:border-rose-400 dark:hover:border-rose-500/50 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="aspect-video w-full relative overflow-hidden bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {vid.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{vid.channel}</span>
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                            Assistir <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto opacity-30 text-rose-500" />
                  <p className="text-xs">Selecione uma demanda para visualizar os tutoriais relacionados.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GOOGLE CALENDAR QUICK EVENT MODAL / PREVIEW */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            {/* Top color bar */}
            <div
              className="h-2.5 w-full"
              style={{ backgroundColor: getGoogleCalendarColor(previewTask).accent }}
            />

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      getGoogleCalendarColor(previewTask).badgeBg
                    }`}
                  >
                    {getGoogleCalendarColor(previewTask).sourceName}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {previewTask.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {format(parseISO(previewTask.current_due_date), "EEEE, d 'de' MMMM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>

              {/* Category & Tags */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{previewTask.category}</span>
                  {previewTask.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description preview */}
              {previewTask.description && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto leading-relaxed">
                  {previewTask.description}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                {previewTask.status !== "COMPLETED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(previewTask.id, "COMPLETED");
                      setPreviewTask(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Marcar como Concluído
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTask?.(previewTask);
                      setActiveTab("details");
                      setPreviewTask(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
