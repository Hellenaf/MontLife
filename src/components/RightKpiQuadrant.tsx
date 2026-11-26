"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Award,
  PieChart,
  Briefcase,
  User,
  Clock,
  ArrowUpRight,
  ListTodo,
  Activity,
  Bell,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronLeft,
  X,
} from "lucide-react";
import { Task, DailyBriefingResponse } from "@/types";

interface RightKpiQuadrantProps {
  tasks: Task[];
  onOpenReportModal: () => void;
  onSelectTaskById?: (taskId: string) => void;
  pinnedNotesCount?: number;
  onBackToTasks?: () => void;
  onCloseDesktop?: () => void;
}

export function RightKpiQuadrant({
  tasks,
  onOpenReportModal,
  onSelectTaskById,
  pinnedNotesCount = 0,
  onBackToTasks,
  onCloseDesktop,
}: RightKpiQuadrantProps) {
  const [briefing, setBriefing] = useState<DailyBriefingResponse | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

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

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED");
    const completedCount = completed.length;

    const inProgressList = tasks.filter(
      (t) =>
        t.status === "IN_PROGRESS" ||
        t.status === "WAITING" ||
        t.status === "TODO" ||
        t.status === "TRIAGE"
    );
    const inProgressCount = inProgressList.length;

    const canceledList = tasks.filter((t) => t.status === "CANCELED");
    const canceledCount = canceledList.length;

    const tasksCount = tasks.filter((t) => (t.item_type || "task") === "task").length;
    const activitiesCount = tasks.filter((t) => t.item_type === "activity").length;
    const remindersCount = tasks.filter((t) => t.item_type === "reminder").length;

    const isWork = (t: Task) => {
      if (t.transferred_to === "personal") return false;
      if (
        t.manually_assigned &&
        (t.account_type === "personal" || t.account_type === "Pessoal")
      )
        return false;
      return true;
    };

    const workTasks = tasks.filter(isWork);
    const personalTasks = tasks.filter((t) => !isWork(t));

    const workPct = total > 0 ? Math.round((workTasks.length / total) * 100) : 0;
    const personalPct = total > 0 ? Math.round((personalTasks.length / total) * 100) : 0;

    const onTimeCount = completed.filter(
      (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
    ).length;
    const extendedCount = completed.filter((t) => (t.extension_count || 0) > 0).length;
    const breachedCount = completed.filter(
      (t) => t.met_original_sla === false && (t.extension_count || 0) === 0
    ).length;

    const onTimePct =
      completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 0;
    const extendedPct =
      completedCount > 0 ? Math.round((extendedCount / completedCount) * 100) : 0;
    const breachedPct =
      completedCount > 0 ? Math.round((breachedCount / completedCount) * 100) : 0;

    const categoryMap: Record<string, number> = {};
    for (const t of tasks) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
    }
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const wikiCount = completed.filter((t) => t.resolution_notes).length;

    return {
      total,
      completedCount,
      inProgressCount,
      canceledCount,
      tasksCount,
      activitiesCount,
      remindersCount,
      workTasks: workTasks.length,
      personalTasks: personalTasks.length,
      workPct,
      personalPct,
      onTimePct,
      extendedPct,
      breachedPct,
      categories,
      wikiCount,
    };
  }, [tasks]);

  return (
    <aside className="w-full h-full flex flex-col border-l border-[#DCD7CC]/80 dark:border-[#343F56] bg-[#F0EDE6] dark:bg-[#1C2230] shrink-0 overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="h-12 border-b border-[#DCD7CC]/75 dark:border-[#2E384D] px-4 flex items-center justify-between shrink-0 bg-[#F7F6F1] dark:bg-[#222938]">
        <div className="flex items-center gap-2 min-w-0">
          {onBackToTasks && (
            <button
              type="button"
              onClick={onBackToTasks}
              className="lg:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E7E3DA] dark:bg-white/[0.06] text-slate-700 dark:text-zinc-200 text-xs font-medium cursor-pointer mr-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          )}
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 tracking-tight truncate">
            Métricas & Briefing IA
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ativo
          </span>
          {onCloseDesktop && (
            <button
              type="button"
              onClick={onCloseDesktop}
              className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-[#E4E0D6] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Fechar painel de métricas"
              aria-label="Fechar painel de métricas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6 lg:pb-4">
        {/* Briefing IA do Dia */}
        <div className="p-3.5 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-indigo-200/80 dark:border-indigo-500/25 space-y-2.5 shadow-xs-subtle">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                Briefing IA do Dia
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadBriefing}
              disabled={isLoadingBriefing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              title="Analisar prioridades e prazos do dia com IA"
            >
              {isLoadingBriefing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : briefing ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>{briefing ? "Atualizar" : "Analisar"}</span>
            </button>
          </div>

          {briefingError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">{briefingError}</p>
          )}

          {briefing ? (
            <div className="space-y-2.5 animate-in fade-in">
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {briefing.focus_summary}
              </p>

              {briefing.top_priorities.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Foco Recomendado
                  </span>
                  {briefing.top_priorities.map((item) => (
                    <button
                      key={item.task_id}
                      type="button"
                      onClick={() => onSelectTaskById?.(item.task_id)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230] border border-[#DCD7CC]/80 dark:border-[#343F56] hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-colors cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 line-clamp-1">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            item.urgency === "alta"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                              : item.urgency === "media"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                        {item.reason}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-500/10 rounded-lg px-2.5 py-2 leading-snug">
                {briefing.quick_tip}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Gere um diagnóstico instantâneo das suas prioridades, prazos críticos
              {pinnedNotesCount > 0
                ? ` e ${pinnedNotesCount} anotação(ões) fixada(s).`
                : " do dia."}
            </p>
          )}
        </div>

        {/* Clean 2x2 KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Total
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">registradas</div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Concluídas
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {metrics.completedCount}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 tabular-nums">
              {metrics.total > 0 ? Math.round((metrics.completedCount / metrics.total) * 100) : 0}% entregue
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Em aberto
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
              {metrics.inProgressCount}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">pendentes</div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Canceladas
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
              {metrics.canceledCount}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">descartadas</div>
          </div>
        </div>

        {/* Distribution by Type */}
        <div className="p-3.5 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
            Distribuição por Tipo
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230] border border-[#DCD7CC]/60 dark:border-[#2E384D]">
              <ListTodo className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-zinc-100 block tabular-nums">
                {metrics.tasksCount}
              </span>
              <span className="text-slate-500 dark:text-zinc-400">Tarefas</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230] border border-[#DCD7CC]/60 dark:border-[#2E384D]">
              <Activity className="w-3.5 h-3.5 text-violet-500 mx-auto mb-1" />
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-zinc-100 block tabular-nums">
                {metrics.activitiesCount}
              </span>
              <span className="text-slate-500 dark:text-zinc-400">Atividades</span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230] border border-[#DCD7CC]/60 dark:border-[#2E384D]">
              <Bell className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
              <span className="font-mono font-bold text-xs text-slate-900 dark:text-zinc-100 block tabular-nums">
                {metrics.remindersCount}
              </span>
              <span className="text-slate-500 dark:text-zinc-400">Lembretes</span>
            </div>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="p-3.5 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              Cumprimento de SLA
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {metrics.onTimePct}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#E7E3DA] dark:bg-white/[0.06] overflow-hidden flex">
            <div
              style={{ width: `${metrics.onTimePct}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`No Prazo: ${metrics.onTimePct}%`}
            />
            <div
              style={{ width: `${metrics.extendedPct}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Estendido: ${metrics.extendedPct}%`}
            />
            <div
              style={{ width: `${metrics.breachedPct}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Atrasado: ${metrics.breachedPct}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230]">
              <span className="text-emerald-600 dark:text-emerald-400 block font-mono font-bold tabular-nums">
                {metrics.onTimePct}%
              </span>
              <span className="text-slate-500 dark:text-zinc-400">No Prazo</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230]">
              <span className="text-amber-600 dark:text-amber-400 block font-mono font-bold tabular-nums">
                {metrics.extendedPct}%
              </span>
              <span className="text-slate-500 dark:text-zinc-400">Estendido</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#F0EDE6] dark:bg-[#1C2230]">
              <span className="text-rose-600 dark:text-rose-400 block font-mono font-bold tabular-nums">
                {metrics.breachedPct}%
              </span>
              <span className="text-slate-500 dark:text-zinc-400">Atrasado</span>
            </div>
          </div>
        </div>

        {/* Work vs Personal Ratio */}
        <div className="p-3.5 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              Trabalho vs Pessoal
            </span>
            <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">
              {metrics.total}
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-medium">
                  <Briefcase className="w-3 h-3 text-blue-500" /> Trabalho
                </span>
                <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold tabular-nums">
                  {metrics.workTasks} ({metrics.workPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E7E3DA] dark:bg-white/[0.06]">
                <div
                  style={{ width: `${metrics.workPct}%` }}
                  className="h-full bg-blue-500 rounded-full transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-medium">
                  <User className="w-3 h-3 text-violet-500" /> Pessoal
                </span>
                <span className="font-mono text-slate-800 dark:text-zinc-200 font-semibold tabular-nums">
                  {metrics.personalTasks} ({metrics.personalPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E7E3DA] dark:bg-white/[0.06]">
                <div
                  style={{ width: `${metrics.personalPct}%` }}
                  className="h-full bg-violet-500 rounded-full transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="p-3.5 rounded-xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
            Principais Categorias
          </span>
          <div className="space-y-2">
            {metrics.categories.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-zinc-500">
                Nenhuma demanda registrada
              </span>
            ) : (
              metrics.categories.map(([cat, count]) => {
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-700 dark:text-zinc-300 truncate min-w-0 flex-1 font-medium">
                        {cat}
                      </span>
                      <span className="shrink-0 font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                        {count}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[#E7E3DA] dark:bg-white/[0.06]">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-indigo-500 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Full Report CTA */}
        <button
          type="button"
          onClick={onOpenReportModal}
          className="w-full p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white flex items-center justify-between transition-all active:scale-[0.99] group cursor-pointer"
        >
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Award className="w-4 h-4" />
              Relatório Executivo
            </div>
            <p className="text-[11px] text-slate-300 dark:text-indigo-100/80 mt-0.5">
              Auditoria de SLA & exportação PDF/CSV
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </aside>
  );
}
