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
import { ScheduleReminderFields } from "@/components/ScheduleReminderFields";
import { MediaLightboxModal, MediaItem } from "@/components/modals/MediaLightboxModal";
import { findSimilarTasks, SimilarTaskMatch } from "@/lib/taskDeduplication";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  initialText?: string;
  initialType?: ItemType;
  initialDate?: Date | null;
  availableCategories?: string[];
  existingTasks?: Task[];
  onSelectExistingTask?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
}

function buildRawInputForAI(rawTitle: string, rawDescription: string): string {
  const t = rawTitle.trim();
  const d = rawDescription.trim();
  if (!t) return d;
  if (!d) return t;
  const tNorm = t.replace(/\.{3}$/, "").trim().toLowerCase();
  const dNorm = d.toLowerCase();
  if (dNorm === tNorm || dNorm.startsWith(tNorm)) return d;
  if (tNorm.startsWith(dNorm)) return t;
  return `${t}\n${d}`;
}

export function NewTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  initialText = "",
  initialType = "task",
  initialDate = null,
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
  const [endDate, setEndDate] = useState<string>("");
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(30);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Validation Steps (Checklist suggested by AI or custom)
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [newStepText, setNewStepText] = useState("");
  const [isAddingStep, setIsAddingStep] = useState(false);

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<GeminiTriageResponse | null>(null);
  const [autoEnhanceWithAI, setAutoEnhanceWithAI] = useState(true);
  const [hasAiEnhancedDraft, setHasAiEnhancedDraft] = useState(false);
  const [aiSource, setAiSource] = useState<"gemini" | "cache" | "fallback" | null>(null);
  const [originalRawInput, setOriginalRawInput] = useState("");

  // Track which fields user manually changed before AI runs on submit
  const touchedFieldsRef = useRef<{
    itemType: boolean;
    accountType: boolean;
    category: boolean;
    priority: boolean;
    dueDate: boolean;
    endDate: boolean;
    reminder: boolean;
    validationSteps: boolean;
  }>({
    itemType: false,
    accountType: false,
    category: false,
    priority: false,
    dueDate: false,
    endDate: false,
    reminder: false,
    validationSteps: false,
  });

  // Deduplication & Recurrence detection state
  const [isSimilarityDismissed, setIsSimilarityDismissed] = useState(false);
  const [showSimilarityScreen, setShowSimilarityScreen] = useState(false);
  const [serverSimilarMatch, setServerSimilarMatch] = useState<SimilarTaskMatch | null>(null);
  const [isRegisteringRecurrence, setIsRegisteringRecurrence] = useState(false);
  const [isReopeningTask, setIsReopeningTask] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  const similarMatches = useMemo(() => {
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const probeTitle = cleanTitle || cleanDesc.split(/\n/)[0]?.slice(0, 90) || "";
    if (!probeTitle || probeTitle.length < 8 || probeTitle.split(/\s+/).length < 2 || !existingTasks || existingTasks.length === 0) {
      return [];
    }
    return findSimilarTasks(probeTitle, cleanDesc, existingTasks, 0.65);
  }, [title, description, existingTasks]);

  const rawTopSimilar = similarMatches[0] || serverSimilarMatch || null;
  const topSimilar = !isSimilarityDismissed ? rawTopSimilar : null;

  const isInterstitialVisible = Boolean(showSimilarityScreen && topSimilar);

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
      setShowSimilarityScreen(false);
      setServerSimilarMatch(null);
      setSubmitError(null);
      setAiError(null);
      setAutoEnhanceWithAI(true);
      setHasAiEnhancedDraft(false);
      setAiSource(null);
      touchedFieldsRef.current = {
        itemType: false,
        accountType: false,
        category: false,
        priority: false,
        dueDate: false,
        endDate: false,
        reminder: false,
        validationSteps: false,
      };
      if (initialText) {
        const cleanInitial = initialText.trim();
        setOriginalRawInput(cleanInitial);
        if (cleanInitial.includes("\n") || cleanInitial.length > 60) {
          setDescription(cleanInitial);
          setTitle("");
        } else {
          setTitle(cleanInitial);
        }
      } else {
        setOriginalRawInput("");
      }
      setItemType(initialType);
      const baseStartDate = initialDate
        ? (() => {
            const d = new Date(initialDate);
            d.setHours(9, 0, 0, 0);
            return d;
          })()
        : new Date(calculateSlaDueDate("P3"));
      try {
        setDueDate(format(baseStartDate, "yyyy-MM-dd'T'HH:mm"));
      } catch {
        setDueDate(baseStartDate.toISOString().substring(0, 16));
      }
      if (initialType === "activity") {
        const defaultEnd = new Date(baseStartDate.getTime() + 60 * 60_000);
        setEndDate(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
        setReminderEnabled(true);
        setReminderMinutesBefore(30);
      } else {
        setEndDate("");
        setReminderEnabled(false);
        setReminderMinutesBefore(30);
      }
    } else {
      setTitle("");
      setDescription("");
      setAiSuggestions(null);
      setTagsInput("");
      setEndDate("");
      setReminderEnabled(false);
      setReminderMinutesBefore(30);
      setAttachments([]);
      setValidationSteps([]);
      setNewStepText("");
      setIsAddingStep(false);
      setIsSimilarityDismissed(false);
      setShowSimilarityScreen(false);
      setServerSimilarMatch(null);
      setSubmitError(null);
      setAiError(null);
      setHasAiEnhancedDraft(false);
      setAiSource(null);
      setOriginalRawInput("");
    }
  }, [isOpen, initialText, initialType, initialDate]);

  const handleAddValidationStep = () => {
    const clean = newStepText.trim();
    if (!clean) return;
    touchedFieldsRef.current.validationSteps = true;
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
    touchedFieldsRef.current.validationSteps = true;
    setValidationSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateValidationStepText = (id: string, text: string) => {
    touchedFieldsRef.current.validationSteps = true;
    setValidationSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s))
    );
  };

  const handleClearValidationSteps = () => {
    touchedFieldsRef.current.validationSteps = true;
    setValidationSteps([]);
  };

  if (!isOpen) return null;

  const handlePriorityChange = (newP: Priority) => {
    touchedFieldsRef.current.priority = true;
    setPriority(newP);
  };

  const formatDateForInput = (isoOrDate: string): string => {
    try {
      const d = new Date(isoOrDate);
      if (!isNaN(d.getTime())) {
        return format(d, "yyyy-MM-dd'T'HH:mm");
      }
    } catch {
      // ignore
    }
    return isoOrDate.substring(0, 16);
  };

  const runTriageOnDraft = async (opts?: { respectTouchedFields?: boolean }) => {
    const rawText = buildRawInputForAI(title, description);
    if (!rawText) return null;

    if (!originalRawInput) {
      setOriginalRawInput(rawText);
    }

    setIsAnalyzingAI(true);
    setAiError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: rawText, force_fresh_ai: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.triage) {
        setAiError(
          data?.error || "Não foi possível melhorar o texto com IA agora. Verifique e tente novamente."
        );
        return null;
      }

      const triage: GeminiTriageResponse = data.triage;
      const source: "gemini" | "cache" | "fallback" =
        data.optimization?.ai_source ||
        (data.optimization?.ai_used === false ? "fallback" : "gemini");

      setAiSuggestions(triage);
      setAiSource(source);
      if (source !== "fallback") {
        setHasAiEnhancedDraft(true);
      }

      const respect = Boolean(opts?.respectTouchedFields);
      const touched = touchedFieldsRef.current;

      const finalTitle = triage.refined_title?.trim() || title.trim();
      const finalDescription = triage.structured_description?.trim() || description.trim();
      const finalSteps: ValidationStep[] =
        triage.validation_steps?.length
          ? triage.validation_steps.map((stepText, idx) => ({
              id: `step-${Date.now()}-${idx}`,
              text: stepText.replace(/^\s*(?:\d+[.)]\s*|[-*•]+\s*)+/, "").trim(),
              completed: false,
            }))
          : validationSteps;

      const finalItemType = respect && touched.itemType ? itemType : (triage.item_type || itemType);
      const finalCategory = respect && touched.category ? category : (triage.category || category);
      const finalPriority = respect && touched.priority ? priority : (triage.priority || priority);
      const finalAccountType = respect && touched.accountType ? accountType : (triage.account_type || accountType);
      const finalTags =
        tagsInput.trim().length > 0
          ? tagsInput
              .split(",")
              .map((t) => t.trim().replace(/^#/, ""))
              .filter(Boolean)
          : triage.search_tags || [];
      const targetDueIso =
        respect && touched.dueDate && dueDate
          ? new Date(dueDate).toISOString()
          : triage.extracted_due_date_iso || data.calculated_due_date || calculateSlaDueDate(finalPriority);

      if (finalTitle) setTitle(finalTitle);
      if (finalDescription) setDescription(finalDescription);
      const shouldUpdateSteps =
        Boolean(triage.validation_steps?.length) &&
        (!respect || !touched.validationSteps || validationSteps.length === 0);
      if (shouldUpdateSteps) {
        setValidationSteps(finalSteps);
      }
      if (!respect || !touched.itemType) setItemType(finalItemType);
      if (!respect || !touched.category) setCategory(finalCategory);
      if (!respect || !touched.priority) setPriority(finalPriority);
      if (!respect || !touched.accountType) setAccountType(finalAccountType);
      if (!tagsInput.trim() && triage.search_tags?.length) {
        setTagsInput(triage.search_tags.join(", "));
      }
      if ((!respect || !touched.dueDate) && targetDueIso) {
        setDueDate(formatDateForInput(targetDueIso));
      }

      let targetEndIso: string | null = null;
      if (respect && touched.endDate && endDate) {
        targetEndIso = new Date(endDate).toISOString();
      } else if (triage.extracted_end_date_iso) {
        targetEndIso = triage.extracted_end_date_iso;
        if (!respect || !touched.endDate) {
          setEndDate(formatDateForInput(targetEndIso));
        }
      } else if (finalItemType === "activity" && targetDueIso) {
        const autoEnd = new Date(new Date(targetDueIso).getTime() + 60 * 60_000);
        if (!isNaN(autoEnd.getTime())) {
          targetEndIso = autoEnd.toISOString();
          if (!respect || !touched.endDate) {
            setEndDate(formatDateForInput(targetEndIso));
          }
        }
      }

      let nextReminderEnabled = reminderEnabled;
      if ((!respect || !touched.reminder) && (finalItemType === "activity" || Boolean(targetEndIso))) {
        nextReminderEnabled = true;
        setReminderEnabled(true);
        if (!respect || !touched.reminder) {
          setReminderMinutesBefore(30);
        }
      }

      if (triage.extracted_meet_link && !meetLink) {
        setMeetLink(triage.extracted_meet_link);
      }

      return {
        rawText,
        triage,
        source,
        similarTasksFromServer: Array.isArray(data.similar_tasks) ? data.similar_tasks : [],
        finalTitle,
        finalDescription,
        finalSteps: shouldUpdateSteps ? finalSteps : validationSteps,
        finalItemType,
        finalCategory,
        finalPriority,
        finalAccountType,
        finalTags,
        targetDueIso,
        targetEndIso,
        nextReminderEnabled,
      };
    } catch (err) {
      console.error("Erro na análise da IA:", err);
      setAiError("Falha de comunicação ao consultar a IA.");
      return null;
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleAnalyzeWithAI = async () => {
    touchedFieldsRef.current.validationSteps = false;
    await runTriageOnDraft({ respectTouchedFields: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawDraft = buildRawInputForAI(title, description);
    if (!rawDraft || isSubmitting || isAnalyzingAI) return;
    if (!title.trim() && !(autoEnhanceWithAI && description.trim())) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const capturedRawInput = originalRawInput || rawDraft;

      let effectiveTitle = title.trim();
      let effectiveDescription = description.trim();
      let effectiveAccountType = accountType;
      let effectiveItemType = itemType;
      let effectiveCategory = category;
      let effectivePriority = priority;
      let effectiveSteps = validationSteps;
      let effectiveTags = tagsInput
        ? tagsInput
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean)
        : aiSuggestions?.search_tags || [];

      let finalDueDateIso =
        dueDate && !isNaN(new Date(dueDate).getTime())
          ? new Date(dueDate).toISOString()
          : calculateSlaDueDate(effectivePriority);

      let finalEndDateIso: string | null =
        endDate && !isNaN(new Date(endDate).getTime())
          ? new Date(endDate).toISOString()
          : null;

      let finalReminderEnabled = reminderEnabled;

      let serverSimilarMatches: SimilarTaskMatch[] = [];

      // Automatically optimize raw message with AI when enabled and not yet enhanced
      if (autoEnhanceWithAI && !hasAiEnhancedDraft) {
        const aiRes = await runTriageOnDraft({ respectTouchedFields: true });
        if (aiRes) {
          effectiveTitle = aiRes.finalTitle || effectiveTitle;
          effectiveDescription = aiRes.finalDescription || effectiveDescription;
          effectiveAccountType = aiRes.finalAccountType;
          effectiveItemType = aiRes.finalItemType;
          effectiveCategory = aiRes.finalCategory;
          effectivePriority = aiRes.finalPriority;
          effectiveSteps = aiRes.finalSteps;
          effectiveTags = aiRes.finalTags;
          if (aiRes.targetDueIso && !isNaN(new Date(aiRes.targetDueIso).getTime())) {
            finalDueDateIso = aiRes.targetDueIso;
          }
          if (aiRes.targetEndIso && !isNaN(new Date(aiRes.targetEndIso).getTime())) {
            finalEndDateIso = aiRes.targetEndIso;
          }
          finalReminderEnabled = aiRes.nextReminderEnabled;
          serverSimilarMatches = aiRes.similarTasksFromServer || [];
          setHasAiEnhancedDraft(aiRes.source !== "fallback");
        }
      }

      if (!effectiveTitle) {
        setSubmitError("Informe um título para a demanda.");
        return;
      }

      // Check similarity BEFORE persisting if not already dismissed by user
      if (!isSimilarityDismissed) {
        const postAiMatches = findSimilarTasks(
          effectiveTitle,
          effectiveDescription,
          existingTasks,
          0.65
        );
        if (postAiMatches.length > 0 || serverSimilarMatches.length > 0) {
          if (postAiMatches.length === 0 && serverSimilarMatches.length > 0) {
            setServerSimilarMatch(serverSimilarMatches[0]);
          }
          setShowSimilarityScreen(true);
          return;
        }
      }

      const payload = {
        raw_input: capturedRawInput,
        title: effectiveTitle,
        description: effectiveDescription,
        account_type: effectiveAccountType,
        item_type: effectiveItemType,
        category: effectiveCategory,
        priority: effectivePriority,
        due_date: finalDueDateIso,
        scheduled_start: finalDueDateIso,
        scheduled_end:
          finalEndDateIso &&
          new Date(finalEndDateIso).getTime() > new Date(finalDueDateIso).getTime()
            ? finalEndDateIso
            : null,
        reminder_enabled: finalReminderEnabled,
        reminder_minutes_before: finalReminderEnabled ? reminderMinutesBefore : null,
        meet_link: meetLink,
        tags: effectiveTags,
        attachments,
        validation_steps: effectiveSteps,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border shrink-0 ${
              isInterstitialVisible
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            }`}>
              {isInterstitialVisible ? (
                <Lightbulb className="w-5 h-5 text-amber-500" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {isInterstitialVisible
                  ? "Demanda Semelhante / Existente Detectada"
                  : "Nova Demanda & Atividade"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isInterstitialVisible && topSimilar
                  ? `Identificamos uma demanda existente com ${Math.round(topSimilar.similarityScore * 100)}% de similaridade.`
                  : "Cole ou digite sua solicitação; a IA melhora o texto, cria o título e gera etapas."}
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
        {isInterstitialVisible && topSimilar ? (
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
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#10111a] border border-slate-200 dark:border-zinc-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sua nova solicitação {hasAiEnhancedDraft && aiSource !== "fallback" ? "(estruturada pela IA)" : ""}:
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {title.trim() || description.trim().slice(0, 100)}
              </p>
              {description.trim() && description.trim() !== title.trim() && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {description.trim()}
                </p>
              )}
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
                  disabled={isRegisteringRecurrence || isAnalyzingAI}
                  onClick={async () => {
                    setIsRegisteringRecurrence(true);
                    try {
                      const res = await fetch(`/api/tasks/${topSimilar.task.id}/recurrence`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          notes: `Nova ocorrência registrada na criação de demanda: "${title || originalRawInput}"`,
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
                  className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-left transition-all cursor-pointer shadow-xs group disabled:opacity-60"
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
                  disabled={isReopeningTask || isAnalyzingAI}
                  onClick={handleReopenSimilarTask}
                  className="p-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-left transition-all cursor-pointer shadow-xs group disabled:opacity-60"
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
                  disabled={isAnalyzingAI}
                  onClick={async () => {
                    // Garante que a IA atue exatamente como na criação normal antes de exibir o formulário
                    if ((!hasAiEnhancedDraft || aiSource === "fallback") && (title.trim() || description.trim())) {
                      await runTriageOnDraft({ respectTouchedFields: true });
                    }
                    setIsSimilarityDismissed(true);
                    setShowSimilarityScreen(false);
                    setServerSimilarMatch(null);
                  }}
                  className="p-3 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-left transition-all cursor-pointer shadow-xs group disabled:opacity-70"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1">
                    {isAnalyzingAI ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-125 transition-transform" />
                    )}
                    <span>{isAnalyzingAI ? "Estruturando com IA..." : "Criação Independente"}</span>
                  </div>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 leading-tight">
                    Ignorar similaridade e avançar para cadastrar como nova demanda avulsa com a IA.
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
          {/* Non-blocking similarity alert banner while editing */}
          {topSimilar && (
            <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug truncate">
                  <strong>Demanda semelhante ({Math.round(topSimilar.similarityScore * 100)}%):</strong> {topSimilar.task.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSimilarityScreen(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold shrink-0 transition-colors cursor-pointer"
              >
                Comparar / Vincular
              </button>
            </div>
          )}

          {/* Tipo de Item & Contexto da Conta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo de Item */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                1. Tipo de Registro:
              </label>
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-[#0c0d13] rounded-xl border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    touchedFieldsRef.current.itemType = true;
                    setItemType("task");
                  }}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    itemType === "task"
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5 shrink-0" />
                  <span>Tarefa</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    touchedFieldsRef.current.itemType = true;
                    setItemType("activity");
                    if (!endDate) {
                      const base =
                        dueDate && !isNaN(new Date(dueDate).getTime())
                          ? new Date(dueDate)
                          : new Date();
                      const nextEnd = new Date(base.getTime() + 60 * 60_000);
                      try {
                        setEndDate(format(nextEnd, "yyyy-MM-dd'T'HH:mm"));
                      } catch {}
                    }
                    if (!touchedFieldsRef.current.reminder) {
                      setReminderEnabled(true);
                      setReminderMinutesBefore(30);
                    }
                  }}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    itemType === "activity"
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span>Atividade</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    touchedFieldsRef.current.itemType = true;
                    setItemType("reminder");
                  }}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    itemType === "reminder"
                      ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
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
                  onClick={() => {
                    touchedFieldsRef.current.accountType = true;
                    setAccountType("work");
                  }}
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
                  onClick={() => {
                    touchedFieldsRef.current.accountType = true;
                    setAccountType("personal");
                  }}
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
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                2. Título da Demanda:
              </label>
              {hasAiEnhancedDraft && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  aiSource === "fallback"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                }`}>
                  {aiSource === "fallback" ? "Modo assistido (tente Melhorar com IA)" : "Otimizado pela IA"}
                </span>
              )}
            </div>
            <input
              type="text"
              required={!autoEnhanceWithAI || !description.trim()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite um título ou cole a mensagem abaixo para a IA criar automaticamente..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                3. Detalhes / Conteúdo da Mensagem:
              </label>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzingAI || (!title.trim() && !description.trim())}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all disabled:opacity-40 cursor-pointer"
                title="Reescreve a mensagem de forma objetiva, cria um título apropriado e gera tarefas de conclusão com IA"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Melhorando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>{hasAiEnhancedDraft ? "Reprocessar com IA" : "Melhorar com IA agora"}</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cole aqui o e-mail completo, mensagem encaminhada, orientações recebidas ou rascunho informal..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 leading-relaxed resize-y font-sans"
            />

            <label className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoEnhanceWithAI}
                onChange={(e) => setAutoEnhanceWithAI(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                Aprimorar automaticamente título, texto objetivo e tarefas de conclusão com IA ao criar
              </span>
            </label>

            {aiError && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                {aiError}
              </div>
            )}
          </div>

          {/* Pontos de Validação & Etapas Sugeridas pela IA */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
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
                Clique em <strong className="text-indigo-600 dark:text-indigo-400">&quot;Melhorar com IA agora&quot;</strong> acima (ou finalize criando a demanda) para gerar automaticamente as tarefas práticas de conclusão, ou adicione etapas manualmente.
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
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1.5 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Descreva a etapa ou teste..."
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddValidationStep())}
                  className="w-full sm:flex-1 text-xs p-2 rounded-xl bg-white dark:bg-[#0c0d13] border border-indigo-300 dark:border-indigo-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
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
                onChange={(val) => {
                  touchedFieldsRef.current.category = true;
                  setCategory(val);
                }}
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

          {/* Agendamento (Início, Término & Lembrete) */}
          <ScheduleReminderFields
            startValue={dueDate}
            endValue={endDate}
            reminderEnabled={reminderEnabled}
            reminderMinutesBefore={reminderMinutesBefore}
            itemType={itemType}
            valueFormat="local"
            meetLink={meetLink}
            onChangeMeetLink={setMeetLink}
            tasks={existingTasks}
            onChangeStart={(val) => {
              touchedFieldsRef.current.dueDate = true;
              setDueDate(val);
            }}
            onChangeEnd={(val) => {
              touchedFieldsRef.current.endDate = true;
              setEndDate(val);
            }}
            onChangeReminderEnabled={(enabled) => {
              touchedFieldsRef.current.reminder = true;
              setReminderEnabled(enabled);
            }}
            onChangeReminderMinutes={(mins) => {
              touchedFieldsRef.current.reminder = true;
              setReminderMinutesBefore(mins);
            }}
          />

          {/* Tags Técnicas */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Tags Técnicas (Separadas por vírgula):
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="totvs, financeiro, biblioteca, reuniao..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Anexos e Links Externos Reutilizável */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <AttachmentManager
              attachments={attachments}
              onChange={setAttachments}
              stage="creation"
              label="4. Anexos de Arquivos & Links Externos (Opcional)"
              onPreviewMedia={(media) => setPreviewMedia(media)}
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
        {!isInterstitialVisible && (
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
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
              disabled={isSubmitting || isAnalyzingAI || (!title.trim() && !(autoEnhanceWithAI && description.trim()))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
            >
              {isSubmitting || isAnalyzingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAnalyzingAI ? "Otimizando com IA..." : "Criando Demanda..."}</span>
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

        {/* Lightbox Preview Modal for Attachments */}
        <MediaLightboxModal
          isOpen={Boolean(previewMedia)}
          onClose={() => setPreviewMedia(null)}
          media={previewMedia}
        />
      </div>
    </div>
  );
}
