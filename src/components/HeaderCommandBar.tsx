"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  X,
  Briefcase,
  User,
  ShieldCheck,
  Award,
  Calendar,
  Lightbulb,
  Clock,
  Tag,
  ArrowRight,
  BookOpen,
  ListTodo,
  Activity,
  Bell,
  Plus,
  Maximize2,
  Sun,
  Moon,
  CheckSquare,
  Trash2,
  Repeat,
} from "lucide-react";
import { findSimilarTasks } from "@/lib/taskDeduplication";
import {
  GeminiTriageResponse,
  SimilarResolution,
  LearningResources,
  Task,
  ConnectedAccount,
  AccountType,
  Priority,
  TaskCategory,
  ItemType,
  ValidationStep,
} from "@/types";
import { MontLifeLogo } from "@/components/MontLifeLogo";
import { calculateSlaDueDate } from "@/lib/sla";
import { format, parseISO, isPast, isSameDay, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/context/ThemeContext";
import { getAllCategories } from "@/lib/categories";
import { CategoryCombobox } from "@/components/CategoryCombobox";

interface HeaderCommandBarProps {
  accounts: ConnectedAccount[];
  tasks?: Task[];
  availableCategories?: string[];
  onTaskCreated: (task: Task) => void;
  onOpenAccountsModal: () => void;
  onOpenReportModal: () => void;
  onOpenNewTaskModal?: (initialText?: string) => void;
  onSelectTask?: (task: Task) => void;
}

export function HeaderCommandBar({
  accounts,
  tasks = [],
  availableCategories,
  onTaskCreated,
  onOpenAccountsModal,
  onOpenReportModal,
  onOpenNewTaskModal,
  onSelectTask,
}: HeaderCommandBarProps) {
  const { theme, toggleTheme } = useTheme();
  const categoriesList = useMemo(() => {
    if (availableCategories && availableCategories.length > 0) return availableCategories;
    return getAllCategories(tasks);
  }, [availableCategories, tasks]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [preferredType, setPreferredType] = useState<"auto" | ItemType>("auto");

  // Triage state
  const [triageData, setTriageData] = useState<GeminiTriageResponse | null>(null);
  const [similarResolutions, setSimilarResolutions] = useState<SimilarResolution[]>([]);
  const [learningResources, setLearningResources] = useState<LearningResources | null>(null);
  const [calculatedDueDate, setCalculatedDueDate] = useState<string>("");

  // Editable fields in confirmation card
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAccountType, setEditAccountType] = useState<AccountType>("work");
  const [editItemType, setEditItemType] = useState<ItemType>("task");
  const [editCategory, setEditCategory] = useState<TaskCategory>("Suporte TI");
  const [editPriority, setEditPriority] = useState<Priority>("P3");
  const [editDueDate, setEditDueDate] = useState("");
  const [editValidationSteps, setEditValidationSteps] = useState<ValidationStep[]>([]);
  const [newHeaderStep, setNewHeaderStep] = useState("");
  const [isAddingHeaderStep, setIsAddingHeaderStep] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Deduplication state in AI Confirmation modal
  const [isSimilarityDismissed, setIsSimilarityDismissed] = useState(false);
  const [isRegisteringRecurrence, setIsRegisteringRecurrence] = useState(false);

  const similarMatches = useMemo(() => {
    const textToCheck = editTitle.trim() || input.trim();
    if (!textToCheck || !tasks || tasks.length === 0) return [];
    return findSimilarTasks(textToCheck, editDescription, tasks, 0.38);
  }, [editTitle, input, editDescription, tasks]);

  const topSimilar = !isSimilarityDismissed && similarMatches.length > 0 ? similarMatches[0] : null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

    // Notifications Popover & Real-time Due Date Alerts
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const deadlineAlertTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => {
        if (t.status === "COMPLETED" || t.status === "CANCELED") return false;
        if (!t.current_due_date) return false;
        try {
          const dueDate = parseISO(t.current_due_date);
          return (
            isPast(dueDate) ||
            isSameDay(dueDate, now) ||
            (differenceInHours(dueDate, now) >= 0 && differenceInHours(dueDate, now) <= 24)
          );
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.current_due_date).getTime() - new Date(b.current_due_date).getTime());
  }, [tasks]);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "pt-BR";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleRunTriage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setIsSimilarityDismissed(false);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: input, force_fresh_ai: true }),
      });

      const data = await res.json();
      if (data.success && data.triage) {
        const triage: GeminiTriageResponse = data.triage;
        setTriageData(triage);
        setSimilarResolutions(data.similar_resolutions || []);
        setLearningResources(data.learning_resources || null);
        setCalculatedDueDate(data.calculated_due_date);

        // Populate editable confirmation card
        setEditTitle(triage.refined_title);
        setEditDescription(triage.structured_description);
        setEditAccountType(triage.account_type);
        setEditItemType(preferredType !== "auto" ? preferredType : triage.item_type || "task");
        setEditCategory(triage.category);
        setEditPriority(triage.priority);
        setEditDueDate(triage.extracted_due_date_iso || data.calculated_due_date);

        if (triage.validation_steps?.length) {
          setEditValidationSteps(
            triage.validation_steps.map((text, idx) => ({
              id: `step-${Date.now()}-${idx}`,
              text,
              completed: false,
            }))
          );
        } else {
          setEditValidationSteps([]);
        }
      }
    } catch (err) {
      console.error("Triage failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriorityChange = (newP: Priority) => {
    setEditPriority(newP);
  };

  const handleRemoveHeaderStep = (id: string) => {
    setEditValidationSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddHeaderStep = () => {
    const clean = newHeaderStep.trim();
    if (!clean) return;
    setEditValidationSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: clean,
        completed: false,
      },
    ]);
    setNewHeaderStep("");
    setIsAddingHeaderStep(false);
  };

  const handleConfirmTask = async () => {
    if (!triageData || isCreating) return;
    setIsCreating(true);

    try {
      const payload = {
        raw_input: input,
        title: editTitle,
        description: editDescription,
        account_type: editAccountType,
        item_type: editItemType,
        category: editCategory,
        priority: editPriority,
        due_date: editDueDate || calculatedDueDate,
        tags: triageData.search_tags || [],
        validation_steps: editValidationSteps,
        learning_resources: learningResources || {
          youtube_videos: [],
          search_queries: [],
        },
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.task) {
        onTaskCreated(data.task);
        setTriageData(null);
        setSimilarResolutions([]);
        setLearningResources(null);
        setInput("");
        setPreferredType("auto");
        setIsSimilarityDismissed(false);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDiscardTriage = () => {
    setTriageData(null);
    setSimilarResolutions([]);
    setLearningResources(null);
    setIsSimilarityDismissed(false);
  };

  const workAcc = accounts.find((a) => a.id === "work");
  const personalAcc = accounts.find((a) => a.id === "personal");

  return (
    <>
      <header className="h-16 w-full shrink-0 bg-white/95 dark:bg-[#0e0d1d]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1f1d38] px-4 sm:px-6 flex items-center justify-between shadow-sm transition-colors duration-200 z-30">
      {/* Brand & Identity (visible on mobile where sidebar is hidden) */}
      <div className="flex items-center gap-2 shrink-0 lg:hidden">
        <MontLifeLogo size="sm" showText={true} />
      </div>

      {/* Center Command Bar + Nova Demanda */}
      <div className="flex-1 max-w-2xl mx-2 sm:mx-4 flex items-center gap-2">
        <form onSubmit={handleRunTriage} className="relative flex items-center flex-1">
          <Sparkles className="w-4 h-4 text-purple-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite um comando... (ex: criar tarefa, ver minhas metas, estudar sobre React)"
            className="w-full h-10 pl-10 pr-28 rounded-xl bg-slate-100 dark:bg-[#16152a] border border-slate-200 dark:border-[#282647] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
            disabled={isProcessing}
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {onOpenNewTaskModal && (
              <button
                type="button"
                onClick={() => onOpenNewTaskModal(input)}
                title="Expandir formulário detalhado (textos longos / mensagens recebidas)"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isListening ? "Parar gravação" : "Falar comando por voz"}
              className={`p-1.5 rounded-lg transition-colors ${
                isListening
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800"
              }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all disabled:opacity-40"
              title="Executar comando inteligente"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>

        {onOpenNewTaskModal && (
          <button
            type="button"
            onClick={() => onOpenNewTaskModal("")}
            className="flex items-center gap-1.5 px-3 py-2 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
            title="Adicionar demanda detalhada"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Demanda</span>
          </button>
        )}
      </div>

      {/* Right Navigation & Tools */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clock & Date Widget (Matching mockup) */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#16152a] border border-slate-200 dark:border-[#282647] text-xs text-slate-700 dark:text-slate-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-purple-500" />
          <span className="capitalize">
            {format(currentTime, "EEE, d 'de' MMM", { locale: ptBR })}
          </span>
          <span className="text-slate-300 dark:text-zinc-600">|</span>
          <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
            {format(currentTime, "HH:mm")}
          </span>
        </div>

        {/* Notifications Bell with real-time deadline alerts */}
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl border transition-all shadow-sm ${
              isNotificationOpen
                ? "bg-purple-50 dark:bg-[#201e3b] border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                : "border-slate-200 dark:border-[#282647] bg-white dark:bg-[#16152a] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Alertas de Vencimento e Prazos"
          >
            <Bell className="w-4 h-4" />
            {deadlineAlertTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                {deadlineAlertTasks.length}
              </span>
            )}
          </button>

          {/* Interactive Notifications Popover */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#141326] border border-slate-200 dark:border-[#282647] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-[#100f1f]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Alertas de Prazos
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Demandas no último dia ou com prazo atingido ({deadlineAlertTasks.length})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {deadlineAlertTasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1.5">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 opacity-60" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tudo em dia!
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Nenhuma demanda atingindo o limite de prazo no momento.
                    </p>
                  </div>
                ) : (
                  deadlineAlertTasks.map((t) => {
                    const dueDate = parseISO(t.current_due_date);
                    const nowTime = new Date();
                    const isOverdue = isPast(dueDate) && !isSameDay(dueDate, nowTime);
                    const isDueToday = isSameDay(dueDate, nowTime);

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectTask?.(t);
                          setIsNotificationOpen(false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-500/40 bg-slate-50/50 dark:bg-[#18172e]/60 hover:bg-purple-50/30 dark:hover:bg-[#1e1c38] cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              isOverdue
                                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800"
                                : isDueToday
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800"
                            }`}
                          >
                            {isOverdue
                              ? "🚨 Atrasada"
                              : isDueToday
                              ? "⚠️ Vence Hoje"
                              : "⏳ Vence em 24h"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {format(dueDate, "dd/MM 'às' HH:mm")}
                          </span>
                        </div>
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {t.title}
                        </h5>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span className="truncate max-w-[180px]">{t.category}</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#100f1f] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    onOpenReportModal();
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-[11px]"
                >
                  Ver Relatório Completo de SLA
                </button>
                <span className="text-[10px] text-slate-400">
                  {deadlineAlertTasks.length} alertas ativos
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Connected Accounts Status */}
        <button
          onClick={onOpenAccountsModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
            workAcc?.is_connected || personalAcc?.is_connected
              ? "bg-slate-50 dark:bg-[#16152a] border-slate-200 dark:border-[#282647] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-zinc-700"
              : "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100/60"
          }`}
          title="Gerenciar Contas Google"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                workAcc?.is_connected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-slate-300 dark:bg-zinc-600"
              }`}
            />
            <Briefcase className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          </div>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                personalAcc?.is_connected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-slate-300 dark:bg-zinc-600"
              }`}
            />
            <User className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
          </div>
        </button>


        {/* Theme Switcher Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alternar modo claro e escuro"
          className="p-2 rounded-xl border border-slate-200 dark:border-[#282647] bg-white dark:bg-[#16152a] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>

    {/* Floating Confirmation Modal with Backdrop - Rendered outside header to avoid backdrop-filter coordinate containment */}
    {triageData && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
        <div className="relative w-full max-w-2xl my-auto flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all max-h-[90vh]">
          {/* Header of confirmation - Fixed */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Confirmar Nova Demanda
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verifique os dados estruturados e ajuste o prazo ou tipo antes de salvar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDiscardTriage}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
              {/* Smart Deduplication Alert Banner */}
              {topSimilar && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-600/40 text-xs space-y-2.5 animate-in fade-in duration-200 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        {topSimilar.isExactMatch
                          ? "Demanda Idêntica Já Existente Detectada"
                          : `Demanda Similar Encontrada (${Math.round(topSimilar.similarityScore * 100)}% de similaridade)`}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${
                        topSimilar.task.status === "COMPLETED"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                      }`}
                    >
                      {topSimilar.task.status === "COMPLETED" ? "✓ Já Concluída" : "⏳ Em Aberto"}
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-white/80 dark:bg-zinc-900/60 p-3 rounded-xl border border-amber-100 dark:border-zinc-800">
                    <p className="font-bold text-slate-900 dark:text-zinc-100 text-xs">
                      {topSimilar.task.title}
                    </p>
                    {topSimilar.task.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {topSimilar.task.description}
                      </p>
                    )}

                    {topSimilar.hasPreviousResolution && topSimilar.previousResolutionNotes && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-700 dark:text-zinc-300 mt-1">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-0.5">
                          ✓ Resolução / Procedimento Anterior:
                        </span>
                        <span className="line-clamp-2 italic">{topSimilar.previousResolutionNotes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTask) {
                          onSelectTask(topSimilar.task);
                        }
                        handleDiscardTriage();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Ver Demanda Existente</span>
                    </button>

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
                              notes: `Nova ocorrência registrada via comando IA: "${input}"`,
                              method: topSimilar.previousResolutionNotes || undefined,
                              reopen_status: topSimilar.task.status === "COMPLETED" ? undefined : topSimilar.task.status,
                            }),
                          });
                          const data = await res.json();
                          if (data.success && data.task) {
                            if (onSelectTask) onSelectTask(data.task);
                            handleDiscardTriage();
                          }
                        } catch (err) {
                          console.error("Erro ao registrar reincidência:", err);
                        } finally {
                          setIsRegisteringRecurrence(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRegisteringRecurrence ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Repeat className="w-3.5 h-3.5" />
                      )}
                      <span>Registrar como Reincidência (+1x)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSimilarityDismissed(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer ml-auto"
                      title="Criar como uma nova demanda independente sem vincular à anterior"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar Demanda Independente</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Classification selector */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Classificação:
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-[#161722] p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditItemType("task")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      editItemType === "task"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    Tarefa
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditItemType("activity")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      editItemType === "activity"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Atividade
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditItemType("reminder")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      editItemType === "reminder"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Lembrete
                  </button>
                </div>
              </div>

              {/* Title & Description Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Título:
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Descrição & Notas:
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Validation Steps Suggested by AI */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Etapas de Validação & Finalização:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {editValidationSteps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditValidationSteps([])}
                        className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        Ignorar Etapas
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAddingHeaderStep(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Inserir Etapa
                    </button>
                  </div>
                </div>

                {editValidationSteps.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {editValidationSteps.map((step, idx) => (
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
                          onChange={(e) =>
                            setEditValidationSteps((prev) =>
                              prev.map((s) => (s.id === step.id ? { ...s, text: e.target.value } : s))
                            )
                          }
                          className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none focus:text-indigo-600 dark:focus:text-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHeaderStep(step.id)}
                          className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nenhuma etapa registrada. Clique em "+ Inserir Etapa" para adicionar pontos de validação.
                  </p>
                )}

                {isAddingHeaderStep && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Descreva a nova etapa..."
                      value={newHeaderStep}
                      onChange={(e) => setNewHeaderStep(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddHeaderStep()}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#141520] border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddHeaderStep}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingHeaderStep(false);
                        setNewHeaderStep("");
                      }}
                      className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Controls: Account, Category, Priority, SLA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Conta:
                  </label>
                  <div className="flex rounded-lg bg-slate-100 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditAccountType("work")}
                      className={`flex-1 py-1.5 text-xs rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        editAccountType === "work"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Trabalho
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAccountType("personal")}
                      className={`flex-1 py-1.5 text-xs rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        editAccountType === "personal"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" /> Pessoal
                    </button>
                  </div>
                </div>

                {/* Category with complete menu & datalist */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Categoria:
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Selecione ou digite livremente
                    </span>
                  </div>
                  <CategoryCombobox
                    value={editCategory}
                    onChange={(val) => setEditCategory(val)}
                    categories={categoriesList}
                    placeholder="Ex: Sistemas ERP, RH, Finanças..."
                  />
                </div>
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Priority */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Prioridade:
                  </label>
                  <div className="flex gap-1">
                    {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => {
                      const activeColor =
                        p === "P1"
                          ? "bg-rose-500 text-white"
                          : p === "P2"
                          ? "bg-amber-500 text-white"
                          : p === "P3"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-600 text-white";
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePriorityChange(p)}
                          className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-colors ${
                            editPriority === p
                              ? activeColor
                              : "bg-slate-100 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Prazo / Limite da Demanda:
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editDueDate
                        ? format(parseISO(editDueDate), "yyyy-MM-dd'T'HH:mm")
                        : ""
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditDueDate(new Date(e.target.value).toISOString());
                      }
                    }}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions - Always visible */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#101118] shrink-0">
              <button
                type="button"
                onClick={handleDiscardTriage}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleConfirmTask}
                disabled={isCreating || !editTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar & Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
