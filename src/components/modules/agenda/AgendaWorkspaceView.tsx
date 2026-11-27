"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  Video,
  Bell,
  Briefcase,
  User,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { SplitView } from "@/components/ui/SplitView";
import { EmptyState } from "@/components/ui/WorkspacePrimitives";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";
import { Task, GoogleCalendarEventItem } from "@/types";
import {
  formatReminderLeadTime,
  formatTaskTimeRange,
  getTaskScheduleDate,
  getTaskScheduleEnd,
  isTaskAllDay,
  isTaskScheduledForDay,
  findScheduleConflicts,
  ScheduleConflictItem,
} from "@/lib/taskSchedule";
import {
  format,
  parseISO,
  isToday,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type CalendarMode = "month" | "week" | "day";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 to 21:00

function isGcalEventLinkedToTask(
  event: GoogleCalendarEventItem,
  tasks: Task[]
): boolean {
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

function isGcalOnDay(event: GoogleCalendarEventItem, day: Date): boolean {
  if (!event.start) return false;
  try {
    if (!event.start.includes("T")) {
      return event.start.substring(0, 10) === format(day, "yyyy-MM-dd");
    }
    return isSameDay(parseISO(event.start), day);
  } catch {
    return false;
  }
}

function getGcalTimeLabel(event: GoogleCalendarEventItem): string {
  if (event.allDay || !event.start.includes("T")) return "Dia todo";
  try {
    const start = format(parseISO(event.start), "HH:mm");
    if (event.end && event.end.includes("T")) {
      return `${start} – ${format(parseISO(event.end), "HH:mm")}`;
    }
    return start;
  } catch {
    return "Horário";
  }
}

function buildDayConflicts(
  dayTasks: Task[],
  dayGcal: GoogleCalendarEventItem[]
): Record<string, ScheduleConflictItem[]> {
  const map: Record<string, ScheduleConflictItem[]> = {};
  for (const t of dayTasks) {
    if (isTaskAllDay(t)) continue;
    const hits = findScheduleConflicts(
      getTaskScheduleDate(t),
      getTaskScheduleEnd(t),
      dayTasks,
      dayGcal,
      t.id
    );
    if (hits.length > 0) map[t.id] = hits;
  }
  return map;
}

export function AgendaWorkspaceView() {
  const {
    tasks,
    accountFilter,
    prefs,
    setSplitRatio,
    openTaskInModule,
    openNewTaskModal,
    handleTaskCreated,
    handleUpdateTaskFields,
    handleUpdateStatus,
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<CalendarMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingGcal, setIsLoadingGcal] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [mobileShowList, setMobileShowList] = useState(false);

  // Quick inline reschedule state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  const loadGcal = useCallback(async () => {
    setIsLoadingGcal(true);
    try {
      const res = await fetch("/api/google/calendar");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setGcalEvents(data.events);
        }
      }
    } catch {
      // Offline resilient
    } finally {
      setIsLoadingGcal(false);
    }
  }, []);

  useEffect(() => {
    loadGcal();
  }, [loadGcal]);

  const scopedTasks = useMemo(
    () =>
      tasks
        .filter((t) => isTaskMatchingWorkspace(t, accountFilter))
        .filter((t) => t.status !== "CANCELED"),
    [tasks, accountFilter]
  );

  // Deduplicated Google Calendar events matching active workspace
  const deduplicatedGcal = useMemo(() => {
    return gcalEvents
      .filter((ev) => !isGcalEventLinkedToTask(ev, tasks))
      .filter((ev) => {
        if (accountFilter === "all") return true;
        const f = accountFilter.toLowerCase();
        if (f.includes("pess") || f === "personal") return ev.isPersonal;
        if (f.includes("trab") || f === "work") return !ev.isPersonal;
        return true;
      });
  }, [gcalEvents, tasks, accountFilter]);

  const getTasksForDay = useCallback(
    (day: Date) =>
      scopedTasks
        .filter((t) => isTaskScheduledForDay(t, day))
        .sort((a, b) =>
          (getTaskScheduleDate(a) || "").localeCompare(getTaskScheduleDate(b) || "")
        ),
    [scopedTasks]
  );

  const getGcalForDay = useCallback(
    (day: Date) =>
      deduplicatedGcal
        .filter((ev) => isGcalOnDay(ev, day))
        .sort((a, b) => (a.start || "").localeCompare(b.start || "")),
    [deduplicatedGcal]
  );

  const selectedDayTasks = useMemo(
    () => getTasksForDay(selectedDate),
    [getTasksForDay, selectedDate]
  );

  const selectedDayGcal = useMemo(
    () => getGcalForDay(selectedDate),
    [getGcalForDay, selectedDate]
  );

  const selectedDayConflicts = useMemo(
    () => buildDayConflicts(selectedDayTasks, selectedDayGcal),
    [selectedDayTasks, selectedDayGcal]
  );

  // Upcoming commitments after selectedDate
  const upcomingItems = useMemo(() => {
    const endOfSelected = new Date(selectedDate);
    endOfSelected.setHours(23, 59, 59, 999);
    const cutoff = endOfSelected.getTime();

    const futureTasks = scopedTasks
      .filter((t) => t.status !== "COMPLETED")
      .filter((t) => {
        const iso = getTaskScheduleDate(t);
        if (!iso) return false;
        try {
          return parseISO(iso).getTime() > cutoff;
        } catch {
          return false;
        }
      })
      .map((t) => ({
        id: `up-task-${t.id}`,
        title: t.title,
        iso: getTaskScheduleDate(t) || "",
        origin: "MontLife" as const,
        meetLink: t.meet_link || null,
        task: t,
      }));

    const futureGcal = deduplicatedGcal
      .filter((ev) => {
        try {
          return parseISO(ev.start).getTime() > cutoff;
        } catch {
          return false;
        }
      })
      .map((ev) => ({
        id: `up-gcal-${ev.id}`,
        title: ev.summary,
        iso: ev.start,
        origin: "Google Calendar" as const,
        meetLink: ev.meet_link || null,
        task: null as Task | null,
      }));

    return [...futureTasks, ...futureGcal]
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .slice(0, 6);
  }, [scopedTasks, deduplicatedGcal, selectedDate]);

  // Period navigation
  const navigatePeriod = (dir: -1 | 1) => {
    if (viewMode === "month") {
      setCursorDate((prev) => (dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1)));
    } else if (viewMode === "week") {
      setCursorDate((prev) => (dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    } else {
      const next = dir === 1 ? addDays(selectedDate, 1) : subDays(selectedDate, 1);
      setSelectedDate(next);
      setCursorDate(next);
    }
  };

  const goToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCursorDate(now);
  };

  // Calendar grid intervals
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursorDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursorDate, { weekStartsOn: 0 });
    const end = endOfWeek(cursorDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursorDate]);

  const periodHeading = useMemo(() => {
    if (viewMode === "month") {
      return format(cursorDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${format(start, "dd MMM", { locale: ptBR })} – ${format(
        end,
        "dd MMM yyyy",
        { locale: ptBR }
      )}`;
    }
    return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [viewMode, cursorDate, weekDays, selectedDate]);

  const handleExpandTask = (task: Task) => {
    const key = `task-${task.id}`;
    if (expandedItemId === key) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(key);
    const sched = getTaskScheduleDate(task);
    if (sched) {
      try {
        const d = parseISO(sched);
        setRescheduleDate(format(d, "yyyy-MM-dd"));
        setRescheduleStart(sched.includes("T") ? format(d, "HH:mm") : "09:00");
        if (task.scheduled_end && task.scheduled_end.includes("T")) {
          setRescheduleEnd(format(parseISO(task.scheduled_end), "HH:mm"));
        } else {
          setRescheduleEnd("10:00");
        }
      } catch {}
    }
  };

  const handleSaveInlineReschedule = async (task: Task) => {
    if (!rescheduleDate) return;
    setIsSavingReschedule(true);
    try {
      const startIso = rescheduleStart
        ? new Date(`${rescheduleDate}T${rescheduleStart}:00`).toISOString()
        : new Date(`${rescheduleDate}T09:00:00`).toISOString();
      const endIso = rescheduleEnd
        ? new Date(`${rescheduleDate}T${rescheduleEnd}:00`).toISOString()
        : null;
      await handleUpdateTaskFields(task.id, {
        current_due_date: startIso,
        scheduled_start: startIso,
        scheduled_end: endIso,
      });
      setExpandedItemId(null);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const handleConvertGcal = async (ev: GoogleCalendarEventItem) => {
    setConvertingId(ev.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ev.summary || "Evento Google Calendar",
          description: ev.description || "",
          account_type: ev.isPersonal ? "personal" : "work",
          item_type: "activity",
          category: "Reuniões & Alinhamentos",
          priority: "P2",
          due_date: ev.start,
          scheduled_start: ev.start,
          scheduled_end: ev.end || null,
          meet_link: ev.meet_link || null,
          google_calendar_event_id: ev.id,
          tags: [`gcal-${ev.id}`],
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        handleTaskCreated(data.task);
      }
    } finally {
      setConvertingId(null);
    }
  };

  const getHourOfIso = (iso?: string | null): number | null => {
    if (!iso || !iso.includes("T")) return null;
    try {
      const d = parseISO(iso);
      return getHours(d) + getMinutes(d) / 60;
    } catch {
      return null;
    }
  };

  // =========================================================================
  // LEFT PANE (65%): Month / Week / Day Calendar
  // =========================================================================
  const leftCalendarPane = (
    <div className="h-full w-full flex flex-col bg-surface border-r border-line overflow-hidden">
      {/* Calendar Header Controls */}
      <div className="px-4 py-3 border-b border-line bg-sidebar flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-[9px] bg-surface hover:bg-lavender-soft border border-line text-xs font-semibold text-ink transition-colors cursor-pointer"
          >
            Hoje
          </button>

          <div className="inline-flex items-center rounded-[9px] bg-surface border border-line overflow-hidden">
            <button
              type="button"
              onClick={() => navigatePeriod(-1)}
              aria-label="Período anterior"
              className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigatePeriod(1)}
              aria-label="Próximo período"
              className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft border-l border-line transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-ink capitalize ml-1 truncate">
            {periodHeading}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher: Mensal | Semanal | Diário */}
          <div className="inline-flex items-center p-0.5 rounded-[10px] bg-canvas border border-line">
            {(
              [
                { id: "month", label: "Mês" },
                { id: "week", label: "Semana" },
                { id: "day", label: "Dia" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setViewMode(m.id)}
                className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === m.id
                    ? "bg-surface text-ink shadow-xs-subtle border border-line/70"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadGcal}
            disabled={isLoadingGcal}
            title="Sincronizar Google Calendar"
            className="w-8 h-8 rounded-[9px] bg-surface border border-line text-ink-muted hover:text-brand hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingGcal ? "animate-spin text-brand" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => openNewTaskModal({ initialDate: selectedDate })}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agendar</span>
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        {viewMode === "month" && (
          <div className="h-full flex flex-col min-h-[520px]">
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-muted py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1.5">
              {monthDays.map((day) => {
                const dayTasks = getTasksForDay(day);
                const dayGcal = getGcalForDay(day);
                const conflicts = buildDayConflicts(dayTasks, dayGcal);
                const hasConflict = Object.keys(conflicts).length > 0;
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, cursorDate);
                const isNow = isToday(day);
                const combinedCount = dayTasks.length + dayGcal.length;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setMobileShowList(true);
                    }}
                    className={`group text-left p-2 rounded-[10px] border flex flex-col gap-1 transition-all min-h-[82px] cursor-pointer ${
                      isSelected
                        ? "bg-lavender-soft/80 border-brand ring-1 ring-brand/30"
                        : isCurrentMonth
                        ? "bg-surface border-line hover:border-lavender-strong hover:bg-lavender-soft/30"
                        : "bg-sidebar/55 border-line/60 opacity-55 hover:opacity-85"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-mono font-semibold flex items-center justify-center ${
                          isNow
                            ? "bg-brand text-brand-fg"
                            : isSelected
                            ? "text-brand font-bold"
                            : "text-ink"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasConflict && (
                          <span title="Conflito de horário">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          </span>
                        )}
                        {combinedCount > 0 && (
                          <span className="text-[10px] font-mono text-ink-muted">
                            {combinedCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 w-full overflow-hidden">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={`px-1.5 py-0.5 rounded-[5px] text-[10px] font-medium truncate ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 line-through"
                              : t.priority === "P1"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : "bg-lavender-mid/70 text-ink"
                          }`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayGcal.slice(0, Math.max(0, 2 - dayTasks.length)).map((ev) => (
                        <div
                          key={ev.id}
                          className="px-1.5 py-0.5 rounded-[5px] text-[10px] font-medium truncate bg-sidebar border border-line text-ink-muted"
                        >
                          {ev.summary}
                        </div>
                      ))}
                      {combinedCount > 2 && (
                        <span className="text-[10px] font-mono text-brand font-semibold block px-1">
                          +{combinedCount - 2} mais
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="min-w-[640px] space-y-2">
            {/* Week Header */}
            <div className="grid grid-cols-7 gap-2 sticky top-0 z-10 bg-surface pb-2 border-b border-line">
              {weekDays.map((day) => {
                const selected = isSameDay(day, selectedDate);
                const now = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setMobileShowList(true);
                    }}
                    className={`p-2 rounded-[10px] border text-center transition-colors cursor-pointer ${
                      selected
                        ? "bg-lavender-soft border-brand"
                        : "bg-sidebar border-line hover:border-lavender-strong"
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase text-ink-muted block">
                      {format(day, "EEE", { locale: ptBR })}
                    </span>
                    <span
                      className={`mt-1 inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-mono font-bold ${
                        now ? "bg-brand text-brand-fg" : "text-ink"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Week Columns */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayTasks = getTasksForDay(day);
                const dayGcal = getGcalForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`rounded-[10px] border p-2 min-h-[420px] space-y-1.5 ${
                      isSameDay(day, selectedDate)
                        ? "bg-lavender-soft/35 border-lavender-strong"
                        : "bg-sidebar/40 border-line"
                    }`}
                  >
                    {dayTasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day);
                          handleExpandTask(t);
                          setMobileShowList(true);
                        }}
                        className="w-full text-left p-2 rounded-[8px] bg-surface border border-line hover:border-brand transition-colors cursor-pointer"
                      >
                        <p className="text-[10px] font-mono text-brand font-semibold">
                          {formatTaskTimeRange(t) || "Dia todo"}
                        </p>
                        <p className="text-[11px] font-semibold text-ink line-clamp-2 mt-0.5">
                          {t.title}
                        </p>
                      </button>
                    ))}
                    {dayGcal.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setSelectedDate(day);
                          setMobileShowList(true);
                        }}
                        className="p-2 rounded-[8px] bg-lavender-soft/70 border border-lavender-mid cursor-pointer"
                      >
                        <p className="text-[10px] font-mono text-ink-muted">
                          {getGcalTimeLabel(ev)}
                        </p>
                        <p className="text-[11px] font-semibold text-ink line-clamp-2 mt-0.5">
                          {ev.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <div className="space-y-3">
            {/* All-day strip */}
            <div className="p-3 rounded-[10px] bg-sidebar border border-line">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Dia todo / Sem horário fixo
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDayTasks
                  .filter((t) => getHourOfIso(t.scheduled_start || getTaskScheduleDate(t)) === null)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleExpandTask(t)}
                      className="px-2.5 py-1 rounded-[8px] bg-lavender-soft border border-lavender-mid text-xs font-semibold text-ink cursor-pointer"
                    >
                      {t.title}
                    </button>
                  ))}
                {selectedDayGcal
                  .filter((ev) => ev.allDay)
                  .map((ev) => (
                    <span
                      key={ev.id}
                      className="px-2.5 py-1 rounded-[8px] bg-surface border border-line text-xs font-medium text-ink-muted"
                    >
                      {ev.summary} (Google)
                    </span>
                  ))}
                {selectedDayTasks.filter(
                  (t) => getHourOfIso(t.scheduled_start || getTaskScheduleDate(t)) === null
                ).length === 0 &&
                  selectedDayGcal.filter((ev) => ev.allDay).length === 0 && (
                    <span className="text-xs text-ink-muted">
                      Nenhum item de dia inteiro.
                    </span>
                  )}
              </div>
            </div>

            {/* Hourly Timeline */}
            <div className="divide-y divide-line border border-line rounded-[12px] overflow-hidden bg-surface">
              {HOURS.map((hour) => {
                const hourTasks = selectedDayTasks.filter((t) => {
                  const h = getHourOfIso(t.scheduled_start || getTaskScheduleDate(t));
                  return h !== null && Math.floor(h) === hour;
                });
                const hourGcal = selectedDayGcal.filter((ev) => {
                  if (ev.allDay) return false;
                  const h = getHourOfIso(ev.start);
                  return h !== null && Math.floor(h) === hour;
                });
                const isCurrentHour =
                  isToday(selectedDate) && new Date().getHours() === hour;

                return (
                  <div
                    key={hour}
                    className={`flex items-stretch min-h-[54px] ${
                      isCurrentHour ? "bg-lavender-soft/35" : ""
                    }`}
                  >
                    <div className="w-16 shrink-0 px-3 py-2 border-r border-line text-[11px] font-mono text-ink-muted text-right">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1 p-1.5 flex flex-wrap gap-1.5 items-center">
                      {hourTasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleExpandTask(t)}
                          className="px-3 py-1.5 rounded-[9px] bg-lavender-soft border border-lavender-strong text-left hover:border-brand transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-[11px] font-mono font-semibold text-brand">
                            {formatTaskTimeRange(t)}
                          </span>
                          <span className="text-xs font-semibold text-ink">
                            {t.title}
                          </span>
                          {t.meet_link && <Video className="w-3.5 h-3.5 text-brand" />}
                        </button>
                      ))}
                      {hourGcal.map((ev) => (
                        <div
                          key={ev.id}
                          className="px-3 py-1.5 rounded-[9px] bg-sidebar border border-line flex items-center gap-2"
                        >
                          <span className="text-[11px] font-mono text-ink-muted">
                            {getGcalTimeLabel(ev)}
                          </span>
                          <span className="text-xs font-semibold text-ink">
                            {ev.summary}
                          </span>
                          {ev.meet_link && (
                            <a
                              href={ev.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // RIGHT PANE (35%): Synchronized Appointment List
  // =========================================================================
  const rightAppointmentsPane = (
    <div className="h-full w-full flex flex-col bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-sidebar flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold">
            {isToday(selectedDate) ? "Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
          </p>
          <h3 className="text-sm font-bold text-ink truncate">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => openNewTaskModal({ initialDate: selectedDate })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-fg text-[11px] font-semibold cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" /> Novo
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* Selected Day Schedule */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <span>
              Agendamentos do dia ({selectedDayTasks.length + selectedDayGcal.length})
            </span>
            {Object.keys(selectedDayConflicts).length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" /> Conflitos
              </span>
            )}
          </div>

          {selectedDayTasks.length === 0 && selectedDayGcal.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarIcon className="w-5 h-5" />}
              title="Dia sem agendamentos"
              description="Nenhum compromisso ou demanda agendada para esta data."
              action={
                <button
                  type="button"
                  onClick={() => openNewTaskModal({ initialDate: selectedDate })}
                  className="px-3 py-1.5 rounded-[9px] bg-lavender-soft text-brand text-xs font-semibold hover:bg-lavender-mid cursor-pointer"
                >
                  + Agendar neste dia
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {/* MontLife Scheduled Tasks */}
              {selectedDayTasks.map((task) => {
                const key = `task-${task.id}`;
                const expanded = expandedItemId === key;
                const hasConflict = Boolean(selectedDayConflicts[task.id]?.length);
                const isPersonal =
                  (task.account_type || "").toLowerCase().includes("pess") ||
                  task.transferred_to === "personal";
                const timeRange = formatTaskTimeRange(task) || "Dia todo";
                const reminderTxt = task.reminder_enabled
                  ? formatReminderLeadTime(task.reminder_minutes_before ?? 30)
                  : null;
                const typeLabel =
                  task.item_type === "activity"
                    ? "Atividade"
                    : task.item_type === "reminder"
                    ? "Lembrete"
                    : "Demanda";

                return (
                  <div
                    key={task.id}
                    className={`rounded-[11px] border transition-colors overflow-hidden ${
                      hasConflict
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-line bg-sidebar"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleExpandTask(task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleExpandTask(task);
                        }
                      }}
                      className="p-3 cursor-pointer hover:bg-lavender-soft/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-brand font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>{timeRange}</span>
                            {hasConflict && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                                <AlertTriangle className="w-2.5 h-2.5" /> Conflito
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs font-bold mt-1 ${
                              task.status === "COMPLETED"
                                ? "line-through text-ink-muted"
                                : "text-ink"
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                        <span className="text-ink-muted shrink-0">
                          {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px] text-ink-muted">
                        <span className="px-1.5 py-0.5 rounded-[6px] bg-surface border border-line text-[10px] font-medium">
                          {typeLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {isPersonal ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Briefcase className="w-3 h-3" />
                          )}
                          {isPersonal ? "Pessoal" : "Trabalho"}
                        </span>
                        <span>• MontLife</span>
                        {reminderTxt && (
                          <span className="inline-flex items-center gap-1 text-brand">
                            <Bell className="w-3 h-3" /> {reminderTxt}
                          </span>
                        )}
                      </div>

                      {task.meet_link && (
                        <div className="mt-2">
                          <a
                            href={task.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-lavender-soft hover:bg-lavender-mid text-brand text-[11px] font-semibold transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Entrar no Google Meet
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Expanded Inline Details + Reschedule */}
                    {expanded && (
                      <div className="px-3 pb-3 pt-2.5 border-t border-line bg-surface space-y-3">
                        {task.description && (
                          <p className="text-xs text-ink-muted leading-relaxed line-clamp-4">
                            {task.description}
                          </p>
                        )}

                        <div className="space-y-2 p-2.5 rounded-[9px] bg-sidebar border border-line">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                            Reagendar rapidamente
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input
                              type="date"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="h-8 px-2 rounded-[7px] ml-input text-[11px]"
                            />
                            <input
                              type="time"
                              value={rescheduleStart}
                              onChange={(e) => setRescheduleStart(e.target.value)}
                              className="h-8 px-2 rounded-[7px] ml-input text-[11px]"
                            />
                            <input
                              type="time"
                              value={rescheduleEnd}
                              onChange={(e) => setRescheduleEnd(e.target.value)}
                              className="h-8 px-2 rounded-[7px] ml-input text-[11px]"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(
                                  task.id,
                                  task.status === "COMPLETED" ? "TODO" : "COMPLETED"
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-surface border border-line text-[11px] font-semibold text-ink hover:border-brand cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              {task.status === "COMPLETED" ? "Reabrir" : "Concluir"}
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openTaskInModule(task, "/demandas")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-lavender-soft text-brand text-[11px] font-semibold cursor-pointer"
                              >
                                Detalhes <ArrowUpRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isSavingReschedule}
                                onClick={() => handleSaveInlineReschedule(task)}
                                className="px-2.5 py-1 rounded-[7px] bg-brand hover:bg-brand-hover text-brand-fg text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                              >
                                {isSavingReschedule ? "..." : "Salvar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Deduplicated Google Calendar External Events */}
              {selectedDayGcal.map((ev) => {
                const key = `gcal-${ev.id}`;
                const expanded = expandedItemId === key;
                return (
                  <div
                    key={ev.id}
                    className="rounded-[11px] border border-lavender-mid bg-lavender-soft/35 overflow-hidden"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedItemId(expanded ? null : key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedItemId(expanded ? null : key);
                        }
                      }}
                      className="p-3 cursor-pointer hover:bg-lavender-soft/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-brand font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>{getGcalTimeLabel(ev)}</span>
                          </div>
                          <p className="text-xs font-bold text-ink mt-1">
                            {ev.summary}
                          </p>
                        </div>
                        <span className="text-ink-muted shrink-0">
                          {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-ink-muted">
                        <span className="px-1.5 py-0.5 rounded-[6px] bg-surface border border-line text-[10px] font-medium">
                          Google Calendar
                        </span>
                        <span>{ev.isPersonal ? "Pessoal" : "Trabalho"}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {ev.meet_link && (
                          <a
                            href={ev.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-surface border border-line text-brand text-[11px] font-semibold hover:border-brand"
                          >
                            <Video className="w-3 h-3" /> Meet
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={convertingId === ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertGcal(ev);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-fg text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {convertingId === ev.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Converter em demanda
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-line bg-surface space-y-2 text-xs text-ink-muted">
                        {ev.description && (
                          <p className="leading-relaxed whitespace-pre-line">
                            {ev.description}
                          </p>
                        )}
                        {ev.location && <p>Local: {ev.location}</p>}
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand font-semibold hover:underline"
                          >
                            Abrir no Google Calendar{" "}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Appointments Section */}
        {upcomingItems.length > 0 && (
          <div className="pt-4 border-t border-line space-y-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Próximos compromissos
            </h4>
            <div className="space-y-1.5">
              {upcomingItems.map((item) => {
                let dateLabel = "";
                try {
                  dateLabel = format(
                    parseISO(item.iso),
                    item.iso.includes("T") ? "dd/MM HH:mm" : "dd/MM",
                    { locale: ptBR }
                  );
                } catch {}
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.task) {
                        openTaskInModule(item.task, "/demandas");
                      } else if (item.iso) {
                        try {
                          const d = parseISO(item.iso);
                          setSelectedDate(d);
                          setCursorDate(d);
                        } catch {}
                      }
                    }}
                    className="px-3 py-2 rounded-[9px] bg-sidebar hover:bg-lavender-soft/50 border border-line flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] font-mono text-ink-muted">
                        {dateLabel} • {item.origin}
                      </p>
                    </div>
                    {item.meetLink && (
                      <a
                        href={item.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand shrink-0"
                        title="Google Meet"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden">
      <SplitView
        ratio={prefs.splitRatios.agenda}
        onRatioChange={(next) => setSplitRatio("agenda", next)}
        defaultRatio={65}
        minLeftPct={45}
        maxLeftPct={78}
        mobileShowRight={mobileShowList}
        onMobileBack={() => setMobileShowList(false)}
        mobileBackLabel="Voltar ao calendário"
        ariaLabel="Redimensionar calendário e lista de agendamentos"
        left={leftCalendarPane}
        right={rightAppointmentsPane}
      />
    </div>
  );
}
