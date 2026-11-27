"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckSquare,
  StickyNote,
  BookOpen,
  Sunrise,
  Layers,
  ArrowUpRight,
  Check,
  Trash2,
  Wand2,
  BarChart3,
  Clock,
} from "lucide-react";
import {
  useWorkspace,
  isTaskMatchingWorkspace,
  isNoteMatchingWorkspace,
} from "@/context/WorkspaceContext";
import { FormattedText } from "@/components/FormattedText";
import { GeminiTriageResponse, TaskAiAssistResponse } from "@/types";
import { format } from "date-fns";

type AiToolId =
  | "briefing"
  | "triage"
  | "task_assist"
  | "note_extract"
  | "categorize"
  | "report_exec";

interface AiInteractionEntry {
  id: string;
  tool: AiToolId;
  prompt: string;
  title: string;
  summary: string;
  createdAt: string;
  source?: string;
  triageDraft?: {
    triage: GeminiTriageResponse;
    calculatedDueDate?: string;
    rawInput: string;
  };
  taskAssistPayload?: {
    taskId: string;
    assist: TaskAiAssistResponse;
  };
  referencedTaskIds?: string[];
  referencedNoteIds?: string[];
  confirmed?: boolean;
}

const HISTORY_KEY = "montlife_ai_workspace_history_v1";

export function AiAssistantWorkspace() {
  const {
    tasks,
    notes,
    accountFilter,
    openTaskInModule,
    openNoteInModule,
    handleTaskCreated,
    handleUpdateTaskFields,
    loadTasks,
    setUndoToast,
  } = useWorkspace();

  const [activeTool, setActiveTool] = useState<AiToolId>("triage");
  const [promptInput, setPromptInput] = useState("");
  const [selectedTargetTaskId, setSelectedTargetTaskId] = useState<string>("");
  const [selectedTargetNoteId, setSelectedTargetNoteId] = useState<string>("");
  const [assistMode, setAssistMode] = useState<"action_plan" | "diagnose" | "refine">(
    "action_plan"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<AiInteractionEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const pushHistory = (entry: AiInteractionEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const markConfirmed = (entryId: string) => {
    setHistory((prev) => {
      const next = prev.map((e) => (e.id === entryId ? { ...e, confirmed: true } : e));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const scopedTasks = useMemo(
    () =>
      tasks
        .filter((t) => isTaskMatchingWorkspace(t, accountFilter))
        .filter((t) => t.status !== "CANCELED"),
    [tasks, accountFilter]
  );

  const openTasks = useMemo(
    () => scopedTasks.filter((t) => t.status !== "COMPLETED"),
    [scopedTasks]
  );

  const scopedNotes = useMemo(
    () => notes.filter((n) => !n.archived && isNoteMatchingWorkspace(n, accountFilter)),
    [notes, accountFilter]
  );

  useEffect(() => {
    if (!selectedTargetTaskId && openTasks[0]) {
      setSelectedTargetTaskId(openTasks[0].id);
    }
  }, [openTasks, selectedTargetTaskId]);

  useEffect(() => {
    if (!selectedTargetNoteId && scopedNotes[0]) {
      setSelectedTargetNoteId(scopedNotes[0].id);
    }
  }, [scopedNotes, selectedTargetNoteId]);

  const tools: {
    id: AiToolId;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "triage",
      label: "Estruturar nova demanda",
      desc: "Converte texto livre em demanda completa (com confirmação)",
      icon: Sparkles,
    },
    {
      id: "briefing",
      label: "Briefing estratégico do dia",
      desc: "Analisa gargalos, SLA e prioridades reais do workspace",
      icon: Sunrise,
    },
    {
      id: "task_assist",
      label: "Diagnóstico & Plano em demanda",
      desc: "Gera plano de ação, diagnóstico técnico e consulta Wiki",
      icon: CheckSquare,
    },
    {
      id: "note_extract",
      label: "Extrair ações de anotação",
      desc: "Lê uma nota e propõe demandas estruturadas",
      icon: StickyNote,
    },
    {
      id: "categorize",
      label: "Reclassificar categorias",
      desc: "Organiza categorias das demandas abertas em lote",
      icon: Layers,
    },
    {
      id: "report_exec",
      label: "Síntese executiva de entregas",
      desc: "Gera parecer executivo com base nas demandas concluídas",
      icon: BarChart3,
    },
  ];

  const handleExecuteTool = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isRunning) return;
    setErrorMsg(null);
    setIsRunning(true);

    try {
      if (activeTool === "triage") {
        const text = promptInput.trim();
        if (!text) {
          setErrorMsg("Descreva a demanda ou pedido que deseja estruturar.");
          setIsRunning(false);
          return;
        }
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_input: text }),
        });
        const data = await res.json();
        if (!res.ok || !data.triage) {
          throw new Error(data?.error || "Não foi possível executar a triagem IA.");
        }
        const t: GeminiTriageResponse = data.triage;
        const similarIds: string[] = Array.isArray(data.similar_resolutions)
          ? data.similar_resolutions.map((s: { task_id: string }) => s.task_id)
          : [];
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "triage",
          prompt: text,
          title: t.refined_title || text,
          summary: `${t.structured_description || ""}\n\n**Prioridade sugerida:** ${
            t.priority
          } • **Categoria:** ${t.category || "Geral"}${
            t.validation_steps?.length
              ? `\n\n**Etapas sugeridas:**\n${t.validation_steps
                  .map((s) => `- ${s}`)
                  .join("\n")}`
              : ""
          }`,
          createdAt: new Date().toISOString(),
          source: data.ai_source,
          triageDraft: {
            triage: t,
            calculatedDueDate: data.calculated_due_date,
            rawInput: text,
          },
          referencedTaskIds: similarIds,
        });
        setPromptInput("");
      } else if (activeTool === "briefing") {
        const res = await fetch("/api/ai/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok || !data.briefing) {
          throw new Error(data?.error || "Falha ao gerar briefing IA.");
        }
        const b = data.briefing;
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "briefing",
          prompt: "Gerar briefing estratégico do dia",
          title: b.greeting || "Briefing Executivo do Dia",
          summary: `${b.focus_summary}\n\n${
            b.quick_tip ? `**Recomendação:** ${b.quick_tip}` : ""
          }`,
          createdAt: new Date().toISOString(),
          source: b.ai_source,
          referencedTaskIds: (b.top_priorities || []).map(
            (p: { task_id: string }) => p.task_id
          ),
        });
      } else if (activeTool === "task_assist") {
        if (!selectedTargetTaskId) {
          setErrorMsg("Selecione uma demanda para analisar.");
          setIsRunning(false);
          return;
        }
        const target = tasks.find((t) => t.id === selectedTargetTaskId);
        const res = await fetch(`/api/tasks/${selectedTargetTaskId}/ai-assist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: assistMode }),
        });
        const data = await res.json();
        if (!res.ok || !data.assist) {
          throw new Error(data?.error || "Falha ao executar assistente na demanda.");
        }
        const assist: TaskAiAssistResponse = data.assist;
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "task_assist",
          prompt: `${
            assistMode === "action_plan"
              ? "Plano de ação"
              : assistMode === "diagnose"
              ? "Diagnóstico técnico"
              : "Refinar escopo"
          } — ${target?.title || ""}`,
          title: assist.refined_title || target?.title || "Análise técnica",
          summary: `${assist.technical_guidance}${
            assist.validation_steps?.length
              ? `\n\n**Etapas sugeridas:**\n${assist.validation_steps
                  .map((s) => `- ${s}`)
                  .join("\n")}`
              : ""
          }`,
          createdAt: new Date().toISOString(),
          source: assist.ai_source,
          taskAssistPayload: { taskId: selectedTargetTaskId, assist },
          referencedTaskIds: [selectedTargetTaskId],
        });
      } else if (activeTool === "note_extract") {
        const note = scopedNotes.find((n) => n.id === selectedTargetNoteId);
        if (!note) {
          setErrorMsg("Selecione uma anotação para analisar.");
          setIsRunning(false);
          return;
        }
        const res = await fetch("/api/notes/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "organize",
            mode: "summary",
            title: note.title,
            content: note.content,
            checklist: note.checklist || [],
            category: note.category,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error || "Não foi possível analisar a anotação.");
        }
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "note_extract",
          prompt: `Analisar anotação: ${note.title || "Nota sem título"}`,
          title: data.suggested_title || note.title || "Resumo da Anotação",
          summary: data.ai_summary || data.organized_content || "Análise concluída.",
          createdAt: new Date().toISOString(),
          referencedNoteIds: [note.id],
        });
      } else if (activeTool === "categorize") {
        const res = await fetch("/api/tasks/ai-categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error || "Falha ao categorizar demandas.");
        }
        await loadTasks();
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "categorize",
          prompt: "Organizar categorias de demandas em lote",
          title: "Categorização Inteligente Concluída",
          summary:
            data.message || "As categorias das suas demandas foram padronizadas com IA.",
          createdAt: new Date().toISOString(),
          confirmed: true,
        });
      } else if (activeTool === "report_exec") {
        const completedCount = scopedTasks.filter((t) => t.status === "COMPLETED").length;
        const res = await fetch("/api/report/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodLabel: "Consolidado Geral",
            tasks: scopedTasks.slice(0, 60),
            metrics: {
              total: scopedTasks.length,
              completed: completedCount,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.summary) {
          throw new Error(data?.error || "Não foi possível gerar o resumo executivo.");
        }
        pushHistory({
          id: `ai-${Date.now()}`,
          tool: "report_exec",
          prompt: "Gerar síntese executiva das entregas",
          title: "Parecer Executivo IA",
          summary: data.summary,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado na IA.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirmCreateTriageTask = async (entry: AiInteractionEntry) => {
    if (!entry.triageDraft) return;
    const { triage, calculatedDueDate, rawInput } = entry.triageDraft;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw_input: rawInput,
        title: triage.refined_title || rawInput,
        description: triage.structured_description || "",
        account_type: triage.account_type || "work",
        item_type: triage.item_type || "task",
        category: triage.category || "Operações & Demandas",
        priority: triage.priority || "P3",
        due_date: calculatedDueDate || undefined,
        scheduled_start: triage.extracted_due_date_iso || null,
        scheduled_end: triage.extracted_end_date_iso || null,
        meet_link: triage.extracted_meet_link || null,
        tags: triage.search_tags || [],
        validation_steps: (triage.validation_steps || []).map((text, idx) => ({
          id: `step-${Date.now()}-${idx}`,
          text,
          completed: false,
        })),
      }),
    });
    const data = await res.json();
    if (data.success && data.task) {
      handleTaskCreated(data.task);
      markConfirmed(entry.id);
      setUndoToast({
        id: `ai-confirm-${data.task.id}`,
        message: "Demanda criada a partir do Assistente IA",
        detail: data.task.title,
        variant: "success",
      });
    }
  };

  const handleConfirmApplyTaskAssist = async (entry: AiInteractionEntry) => {
    if (!entry.taskAssistPayload) return;
    const { taskId, assist } = entry.taskAssistPayload;
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const patch: Record<string, unknown> = {};
    if (assist.structured_description) {
      patch.description = assist.structured_description;
    }
    if (assist.validation_steps?.length) {
      const existing = target.validation_steps || [];
      patch.validation_steps = [
        ...existing,
        ...assist.validation_steps.map((text, idx) => ({
          id: `step-ai-${Date.now()}-${idx}`,
          text,
          completed: false,
        })),
      ];
    }
    await handleUpdateTaskFields(taskId, patch);
    markConfirmed(entry.id);
    setUndoToast({
      id: `ai-apply-${taskId}`,
      message: "Sugestões aplicadas na demanda",
      detail: target.title,
      variant: "success",
    });
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-canvas">
      {/* Left Sidebar: AI Tools & Contexts */}
      <aside className="w-full lg:w-[290px] xl:w-[310px] shrink-0 bg-sidebar border-b lg:border-b-0 lg:border-r border-line p-4 overflow-y-auto space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
            <Sparkles className="w-4 h-4" />
            <span>Assistente IA Gemini</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            Ferramentas conectadas diretamente às suas demandas, anotações e Wiki técnica. Toda alteração só é aplicada após sua confirmação.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-1">
            Ferramentas disponíveis
          </p>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  setErrorMsg(null);
                }}
                className={`w-full text-left p-2.5 rounded-[10px] border transition-colors cursor-pointer flex items-start gap-2.5 ${
                  active
                    ? "bg-lavender-soft border-lavender-strong text-ink"
                    : "bg-surface border-line text-ink-muted hover:text-ink hover:bg-lavender-soft/45"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    active ? "text-brand" : "text-ink-muted"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">{tool.label}</p>
                  <p className="text-[11px] text-ink-muted leading-snug mt-0.5">
                    {tool.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Context Stats */}
        <div className="p-3 rounded-[10px] bg-surface border border-line space-y-1.5 text-[11px] text-ink-muted">
          <p className="font-semibold text-ink">Contexto ativo</p>
          <p className="font-mono">
            {openTasks.length} demandas abertas • {scopedNotes.length} notas
          </p>
          <p>
            Espaço:{" "}
            <strong className="text-ink">
              {accountFilter === "all"
                ? "Todos"
                : accountFilter === "personal"
                ? "Pessoal"
                : "Trabalho"}
            </strong>
          </p>
        </div>
      </aside>

      {/* Main Interaction & Structured Results Area */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Interactive Prompt / Tool Configuration Bar */}
        <form
          onSubmit={handleExecuteTool}
          className="p-4 sm:p-5 bg-surface border-b border-line space-y-3 shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm sm:text-base font-bold text-ink">
              {tools.find((t) => t.id === activeTool)?.label}
            </h1>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  if (typeof window !== "undefined") {
                    localStorage.removeItem(HISTORY_KEY);
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Limpar histórico
              </button>
            )}
          </div>

          {activeTool === "triage" && (
            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Cole um e-mail, mensagem ou descreva livremente o que precisa ser feito. A IA vai estruturar título, prioridade, SLA, categoria e etapas para sua aprovação..."
              className="w-full p-3 rounded-[10px] ml-input text-xs resize-none"
            />
          )}

          {activeTool === "task_assist" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={selectedTargetTaskId}
                onChange={(e) => setSelectedTargetTaskId(e.target.value)}
                className="sm:col-span-2 h-9 px-3 rounded-[9px] ml-input text-xs font-medium"
              >
                {openTasks.length === 0 && (
                  <option value="">Nenhuma demanda aberta</option>
                )}
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.priority}] {t.title}
                  </option>
                ))}
              </select>
              <select
                value={assistMode}
                onChange={(e) =>
                  setAssistMode(
                    e.target.value as "action_plan" | "diagnose" | "refine"
                  )
                }
                className="h-9 px-3 rounded-[9px] ml-input text-xs font-medium"
              >
                <option value="action_plan">Gerar Plano de Ação</option>
                <option value="diagnose">Diagnóstico + Wiki</option>
                <option value="refine">Refinar Descrição</option>
              </select>
            </div>
          )}

          {activeTool === "note_extract" && (
            <select
              value={selectedTargetNoteId}
              onChange={(e) => setSelectedTargetNoteId(e.target.value)}
              className="w-full h-9 px-3 rounded-[9px] ml-input text-xs font-medium"
            >
              {scopedNotes.length === 0 && (
                <option value="">Nenhuma anotação disponível</option>
              )}
              {scopedNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title || n.content.slice(0, 60) || "Nota sem título"}
                </option>
              ))}
            </select>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-[9px] px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isRunning ? "Processando com Gemini..." : "Executar ferramenta"}</span>
            </button>
          </div>
        </form>

        {/* Results & Interaction History Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-[12px] bg-lavender-soft border border-line text-brand flex items-center justify-center">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-sm font-bold text-ink">
                  Pronto para auxiliar sua operação
                </h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Escolha uma ferramenta à esquerda e execute. Os resultados aparecem estruturados aqui com links para suas demandas, notas e Wiki — e ações de criação exigem sua confirmação.
                </p>
              </div>
            </div>
          ) : (
            history.map((entry) => (
              <article
                key={entry.id}
                className="ml-card p-5 space-y-3.5 max-w-4xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[11px] text-ink-muted truncate">
                      {entry.prompt}
                    </p>
                    <h3 className="text-sm font-bold text-ink">{entry.title}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-muted shrink-0">
                    <Clock className="w-3 h-3" />
                    {format(new Date(entry.createdAt), "HH:mm")}
                  </span>
                </div>

                <div className="text-xs sm:text-[13px] text-ink leading-relaxed">
                  <FormattedText text={entry.summary} />
                </div>

                {/* Clickable References to Tasks & Notes */}
                {((entry.referencedTaskIds?.length || 0) > 0 ||
                  (entry.referencedNoteIds?.length || 0) > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(entry.referencedTaskIds || []).map((tid) => {
                      const found = tasks.find((t) => t.id === tid);
                      if (!found) return null;
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => openTaskInModule(found, "/demandas")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-[11px] font-medium text-ink cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3 text-brand" />
                          <span className="truncate max-w-[240px]">
                            {found.title}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-brand" />
                        </button>
                      );
                    })}
                    {(entry.referencedNoteIds || []).map((nid) => {
                      const found = notes.find((n) => n.id === nid);
                      if (!found) return null;
                      return (
                        <button
                          key={nid}
                          type="button"
                          onClick={() => openNoteInModule(found.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-[11px] font-medium text-ink cursor-pointer"
                        >
                          <StickyNote className="w-3 h-3 text-brand" />
                          <span className="truncate max-w-[240px]">
                            {found.title || "Nota"}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-brand" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Explicit Confirmation Actions */}
                {entry.triageDraft && (
                  <div className="pt-2.5 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-muted">
                      {entry.confirmed
                        ? "Demanda criada com sucesso no workspace."
                        : "Revise os dados acima e confirme para criar a demanda:"}
                    </span>
                    <button
                      type="button"
                      disabled={entry.confirmed}
                      onClick={() => handleConfirmCreateTriageTask(entry)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-xs font-semibold transition-colors cursor-pointer ${
                        entry.confirmed
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default"
                          : "bg-brand hover:bg-brand-hover text-brand-fg"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {entry.confirmed ? "Demanda criada" : "Confirmar e criar demanda"}
                      </span>
                    </button>
                  </div>
                )}

                {entry.taskAssistPayload && (
                  <div className="pt-2.5 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-muted">
                      {entry.confirmed
                        ? "Sugestões aplicadas na demanda."
                        : "Deseja aplicar descrição/etapas sugeridas na demanda?"}
                    </span>
                    <button
                      type="button"
                      disabled={entry.confirmed}
                      onClick={() => handleConfirmApplyTaskAssist(entry)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-xs font-semibold transition-colors cursor-pointer ${
                        entry.confirmed
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default"
                          : "bg-brand hover:bg-brand-hover text-brand-fg"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {entry.confirmed ? "Aplicado" : "Aplicar na demanda"}
                      </span>
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

