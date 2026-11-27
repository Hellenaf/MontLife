"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  ArrowUp,
  ArrowDown,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  GripVertical,
  CalendarPlus,
} from "lucide-react";
import {
  useWorkspace,
  isTaskMatchingWorkspace,
  isNoteMatchingWorkspace,
} from "@/context/WorkspaceContext";
import { Task, Priority, GoogleCalendarEventItem } from "@/types";
import { isTaskOverdue } from "@/lib/sla";
import {
  formatTaskTimeRange,
  getTaskScheduleDate,
  getTaskScheduleEnd,
  isTaskAllDay,
  isTaskScheduledForDay,
  findScheduleConflicts,
  ScheduleConflictItem,
} from "@/lib/taskSchedule";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function MyDayView() {
  const {
    tasks,
    notes,
    currentUser,
    accountFilter,
    briefing,
    isLoadingBriefing,
    briefingError,
    refreshBriefing,
    openTaskInModule,
    openNoteInModule,
    handleUpdateStatus,
    handleUpdateTaskFields,
    handleQuickCreateTask,
    handleCreateNote,
    handleTaskCreated,
    openNewTaskModal,
  } = useWorkspace();

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

  // Custom daily priority order persisted per day
  const [priorityOrderIds, setPriorityOrderIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Quick-add planned task for today
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState<Priority>("P2");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Quick blank note capture
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNoteBody, setQuickNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Google Calendar events for today
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingGcal, setIsLoadingGcal] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(`montlife_myday_order_${todayKey}`);
      if (saved) setPriorityOrderIds(JSON.parse(saved));
    } catch {}
  }, [todayKey]);

  const persistOrder = useCallback(
    (nextIds: string[]) => {
      setPriorityOrderIds(nextIds);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `montlife_myday_order_${todayKey}`,
            JSON.stringify(nextIds)
          );
        } catch {}
      }
    },
    [todayKey]
  );

  const loadGcalToday = useCallback(async () => {
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
      // ignore offline
    } finally {
      setIsLoadingGcal(false);
    }
  }, []);

  useEffect(() => {
    loadGcalToday();
  }, [loadGcalToday]);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  const openTasks = useMemo(
    () =>
      scopedTasks.filter(
        (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
      ),
    [scopedTasks]
  );

  const overdueTasks = useMemo(
    () =>
      openTasks.filter(
        (t) =>
          isTaskOverdue(t.current_due_date || t.original_due_date, t.status) &&
          !isTaskScheduledForDay(t, today)
      ),
    [openTasks, today]
  );

  const plannedTodayTasks = useMemo(() => {
    const base = openTasks.filter(
      (t) => isTaskScheduledForDay(t, today) || t.priority === "P1"
    );
    const weight: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    return [...base].sort((a, b) => {
      const ia = priorityOrderIds.indexOf(a.id);
      const ib = priorityOrderIds.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return (weight[a.priority] || 4) - (weight[b.priority] || 4);
    });
  }, [openTasks, today, priorityOrderIds]);

  const completedTodayCount = useMemo(
    () =>
      scopedTasks.filter(
        (t) =>
          t.status === "COMPLETED" &&
          (isTaskScheduledForDay(t, today) ||
            (t.completed_at && t.completed_at.startsWith(todayKey)))
      ).length,
    [scopedTasks, today, todayKey]
  );

  const progressPct = useMemo(() => {
    const total = plannedTodayTasks.length + completedTodayCount;
    if (total === 0) return 100;
    return Math.round((completedTodayCount / total) * 100);
  }, [plannedTodayTasks.length, completedTodayCount]);

  // Appointments today (deduplicated Google Calendar + scheduled MontLife tasks)
  const todayScheduledTasks = useMemo(
    () =>
      openTasks
        .filter((t) => isTaskScheduledForDay(t, today))
        .sort((a, b) => {
          const da = getTaskScheduleDate(a) || "";
          const db = getTaskScheduleDate(b) || "";
          return da.localeCompare(db);
        }),
    [openTasks, today]
  );

  const todayExternalGcal = useMemo(() => {
    return gcalEvents
      .filter((ev) => isGcalOnToday(ev, today))
      .filter((ev) => !isGcalEventLinkedToTask(ev, tasks))
      .filter((ev) => {
        if (accountFilter === "all") return true;
        const f = accountFilter.toLowerCase();
        if (f.includes("pess") || f === "personal") return ev.isPersonal;
        if (f.includes("trab") || f === "work") return !ev.isPersonal;
        return true;
      });
  }, [gcalEvents, today, tasks, accountFilter]);

  const conflictMap = useMemo(() => {
    const map: Record<string, ScheduleConflictItem[]> = {};
    for (const t of todayScheduledTasks) {
      if (isTaskAllDay(t)) continue;
      const hits = findScheduleConflicts(
        getTaskScheduleDate(t),
        getTaskScheduleEnd(t),
        todayScheduledTasks,
        todayExternalGcal,
        t.id
      );
      if (hits.length > 0) map[t.id] = hits;
    }
    return map;
  }, [todayScheduledTasks, todayExternalGcal]);

  const recentNotes = useMemo(
    () =>
      notes
        .filter((n) => !n.archived && isNoteMatchingWorkspace(n, accountFilter))
        .slice(0, 3),
    [notes, accountFilter]
  );

  const movePriority = (taskId: string, direction: -1 | 1) => {
    const ids = plannedTodayTasks.map((t) => t.id);
    const idx = ids.indexOf(taskId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    persistOrder(next);
  };

  const handleDropPriority = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = plannedTodayTasks.map((t) => t.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      return;
    }
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistOrder(next);
    setDraggedId(null);
  };

  const handleBringToToday = async (task: Task) => {
    const endOfToday = new Date();
    endOfToday.setHours(18, 0, 0, 0);
    await handleUpdateTaskFields(task.id, {
      current_due_date: endOfToday.toISOString(),
    });
  };

  const handleQuickAddToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || isAddingTask) return;
    setIsAddingTask(true);
    try {
      const targetDue = new Date();
      targetDue.setHours(18, 0, 0, 0);
      await handleQuickCreateTask(quickTaskTitle, "TODO", quickTaskPriority, {
        current_due_date: targetDue.toISOString(),
      });
      setQuickTaskTitle("");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleConvertGcalEvent = async (ev: GoogleCalendarEventItem) => {
    setConvertingId(ev.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ev.summary || "Compromisso Google Calendar",
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

  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteTitle.trim() && !quickNoteBody.trim()) return;
    setIsSavingNote(true);
    try {
      const isPersonal =
        accountFilter === "personal" ||
        accountFilter.toLowerCase().includes("pess");
      await handleCreateNote({
        title: quickNoteTitle.trim(),
        content: quickNoteBody.trim(),
        category: "geral",
        account_type: isPersonal ? "personal" : "work",
        checklist: [],
      });
      setQuickNoteTitle("");
      setQuickNoteBody("");
    } finally {
      setIsSavingNote(false);
    }
  };

  const greeting =
    today.getHours() < 12
      ? "Bom dia"
      : today.getHours() < 18
      ? "Boa tarde"
      : "Boa noite";
  const firstName = (currentUser?.name || "").split(" ")[0];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header Banner */}
      <section className="ml-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-brand font-semibold capitalize">
            <Sunrise className="w-4 h-4" />
            <span>{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            {greeting}
            {firstName ? `, ${firstName}` : ""} — Planejamento do dia
          </h1>
          <p className="text-xs text-ink-muted">
            Reorganize suas prioridades arrastando ou usando as setas, acompanhe sua agenda e registre notas rápidas sem sair desta página.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-[11px] bg-sidebar border border-line">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  className="stroke-lavender-soft"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  className="stroke-brand transition-all duration-500"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(progressPct / 100) * 94.2} 94.2`}
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-ink">
                {progressPct}%
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Progresso de hoje</p>
              <p className="text-[11px] text-ink-muted font-mono">
                {completedTodayCount} de {completedTodayCount + plannedTodayTasks.length} itens
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshBriefing}
            disabled={isLoadingBriefing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoadingBriefing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Briefing IA</span>
          </button>
        </div>
      </section>

      {/* Main 2-Column Balanced Planning Composition */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (7/12): Reorderable Priorities + Planned Tasks + Overdue Pull-in */}
        <div className="xl:col-span-7 space-y-5">
          {/* Planned & Prioritized for Today */}
          <section className="ml-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line bg-sidebar flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Prioridades & Tarefas planejadas ({plannedTodayTasks.length})
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Arraste para reordenar seu foco do dia ou conclua em 1 clique
                </p>
              </div>
              <Link
                href="/demandas"
                className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                Todas as demandas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 1-Line Quick Add for Today */}
            <form
              onSubmit={handleQuickAddToday}
              className="px-4 py-3 border-b border-line bg-surface flex flex-wrap sm:flex-nowrap items-center gap-2"
            >
              <Plus className="w-4 h-4 text-brand shrink-0 hidden sm:block" />
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Adicionar tarefa planejada para hoje..."
                className="flex-1 min-w-[180px] h-9 px-3 rounded-[9px] ml-input text-xs"
                disabled={isAddingTask}
              />
              <div className="inline-flex items-center gap-1 p-0.5 rounded-[9px] bg-canvas border border-line">
                {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setQuickTaskPriority(p)}
                    className={`px-2 py-1 rounded-[7px] text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                      quickTaskPriority === p
                        ? "bg-brand text-brand-fg"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || isAddingTask}
                className="h-9 px-3.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Planejar
              </button>
            </form>

            {plannedTodayTasks.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2">
                <p className="text-sm font-semibold text-ink">
                  Nenhuma prioridade pendente para hoje
                </p>
                <p className="text-xs text-ink-muted">
                  Use a barra acima para planejar seu dia ou traga demandas atrasadas abaixo.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {plannedTodayTasks.map((task, idx) => {
                  const timeRange = formatTaskTimeRange(task);
                  const overdue = isTaskOverdue(
                    task.current_due_date || task.original_due_date,
                    task.status
                  );
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropPriority(task.id)}
                      className={`group flex items-center gap-2.5 px-4 py-3 transition-colors ${
                        draggedId === task.id
                          ? "bg-lavender-soft/70 opacity-60"
                          : "hover:bg-lavender-soft/40"
                      }`}
                    >
                      <span
                        className="text-ink-muted/50 group-hover:text-ink-muted cursor-grab active:cursor-grabbing shrink-0"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                        title="Concluir tarefa"
                        className="w-5 h-5 rounded-full border border-line-strong hover:border-brand hover:bg-lavender-soft flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3 opacity-0 group-hover:opacity-70 text-brand" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openTaskInModule(task, "/demandas")}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <p className="text-xs sm:text-[13px] font-semibold text-ink truncate">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
                          <span>{task.category || "Geral"}</span>
                          {timeRange && (
                            <span className="font-mono text-brand">{timeRange}</span>
                          )}
                          {overdue && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              • Atrasada
                            </span>
                          )}
                        </div>
                      </button>

                      <span
                        className={`px-2 py-0.5 rounded-[7px] text-[10px] font-mono font-bold shrink-0 ${
                          task.priority === "P1"
                            ? "bg-rose-500/12 text-rose-600 dark:text-rose-400"
                            : task.priority === "P2"
                            ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                            : "bg-lavender-soft text-brand"
                        }`}
                      >
                        {task.priority}
                      </span>

                      <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePriority(task.id, -1)}
                          title="Subir prioridade"
                          className="p-1 rounded-md text-ink-muted hover:text-brand hover:bg-lavender-soft disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === plannedTodayTasks.length - 1}
                          onClick={() => movePriority(task.id, 1)}
                          title="Descer prioridade"
                          className="p-1 rounded-md text-ink-muted hover:text-brand hover:bg-lavender-soft disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Overdue Backlog — Pull into Today */}
          {overdueTasks.length > 0 && (
            <section className="ml-card overflow-hidden border-rose-500/30">
              <div className="px-5 py-3 border-b border-line bg-rose-500/8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h2 className="text-xs font-bold text-ink">
                    Atrasadas de dias anteriores ({overdueTasks.length})
                  </h2>
                </div>
                <span className="text-[11px] text-ink-muted">
                  Traga para o plano de hoje
                </span>
              </div>
              <div className="divide-y divide-line">
                {overdueTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-lavender-soft/30"
                  >
                    <button
                      type="button"
                      onClick={() => openTaskInModule(task, "/demandas")}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-ink truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {task.priority} • {task.category || "Geral"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBringToToday(task)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-[11px] font-semibold text-ink shrink-0 cursor-pointer"
                    >
                      <CalendarPlus className="w-3 h-3 text-brand" />
                      <span>Trazer para hoje</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column (5/12): Appointments Today + Briefing IA + Quick Note Capture */}
        <div className="xl:col-span-5 space-y-5">
          {/* Today's Appointments */}
          <section className="ml-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line bg-sidebar flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-ink">Compromissos de hoje</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadGcalToday}
                  disabled={isLoadingGcal}
                  className="p-1.5 rounded-[8px] text-ink-muted hover:text-brand hover:bg-lavender-soft cursor-pointer"
                  title="Atualizar Google Calendar"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoadingGcal ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => openNewTaskModal({ initialDate: today })}
                  className="text-xs font-semibold text-brand hover:underline cursor-pointer"
                >
                  + Agendar
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
              {todayScheduledTasks.length === 0 && todayExternalGcal.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted bg-sidebar rounded-[10px] border border-line">
                  Sem compromissos marcados para hoje.{" "}
                  <Link href="/agenda" className="text-brand font-semibold hover:underline">
                    Abrir Agenda
                  </Link>
                </div>
              ) : (
                <>
                  {todayScheduledTasks.map((task) => {
                    const hasConflict = Boolean(conflictMap[task.id]?.length);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-[10px] bg-sidebar border border-line hover:border-lavender-strong transition-colors flex items-start justify-between gap-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => openTaskInModule(task, "/demandas")}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-mono text-brand font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>{formatTaskTimeRange(task) || "Hoje"}</span>
                            {hasConflict && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> Conflito
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-ink mt-1 truncate">
                            {task.title}
                          </p>
                        </button>
                        {task.meet_link && (
                          <a
                            href={task.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-lavender-soft text-brand text-[11px] font-semibold hover:bg-lavender-mid shrink-0"
                          >
                            <Video className="w-3 h-3" />
                            Meet
                          </a>
                        )}
                      </div>
                    );
                  })}

                  {todayExternalGcal.map((ev) => {
                    const startTxt = ev.allDay
                      ? "Dia todo"
                      : ev.start.includes("T")
                      ? format(parseISO(ev.start), "HH:mm")
                      : "Horário";
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-[10px] bg-lavender-soft/45 border border-line flex items-start justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-ink-muted">
                            <span>{startTxt}</span>
                            <span>• Google Calendar</span>
                          </div>
                          <p className="text-xs font-semibold text-ink mt-0.5 truncate">
                            {ev.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {ev.meet_link && (
                            <a
                              href={ev.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] bg-surface border border-line text-brand text-[10px] font-semibold hover:bg-lavender-soft"
                            >
                              <Video className="w-3 h-3" />
                              Meet
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={convertingId === ev.id}
                            onClick={() => handleConvertGcalEvent(ev)}
                            className="px-2 py-1 rounded-[7px] bg-brand hover:bg-brand-hover text-brand-fg text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {convertingId === ev.id ? "..." : "+ Demanda"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>

          {/* Briefing IA Section */}
          {(briefing || briefingError) && (
            <section className="ml-card p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-ink">
                <Sparkles className="w-4 h-4 text-brand" />
                <span>Briefing IA do Dia</span>
              </div>
              {briefingError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {briefingError}
                </p>
              ) : (
                briefing && (
                  <>
                    <p className="text-xs text-ink leading-relaxed">
                      {briefing.focus_summary}
                    </p>
                    {briefing.quick_tip && (
                      <p className="text-[11px] text-ink-muted bg-sidebar px-3 py-2 rounded-[9px] border border-line">
                        💡 {briefing.quick_tip}
                      </p>
                    )}
                  </>
                )
              )}
            </section>
          )}

          {/* Quick Blank Note Capture */}
          <section className="ml-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-ink">Captura rápida de notas</h2>
              </div>
              <Link
                href="/anotacoes"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Abrir editor
              </Link>
            </div>

            <form onSubmit={handleSaveQuickNote} className="space-y-2">
              <input
                type="text"
                value={quickNoteTitle}
                onChange={(e) => setQuickNoteTitle(e.target.value)}
                placeholder="Título opcional..."
                className="w-full h-8.5 py-1.5 px-3 rounded-[9px] ml-input text-xs font-semibold"
              />
              <textarea
                rows={3}
                value={quickNoteBody}
                onChange={(e) => setQuickNoteBody(e.target.value)}
                placeholder="Anote uma ideia, recado ou ponto de reunião rapidamente..."
                className="w-full p-3 rounded-[9px] ml-input text-xs resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isSavingNote || (!quickNoteTitle.trim() && !quickNoteBody.trim())
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {isSavingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Salvar nota</span>
                </button>
              </div>
            </form>

            {recentNotes.length > 0 && (
              <div className="pt-2 border-t border-line space-y-1.5">
                {recentNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNoteInModule(n.id)}
                    className="w-full text-left px-3 py-2 rounded-[9px] bg-sidebar hover:bg-lavender-soft/60 border border-line text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-ink truncate">
                      {n.title || n.content.slice(0, 48) || "Nota sem título"}
                    </span>
                    <ArrowRight className="w-3 h-3 text-ink-muted shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
