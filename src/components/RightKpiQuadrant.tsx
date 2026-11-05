"use client";

import React, { useMemo } from "react";
import {
  TrendingUp,
  Award,
  PieChart,
  Briefcase,
  User,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowUpRight,
  Layers,
  PlayCircle,
  XCircle,
  ListTodo,
  Activity,
  Bell,
} from "lucide-react";
import { Task } from "@/types";

interface RightKpiQuadrantProps {
  tasks: Task[];
  onOpenReportModal: () => void;
}

export function RightKpiQuadrant({
  tasks,
  onOpenReportModal,
}: RightKpiQuadrantProps) {
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED");
    const completedCount = completed.length;

    const inProgressList = tasks.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "WAITING" || t.status === "TODO"
    );
    const inProgressCount = inProgressList.length;

    const canceledList = tasks.filter((t) => t.status === "CANCELED");
    const canceledCount = canceledList.length;

    // Type breakdown
    const tasksCount = tasks.filter((t) => (t.item_type || "task") === "task").length;
    const activitiesCount = tasks.filter((t) => t.item_type === "activity").length;
    const remindersCount = tasks.filter((t) => t.item_type === "reminder").length;

    const isWork = (t: Task) =>
      t.account_type === "work" ||
      t.account_type?.toLowerCase() === "trabalho" ||
      Boolean(t.account_email?.toLowerCase().includes("notredame")) ||
      Boolean(t.account_email?.toLowerCase().includes("haferreira"));

    const workTasks = tasks.filter(isWork);
    const personalTasks = tasks.filter((t) => !isWork(t));

    const workPct = total > 0 ? Math.round((workTasks.length / total) * 100) : 0;
    const personalPct = total > 0 ? Math.round((personalTasks.length / total) * 100) : 0;

    // SLA breakdown
    const onTimeCount = completed.filter(
      (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
    ).length;
    const extendedCount = completed.filter(
      (t) => (t.extension_count || 0) > 0
    ).length;
    const breachedCount = completed.filter(
      (t) => t.met_original_sla === false && (t.extension_count || 0) === 0
    ).length;

    const onTimePct = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 0;
    const extendedPct = completedCount > 0 ? Math.round((extendedCount / completedCount) * 100) : 0;
    const breachedPct = completedCount > 0 ? Math.round((breachedCount / completedCount) * 100) : 0;

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const t of tasks) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
    }
    const categories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Knowledge base resolutions count
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
    <aside className="w-full lg:w-[300px] xl:w-[330px] h-full flex flex-col border-l border-slate-200 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-[#0c0d13] shrink-0 overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 dark:border-zinc-800/80 px-5 flex items-center justify-between shrink-0 bg-white dark:bg-[#101118]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase">
            Métricas Operacionais
          </h2>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ativo
        </span>
      </div>

      {/* Scrollable KPIs container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Core 4-KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-1 shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" /> Total
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">demandas</div>
          </div>

          {/* Concluídas */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#141520] border border-emerald-200 dark:border-emerald-900/40 space-y-1 shadow-sm">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Concluídas
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.completedCount}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              {metrics.total > 0 ? Math.round((metrics.completedCount / metrics.total) * 100) : 0}% entregue
            </div>
          </div>

          {/* Em Andamento */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#141520] border border-blue-200 dark:border-blue-900/40 space-y-1 shadow-sm">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <PlayCircle className="w-3 h-3" /> Pendentes
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {metrics.inProgressCount}
            </div>
            <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80">em aberto</div>
          </div>

          {/* Canceladas */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#141520] border border-rose-200 dark:border-rose-900/40 space-y-1 shadow-sm">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Canceladas
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">
              {metrics.canceledCount}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80">descartadas</div>
          </div>
        </div>

        {/* Breakdown by Type: Tarefas / Atividades / Lembretes */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
          <span className="text-xs font-bold text-slate-800 dark:text-white block">
            Distribuição por Tipo
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-blue-200 dark:border-blue-900/30">
              <ListTodo className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
              <span className="font-bold text-slate-900 dark:text-white block">{metrics.tasksCount}</span>
              <span className="text-slate-500 dark:text-slate-400">Tarefas</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-purple-200 dark:border-purple-900/30">
              <Activity className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1" />
              <span className="font-bold text-slate-900 dark:text-white block">{metrics.activitiesCount}</span>
              <span className="text-slate-500 dark:text-slate-400">Atividades</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-amber-200 dark:border-amber-900/30">
              <Bell className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
              <span className="font-bold text-slate-900 dark:text-white block">{metrics.remindersCount}</span>
              <span className="text-slate-500 dark:text-slate-400">Lembretes</span>
            </div>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Cumprimento de SLA
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.onTimePct}% no prazo
            </span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden flex">
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

          <div className="grid grid-cols-3 gap-1 pt-0.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0d13]">
              <span className="text-emerald-600 dark:text-emerald-400 block font-bold">
                {metrics.onTimePct}%
              </span>
              <span className="text-slate-500 dark:text-slate-400">No Prazo</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0d13]">
              <span className="text-amber-600 dark:text-amber-400 block font-bold">
                {metrics.extendedPct}%
              </span>
              <span className="text-slate-500 dark:text-slate-400">Estendido</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#0c0d13]">
              <span className="text-rose-600 dark:text-rose-400 block font-bold">
                {metrics.breachedPct}%
              </span>
              <span className="text-slate-500 dark:text-slate-400">Atrasado</span>
            </div>
          </div>
        </div>

        {/* Work vs Personal Ratio */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-500" />
              Trabalho vs Pessoal
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {metrics.total} total
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300 font-medium">
                  <Briefcase className="w-3 h-3" /> Trabalho
                </span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {metrics.workTasks} ({metrics.workPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                <div
                  style={{ width: `${metrics.workPct}%` }}
                  className="h-full bg-blue-500 rounded-full transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-300 font-medium">
                  <User className="w-3 h-3" /> Pessoal
                </span>
                <span className="text-slate-900 dark:text-white font-semibold">
                  {metrics.personalTasks} ({metrics.personalPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                <div
                  style={{ width: `${metrics.personalPct}%` }}
                  className="h-full bg-purple-500 rounded-full transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-800 dark:text-white block">
            Principais Categorias
          </span>
          <div className="space-y-1.5">
            {metrics.categories.length === 0 ? (
              <span className="text-xs text-slate-400">Nenhuma demanda registrada</span>
            ) : (
              metrics.categories.map(([cat, count]) => {
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{cat}</span>
                      <span>{count}</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-zinc-800">
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

        {/* Big CTA for Annual Report */}
        <button
          onClick={onOpenReportModal}
          className="w-full p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center justify-between transition-all active:scale-[0.99] group"
        >
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Relatório Completo
            </div>
            <p className="text-[10px] text-indigo-100 mt-0.5">
              Auditoria de desempenho & exportação
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </aside>
  );
}
