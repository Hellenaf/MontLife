"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Sunrise,
  CheckSquare,
  Kanban,
  Calendar,
  StickyNote,
  BookOpen,
  Sparkles,
  BarChart3,
  Settings,
  ArrowRight,
  AlertCircle,
  Clock,
  Video,
  Check,
  SlidersHorizontal,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  useWorkspace,
  isTaskMatchingWorkspace,
  isNoteMatchingWorkspace,
} from "@/context/WorkspaceContext";
import { OverviewShortcut } from "@/hooks/useLayoutPreferences";
import { isTaskOverdue } from "@/lib/sla";
import {
  getTaskScheduleDate,
  isTaskScheduledForDay,
  formatTaskTimeRange,
} from "@/lib/taskSchedule";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ALL_SHORTCUT_CANDIDATES: OverviewShortcut[] = [
  { id: "sc-meu-dia", label: "Planejar Meu Dia", href: "/meu-dia", description: "Prioridades e agenda de hoje" },
  { id: "sc-demandas", label: "Demandas Ativas", href: "/demandas", description: "Lista + detalhes lado a lado" },
  { id: "sc-kanban", label: "Quadro Kanban", href: "/kanban", description: "Fluxo visual por status" },
  { id: "sc-agenda", label: "Agenda & Meet", href: "/agenda", description: "Calendário e compromissos" },
  { id: "sc-anotacoes", label: "Anotações & IA", href: "/anotacoes", description: "Captura livre com 6 modos IA" },
  { id: "sc-wiki", label: "Wiki Técnica", href: "/wiki", description: "Soluções e base de conhecimento" },
  { id: "sc-ia", label: "Assistente IA", href: "/assistente-ia", description: "Hub inteligente Gemini" },
  { id: "sc-relatorios", label: "Relatórios & SLA", href: "/relatorios", description: "Métricas e impressão A4" },
];

export function OverviewView() {
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
    openNewTaskModal,
    handleUpdateStatus,
    prefs,
    updatePrefs,
  } = useWorkspace();

  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (prefs.autoBriefingOnOverview && !briefing && !isLoadingBriefing) {
      refreshBriefing();
    }
  }, [prefs.autoBriefingOnOverview, briefing, isLoadingBriefing, refreshBriefing]);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  const scopedNotes = useMemo(
    () => notes.filter((n) => !n.archived && isNoteMatchingWorkspace(n, accountFilter)),
    [notes, accountFilter]
  );

  const stats = useMemo(() => {
    const open = scopedTasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
    );
    const overdue = open.filter((t) =>
      isTaskOverdue(t.current_due_date || t.original_due_date, t.status)
    );
    const todayOpen = open.filter((t) => isTaskScheduledForDay(t, today));
    const todayDone = scopedTasks.filter(
      (t) =>
        t.status === "COMPLETED" &&
        (isTaskScheduledForDay(t, today) ||
          (t.completed_at && t.completed_at.startsWith(format(today, "yyyy-MM-dd"))))
    );
    const totalTodayPool = todayOpen.length + todayDone.length;
    const progressPct =
      totalTodayPool > 0
        ? Math.round((todayDone.length / totalTodayPool) * 100)
        : open.length === 0
        ? 100
        : 0;

    // Next upcoming scheduled commitment today or later
    const nowMs = Date.now();
    const upcoming = open
      .filter((t) => {
        const iso = t.scheduled_start || getTaskScheduleDate(t);
        if (!iso || !iso.includes("T")) return false;
        try {
          return parseISO(iso).getTime() >= nowMs - 15 * 60 * 1000;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const aMs = parseISO(a.scheduled_start || getTaskScheduleDate(a) || "").getTime();
        const bMs = parseISO(b.scheduled_start || getTaskScheduleDate(b) || "").getTime();
        return aMs - bMs;
      })[0] || null;

    // Top 4 priorities for today (P1/P2 or due today or overdue)
    const priorityOrder: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const topPriorities = [...open]
      .sort((a, b) => {
        const aOver = isTaskOverdue(a.current_due_date || a.original_due_date, a.status) ? 0 : 1;
        const bOver = isTaskOverdue(b.current_due_date || b.original_due_date, b.status) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        const aToday = isTaskScheduledForDay(a, today) ? 0 : 1;
        const bToday = isTaskScheduledForDay(b, today) ? 0 : 1;
        if (aToday !== bToday) return aToday - bToday;
        return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      })
      .slice(0, 4);

    const wikiCount = scopedTasks.filter(
      (t) => t.resolution_notes && t.resolution_notes.trim().length > 0
    ).length;

    return {
      openCount: open.length,
      overdueCount: overdue.length,
      todayCount: todayOpen.length,
      todayDoneCount: todayDone.length,
      progressPct,
      upcoming,
      topPriorities,
      wikiCount,
    };
  }, [scopedTasks, today]);

  const greeting = useMemo(() => {
    const hr = today.getHours();
    if (hr < 12) return "Bom dia";
    if (hr < 18) return "Boa tarde";
    return "Boa noite";
  }, [today]);

  const firstName = (currentUser?.name || "").split(" ")[0] || "";
  const formattedDate = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const toggleShortcut = (item: OverviewShortcut) => {
    const exists = prefs.overviewShortcuts.some((s) => s.id === item.id);
    const next = exists
      ? prefs.overviewShortcuts.filter((s) => s.id !== item.id)
      : [...prefs.overviewShortcuts, item];
    if (next.length > 0) {
      updatePrefs({ overviewShortcuts: next });
    }
  };

  const modules = [
    {
      href: "/meu-dia",
      title: "Meu dia",
      desc: "Planejamento diário, prioridades e compromissos",
      metric: `${stats.todayCount} para hoje`,
      icon: Sunrise,
    },
    {
      href: "/demandas",
      title: "Demandas",
      desc: "Gestão operacional em Master-Detail persistente",
      metric: `${stats.openCount} abertas`,
      icon: CheckSquare,
    },
    {
      href: "/kanban",
      title: "Kanban",
      desc: "Fluxo visual por status com painel lateral acoplável",
      metric: "Drag & Drop",
      icon: Kanban,
    },
    {
      href: "/agenda",
      title: "Agenda",
      desc: "Calendário mensal, semanal e diário + Google Calendar",
      metric: "Google Meet",
      icon: Calendar,
    },
    {
      href: "/anotacoes",
      title: "Anotações",
      desc: "Editor amplo em Split View com 6 modos de IA",
      metric: `${scopedNotes.length} notas`,
      icon: StickyNote,
    },
    {
      href: "/wiki",
      title: "Wiki técnica",
      desc: "Biblioteca de soluções, procedimentos e vídeos",
      metric: `${stats.wikiCount} soluções`,
      icon: BookOpen,
    },
    {
      href: "/assistente-ia",
      title: "Assistente IA",
      desc: "Ambiente dedicado Gemini conectado aos seus dados",
      metric: "Gemini AI",
      icon: Sparkles,
    },
    {
      href: "/relatorios",
      title: "Relatórios",
      desc: "SLA, Lead Time, produtividade e exportação A4",
      metric: "Analítico",
      icon: BarChart3,
    },
    {
      href: "/configuracoes",
      title: "Configurações",
      desc: "Perfil, aparência, workspaces, contas Google e layout",
      metric: "Sistema",
      icon: Settings,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Contextual Greeting & Daily Progress */}
      <section className="ml-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-mono uppercase tracking-wider text-brand font-semibold capitalize">
            {formattedDate}
          </p>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-2xl">
            Central de acesso ao seu workspace. Escolha um módulo para trabalhar em amplitude total ou revise rapidamente suas prioridades do dia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
          {/* Daily Progress Pill */}
          <div className="px-4 py-3 rounded-[11px] bg-sidebar border border-line min-w-[200px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-muted">Progresso diário</span>
              <span className="font-mono font-bold text-ink tabular">
                {stats.progressPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-lavender-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${Math.min(100, stats.progressPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-muted font-mono tabular">
              {stats.todayDoneCount} concluída(s) hoje • {stats.todayCount} pendente(s)
            </p>
          </div>

          <div className="flex sm:flex-col gap-2">
            <button
              type="button"
              onClick={() => openNewTaskModal()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Demanda</span>
            </button>
            <Link
              href="/meu-dia"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] bg-sidebar hover:bg-lavender-soft border border-line text-ink text-xs font-semibold transition-colors"
            >
              <Sunrise className="w-3.5 h-3.5 text-brand" />
              <span>Abrir Meu Dia</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Four Essential Summary Indicators */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Link
          href="/demandas"
          className="ml-card p-4 hover:border-lavender-strong flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Demandas abertas</span>
            <CheckSquare className="w-4 h-4 text-brand" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular text-ink">
              {stats.openCount}
            </span>
            <span className="text-[11px] text-brand font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link
          href="/meu-dia"
          className="ml-card p-4 hover:border-lavender-strong flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Prioridades de hoje</span>
            <Sunrise className="w-4 h-4 text-brand" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular text-ink">
              {stats.todayCount}
            </span>
            <span className="text-[11px] text-ink-muted">
              {stats.todayDoneCount} entregues
            </span>
          </div>
        </Link>

        <Link
          href="/demandas?filter=overdue"
          className="ml-card p-4 hover:border-rose-400/60 flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Demandas atrasadas</span>
            <AlertCircle
              className={`w-4 h-4 ${
                stats.overdueCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            />
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono tabular ${
                stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-ink"
              }`}
            >
              {stats.overdueCount}
            </span>
            <span className="text-[11px] text-ink-muted">
              {stats.overdueCount > 0 ? "Requer atenção" : "SLA sob controle"}
            </span>
          </div>
        </Link>

        <div className="ml-card p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Próximo compromisso</span>
            <Clock className="w-4 h-4 text-brand" />
          </div>
          {stats.upcoming ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => openTaskInModule(stats.upcoming!, "/demandas")}
                className="text-left text-xs font-semibold text-ink hover:text-brand truncate block w-full cursor-pointer"
              >
                {stats.upcoming.title}
              </button>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-ink-muted">
                  {formatTaskTimeRange(stats.upcoming) ||
                    (stats.upcoming.scheduled_start
                      ? format(parseISO(stats.upcoming.scheduled_start), "dd/MM HH:mm", {
                          locale: ptBR,
                        })
                      : "Agendado")}
                </span>
                {stats.upcoming.meet_link && (
                  <a
                    href={stats.upcoming.meet_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] bg-lavender-soft text-brand text-[10px] font-semibold hover:bg-lavender-mid transition-colors"
                  >
                    <Video className="w-3 h-3" />
                    Meet
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink">Agenda livre</span>
              <Link
                href="/agenda"
                className="text-[11px] text-brand font-medium hover:underline"
              >
                Ver calendário
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. Balanced Middle Row: Compact Priorities + Briefing IA Summary */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Compact Today's Focus */}
        <div className="xl:col-span-7 ml-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-ink">Foco prioritário</h2>
              <p className="text-xs text-ink-muted">
                Principais itens para destravar agora
              </p>
            </div>
            <Link
              href="/demandas"
              className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>Abrir Demandas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.topPriorities.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted bg-sidebar rounded-[10px] border border-line">
              Nenhuma demanda pendente neste espaço. Aproveite para planejar em Meu dia.
            </div>
          ) : (
            <div className="divide-y divide-line border border-line rounded-[10px] overflow-hidden bg-surface">
              {stats.topPriorities.map((task) => {
                const overdue = isTaskOverdue(
                  task.current_due_date || task.original_due_date,
                  task.status
                );
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-lavender-soft/45 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                      title="Marcar como concluída"
                      className="w-4.5 h-4.5 w-4 h-4 rounded-full border border-line-strong hover:border-brand hover:bg-lavender-soft flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-brand" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openTaskInModule(task, "/demandas")}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-ink truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate">
                        {task.category || "Geral"}
                        {overdue ? " • Atrasada" : ""}
                      </p>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Concise AI Briefing Card */}
        <div className="xl:col-span-5 ml-card p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink">Briefing IA resumido</h2>
                <p className="text-[11px] text-ink-muted">
                  Síntese inteligente das suas prioridades
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshBriefing}
              disabled={isLoadingBriefing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-[11px] font-semibold text-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoadingBriefing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-brand" />
              )}
              <span>{briefing ? "Atualizar" : "Gerar briefing"}</span>
            </button>
          </div>

          {briefingError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-[9px] px-3 py-2">
              {briefingError}
            </p>
          )}

          {briefing ? (
            <div className="space-y-3 flex-1">
              <p className="text-xs text-ink leading-relaxed bg-sidebar p-3 rounded-[10px] border border-line">
                {briefing.focus_summary}
              </p>
              {briefing.top_priorities?.length > 0 && (
                <div className="space-y-1.5">
                  {briefing.top_priorities.slice(0, 3).map((item) => (
                    <button
                      key={item.task_id}
                      type="button"
                      onClick={() => {
                        const found = tasks.find((t) => t.id === item.task_id);
                        if (found) openTaskInModule(found, "/demandas");
                      }}
                      className="w-full text-left px-3 py-2 rounded-[9px] bg-lavender-soft/45 hover:bg-lavender-soft transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-ink-muted truncate">
                          {item.reason}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4 rounded-[10px] bg-sidebar border border-line space-y-2">
              <p className="text-xs text-ink-muted max-w-xs">
                Gere um resumo sob demanda ou abra o Assistente IA para análises detalhadas.
              </p>
              <Link
                href="/assistente-ia"
                className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                Ir para Assistente IA <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. Customizable Shortcuts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Atalhos rápidos
          </h2>
          <button
            type="button"
            onClick={() => setIsEditingShortcuts((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold text-ink-muted hover:text-brand hover:bg-lavender-soft transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isEditingShortcuts ? "Concluir edição" : "Personalizar"}</span>
          </button>
        </div>

        {isEditingShortcuts && (
          <div className="ml-card p-3.5 flex flex-wrap gap-2">
            {ALL_SHORTCUT_CANDIDATES.map((cand) => {
              const selected = prefs.overviewShortcuts.some((s) => s.id === cand.id);
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => toggleShortcut(cand)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-medium border transition-colors cursor-pointer ${
                    selected
                      ? "bg-lavender-soft border-brand text-ink font-semibold"
                      : "bg-sidebar border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {selected && <Check className="w-3 h-3 text-brand" />}
                  <span>{cand.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {prefs.overviewShortcuts.map((sc) => (
            <Link
              key={sc.id}
              href={sc.href}
              className="ml-card px-4 py-3.5 hover:border-brand flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{sc.label}</p>
                <p className="text-[11px] text-ink-muted truncate mt-0.5">
                  {sc.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Modular Directory */}
      <section className="space-y-3 pb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Módulos do MontLife
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="ml-card p-4 hover:border-brand flex items-start gap-3.5 group"
              >
                <div className="w-9 h-9 rounded-[10px] bg-lavender-soft text-brand flex items-center justify-center shrink-0 group-hover:bg-lavender-mid transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink truncate">
                      {mod.title}
                    </h3>
                    <span className="text-[10px] font-mono text-ink-muted shrink-0">
                      {mod.metric}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
