"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ListTodo,
  Activity,
  Bell,
  Briefcase,
  User,
  Sparkles,
  Loader2,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Paperclip,
  Trash2,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Plus,
  Lightbulb,
  ArrowRight,
  Repeat,
  RotateCcw,
} from "lucide-react";
import {
  ItemType,
  AccountType,
  Priority,
  TaskCategory,
  Task,
  TaskAttachment,
  ValidationStep,
  GeminiTriageResponse,
} from "@/types";
import { calculateSlaDueDate } from "@/lib/sla";
import { format } from "date-fns";
import { getAllCategories } from "@/lib/categories";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { AttachmentManager } from "@/components/AttachmentManager";
import { findSimilarTasks } from "@/lib/taskDeduplication";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  initialText?: string;
  initialType?: ItemType;
  availableCategories?: string[];
  existingTasks?: Task[];
  onSelectExistingTask?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
}

export function NewTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  initialText = "",
  initialType = "task",
  availableCategories,
  existingTasks = [],
  onSelectExistingTask,
  onTaskUpdated,
}: NewTaskModalProps) {
  const categoriesList = useMemo(() => {
    if (availableCategories && availableCategories.length > 0) return availableCategories;
    return getAllCategories();
  }, [availableCategories]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<ItemType>(initialType);
  const [accountType, setAccountType] = useState<AccountType>("work");
  const [category, setCategory] = useState<TaskCategory>("Suporte TI");
  const [priority, setPriority] = useState<Priority>("P3");
  const [dueDate, setDueDate] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Validation Steps (Checklist suggested by AI or custom)
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [newStepText, setNewStepText] = useState("");
  const [isAddingStep, setIsAddingStep] = useState(false);

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<GeminiTriageResponse | null>(null);

  // Deduplication & Recurrence detection state
  const [isSimilarityDismissed, setIsSimilarityDismissed] = useState(false);
  const [isRegisteringRecurrence, setIsRegisteringRecurrence] = useState(false);
  const [isReopeningTask, setIsReopeningTask] = useState(false);

  const similarMatches = useMemo(() => {
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length < 8 || cleanTitle.split(/\s+/).length < 2 || !existingTasks || existingTasks.length === 0) {
      return [];
    }
    return findSimilarTasks(cleanTitle, description, existingTasks, 0.65);
  }, [title, description, existingTasks]);

  const topSimilar =
    !isSimilarityDismissed && similarMatches.length > 0
      ? similarMatches[0]
      : null;

  const handleReopenSimilarTask = async () => {
    if (!topSimilar) return;
    setIsReopeningTask(true);
    try {
      const res = await fetch(`/api/tasks/${topSimilar.task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          status: "TODO",
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        if (onTaskUpdated) onTaskUpdated(data.task);
        if (onSelectExistingTask) onSelectExistingTask(data.task);
        onClose();
      }
    } catch (err) {
      console.error("Erro ao reabrir demanda:", err);
    } finally {
      setIsReopeningTask(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSimilarityDismissed(false);
      setSubmitError(null);
      if (initialText) {
        if (initialText.includes("\n") || initialText.length > 60) {
          setDescription(initialText);
          const firstLine = initialText.split("\n")[0].trim().substring(0, 80);
          setTitle(firstLine);
        } else {
          setTitle(initialText);
        }
      }
      setItemType(initialType);
      const defaultDate = calculateSlaDueDate("P3");
      try {
        setDueDate(format(new Date(defaultDate), "yyyy-MM-dd'T'HH:mm"));
      } catch {
        setDueDate(defaultDate.substring(0, 16));
      }
    } else {
      setTitle("");
      setDescription("");
      setAiSuggestions(null);
      setTagsInput("");
      setAttachments([]);
      setValidationSteps([]);
      setNewStepText("");
      setIsAddingStep(false);
      setIsSimilarityDismissed(false);
      setSubmitError(null);
    }
  }, [isOpen, initialText, initialType]);

  const handleAddValidationStep = () => {
    const clean = newStepText.trim();
    if (!clean) return;
    setValidationSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: clean,
        completed: false,
      },
    ]);
    setNewStepText("");
    setIsAddingStep(false);
  };

  const handleRemoveValidationStep = (id: string) => {
    setValidationSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateValidationStepText = (id: string, text: string) => {
    setValidationSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s))
    );
  };

  const handleClearValidationSteps = () => {
    setValidationSteps([]);
  };

  if (!isOpen) return null;

  const handlePriorityChange = (newP: Priority) => {
    setPriority(newP);
  };

  const handleAnalyzeWithAI = async () => {
    const textToAnalyze = `${title}\n${description}`.trim();
    if (!textToAnalyze || isAnalyzingAI) return;

    setIsAnalyzingAI(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: textToAnalyze, force_fresh_ai: true }),
      });
      const data = await res.json();
      if (data.success && data.triage) {
        const triage: GeminiTriageResponse = data.triage;
        setAiSuggestions(triage);
        setIsSimilarityDismissed(true);

        if (triage.refined_title) {
          setTitle(triage.refined_title);
        }

        if (triage.structured_description) {
          setDescription(triage.structured_description);
        }

        if (triage.validation_steps?.length) {
          setValidationSteps(
            triage.validation_steps.map((stepText, idx) => ({
              id: `step-${Date.now()}-${idx}`,
              text: stepText,
              completed: false,
            }))
          );
        }

        if (triage.item_type) {
          setItemType(triage.item_type);
        }

        if (triage.category) {
          setCategory(triage.category);
        }

        if (triage.priority) {
          setPriority(triage.priority);
        }

        if (triage.account_type) {
          setAccountType(triage.account_type);
        }

        if (triage.search_tags?.length) {
          setTagsInput(triage.search_tags.join(", "));
        }

        const targetDueDate = triage.extracted_due_date_iso || data.calculated_due_date;
        if (targetDueDate) {
          try {
            setDueDate(format(new Date(targetDueDate), "yyyy-MM-dd'T'HH:mm"));
          } catch {
            setDueDate(targetDueDate.substring(0, 16));
          }
        }
      }
    } catch (err) {
      console.error("Erro na análise da IA:", err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const parsedTags = tagsInput
        ? tagsInput
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean)
        : aiSuggestions?.search_tags || [];

      const finalDueDateIso = dueDate ? new Date(dueDate).toISOString() : calculateSlaDueDate(priority);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        account_type: accountType,
        item_type: itemType,
        category,
        priority,
        due_date: finalDueDateIso,
        tags: parsedTags,
        attachments,
        validation_steps: validationSteps,
        learning_resources: {
          youtube_videos: [],
          search_queries: [],
        },
      };

      const serializedPayload = JSON.stringify(payload);
      if (serializedPayload.length > 950_000) {
        setSubmitError(
          "Os anexos ou textos excedem o limite máximo de 950 KB por demanda. Remova ou reduza um arquivo antes de salvar."
        );
        return;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serializedPayload,
      });

      const data = await res.json();
      if (res.ok && data.success && data.task) {
        onTaskCreated(data.task);
        onClose();
      } else {
        setSubmitError(
          data?.error || "Não foi possível salvar a demanda. Verifique sua conexão e tente novamente."
        );
      }
    } catch (err) {
      console.error("Erro ao criar demanda:", err);
      setSubmitError("Erro de conexão ao salvar demanda no banco de dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border shrink-0 ${
              topSimilar && !isSimilarityDismissed
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            }`}>
              {topSimilar && !isSimilarityDismissed ? (
                <Lightbulb className="w-5 h-5 text-amber-500" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {topSimilar && !isSimilarityDismissed
                  ? "Demanda Semelhante / Existente Detectada"
                  : "Nova Demanda & Atividade"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {topSimilar && !isSimilarityDismissed
                  ? `Identificamos uma demanda existente com ${Math.round(topSimilar.similarityScore * 100)}% de similaridade.`
                  : "Cadastre solicitações com SLA, etapas de validação e anexos."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Tela Intersticial OU Formulário Completo */}
        {topSimilar && !isSimilarityDismissed ? (
          /* ========================================================= */
          /* 1. TELA INTERSTICIAL DE DEMANDA SEMELHANTE                */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left custom-scrollbar">
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 space-y-3 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Demanda Cadastrada Anteriormente
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                    topSimilar.task.status === "COMPLETED"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  }`}
                >
                  {topSimilar.task.status === "COMPLETED" ? "✓ Já Concluída" : "⏳ Em Aberto"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#12131d] border border-amber-200/70 dark:border-zinc-800 space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {topSimilar.task.title}
                </h4>

                {topSimilar.task.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {topSimilar.task.description.replace(/\*\*/g, "")}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>Categoria: <strong className="text-slate-700 dark:text-slate-200">{topSimilar.task.category}</strong></span>
                  <span>•</span>
                  <span>Prioridade: <strong className="text-purple-600 dark:text-purple-400">{topSimilar.task.priority}</strong></span>
                </div>

                {topSimilar.hasPreviousResolution && topSimilar.previousResolutionNotes && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-700 dark:text-zinc-300">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-0.5">
                      ✓ Procedimento / Resolução Anterior:
                    </span>
                    <span className="italic">{topSimilar.previousResolutionNotes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Demanda sendo digitada */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#10111a] border border-slate-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sua nova solicitação:
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 italic">
                &quot;{title}&quot;
              </p>
            </div>

            {/* 3 Ações Solicitadas: Recorrência, Reabrir ou Criação Independente */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Como deseja prosseguir com esta demanda?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Botão 1: Registrar Recorrência */}
                <button
                  type="button"
                  disabled={isRegisteringRecurrence}
                  onClick={async () => {
                    setIsRegisteringRecurrence(true);
                    try {
                      const res = await fetch(`/api/tasks/${topSimilar.task.id}/recurrence`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          notes: `Nova ocorrência registrada na criação de demanda: "${title}"`,
                          method: topSimilar.previousResolutionNotes || undefined,
                          reopen_status: topSimilar.task.status === "COMPLETED" ? undefined : topSimilar.task.status,
                        }),
                      });
                      const data = await res.json();
                      if (data.success && data.task) {
                        if (onTaskUpdated) onTaskUpdated(data.task);
                        if (onSelectExistingTask) onSelectExistingTask(data.task);
                        onClose();
                      }
                    } catch (err) {
                      console.error("Erro ao registrar reincidência:", err);
                    } finally {
                      setIsRegisteringRecurrence(false);
                    }
                  }}
                  className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-left transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    {isRegisteringRecurrence ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Repeat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:rotate-180 transition-transform" />
                    )}
                    <span>Registrar Recorrência</span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 leading-tight">
                    Incrementa contador (+1x) na demanda existente mantendo histórico unificado.
                  </p>
                </button>

                {/* Botão 2: Reabrir Demanda */}
                <button
                  type="button"
                  disabled={isReopeningTask}
                  onClick={handleReopenSimilarTask}
                  className="p-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-left transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">
                    {isReopeningTask ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:-rotate-90 transition-transform" />
                    )}
                    <span>Reabrir Demanda</span>
                  </div>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-400 leading-tight">
                    {topSimilar.task.status === "COMPLETED"
                      ? "Retorna o status para 'A Fazer' para execução imediata."
                      : "Abre a demanda existente em aberto para edição."}
                  </p>
                </button>

                {/* Botão 3: Continuar Criação Independente */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsSimilarityDismissed(true);
                    // Dispara a IA para estruturar título e descrição concisa em texto corrido se ainda não sintetizado
                    if (!aiSuggestions && (title.trim() || description.trim())) {
                      await handleAnalyzeWithAI();
                    }
                  }}
                  className="p-3 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-left transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                    <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-125 transition-transform" />
                    <span>Criação Independente</span>
                  </div>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 leading-tight">
                    Ignorar similaridade e avançar para cadastrar como nova demanda avulsa com auxílio da IA.
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 2. FORMULÁRIO COMPLETO DE CRIAÇÃO                         */
          /* ========================================================= */
          <form
            id="new-task-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left custom-scrollbar"
          >

          {/* Tipo de Item & Contexto da Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo de Item */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                1. Tipo de Registro:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-[#0c0d13] rounded-xl border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setItemType("task")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    itemType === "task"
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Tarefa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType("activity")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    itemType === "activity"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Atividade</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType("reminder")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    itemType === "reminder"
                      ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Lembrete</span>
                </button>
              </div>
            </div>

            {/* Contexto: Trabalho vs Pessoal */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Conta & Contexto:
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#0c0d13] rounded-xl border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAccountType("work")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    accountType === "work"
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Trabalho</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("personal")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    accountType === "personal"
                      ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Pessoal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Título da Demanda */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              2. Título da Demanda:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ajuste de relatórios no TOTVS RM / Reunião de equipe..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                3. Detalhes / Conteúdo da Mensagem:
              </label>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzingAI || (!title.trim() && !description.trim())}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all disabled:opacity-40 cursor-pointer"
                title="A IA analisa o texto para sugerir título, categoria, prioridade e tags sem apagar seu texto"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Sugerir Metadados com IA</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cole aqui o e-mail completo, mensagem encaminhada, orientações recebidas ou anotações detalhadas..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Pontos de Validação & Etapas Sugeridas pela IA */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Pontos de Validação & Etapas de Conclusão:
                </label>
              </div>

              <div className="flex items-center gap-2">
                {validationSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearValidationSteps}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Ignorar Sugestões
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddingStep(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Inserir Etapa
                </button>
              </div>
            </div>

            {validationSteps.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Clique em <strong className="text-indigo-600 dark:text-indigo-400">"Sugerir Metadados com IA"</strong> acima para gerar automaticamente as etapas de execução, ou adicione etapas manuais para guiar a finalização.
              </p>
            ) : (
              <div className="space-y-1.5 pt-1">
                {validationSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 group"
                  >
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={step.text}
                      onChange={(e) => handleUpdateValidationStepText(step.id, e.target.value)}
                      className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-hidden focus:text-indigo-600 dark:focus:text-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveValidationStep(step.id)}
                      className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                      title="Excluir esta etapa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isAddingStep && (
              <div className="flex items-center gap-2 pt-1.5 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Descreva a etapa ou teste..."
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddValidationStep())}
                  className="flex-1 text-xs p-2 rounded-xl bg-white dark:bg-[#0c0d13] border border-indigo-300 dark:border-indigo-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddValidationStep}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingStep(false);
                    setNewStepText("");
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Categorias & Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Categoria Combobox */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Categoria Dinâmica:
              </label>
              <CategoryCombobox
                categories={categoriesList}
                value={category}
                onChange={setCategory}
              />
            </div>

            {/* Prioridade & SLA */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Prioridade & Nível SLA:
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-[#0c0d13] rounded-xl border border-slate-200 dark:border-zinc-800">
                {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => {
                  const isSel = priority === p;
                  let colorClass = "text-slate-600 dark:text-slate-400";
                  if (isSel) {
                    if (p === "P1") colorClass = "bg-rose-500 text-white shadow-sm";
                    else if (p === "P2") colorClass = "bg-amber-500 text-white shadow-sm";
                    else if (p === "P3") colorClass = "bg-indigo-600 text-white shadow-sm";
                    else colorClass = "bg-slate-700 text-white shadow-sm";
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePriorityChange(p)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all ${colorClass}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prazo Limite (Data/Hora) & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Prazo Limite / Agendamento:
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Tags Técnicas (Separadas por vírgula):
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="totvs, financeiro, biblioteca..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Anexos e Links Externos Reutilizável */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <AttachmentManager
              attachments={attachments}
              onChange={setAttachments}
              stage="creation"
              label="4. Anexos de Arquivos & Links Externos (Opcional)"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
              {submitError}
            </div>
          )}
        </form>
      )}

      {/* Footer Actions - Visible when filling form */}
        {(!topSimilar || isSimilarityDismissed) && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="new-task-form"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando Demanda...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Criar Demanda</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
