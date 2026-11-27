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

  // 6-month delivery evolution series (real data)
  const monthlySeries = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => {
      const ref = subMonths(now, 5 - idx);
      const start = startOfMonth(ref).getTime();
      const end = endOfMonth(ref).getTime();
      let created = 0;
      let completed = 0;
      let extended = 0;

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
          if ((t.extension_count || 0) > 0 && t.created_at) {
            const cMs = parseISO(t.created_at).getTime();
            if (cMs >= start && cMs <= end) extended += t.extension_count;
          }
        } catch {}
      }

      return {
        label: format(ref, "MMM", { locale: ptBR }),
        created,
        completed,
        extended,
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
      .slice(0, 5);
  }, [scopedTasks]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 bg-canvas">
      {/* Analytical Bento Top Strip: Delivery Evolution + Deadline Extensions Audit */}
      <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-8 ml-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Evolução de entregas (últimos 6 meses)
                </h2>
                <p className="text-[11px] text-ink-muted">
                  Comparativo entre demandas criadas e concluídas no espaço ativo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-lavender-mid" /> Criadas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" /> Concluídas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-[132px] pt-2">
            {monthlySeries.map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="flex items-end gap-1.5 h-[96px] w-full justify-center">
                  <div
                    title={`Criadas: ${m.created}`}
                    className="w-4 sm:w-5 rounded-t-[5px] bg-lavender-mid transition-all duration-300"
                    style={{ height: `${Math.max(6, (m.created / maxVal) * 100)}%` }}
                  />
                  <div
                    title={`Concluídas: ${m.completed}`}
                    className="w-4 sm:w-5 rounded-t-[5px] bg-brand transition-all duration-300"
                    style={{ height: `${Math.max(6, (m.completed / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono uppercase text-ink-muted">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-4 ml-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Histórico de extensões de prazo
              </h2>
              <p className="text-[11px] text-ink-muted">
                Últimas prorrogações registradas em auditoria
              </p>
            </div>
          </div>

          {recentExtensions.length === 0 ? (
            <div className="py-7 text-center text-xs text-ink-muted bg-sidebar rounded-[10px] border border-line">
              Nenhuma prorrogação de prazo registrada neste espaço.
            </div>
          ) : (
            <div className="space-y-2">
              {recentExtensions.map((ext, idx) => (
                <div
                  key={`${ext.taskId}-${idx}`}
                  className="p-2.5 rounded-[9px] bg-sidebar border border-line space-y-0.5"
                >
                  <p className="text-xs font-semibold text-ink truncate">
                    {ext.title}
                  </p>
                  <p className="text-[11px] text-ink-muted line-clamp-1">
                    {ext.reason || "Prorrogação de prazo"}
                  </p>
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

