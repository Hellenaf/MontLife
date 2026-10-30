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
  AlertCircle,
  Zap,
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

    const workTasks = tasks.filter((t) => t.account_type === "work");
    const personalTasks = tasks.filter((t) => t.account_type === "personal");

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
    <aside className="w-[320px] xl:w-[350px] h-full flex flex-col border-l border-[#2E2B44] bg-[#141221] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[#2E2B44] px-5 flex items-center justify-between shrink-0 bg-[#161424]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#7B61FF]" />
          <h2 className="text-xs font-bold text-[#EAE9FC] tracking-wider uppercase">
            KPIs & Metrificação
          </h2>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Métricas em tempo real" />
      </div>

      {/* Scrollable KPIs container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card 1: SLA Compliance */}
        <div className="p-4 rounded-xl bg-[#1A1829] border border-[#2E2B44] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EAE9FC] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#9D8DF1]" />
              Cumprimento de SLA
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {metrics.onTimePct}% no prazo
            </span>
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2 rounded-full bg-[#0F0E17] overflow-hidden flex">
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

          <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[10px]">
            <div className="p-1 rounded bg-[#0F0E17]">
              <span className="text-emerald-400 block font-bold">
                {metrics.onTimePct}%
              </span>
              <span className="text-[#9490AC]">Original</span>
            </div>
            <div className="p-1 rounded bg-[#0F0E17]">
              <span className="text-amber-400 block font-bold">
                {metrics.extendedPct}%
              </span>
              <span className="text-[#9490AC]">Estendido</span>
            </div>
            <div className="p-1 rounded bg-[#0F0E17]">
              <span className="text-rose-400 block font-bold">
                {metrics.breachedPct}%
              </span>
              <span className="text-[#9490AC]">Atrasado</span>
            </div>
          </div>
        </div>

        {/* Card 2: Work vs Personal Ratio */}
        <div className="p-4 rounded-xl bg-[#1A1829] border border-[#2E2B44] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EAE9FC] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#7B61FF]" />
              Proporção de Contextos
            </span>
            <span className="text-[11px] text-[#9490AC]">
              {metrics.total} tarefas
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 text-indigo-300">
                  <Briefcase className="w-3 h-3" /> Trabalho
                </span>
                <span className="text-[#EAE9FC] font-semibold">
                  {metrics.workTasks} ({metrics.workPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#0F0E17]">
                <div
                  style={{ width: `${metrics.workPct}%` }}
                  className="h-full bg-indigo-500 rounded-full transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 text-purple-300">
                  <User className="w-3 h-3" /> Pessoal
                </span>
                <span className="text-[#EAE9FC] font-semibold">
                  {metrics.personalTasks} ({metrics.personalPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#0F0E17]">
                <div
                  style={{ width: `${metrics.personalPct}%` }}
                  className="h-full bg-purple-500 rounded-full transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Top Categories */}
        <div className="p-4 rounded-xl bg-[#1A1829] border border-[#2E2B44] space-y-2.5">
          <span className="text-xs font-semibold text-[#EAE9FC] block">
            Top Categorias
          </span>
          <div className="space-y-1.5">
            {metrics.categories.map(([cat, count]) => {
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#9490AC]">
                    <span className="text-[#EAE9FC] truncate max-w-[170px]">{cat}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[#0F0E17]">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-[#9D8DF1] rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Knowledge Base Wiki */}
        <div className="p-4 rounded-xl bg-[#1A1829] border border-[#2E2B44] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EAE9FC] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#9D8DF1]" />
              Wiki Técnica
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#7B61FF]/20 text-[#9D8DF1] text-[10px] font-bold">
              {metrics.wikiCount} Soluções
            </span>
          </div>
          <p className="text-[11px] text-[#9490AC] leading-relaxed">
            As resoluções registradas são indexadas e sugeridas automaticamente pelo Gemini quando novos tickets similares chegam.
          </p>
        </div>

        {/* Big CTA for Annual Report */}
        <button
          onClick={onOpenReportModal}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white shadow-xl shadow-[#7B61FF]/25 flex items-center justify-between transition-all active:scale-98 group"
        >
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Balanço & Relatório Anual
            </div>
            <p className="text-[10px] text-white/80 mt-0.5">
              Auditoria de desempenho e assertividade
            </p>
          </div>
          <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </aside>
  );
}

