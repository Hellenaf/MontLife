"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  PieChart,
  Briefcase,
  User,
  Download,
  Printer,
  Copy,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Task, AccountType } from "@/types";
import { parseISO, getYear, getMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AnnualReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export function AnnualReportModal({
  isOpen,
  onClose,
  tasks,
}: AnnualReportModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");
  const [scopeFilter, setScopeFilter] = useState<"work" | "personal" | "all">("work");

  // Executive AI summary state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "ai_summary">("dashboard");

  // Month names
  const months = [
    { value: "ALL", label: "Ano Todo" },
    { value: 0, label: "Jan" },
    { value: 1, label: "Fev" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Abr" },
    { value: 4, label: "Mai" },
    { value: 5, label: "Jun" },
    { value: 6, label: "Jul" },
    { value: 7, label: "Ago" },
    { value: 8, label: "Set" },
    { value: 9, label: "Out" },
    { value: 10, label: "Nov" },
    { value: 11, label: "Dez" },
  ];

  const selectedMonthLabel =
    selectedMonth === "ALL"
      ? `Ano Completo de ${selectedYear}`
      : `${months.find((m) => m.value === selectedMonth)?.label}/${selectedYear}`;

  // Filter tasks strictly according to scope (work vs personal vs all) and period
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Strict Scope isolation
      if (scopeFilter !== "all" && t.account_type !== scopeFilter) {
        return false;
      }

      // 2. Year & Month period
      try {
        const d = parseISO(t.created_at);
        const y = getYear(d);
        if (y !== selectedYear) return false;
        if (selectedMonth !== "ALL") {
          const m = getMonth(d);
          if (m !== selectedMonth) return false;
        }
        return true;
      } catch {
        return true;
      }
    });
  }, [tasks, selectedYear, selectedMonth, scopeFilter]);

  // Metrics computation
  const total = filteredTasks.length;
  const completed = filteredTasks.filter((t) => t.status === "COMPLETED");
  const completedCount = completed.length;
  const inProgress = filteredTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "WAITING");

  // SLA breakdown
  const onTimeCount = completed.filter(
    (t) => t.met_original_sla === true && (t.extension_count || 0) === 0
  ).length;

  const extendedAndCompletedCount = completed.filter(
    (t) => (t.extension_count || 0) > 0
  ).length;

  const breachedCount = completed.filter(
    (t) => t.met_original_sla === false && (t.extension_count || 0) === 0
  ).length;

  const onTimePct = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 0;
  const extendedPct = completedCount > 0 ? Math.round((extendedAndCompletedCount / completedCount) * 100) : 0;
  const breachedPct = completedCount > 0 ? Math.round((breachedCount / completedCount) * 100) : 0;

  // Category distribution
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTasks) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTasks]);

  // Wiki solutions
  const wikiResolved = completed.filter((t) => t.resolution_notes);

  if (!isOpen) return null;

  // Generate AI Executive Summary for Management / Boss
  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/report/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: filteredTasks,
          period_label: selectedMonthLabel,
          account_type: scopeFilter === "personal" ? "personal" : "work",
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setAiSummary(data.summary);
        setActiveTab("ai_summary");
      }
    } catch (err) {
      console.error("Error generating executive summary:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Titulo",
      "Contexto",
      "Categoria",
      "Prioridade",
      "Status",
      "Data_Criacao",
      "Data_Conclusao",
      "Prazo_Original",
      "Prazo_Atual",
      "Extensoes",
      "Resolucao_Tecnica",
    ];

    const rows = filteredTasks.map((t) => [
      `"${t.id}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.account_type === "work" ? "Trabalho" : "Pessoal"}"`,
      `"${t.category}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.created_at}"`,
      `"${t.completed_at || ""}"`,
      `"${t.original_due_date}"`,
      `"${t.current_due_date}"`,
      `"${t.extension_count || 0}"`,
      `"${(t.resolution_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mont-ops-relatorio-${scopeFilter}-${selectedYear}-${selectedMonth}.csv`;
    a.click();
  };

  // Copy Executive Report to Clipboard (Email format)
  const handleCopyEmailReport = () => {
    const summaryText = aiSummary || `RELATÓRIO DE ENTREGAS — ${selectedMonthLabel.toUpperCase()}
Contexto: ${scopeFilter === "work" ? "Tecnologia da Informação & Operações" : "Atividades Pessoais"}
Total de Demandas Gerenciadas: ${total} | Concluídas com Sucesso: ${completedCount}
Taxa de Cumprimento de SLA: ${onTimePct}% no prazo original (+ ${extendedPct}% com adiamento gerenciado)

PRINCIPAIS ATIVIDADES E ENTREGAS TÉCNICAS:
${completed
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.category}] ${t.title}\n   - Status: Concluído em ${
        t.completed_at ? format(parseISO(t.completed_at), "dd/MM/yyyy") : "Data não reg."
      }\n   ${t.resolution_notes ? `- Resolução Técnica: ${t.resolution_notes}` : `- Detalhes: ${t.description}`}`
  )
  .join("\n\n")}

Relatório gerado via Mont Ops.`;

    navigator.clipboard.writeText(summaryText);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="printable-report"
        className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#1A1829] border border-[#2E2B44] shadow-2xl flex flex-col overflow-hidden glow-violet print:border-none print:shadow-none print:bg-white"
      >
        {/* Top Action Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between p-5 border-b border-[#2E2B44] bg-[#141221] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7B61FF] to-[#9D8DF1] text-white shadow-lg shadow-[#7B61FF]/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#EAE9FC]">
                  Relatório & Prestação de Contas
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7B61FF]/20 text-[#9D8DF1] border border-[#7B61FF]/30">
                  {scopeFilter === "work"
                    ? "Atividades Profissionais"
                    : scopeFilter === "personal"
                    ? "Atividades Pessoais"
                    : "Consolidado Geral"}
                </span>
              </div>
              <p className="text-xs text-[#9490AC]">
                Consolidação de atividades, comprovações técnicas e síntese de entregas por período
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiSummary}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-xs font-semibold text-white shadow-md shadow-[#7B61FF]/20 transition-all disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingAi ? "Sintetizando..." : "Síntese com IA"}</span>
            </button>

            <button
              onClick={handleCopyEmailReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E2B44] hover:bg-[#3B3857] text-xs text-[#EAE9FC] transition-colors"
              title="Copiar texto formatado para enviar por e-mail"
            >
              {copiedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar p/ E-mail</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E2B44] hover:bg-[#3B3857] text-xs text-[#EAE9FC] transition-colors"
              title="Imprimir ou Salvar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E2B44] hover:bg-[#3B3857] text-xs text-[#EAE9FC] transition-colors"
              title="Exportar planilha CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#9490AC] hover:text-white hover:bg-[#2E2B44] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar: Scope (Strict Isolation) + Year + Month */}
        <div className="no-print px-6 py-3 border-b border-[#2E2B44] bg-[#0F0E17] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Scope Selector: Work vs Personal vs All */}
          <div className="flex items-center gap-1 bg-[#1A1829] p-1 rounded-xl border border-[#2E2B44]">
            <button
              onClick={() => {
                setScopeFilter("work");
                setAiSummary(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === "work"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-[#9490AC] hover:text-[#EAE9FC]"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Apenas Trabalho (Profissional)
            </button>

            <button
              onClick={() => {
                setScopeFilter("personal");
                setAiSummary(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                scopeFilter === "personal"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-[#9490AC] hover:text-[#EAE9FC]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Apenas Pessoal
            </button>

            <button
              onClick={() => {
                setScopeFilter("all");
                setAiSummary(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                scopeFilter === "all"
                  ? "bg-[#2E2B44] text-[#EAE9FC]"
                  : "text-[#9490AC] hover:text-[#EAE9FC]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Consolidado
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#9D8DF1]" />
              {[2026, 2025, 2024].map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                    selectedYear === year
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#1A1829] text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5 overflow-x-auto max-w-sm">
              {months.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setSelectedMonth(m.value as number | "ALL")}
                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors ${
                    selectedMonth === m.value
                      ? "bg-[#9D8DF1] text-black font-bold"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security & Scope Banner */}
        <div className="no-print px-6 py-2 bg-[#141221] border-b border-[#2E2B44] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`w-4 h-4 ${
                scopeFilter === "work"
                  ? "text-emerald-400"
                  : scopeFilter === "personal"
                  ? "text-purple-400"
                  : "text-amber-400"
              }`}
            />
            {scopeFilter === "work" && (
              <span className="text-emerald-300 font-medium text-[11px]">
                🔒 <strong>Escopo Profissional:</strong> Tarefas pessoais estão 100% ocultas deste relatório. Exibe exclusivamente atividades de trabalho.
              </span>
            )}
            {scopeFilter === "personal" && (
              <span className="text-purple-300 font-medium text-[11px]">
                👤 <strong>Escopo Pessoal:</strong> Exibindo catequese, finanças particulares e estudos.
              </span>
            )}
            {scopeFilter === "all" && (
              <span className="text-amber-300 font-medium text-[11px]">
                ⚠️ <strong>Atenção:</strong> Modo consolidado exibe tanto tarefas institucionais quanto pessoais.
              </span>
            )}
          </div>

          {/* Internal sub-tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-[#2E2B44] text-[#EAE9FC]"
                  : "text-[#9490AC] hover:text-[#EAE9FC]"
              }`}
            >
              Métricas & Gráficos
            </button>
            <button
              onClick={() => setActiveTab("activities")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === "activities"
                  ? "bg-[#2E2B44] text-[#EAE9FC]"
                  : "text-[#9490AC] hover:text-[#EAE9FC]"
              }`}
            >
              Quadro de Entregas & Soluções ({filteredTasks.length})
            </button>
            {aiSummary && (
              <button
                onClick={() => setActiveTab("ai_summary")}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold flex items-center gap-1 text-[#9D8DF1] ${
                  activeTab === "ai_summary" ? "bg-[#2E2B44]" : ""
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Síntese Executiva IA
              </button>
            )}
          </div>
        </div>

        {/* PRINT HEADER: Appears only when printed or generated as PDF */}
        <div className="hidden print:block p-8 border-b-2 border-gray-800 text-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider">
                MONT OPS — RELATÓRIO OPERACIONAL DE ATIVIDADES
              </h1>
              <p className="text-sm text-gray-700 font-semibold mt-1">
                Prestação de Contas & Auditoria de Entregas Técnicas
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold">Período: {selectedMonthLabel}</p>
              <p className="text-gray-600">
                Contexto: {scopeFilter === "work" ? "Trabalho (TI Escolar)" : "Pessoal"}
              </p>
              <p className="text-gray-500">
                Emitido em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible print:p-8 print:text-black">
          {/* TAB 1: DASHBOARD METRICS */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4 print:grid-cols-4">
                <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-gray-50 space-y-1">
                  <span className="text-xs text-[#9490AC] print:text-gray-600">
                    Total no Período
                  </span>
                  <div className="text-2xl font-bold text-[#EAE9FC] print:text-black">
                    {total}
                  </div>
                  <span className="text-[11px] text-emerald-400 print:text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {completedCount} finalizadas
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-gray-50 space-y-1">
                  <span className="text-xs text-[#9490AC] print:text-gray-600">
                    Assertividade SLA Original
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 print:text-emerald-700">
                    {onTimePct}%
                  </div>
                  <span className="text-[11px] text-[#9490AC] print:text-gray-600">
                    {onTimeCount} dentro do SLA inicial
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-gray-50 space-y-1">
                  <span className="text-xs text-[#9490AC] print:text-gray-600">
                    Extensões Justificadas
                  </span>
                  <div className="text-2xl font-bold text-amber-400 print:text-amber-700">
                    {extendedPct}%
                  </div>
                  <span className="text-[11px] text-[#9490AC] print:text-gray-600">
                    {extendedAndCompletedCount} com motivo registrado
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-gray-50 space-y-1">
                  <span className="text-xs text-[#9490AC] print:text-gray-600">
                    Wiki Técnica / Soluções
                  </span>
                  <div className="text-2xl font-bold text-[#9D8DF1] print:text-indigo-700">
                    {wikiResolved.length}
                  </div>
                  <span className="text-[11px] text-[#9490AC] print:text-gray-600">
                    resoluções documentadas
                  </span>
                </div>
              </div>

              {/* SLA Performance Bar */}
              <div className="p-5 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-white space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#EAE9FC] print:text-black flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#7B61FF]" />
                    Índice de Confiabilidade de Prazos (SLA)
                  </span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-emerald-400 font-semibold">
                      No Prazo: {onTimePct}%
                    </span>
                    <span className="text-amber-400 font-semibold">
                      Estendido: {extendedPct}%
                    </span>
                    <span className="text-rose-400 font-semibold">
                      Atrasado: {breachedPct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-[#2E2B44] print:bg-gray-200 overflow-hidden flex">
                  <div style={{ width: `${onTimePct}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${extendedPct}%` }} className="bg-amber-500 h-full" />
                  <div style={{ width: `${breachedPct}%` }} className="bg-rose-500 h-full" />
                </div>
              </div>

              {/* Category Breakdown & Highlights */}
              <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
                <div className="p-5 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-white space-y-3">
                  <h3 className="text-xs font-semibold text-[#EAE9FC] print:text-black">
                    Volume por Categoria / Função
                  </h3>
                  <div className="space-y-2">
                    {categoryCounts.map(([cat, count]) => {
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-[#9490AC] print:text-gray-700">
                            <span className="text-[#EAE9FC] print:text-black font-medium">{cat}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#2E2B44] print:bg-gray-200">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-[#9D8DF1] print:bg-indigo-600 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#0F0E17] border border-[#2E2B44] print:border-gray-300 print:bg-white space-y-3">
                  <h3 className="text-xs font-semibold text-[#EAE9FC] print:text-black flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#9D8DF1]" />
                    Exemplos de Problemas Complexos Solucionados
                  </h3>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {wikiResolved.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-[#141221] print:bg-gray-50 border border-[#2E2B44] print:border-gray-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#EAE9FC] print:text-black">
                            {item.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E2B44] print:bg-gray-200 text-[#9D8DF1] print:text-gray-700">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[#9490AC] print:text-gray-700 italic">
                          &quot;{item.resolution_notes}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED ACTIVITIES & JUSTIFICATION TABLE */}
          {(activeTab === "activities" || activeTab === "dashboard") && (
            <div className="space-y-4 pt-4 border-t border-[#2E2B44] print:border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#EAE9FC] print:text-black">
                    Registro Detalhado de Atividades para Comprovação
                  </h3>
                  <p className="text-xs text-[#9490AC] print:text-gray-600">
                    Histórico completo com diagnósticos técnicos, ações tomadas e cumprimento de prazos
                  </p>
                </div>
                <span className="text-xs text-[#9D8DF1] font-semibold print:text-gray-800">
                  {filteredTasks.length} tarefas listadas
                </span>
              </div>

              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#9490AC]">
                    Nenhuma atividade encontrada para o período e contexto selecionados.
                  </div>
                ) : (
                  filteredTasks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#0F0E17] print:bg-white border border-[#2E2B44] print:border-gray-300 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#9490AC]">
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E2B44] print:bg-gray-100 text-[#EAE9FC] print:text-black">
                              {t.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#7B61FF]/40 text-[#9D8DF1] print:text-black">
                              {t.priority}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : t.status === "IN_PROGRESS"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-[#2E2B44] text-[#9490AC]"
                              }`}
                            >
                              {t.status === "COMPLETED"
                                ? "Concluída"
                                : t.status === "IN_PROGRESS"
                                ? "Em Execução"
                                : "A Fazer"}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold text-[#EAE9FC] print:text-black">
                            {t.title}
                          </h4>
                        </div>

                        <div className="text-right text-[11px] text-[#9490AC] print:text-gray-600 shrink-0">
                          <div>
                            Concluído:{" "}
                            <span className="font-semibold text-[#EAE9FC] print:text-black">
                              {t.completed_at
                                ? format(parseISO(t.completed_at), "dd/MM/yyyy HH:mm", {
                                    locale: ptBR,
                                  })
                                : "Em andamento"}
                            </span>
                          </div>
                          <div>
                            SLA:{" "}
                            <span
                              className={
                                t.met_original_sla
                                  ? "text-emerald-400 font-semibold"
                                  : "text-amber-400 font-semibold"
                              }
                            >
                              {t.met_original_sla
                                ? "No Prazo Original"
                                : t.extension_count > 0
                                ? `Estendido (${t.extension_count}x)`
                                : "Pendente"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {t.description && (
                        <p className="text-[#9490AC] print:text-gray-700 leading-relaxed text-[11px] pl-2 border-l-2 border-[#2E2B44] print:border-gray-300">
                          {t.description}
                        </p>
                      )}

                      {/* Resolution notes: The proof of work! */}
                      {t.resolution_notes && (
                        <div className="p-3 rounded-lg bg-[#141221] print:bg-gray-100 border border-emerald-500/30 print:border-emerald-700 text-[11px] space-y-1">
                          <span className="font-bold text-emerald-400 print:text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Como foi resolvido (Comprovação Técnica):
                          </span>
                          <p className="text-emerald-100/90 print:text-gray-800 leading-relaxed pl-4">
                            {t.resolution_notes}
                          </p>
                        </div>
                      )}

                      {/* Extension history if any */}
                      {t.deadline_extensions?.length > 0 && (
                        <div className="text-[10px] text-amber-300/80 print:text-amber-800 pl-2">
                          <strong>Motivo do adiamento registrado:</strong>{" "}
                          {t.deadline_extensions[t.deadline_extensions.length - 1].reason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI EXECUTIVE SUMMARY */}
          {activeTab === "ai_summary" && aiSummary && (
            <div className="p-6 rounded-2xl bg-[#0F0E17] border border-[#7B61FF]/40 space-y-4 print:border-none print:bg-white">
              <div className="flex items-center justify-between border-b border-[#2E2B44] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#9D8DF1]" />
                  <h3 className="text-sm font-bold text-[#EAE9FC] print:text-black">
                    Síntese Geral de Atividades (Gerada com IA)
                  </h3>
                </div>
                <button
                  onClick={handleCopyEmailReport}
                  className="px-3 py-1 text-xs rounded-lg bg-[#2E2B44] hover:bg-[#3B3857] text-[#EAE9FC] flex items-center gap-1.5 transition-colors no-print"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Texto
                </button>
              </div>

              <div className="text-xs text-[#EAE9FC] print:text-black leading-relaxed whitespace-pre-wrap space-y-3 font-sans">
                {aiSummary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
