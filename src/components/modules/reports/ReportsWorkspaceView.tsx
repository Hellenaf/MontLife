"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Clock } from "lucide-react";
import { ReportsView } from "@/components/ReportsView";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ReportsWorkspaceView() {
  const router = useRouter();
  const { tasks, accountFilter } = useWorkspace();

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  // Compact 6-month delivery evolution series
  const monthlySeries = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => {
      const ref = subMonths(now, 5 - idx);
      const start = startOfMonth(ref).getTime();
      const end = endOfMonth(ref).getTime();
      let created = 0;
      let completed = 0;

      for (const t of scopedTasks) {
        try {
          if (t.created_at) {
            const cMs = parseISO(t.created_at).getTime();
            if (cMs >= start && cMs <= end) created += 1;
          }
          if (t.status === "COMPLETED" && t.completed_at) {
            const dMs = parseISO(t.completed_at).getTime();
            if (dMs >= start && dMs <= end) completed += 1;
          }
        } catch {}
      }

      return {
        label: format(ref, "MMM", { locale: ptBR }),
        created,
        completed,
      };
    });
  }, [scopedTasks]);

  const maxVal = Math.max(
    1,
    ...monthlySeries.map((m) => Math.max(m.created, m.completed))
  );

  const recentExtensions = useMemo(() => {
    return scopedTasks
      .flatMap((t) =>
        (t.deadline_extensions || []).map((ext) => ({
          taskId: t.id,
          title: t.title,
          ...ext,
        }))
      )
      .sort((a, b) => (b.extended_at || "").localeCompare(a.extended_at || ""))
      .slice(0, 3);
  }, [scopedTasks]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-canvas">
      {/* Compact & Pixel-Aligned Top Strip (exact same max-w-7xl mx-auto as ReportsView) */}
      <div className="no-print max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <section className="lg:col-span-7 ml-card p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-ink truncate">
                  Evolução de entregas (6 meses)
                </h2>
                <p className="text-[11px] text-ink-muted truncate">
                  Criadas vs. concluídas no espaço ativo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-ink-muted shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-lavender-mid" /> Criadas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" /> Concluídas
              </span>
            </div>
          </div>

          {/* Crisp Compact Fixed-Height Bar Chart (aligned neatly!) */}
          <div className="grid grid-cols-6 gap-2 pt-1">
            {monthlySeries.map((m) => {
              const createdPct = m.created > 0 ? Math.max(12, Math.round((m.created / maxVal) * 100)) : 4;
              const completedPct =
                m.completed > 0 ? Math.max(12, Math.round((m.completed / maxVal) * 100)) : 4;
              return (
                <div key={m.label} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-mono text-ink-muted tabular">
                    {m.completed}/{m.created}
                  </div>
                  <div className="h-[68px] w-full flex items-end justify-center gap-1 px-1 border-b border-line pb-1">
                    <div
                      title={`Criadas em ${m.label}: ${m.created}`}
                      className="w-3 rounded-t-[4px] bg-lavender-mid transition-all duration-300"
                      style={{ height: `${createdPct}%` }}
                    />
                    <div
                      title={`Concluídas em ${m.label}: ${m.completed}`}
                      className="w-3 rounded-t-[4px] bg-brand transition-all duration-300"
                      style={{ height: `${completedPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-ink-muted">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 ml-card p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-ink truncate">
                Extensões de prazo recentes
              </h2>
              <p className="text-[11px] text-ink-muted truncate">
                Auditoria de prorrogações registradas
              </p>
            </div>
          </div>

          {recentExtensions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-4 px-3 text-center text-xs text-ink-muted bg-sidebar rounded-[9px] border border-line">
              Nenhuma prorrogação de prazo registrada neste espaço.
            </div>
          ) : (
            <div className="space-y-1.5 flex-1">
              {recentExtensions.map((ext, idx) => (
                <div
                  key={`${ext.taskId}-${idx}`}
                  className="px-3 py-2 rounded-[8px] bg-sidebar border border-line flex items-center justify-between gap-2"
                >
                  <p className="text-xs font-semibold text-ink truncate">{ext.title}</p>
                  <span className="text-[10px] text-ink-muted truncate max-w-[130px] shrink-0">
                    {ext.reason || "Prorrogada"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Complete Executive Reports & A4 Printable Engine */}
      <ReportsView
        tasks={tasks}
        accountFilter={accountFilter}
        onBackToTasks={() => router.push("/demandas")}
      />
    </div>
  );
}
