"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Sunrise,
  Sparkles,
  Calendar,
  Clock,
  Check,
  Video,
  StickyNote,
  Plus,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  BarChart3,
  Pin,
  Flame,
  ExternalLink,
} from "lucide-react";
import {
  Task,
  Note,
  TaskStatus,
  AccountType,
  DailyBriefingResponse,
  GoogleCalendarEventItem,
} from "@/types";
import { isTaskOverdue } from "@/lib/sla";
import {
  formatTaskTimeRange,
  getTaskScheduleDate,
  isTaskScheduledForDay,
  findScheduleConflicts,
} from "@/lib/taskSchedule";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TodayBentoViewProps {
  tasks: Task[];
  notes: Note[];
  accountFilter: "all" | AccountType;
  userName?: string;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onOpenNewTaskModal: (prefillDate?: Date) => void;
  onCreateNote: (draft: Partial<Note>) => Promise<Note | null>;
  onNavigate: (nav: string, execMode?: "list" | "kanban" | "agenda") => void;
  onTaskCreated: (task: Task) => void;
}

function isGcalEventLinkedToTask(event: GoogleCalendarEventItem, tasks: Task[]): boolean {
  if (tasks.length === 0 && event.linkedTaskId) return true;
  const sanitizedId = `gcal-${event.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  return tasks.some(
    (t) =>
      (event.linkedTaskId && t.id === event.linkedTaskId) ||
      t.google_calendar_event_id === event.id ||
      t.id === `gcal-${event.id}` ||
      t.id === sanitizedId ||
      (Array.isArray(t.tags) && t.tags.includes(`gcal-${event.id}`))
  );
}

function isGcalOnToday(event: GoogleCalendarEventItem, today: Date): boolean {
  if (!event.start) return false;
  try {
    if (!event.start.includes("T")) {
      return event.start.substring(0, 10) === format(today, "yyyy-MM-dd");
    }
    return isSameDay(parseISO(event.start), today);
  } catch {
    return false;
  }
}

export function TodayBentoView({
  tasks,
  notes,
  accountFilter,
  userName,
  onSelectTask,
  onUpdateStatus,
  onOpenNewTaskModal,
  onCreateNote,
  onNavigate,
  onTaskCreated,
}: TodayBentoViewProps) {
  const today = useMemo(() => new Date(), []);
  const [briefing, setBriefing] = useState<DailyBriefingResponse | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingGcal, setIsLoadingGcal] = useState(false);
  const [convertingEventId, setConvertingEventId] = useState<string | null>(null);

  const [quickNoteText, setQuickNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const fetchGcal = useCallback(async () => {
    setIsLoadingGcal(true);
    try {
      const res = await fetch("/api/google/calendar");
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setGcalEvents(data.events);
      }
    } catch {
      // silent fallback
    } finally {
      setIsLoadingGcal(false);
    }
  }, []);

  useEffect(() => {
    fetchGcal();
  }, [fetchGcal]);

  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) {
      return false;
    }
    return true;
  };

  const scopedTasks = useMemo(() => {
    const f = (accountFilter || "all").toLowerCase().trim();
    if (f === "all") return tasks;
    return tasks.filter((t) => {
      if (f === "work" || f.includes("trab") || f.includes("notre") || f.includes("haferreira")) {
        return isWorkTask(t);
      }
      if (f === "personal" || f.includes("pess") || f.includes("hellen")) {
        return !isWorkTask(t);
      }
      return (t.account_type || "").toLowerCase() === f;
    });
  }, [tasks, accountFilter]);

  const greeting = useMemo(() => {
    const h = today.getHours();
    const base = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const firstName = userName?.trim().split(/\s+/)[0];
    return firstName ? `${base}, ${firstName}` : base;
  }, [today, userName]);

  const openTasks = useMemo(
    () => scopedTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED"),
    [scopedTasks]
  );

  const todayTasks = useMemo(
    () =>
      scopedTasks
        .filter((t) => t.status !== "CANCELED" && isTaskScheduledForDay(t, today))
        .sort(
          (a, b) =>
            new Date(getTaskScheduleDate(a) || 0).getTime() -
            new Date(getTaskScheduleDate(b) || 0).getTime()
        ),
    [scopedTasks, today]
  );

  const unlinkedTodayGcal = useMemo(
    () =>
      gcalEvents.filter(
        (ev) => !isGcalEventLinkedToTask(ev, tasks) && isGcalOnToday(ev, today)
      ),
    [gcalEvents, tasks, today]
  );

  const urgentFocusTasks = useMemo(() => {
    const priorityRank = { P1: 1, P2: 2, P3: 3, P4: 4 };
    return [...openTasks]
      .sort((a, b) => {
        const aOver = isTaskOverdue(a.current_due_date, a.status) ? 0 : 1;
        const bOver = isTaskOverdue(b.current_due_date, b.status) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        const aToday = isTaskScheduledForDay(a, today) ? 0 : 1;
        const bToday = isTaskScheduledForDay(b, today) ? 0 : 1;
        if (aToday !== bToday) return aToday - bToday;
        const pDiff = (priorityRank[a.priority] || 4) - (priorityRank[b.priority] || 4);
        if (pDiff !== 0) return pDiff;
        return (
          new Date(getTaskScheduleDate(a) || 0).getTime() -
          new Date(getTaskScheduleDate(b) || 0).getTime()
        );
      })
      .slice(0, 6);
  }, [openTasks, today]);

  const stats = useMemo(() => {
    const completedAll = scopedTasks.filter((t) => t.status === "COMPLETED");
    const overdueCount = openTasks.filter((t) => isTaskOverdue(t.current_due_date, t.status)).length;
    const onTime = completedAll.filter(
      (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
    ).length;
    const slaPct = completedAll.length > 0 ? Math.round((onTime / completedAll.length) * 100) : 100;
    const completionPct =
      scopedTasks.length > 0 ? Math.round((completedAll.length / scopedTasks.length) * 100) : 100;
    return {
      overdueCount,
      slaPct,
      completionPct,
      completedCount: completedAll.length,
    };
  }, [scopedTasks, openTasks]);

  const highlightedNotes = useMemo(() => {
    return notes
      .filter((n) => !n.archived)
      .sort((a, b) => {
        const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pinDiff !== 0) return pinDiff;
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      })
      .slice(0, 4);
  }, [notes]);

  const handleLoadBriefing = async () => {
    if (isLoadingBriefing) return;
    setIsLoadingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success && data.briefing) {
        setBriefing(data.briefing);
      } else {
        setBriefingError(data?.error || "Não foi possível gerar o briefing.");
      }
    } catch {
      setBriefingError("Erro ao conectar com a IA.");
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  const handleQuickSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickNoteText.trim();
    if (!raw || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const firstLine = raw.split(/\r?\n/)[0].trim();
      await onCreateNote({
        title: firstLine.length > 56 ? `${firstLine.slice(0, 54).trim()}...` : firstLine,
        content: raw,
        category: "geral",
        account_type: accountFilter === "personal" ? "personal" : "work",
        color: "default",
        checklist: [],
        tags: [],
      });
      setQuickNoteText("");
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2200);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleConvertGcal = async (ev: GoogleCalendarEventItem) => {
    if (convertingEventId === ev.id) return;
    setConvertingEventId(ev.id);
    try {
      const res = await fetch("/api/google/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: ev.id,
          summary: ev.summary,
          description: ev.description,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          meet_link: ev.meet_link || null,
          accountType: ev.isPersonal ? "Pessoal" : "Trabalho",
          accountEmail: ev.accountEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setGcalEvents((prev) =>
          prev.map((item) =>
            item.id === ev.id ? { ...item, linkedTaskId: data.task.id } : item
          )
        );
        onTaskCreated(data.task);
      }
    } finally {
      setConvertingEventId(null);
    }
  };

  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(stats.completionPct, 100) / 100);

  return (
    <div className="max-w-[1520px] mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* ROW 1: HERO EDITORIAL GREETING + QUICK BENTO SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero Greeting & AI Briefing Card */}
        <div className="lg:col-span-8 bento-card p-5 sm:p-6 flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4B55D6] dark:text-[#96A0FF]">
                <Sunrise className="w-3.5 h-3.5" />
                <span className="capitalize">
                  {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-950 dark:text-slate-50 leading-tight">
                {greeting}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Você tem{" "}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {todayTasks.length + unlinkedTodayGcal.length} compromisso(s)
                </strong>{" "}
                para hoje e{" "}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {openTasks.length} demanda(s)
                </strong>{" "}
                na fila ativa
                {stats.overdueCount > 0 ? (
                  <>
                    {" "}
                    (com{" "}
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {stats.overdueCount} atrasada{stats.overdueCount > 1 ? "s" : ""}
                    </span>
                    ).
                  </>
                ) : (
                  " — tudo dentro do prazo."
                )}
              </p>
            </div>

            {/* Subtle Circular Progress Ring */}
            <div className="flex items-center gap-3 shrink-0 self-start">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-[#E3DFD5] dark:text-[#2D374D]"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="text-[#4B55D6] dark:text-[#7380FF] transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.completionPct}%
                </span>
              </div>
              <div className="text-xs hidden sm:block">
                <div className="font-semibold text-slate-800 dark:text-slate-100">
                  Entregas
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {stats.completedCount}/{scopedTasks.length}
                </div>
              </div>
            </div>
          </div>

          {/* Inline AI Briefing Box */}
          <div className="p-3.5 rounded-xl bg-[#EFECE4]/90 dark:bg-[#1A202E] border border-[#DCD6CA] dark:border-[#2F3950] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                <Sparkles className="w-4 h-4 text-[#4B55D6] dark:text-[#8692FF]" />
                <span>Briefing Inteligente do Dia</span>
              </div>
              <button
                type="button"
                onClick={handleLoadBriefing}
                disabled={isLoadingBriefing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B55D6] hover:bg-[#3F48C4] dark:bg-[#6673F5] dark:hover:bg-[#7783FF] text-white text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoadingBriefing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : briefing ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{briefing ? "Atualizar Análise" : "Analisar Prioridades"}</span>
              </button>
            </div>

            {briefingError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{briefingError}</p>
            )}

            {briefing ? (
              <div className="space-y-2.5 animate-in fade-in">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {briefing.focus_summary}
                </p>
                {briefing.top_priorities.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {briefing.top_priorities.slice(0, 4).map((item) => (
                      <button
                        key={item.task_id}
                        type="button"
                        onClick={() => {
                          const match = tasks.find((t) => t.id === item.task_id);
                          if (match) onSelectTask(match);
                        }}
                        className="p-2.5 rounded-lg bg-[#FCFBF7] dark:bg-[#232B3C] border border-[#DCD6CA] dark:border-[#344059] hover:border-[#4B55D6] dark:hover:border-[#7380FF] text-left transition-colors cursor-pointer space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/12 text-[#4B55D6] dark:text-[#96A0FF] font-bold shrink-0">
                            {item.urgency}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {item.reason}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-[#4B55D6] dark:text-[#A4ADFF] font-medium">
                  {briefing.quick_tip}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clique em <strong>Analisar Prioridades</strong> para a IA destacar onde focar sua energia hoje com base nos seus prazos e notas fixadas.
              </p>
            )}
          </div>
        </div>

        {/* Right 2x2 Bento Quick Launchpad */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate("tarefas", "list")}
            className="bento-card p-4 flex flex-col justify-between text-left hover:border-[#4B55D6]/50 dark:hover:border-[#7380FF]/50 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/12 text-[#4B55D6] dark:text-[#8692FF] flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Execução</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Lista, Kanban e Agenda
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewTaskModal(today)}
            className="bento-card p-4 flex flex-col justify-between text-left hover:border-[#4B55D6]/50 dark:hover:border-[#7380FF]/50 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Nova Demanda</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Criar c/ IA e Meet
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("notas")}
            className="bento-card p-4 flex flex-col justify-between text-left hover:border-amber-500/50 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <StickyNote className="w-4 h-4" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Anotações</span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {notes.filter((n) => !n.archived).length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Bloco livre & IA
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("relatorios")}
            className="bento-card p-4 flex flex-col justify-between text-left hover:border-indigo-400/50 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>SLA Global</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.slaPct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Auditoria & PDF
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ROW 2: PRIORITY FOCUS LIST (LEFT) + TODAY'S TIMELINE & MEET (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bento Focus Priorities */}
        <section className="lg:col-span-6 bento-card flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5E0D6] dark:border-[#2E384D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Foco Prioritário
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("tarefas", "list")}
              className="text-xs font-semibold text-[#4B55D6] dark:text-[#96A0FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Ver todas
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E6E1D7] dark:divide-[#2C364A] flex-1">
            {urgentFocusTasks.length === 0 ? (
              <div className="py-12 px-5 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhuma pendência crítica no momento.
              </div>
            ) : (
              urgentFocusTasks.map((task) => {
                const overdue = isTaskOverdue(task.current_due_date, task.status);
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#EFECE4]/80 dark:hover:bg-[#273043] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(task.id, "COMPLETED");
                        }}
                        className="w-5 h-5 rounded-full border-[1.75px] border-[#C5BFB2] dark:border-[#495775] hover:border-emerald-500 hover:bg-emerald-500/15 flex items-center justify-center text-transparent hover:text-emerald-500 transition-all shrink-0 cursor-pointer"
                        title="Concluir demanda"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#4B55D6] dark:group-hover:text-[#96A0FF] truncate">
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="truncate">{task.category}</span>
                          {overdue && (
                            <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              Atrasada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.meet_link && (
                        <a
                          href={task.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25"
                        >
                          <Video className="w-3 h-3" />
                          Meet
                        </a>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          task.priority === "P1"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : task.priority === "P2"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-[#EAE6DC] dark:bg-[#2A3347] text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Bento Today's Agenda + Google Meet */}
        <section className="lg:col-span-6 bento-card flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5E0D6] dark:border-[#2E384D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4B55D6] dark:text-[#8692FF]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Agenda de Hoje & Reuniões
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchGcal}
                disabled={isLoadingGcal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                title="Atualizar Google Agenda"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGcal ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("tarefas", "agenda")}
                className="text-xs font-semibold text-[#4B55D6] dark:text-[#96A0FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Calendário
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2 flex-1 overflow-y-auto max-h-[360px]">
            {todayTasks.length === 0 && unlinkedTodayGcal.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-7 h-7 mx-auto opacity-35 text-indigo-500" />
                <p>Nenhum compromisso agendado para hoje.</p>
                <button
                  type="button"
                  onClick={() => onOpenNewTaskModal(today)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EAE6DC] dark:bg-[#293244] text-slate-800 dark:text-slate-200 font-semibold hover:bg-[#E1DDD2] dark:hover:bg-[#323D54] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agendar compromisso
                </button>
              </div>
            ) : (
              <>
                {todayTasks.map((task) => {
                  const conflicts = findScheduleConflicts(
                    task.scheduled_start || task.current_due_date,
                    task.scheduled_end,
                    todayTasks,
                    unlinkedTodayGcal,
                    task.id
                  );
                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="p-3 rounded-xl bg-[#EFECE4]/80 dark:bg-[#1B2130] border border-[#DCD6CA] dark:border-[#2F3950] hover:border-[#4B55D6]/60 dark:hover:border-[#7380FF]/60 flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-[#4B55D6] dark:text-[#96A0FF] shrink-0 min-w-[74px] tabular-nums">
                          {formatTaskTimeRange(task)}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-semibold truncate ${
                              task.status === "COMPLETED"
                                ? "line-through text-slate-400"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {task.title}
                          </div>
                          {conflicts.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Conflito com {conflicts[0].title}
                            </span>
                          )}
                        </div>
                      </div>

                      {task.meet_link && (
                        <a
                          href={task.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0 transition-colors"
                        >
                          <Video className="w-3 h-3" />
                          Entrar
                        </a>
                      )}
                    </div>
                  );
                })}

                {unlinkedTodayGcal.map((ev) => {
                  const timeStr =
                    ev.allDay || !ev.start.includes("T")
                      ? "Dia todo"
                      : format(parseISO(ev.start), "HH:mm");
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0 min-w-[74px] tabular-nums">
                          {timeStr}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {ev.summary}
                          </div>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400">
                            Google Agenda
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ev.meet_link && (
                          <a
                            href={ev.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold"
                          >
                            <Video className="w-3 h-3" />
                            Meet
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleConvertGcal(ev)}
                          disabled={convertingEventId === ev.id}
                          className="px-2 py-1 rounded-lg bg-[#FCFBF7] dark:bg-[#273043] border border-[#DCD6CA] dark:border-[#36425A] text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 cursor-pointer disabled:opacity-50"
                        >
                          {convertingEventId === ev.id ? "..." : "+ Demanda"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ROW 3: QUICK BLANK NOTE CAPTURE + PINNED/RECENT NOTES BENTO STRIP */}
      <section className="bento-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Anotações Rápidas & Fixadas
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("notas")}
            className="text-xs font-semibold text-[#4B55D6] dark:text-[#96A0FF] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Abrir bloco completo
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <form onSubmit={handleQuickSaveNote} className="flex items-center gap-2">
          <input
            type="text"
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
            placeholder="Registrar anotação rápida em branco (organize com IA ou transforme em demanda depois)..."
            className="flex-1 h-10 px-3.5 rounded-xl bg-[#EAE6DC] dark:bg-[#19202E] focus:bg-[#FCFBF7] dark:focus:bg-[#252E40] border border-[#DCD6CA] dark:border-[#323D54] focus:border-[#4B55D6] dark:focus:border-[#7380FF] text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!quickNoteText.trim() || isSavingNote}
            className="h-10 px-4 rounded-xl bg-[#1E2330] hover:bg-[#2D3548] dark:bg-[#6673F5] dark:hover:bg-[#7783FF] text-white text-xs font-semibold transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
          >
            {noteSavedFeedback ? "Salva ✓" : isSavingNote ? "Salvando..." : "Salvar Nota"}
          </button>
        </form>

        {highlightedNotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {highlightedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onNavigate("notas")}
                className="p-3.5 rounded-xl bg-[#EFECE4]/75 dark:bg-[#1B2130] border border-[#DCD6CA] dark:border-[#2F3950] hover:border-[#4B55D6]/50 dark:hover:border-[#7380FF]/50 text-left transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {note.title?.trim() || "Nota sem título"}
                  </span>
                  {note.pinned && (
                    <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {note.ai_summary || note.content || "Anotação em branco"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

