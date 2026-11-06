"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  PieChart,
  Briefcase,
  User,
  Printer,
  Copy,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  Loader2,
  Layers,
  XCircle,
  ListTodo,
  Activity,
  Bell,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Task, AccountType, ItemType } from "@/types";
import { parseISO, getYear, getMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FormattedText } from "@/components/FormattedText";
import { MontLifeLogo } from "@/components/MontLifeLogo";

interface ReportsViewProps {
  tasks: Task[];
  accountFilter?: "all" | string;
  onBackToTasks?: () => void;
}

export function ReportsView({ tasks, accountFilter = "all", onBackToTasks }: ReportsViewProps) {
  // Period filter states: "ALL" represents "Todos os anos" (Compilado Geral)
  const [selectedYear, setSelectedYear] = useState<number | "ALL">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL");
  
  // Scope filter is derived from the active workspace in the sidebar
  const scopeFilter: "all" | "work" | "personal" = useMemo(() => {
    const f = (accountFilter || "all").toLowerCase().trim();
    if (f === "work" || f.includes("trab") || f.includes("notre") || f.includes("haferreira")) return "work";
    if (f === "personal" || f.includes("pess") || f.includes("hellen")) return "personal";
    return "all";
  }, [accountFilter]);

  // Executive AI summary state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "ai_summary">("dashboard");
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Accordion state for activities list
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpand = (id: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Editable Manager / Gestor Responsável state (persisted in localStorage)
  const [managerName, setManagerName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("montlife_report_manager") || "Hellen Ferreira";
    }
    return "Hellen Ferreira";
  });

  const handleManagerNameChange = (name: string) => {
    setManagerName(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("montlife_report_manager", name);
    }
  };

  // Dynamically extract available years from all tasks
  const availableYears = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const yearSet = new Set<number>([currentYr, currentYr - 1]);
    tasks.forEach((t) => {
      const dateStr = t.created_at || t.original_due_date || t.current_due_date;
      if (dateStr) {
        try {
          const y = getYear(parseISO(dateStr));
          if (!isNaN(y) && y > 2000 && y < 2100) {
            yearSet.add(y);
          }
        } catch {
          // ignore invalid
        }
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [tasks]);

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

  const selectedMonthLabel = useMemo(() => {
    if (selectedYear === "ALL") {
      return selectedMonth === "ALL"
        ? "Todos os Anos (Compilado Geral)"
        : `${months.find((m) => m.value === selectedMonth)?.label} (Todos os Anos)`;
    }
    return selectedMonth === "ALL"
      ? `Ano Completo de ${selectedYear}`
      : `${months.find((m) => m.value === selectedMonth)?.label}/${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  // Unified Work vs Personal task classifier matching LeftTasksQuadrant
  const isWorkTask = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.transferred_to === "work") return true;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    const acc = (t.account_type || "").toLowerCase().trim();
    const email = (t.account_email || "").toLowerCase().trim();
    if (acc === "personal" || acc === "pessoal" || email.includes("hellen")) return false;
    return true; // Default is corporate/work
  };

  // Filter tasks strictly according to scope (work vs personal vs all) and period
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Strict Scope isolation
      if (scopeFilter === "work" && !isWorkTask(t)) {
        return false;
      }
      if (scopeFilter === "personal" && isWorkTask(t)) {
        return false;
      }

      // 2. Year & Month period
      if (selectedYear !== "ALL" || selectedMonth !== "ALL") {
        try {
          const dateStr = t.created_at || t.original_due_date || t.current_due_date;
          if (dateStr) {
            const d = parseISO(dateStr);
            if (!isNaN(d.getTime())) {
              if (selectedYear !== "ALL" && getYear(d) !== selectedYear) return false;
              if (selectedMonth !== "ALL" && getMonth(d) !== selectedMonth) return false;
            } else if (selectedYear !== "ALL") {
              return false;
            }
          } else if (selectedYear !== "ALL") {
            return false;
          }
        } catch {
          if (selectedYear !== "ALL") return false;
        }
      }

      return true;
    });
  }, [tasks, selectedYear, selectedMonth, scopeFilter]);

  // Core KPI metrics computation
  const total = filteredTasks.length;
  const completed = filteredTasks.filter((t) => t.status === "COMPLETED");
  const completedCount = completed.length;

  const canceledList = filteredTasks.filter((t) => t.status === "CANCELED");
  const canceledCount = canceledList.length;

  // In-progress accounts for all active open tasks (TRIAGE, TODO, IN_PROGRESS, WAITING)
  const inProgressList = filteredTasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
  );
  const inProgressCount = inProgressList.length;
  const activeRunningCount = filteredTasks.filter((t) => t.status === "IN_PROGRESS").length;

  const tasksCount = filteredTasks.filter((t) => (t.item_type || "task") === "task").length;
  const activitiesCount = filteredTasks.filter((t) => t.item_type === "activity").length;
  const remindersCount = filteredTasks.filter((t) => t.item_type === "reminder").length;

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgressCount / total) * 100) : 0;
  const canceledPct = total > 0 ? Math.round((canceledCount / total) * 100) : 0;

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

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTasks) {
      map[t.category] = (map[t.category] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTasks]);

  // AI Executive Summary Generator
  const handleGenerateAiSummary = async () => {
    if (filteredTasks.length === 0) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/report/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: filteredTasks,
          period_label: selectedMonthLabel,
          account_type: scopeFilter,
        }),
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setAiSummary(data.summary);
        setActiveTab("ai_summary");
      }
    } catch (err) {
      console.error("Failed to generate AI summary:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyEmailReport = () => {
    const lines = [
      `MONTLIFE — RELATÓRIO OPERACIONAL DE ATIVIDADES`,
      `Período: ${selectedMonthLabel} | Contexto: ${scopeFilter === "work" ? "Trabalho" : scopeFilter === "personal" ? "Pessoal" : "Consolidado"}`,
      `Gestor / Responsável: ${managerName}`,
      `Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      `--------------------------------------------------`,
      `INDICADORES PRINCIPAIS:`,
      `• Total de Demandas Registradas: ${total}`,
      `• Entregues / Concluídas: ${completedCount} (${completedPct}%)`,
      `• Em Andamento / Abertas: ${inProgressCount} (${inProgressPct}%)`,
      `• Canceladas: ${canceledCount} (${canceledPct}%)`,
      ``,
      `AUDITORIA DE SLA:`,
      `• Entregas no Prazo Original: ${onTimeCount} (${onTimePct}%)`,
      `• Prazos Prorrogados (Gerenciados): ${extendedAndCompletedCount} (${extendedPct}%)`,
      `• Entregas com Atraso: ${breachedCount} (${breachedPct}%)`,
      `• Índice de Confiabilidade: ${onTimePct + extendedPct}%`,
      `--------------------------------------------------`,
    ];

    if (aiSummary) {
      lines.push(
        `PARECER EXECUTIVO (INTELIGÊNCIA ARTIFICIAL):`,
        aiSummary,
        `--------------------------------------------------`
      );
    }

    lines.push(`PRINCIPAIS ENTREGAS DO PERÍODO:`);
    filteredTasks.slice(0, 25).forEach((t, i) => {
      lines.push(
        `${i + 1}. [${t.status === "COMPLETED" ? "CONCLUÍDO" : t.status === "CANCELED" ? "CANCELADO" : "ABERTO"}] ${t.title} (${t.category} - ${t.priority})`
      );
      if (t.resolution_notes) {
        lines.push(`   Resolução: ${t.resolution_notes}`);
      }
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Tipo",
      "Título",
      "Descrição",
      "Contexto",
      "Categoria",
      "Prioridade",
      "Status",
      "Data Criação",
      "Data Conclusão",
      "Prazo Original",
      "Prazo Atual",
      "Extensões",
      "Cumpriu SLA",
      "Resolução Técnica",
      "Motivo Cancelamento",
    ];

    const rows = filteredTasks.map((t) => [
      `"${t.id}"`,
      `"${t.item_type || "task"}"`,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${t.account_type}"`,
      `"${t.category}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.created_at}"`,
      `"${t.completed_at || ""}"`,
      `"${t.original_due_date}"`,
      `"${t.current_due_date}"`,
      `"${t.extension_count || 0}"`,
      `"${t.met_original_sla === true ? "Sim" : t.met_original_sla === false ? "Não" : "N/A"}"`,
      `"${(t.resolution_notes || "").replace(/"/g, '""')}"`,
      `"${(t.cancel_reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `montlife-relatorio-${scopeFilter}-${selectedYear}-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getItemTypeBadge = (itemType?: ItemType) => {
    switch (itemType) {
      case "reminder":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Bell className="w-2.5 h-2.5" /> Lembrete
          </span>
        );
      case "activity":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Activity className="w-2.5 h-2.5" /> Atividade
          </span>
        );
      case "task":
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <ListTodo className="w-2.5 h-2.5" /> Tarefa
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
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
              Painel analítico de produtividade, auditoria de SLA e volume de entregas para apresentação.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Presentation Mode */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isPreviewMode
                ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20"
                : "border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700"
            }`}
            title="Alternar entre o painel interativo e a visualização executiva do relatório para apresentação"
          >
            {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreviewMode ? "Voltar ao Painel" : "Modo Apresentação"}</span>
          </button>

          {/* AI Executive Summary button */}
          <button
            type="button"
            onClick={handleGenerateAiSummary}
            disabled={isGeneratingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            title="Gerar parecer textual formal com Google Gemini"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingAi ? "Sintetizando..." : "Síntese com IA"}</span>
          </button>

          {/* Print / Generate Report Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Gerar e Imprimir Relatório Executivo (Visualização Limpa / PDF Nativo)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Gerar Relatório</span>
          </button>

          {/* Copy to Email */}
          <button
            type="button"
            onClick={handleCopyEmailReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
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

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
            title="Exportar planilha CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar: Year + Month + Sub-tabs (Tudo em uma única linha alinhada) */}
      <div className="no-print p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-2.5 overflow-x-auto custom-scrollbar flex-nowrap">
        {/* 1. Period Selector: Year (Compact Menu / Dropdown) + Month Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Year Select ("Menuzinho de Ano") */}
          <div className="relative shrink-0">
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              className="h-8 pl-2.5 pr-7 rounded-xl bg-slate-100 dark:bg-[#16152a] border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 shadow-xs cursor-pointer appearance-none transition-all"
              title="Filtrar por ano ou compilado geral"
            >
              <option value="ALL">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Selector Pills */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-[#16152a] rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0">
            {months.map((m) => (
              <button
                key={String(m.value)}
                type="button"
                onClick={() => setSelectedMonth(m.value as any)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                  selectedMonth === m.value
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. View Tabs (Métricas vs Lista) */}
        {!isPreviewMode && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#16152a] p-1 rounded-xl border border-slate-200 dark:border-zinc-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Métricas & SLA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activities")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "activities"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Lista de Atividades ({filteredTasks.length})
            </button>
            {aiSummary && (
              <button
                type="button"
                onClick={() => setActiveTab("ai_summary")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "ai_summary"
                    ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span>Parecer IA</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          EXECUTIVE PRESENTATION REPORT (RENDERED ON PRINT OR IN PREVIEW MODE)
         ========================================================================= */}
      {(isPreviewMode || typeof window !== "undefined") && (
        <div
          id="printable-report"
          className={`${
            isPreviewMode
              ? "block bg-white dark:bg-[#12131A] text-slate-900 dark:text-zinc-100 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-8 print:p-0 print:border-0 print:shadow-none print:bg-white print:text-black"
              : "hidden print:block text-black bg-white space-y-6"
          }`}
        >
          {/* Executive Header Banner */}
          <div className="border-b-2 border-slate-800 dark:border-zinc-700 print:border-black pb-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <MontLifeLogo size="sm" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 print:text-slate-600">
                    MontLife Platform &bull; Governança Operacional
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white print:text-black uppercase tracking-tight leading-tight">
                  Relatório Executivo de Operações & Entregas
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 print:text-slate-700 font-medium">
                  Auditoria de Produtividade, Cumprimento de Metas de SLA & Síntese Técnica de Demandas
                </p>
              </div>

              {/* Verified Seal */}
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 print:bg-slate-100 print:text-black print:border-slate-300 text-[11px] font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Documento Oficial Auditado</span>
                </div>
              </div>
            </div>

            {/* Metadata 4-Box Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Período Auditado
                </span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black block mt-0.5 truncate">
                  {selectedMonthLabel}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Escopo Operacional
                </span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black block mt-0.5 truncate">
                  {scopeFilter === "work"
                    ? "Corporativo (TOTVS RM & TI)"
                    : scopeFilter === "personal"
                    ? "Pessoal & Estudos"
                    : "Consolidado Geral"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Gestor Responsável
                </span>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => handleManagerNameChange(e.target.value)}
                  className="font-bold text-slate-900 dark:text-white print:text-black bg-transparent border-b border-dashed border-slate-300 dark:border-zinc-700 focus:border-indigo-500 outline-none w-full mt-0.5 text-xs transition-colors"
                  placeholder="Nome do Gestor"
                  title="Clique para editar o Gestor Responsável"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Data de Emissão
                </span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black block mt-0.5 truncate">
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive KPI Scorecard */}
          <div className="space-y-3 page-break-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 print:text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              1. Indicadores de Volume & Taxa de Conclusão
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 print:text-slate-600 block">
                  Total de Demandas
                </span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white print:text-black block">
                  {total}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  {tasksCount} tarefas &bull; {activitiesCount} atividades &bull; {remindersCount} lembretes
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/40 print:bg-emerald-50 print:border-emerald-200 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 print:text-emerald-800 block">
                  Entregas Concluídas
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-300 print:text-emerald-800">
                    {completedCount}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 print:text-emerald-700 font-mono">
                    ({completedPct}%)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 print:text-emerald-700 block">
                  Taxa global de resolução
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 print:bg-amber-50 print:border-amber-200 space-y-1">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 print:text-amber-800 block">
                  Demandas em Andamento
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-amber-800 dark:text-amber-300 print:text-amber-800">
                    {inProgressCount}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 print:text-amber-700 font-mono">
                    ({inProgressPct}%)
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 print:text-amber-700 block">
                  {activeRunningCount} em execução ativa
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-900/40 print:bg-purple-50 print:border-purple-200 space-y-1">
                <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 print:text-purple-800 block">
                  Assertividade de SLA
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-purple-800 dark:text-purple-300 print:text-purple-800">
                    {onTimePct}%
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 print:text-purple-700 block">
                  Cumpridas no prazo original
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SLA Audit & Categories Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 page-break-avoid">
            {/* SLA Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 print:text-slate-800 flex items-center justify-between">
                <span>Auditoria de Cumprimento de Prazos (SLA)</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{onTimePct + extendedPct}% Confiabilidade</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-zinc-800/80 print:border-slate-200">
                  <span className="text-slate-700 dark:text-zinc-300 print:text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    No Prazo Original (Sem prorrogação)
                  </span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-mono">{onTimeCount} ({onTimePct}%)</strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-zinc-800/80 print:border-slate-200">
                  <span className="text-slate-700 dark:text-zinc-300 print:text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Com Prazo Prorrogado (Gerenciado)
                  </span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-mono">{extendedAndCompletedCount} ({extendedPct}%)</strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-zinc-800/80 print:border-slate-200">
                  <span className="text-slate-700 dark:text-zinc-300 print:text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Entregues com Atraso
                  </span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-mono">{breachedCount} ({breachedPct}%)</strong>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-700 dark:text-zinc-300 print:text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Demandas Canceladas / Descartadas
                  </span>
                  <strong className="text-slate-900 dark:text-white print:text-black font-mono">{canceledCount} ({canceledPct}%)</strong>
                </div>
              </div>
            </div>

            {/* Top Workload Categories */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181926] border border-slate-200 dark:border-zinc-800 print:bg-slate-50 print:border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 print:text-slate-800 flex items-center justify-between">
                <span>Distribuição por Linha de Atuação / Sistema</span>
                <span className="text-slate-500 dark:text-zinc-400 font-mono">{categoryCounts.length} categorias</span>
              </h3>

              <div className="space-y-1.5 text-xs max-h-48 overflow-hidden">
                {categoryCounts.slice(0, 5).map(([cat, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-zinc-800/80 print:border-slate-200">
                      <span className="text-slate-800 dark:text-zinc-200 print:text-slate-800 font-medium truncate max-w-[200px]">{cat}</span>
                      <span className="font-mono text-slate-600 dark:text-zinc-400 print:text-slate-600 font-semibold">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: AI Executive Summary (If Available) */}
          {aiSummary ? (
            <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 print:bg-purple-50 print:border-purple-200 space-y-3 page-break-avoid">
              <div className="flex items-center gap-2 border-b border-purple-200 dark:border-purple-800/60 print:border-purple-200 pb-2">
                <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400 print:text-purple-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 print:text-purple-900">
                  Parecer Executivo & Diagnóstico com Inteligência Artificial
                </h3>
              </div>
              <div className="text-xs leading-relaxed text-slate-800 dark:text-zinc-200 print:text-slate-800 space-y-2">
                <FormattedText text={aiSummary} />
              </div>
            </div>
          ) : (
            <div className="no-print p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                  Deseja incluir parecer executivo automático no Relatório?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                  Gere a síntese com a IA antes de exportar para que ela apareça na apresentação impressa.
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Gerar Síntese</span>
              </button>
            </div>
          )}

          {/* Section 4: Comprehensive Analytical Delivery Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-zinc-700 print:border-slate-300 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 print:text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white print:bg-black" />
                4. Quadro Analítico de Demandas & Entregas do Período ({filteredTasks.length})
              </h2>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 print:text-slate-500">
                Auditoria Completa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-zinc-800 print:border-slate-300 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 dark:bg-[#181926] print:bg-slate-100 border-b border-slate-300 dark:border-zinc-700 print:border-slate-300">
                  <tr>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800 w-12 text-center">#</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800 w-24">Tipo</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800">Demanda / Escopo</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800 w-32">Categoria</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800 w-16 text-center">Pri.</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800 w-28 text-center">Status / SLA</th>
                    <th className="p-2.5 font-bold text-slate-800 dark:text-zinc-200 print:text-slate-800">Resolução / Solução Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 print:divide-slate-200">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 dark:text-zinc-400">
                        Nenhuma demanda registrada para os parâmetros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task, idx) => (
                      <tr key={task.id} className="page-break-avoid hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 print:hover:bg-transparent">
                        <td className="p-2.5 font-mono text-slate-500 dark:text-zinc-400 print:text-slate-500 text-center font-semibold">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 print:bg-slate-100 print:border-slate-300 print:text-black">
                            {task.item_type === "activity"
                              ? "Atividade"
                              : task.item_type === "reminder"
                              ? "Lembrete"
                              : "Tarefa"}
                          </span>
                        </td>
                        <td className="p-2.5 space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white print:text-black block leading-snug">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[11px] text-slate-600 dark:text-zinc-400 print:text-slate-600 line-clamp-2 leading-tight block">
                              {task.description.replace(/\*\*/g, "")}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium text-slate-700 dark:text-zinc-300 print:text-slate-700 text-[11px]">
                          {task.category}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-[11px] text-slate-800 dark:text-zinc-200 print:text-slate-800">
                          {task.priority}
                        </td>
                        <td className="p-2.5 text-center">
                          {task.status === "COMPLETED" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-300">
                              Concluída
                            </span>
                          ) : task.status === "CANCELED" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 print:bg-rose-100 print:text-rose-800 print:border-rose-300">
                              Cancelada
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 print:bg-amber-100 print:text-amber-800 print:border-amber-300">
                              Em Aberto
                            </span>
                          )}
                          {task.completed_at && (
                            <span className="block text-[10px] font-mono text-slate-500 dark:text-zinc-400 print:text-slate-500 mt-0.5">
                              {format(parseISO(task.completed_at), "dd/MM/yyyy")}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-700 dark:text-zinc-300 print:text-slate-700 leading-snug">
                          {task.resolution_notes ? (
                            <span className="text-slate-800 dark:text-zinc-200 print:text-slate-800">
                              {task.resolution_notes.replace(/\*\*/g, "")}
                            </span>
                          ) : task.cancel_reason ? (
                            <span className="text-rose-700 dark:text-rose-400 print:text-rose-700 font-medium italic">
                              Cancelada: {task.cancel_reason}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-500 italic">Em execução</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t-2 border-slate-300 dark:border-zinc-800 print:border-slate-300 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 print:text-slate-500 font-medium">
            <span>MontLife Platform &bull; Sistema Integrado de Produtividade & Operações</span>
            <span>Documento Oficial de Prestação de Contas &bull; Confidencial</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN-ONLY INTERACTIVE DASHBOARD VIEW (HIDDEN ON PRINT OR IN PREVIEW)
         ========================================================================= */}
      {!isPreviewMode && (
        <div className="no-print space-y-6">
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

                {/* 4. CANCELADAS */}
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
                  filteredTasks.map((t) => {
                    const isExpanded = Boolean(expandedTaskIds[t.id]);

                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTaskExpand(t.id)}
                        className={`p-4 rounded-2xl bg-white dark:bg-[#141520] border transition-all space-y-2.5 shadow-xs cursor-pointer select-none ${
                          isExpanded
                            ? "border-indigo-400 dark:border-indigo-500/70 ring-1 ring-indigo-500/20"
                            : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                        }`}
                        title="Clique para expandir/recolher a descrição da demanda"
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

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            <span>Criada: {format(parseISO(t.created_at), "dd/MM/yyyy")}</span>
                            {t.completed_at && (
                              <span>• Concluída: {format(parseISO(t.completed_at), "dd/MM/yyyy")}</span>
                            )}
                            <div className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-1">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {t.title}
                        </h4>

                        {/* Accordion: Displays ONLY the description when expanded */}
                        {isExpanded && (
                          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200/90 dark:border-zinc-800/90 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                              Descrição da Demanda
                            </span>
                            {t.description ? (
                              <FormattedText text={t.description} />
                            ) : (
                              <p className="italic text-slate-400 dark:text-zinc-500">
                                Nenhuma descrição detalhada registrada para esta demanda.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
      )}
    </div>
  );
}
