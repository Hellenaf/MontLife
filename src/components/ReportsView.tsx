"use client";

import React, { useState, useMemo } from "react";
import {
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
  XCircle,
  PlayCircle,
  ListTodo,
  Activity,
  Bell,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Task, AccountType, ItemType } from "@/types";
import { parseISO, getYear, getMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FormattedText } from "@/components/FormattedText";

interface ReportsViewProps {
  tasks: Task[];
  onBackToTasks?: () => void;
}

export function ReportsView({ tasks, onBackToTasks }: ReportsViewProps) {
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

  // Core KPI metrics computation
  const total = filteredTasks.length;
  const completed = filteredTasks.filter((t) => t.status === "COMPLETED");
  const completedCount = completed.length;

  // In progress / pending (includes IN_PROGRESS, WAITING, and TODO)
  const inProgressList = filteredTasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "WAITING" || t.status === "TODO"
  );
  const inProgressCount = inProgressList.length;
  const activeRunningCount = filteredTasks.filter((t) => t.status === "IN_PROGRESS").length;

  // Canceled
  const canceledList = filteredTasks.filter((t) => t.status === "CANCELED");
  const canceledCount = canceledList.length;

  // Breakdown by Item Type (Tarefa vs Atividade vs Lembrete)
  const tasksCount = filteredTasks.filter((t) => (t.item_type || "task") === "task").length;
  const activitiesCount = filteredTasks.filter((t) => t.item_type === "activity").length;
  const remindersCount = filteredTasks.filter((t) => t.item_type === "reminder").length;

  // Percentages
  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgressCount / total) * 100) : 0;
  const canceledPct = total > 0 ? Math.round((canceledCount / total) * 100) : 0;

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
      "Tipo",
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
      `"${t.item_type === "reminder" ? "Lembrete" : t.item_type === "activity" ? "Atividade" : "Tarefa"}"`,
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
    a.download = `montlife-relatorio-${scopeFilter}-${selectedYear}-${selectedMonth}.csv`;
    a.click();
  };

  // Copy Executive Report to Clipboard (Email format)
  const handleCopyEmailReport = () => {
    const summaryText =
      aiSummary ||
      `RELATÓRIO DE ENTREGAS — ${selectedMonthLabel.toUpperCase()}
Contexto: ${scopeFilter === "work" ? "Tecnologia da Informação & Operações" : "Atividades Pessoais"}

QUADRO GERAL DE KPIS:
- Total de Demandas Registradas: ${total}
  • Tarefas: ${tasksCount} | Atividades: ${activitiesCount} | Lembretes: ${remindersCount}
- Concluídas com Sucesso: ${completedCount} (${completedPct}%)
- Em Andamento / Pendentes: ${inProgressCount} (${inProgressPct}%)
- Canceladas / Descartadas: ${canceledCount} (${canceledPct}%)
- Índice de Assertividade de SLA: ${onTimePct}% no prazo original (+ ${extendedPct}% com adiamento gerenciado)
- Soluções Técnicas Registradas na Wiki: ${wikiResolved.length}

PRINCIPAIS ATIVIDADES E ENTREGAS TÉCNICAS:
${completed
  .map(
    (t, idx) =>
      `${idx + 1}. [${
        t.item_type === "reminder" ? "Lembrete" : t.item_type === "activity" ? "Atividade" : "Tarefa"
      } - ${t.category}] ${t.title}\n   - Status: Concluído em ${
        t.completed_at ? format(parseISO(t.completed_at), "dd/MM/yyyy") : "Data não reg."
      }\n   ${
        t.resolution_notes
          ? `- Resolução Técnica: ${t.resolution_notes}`
          : `- Detalhes: ${(t.description || "").replace(/\*\*/g, "")}`
      }`
  )
  .join("\n\n")}

Relatório gerado via MontLife.`;

    navigator.clipboard.writeText(summaryText);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getItemTypeBadge = (itemType?: ItemType) => {
    switch (itemType) {
      case "reminder":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Bell className="w-2.5 h-2.5" /> Lembrete
          </span>
        );
      case "activity":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> Atividade
          </span>
        );
      case "task":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <ListTodo className="w-2.5 h-2.5" /> Tarefa
          </span>
        );
    }
  };

  return (
    <div id="printable-report" className="max-w-7xl mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* 1. Header Toolbar (Hidden when printing) */}
      <div className="no-print p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Relatórios & Prestação de Contas
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                {scopeFilter === "work"
                  ? "Atividades Profissionais"
                  : scopeFilter === "personal"
                  ? "Atividades Pessoais"
                  : "Consolidado Geral"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Painel analítico de produtividade, auditoria de SLA e volume de entregas.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleGenerateAiSummary}
            disabled={isGeneratingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 active:scale-95"
            title="Gerar parecer textual formal com Google Gemini"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingAi ? "Sintetizando..." : "Síntese com IA"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyEmailReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-xs"
            title="Copiar texto formatado para enviar por e-mail"
          >
            {copiedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar p/ E-mail</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-xs"
            title="Imprimir ou Salvar como PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-xs"
            title="Exportar planilha CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {onBackToTasks && (
            <button
              type="button"
              onClick={onBackToTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold shadow-xs transition-all active:scale-95 ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar: Scope + Year + Month + Sub-tabs */}
      <div className="no-print p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Scope Selector: Work vs Personal vs All */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16152a] p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              setScopeFilter("work");
              setAiSummary(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              scopeFilter === "work"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Trabalho
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("personal");
              setAiSummary(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              scopeFilter === "personal"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Pessoal
          </button>

          <button
            type="button"
            onClick={() => {
              setScopeFilter("all");
              setAiSummary(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              scopeFilter === "all"
                ? "bg-slate-700 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Consolidado
          </button>
        </div>

        {/* Period Selector: Year & Months */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-[#16152a] border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#16152a] p-1 rounded-xl border border-slate-200 dark:border-zinc-700 text-[11px] overflow-x-auto">
            {months.map((m) => (
              <button
                key={String(m.value)}
                type="button"
                onClick={() => setSelectedMonth(m.value as any)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                  selectedMonth === m.value
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16152a] p-1 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "dashboard"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Métricas & KPIs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "activities"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Quadro de Entregas ({filteredTasks.length})
          </button>
          {aiSummary && (
            <button
              type="button"
              onClick={() => setActiveTab("ai_summary")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                activeTab === "ai_summary"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-600 dark:text-purple-400 hover:text-purple-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Parecer Executivo IA
            </button>
          )}
        </div>
      </div>

      {/* 3. Security & Scope Banner */}
      <div className="no-print p-3 rounded-2xl bg-slate-50 dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 flex items-center gap-2 text-xs">
        <ShieldCheck
          className={`w-4 h-4 shrink-0 ${
            scopeFilter === "work"
              ? "text-emerald-500"
              : scopeFilter === "personal"
              ? "text-purple-500"
              : "text-amber-500"
          }`}
        />
        {scopeFilter === "work" && (
          <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">
            🔒 <strong>Escopo Profissional:</strong> Exibindo exclusivamente atividades institucionais de trabalho.
          </span>
        )}
        {scopeFilter === "personal" && (
          <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">
            👤 <strong>Escopo Pessoal:</strong> Exibindo rotinas pessoais, finanças particulares e estudos.
          </span>
        )}
        {scopeFilter === "all" && (
          <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">
            ⚠️ <strong>Modo Consolidado:</strong> Exibe tanto atividades de trabalho quanto compromissos pessoais.
          </span>
        )}
      </div>

      {/* PRINT HEADER: Appears only when printed or generated as PDF */}
      <div className="hidden print:block p-8 border-b-2 border-gray-800 text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider">
              MONTLIFE — RELATÓRIO OPERACIONAL DE ATIVIDADES
            </h1>
            <p className="text-sm text-gray-700 font-semibold mt-1">
              Prestação de Contas, Auditoria de SLA & Metrificação de Entregas
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Período: {selectedMonthLabel}</p>
            <p className="text-gray-600">
              Contexto: {scopeFilter === "work" ? "Trabalho" : scopeFilter === "personal" ? "Pessoal" : "Consolidado"}
            </p>
            <p className="text-gray-500">
              Emitido em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Main Body Content */}
      <div className="space-y-6">
        {/* TAB 1: DASHBOARD METRICS */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Primary 4-KPI Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* 1. QUANTIDADE TOTAL */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Total de Demandas
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
                    {selectedYear}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{total}</span>
                  <span className="text-xs text-slate-400">demandas</span>
                </div>
                {/* Breakdown by Type */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span title="Tarefas">{tasksCount} tarefas</span>
                  <span>•</span>
                  <span title="Atividades">{activitiesCount} ativ.</span>
                  <span>•</span>
                  <span title="Lembretes">{remindersCount} lemb.</span>
                </div>
              </div>

              {/* 2. CONCLUÍDAS */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Concluídas
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{completedPct}%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{completedCount}</span>
                  <span className="text-xs text-slate-400">entregas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                  />
                </div>
              </div>

              {/* 3. EM ANDAMENTO / PENDENTES */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Em Andamento
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">{inProgressPct}%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{inProgressCount}</span>
                  <span className="text-xs text-slate-400">ativas ({activeRunningCount} executando)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${inProgressPct}%` }}
                  />
                </div>
              </div>

              {/* 4. CANCELADAS / DESCARTADAS */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Canceladas
                  </span>
                  <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">{canceledPct}%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">{canceledCount}</span>
                  <span className="text-xs text-slate-400">descartadas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${canceledPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* SLA Performance & Categories Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SLA Performance Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Auditoria de Cumprimento de SLA
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {onTimePct}% Assertividade
                  </span>
                </div>

                <div className="space-y-3">
                  {/* On time */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        No Prazo Original (Sem extensão)
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {onTimeCount} ({onTimePct}%)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${onTimePct}%` }} />
                    </div>
                  </div>

                  {/* Extended */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Com Prazo Prorrogado (Gerenciado)
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {extendedAndCompletedCount} ({extendedPct}%)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${extendedPct}%` }} />
                    </div>
                  </div>

                  {/* Breached */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Entregues com Atraso
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {breachedCount} ({breachedPct}%)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${breachedPct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-slate-400">
                  💡 <strong>Índice de Confiabilidade:</strong> {onTimePct + extendedPct}% das tarefas concluídas tiveram seus prazos devidamente gerenciados e cumpridos.
                </div>
              </div>

              {/* Category Volume Breakdown */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Distribuição por Categoria
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">{categoryCounts.length} categorias</span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {categoryCounts.map(([cat, count]) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[220px]">
                            {cat}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-purple-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITIES / DELIVERIES LIST */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Quadro Completo de Entregas & Atividades ({filteredTasks.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Listagem auditável de todas as demandas do período selecionado ({selectedMonthLabel}).
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white dark:bg-[#141520] rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
                  <Layers className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
                  <p className="text-xs">Nenhuma atividade registrada para o período e escopo selecionados.</p>
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-2 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getItemTypeBadge(t.item_type)}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                          {t.category}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                          {t.priority}
                        </span>
                        {t.status === "COMPLETED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Concluída
                          </span>
                        ) : t.status === "CANCELED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            Cancelada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Em Aberto
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        <span>Criada: {format(parseISO(t.created_at), "dd/MM/yyyy")}</span>
                        {t.completed_at && <span>• Concluída: {format(parseISO(t.completed_at), "dd/MM/yyyy")}</span>}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {t.title}
                    </h4>

                    {t.resolution_notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-slate-300">
                        <strong className="text-emerald-600 dark:text-emerald-400 block mb-1">
                          Resolução Técnica:
                        </strong>
                        <FormattedText text={t.resolution_notes} />
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
          <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Parecer Executivo da Inteligência Artificial (Google Gemini)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyEmailReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Parecer</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 leading-relaxed text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              <FormattedText text={aiSummary} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

