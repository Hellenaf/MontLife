"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
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
} from "@/types";
import { calculateSlaDueDate } from "@/lib/sla";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/context/ThemeContext";

interface HeaderCommandBarProps {
  accounts: ConnectedAccount[];
  onTaskCreated: (task: Task) => void;
  onOpenAccountsModal: () => void;
  onOpenReportModal: () => void;
  onOpenNewTaskModal?: (initialText?: string) => void;
}

export function HeaderCommandBar({
  accounts,
  onTaskCreated,
  onOpenAccountsModal,
  onOpenReportModal,
  onOpenNewTaskModal,
}: HeaderCommandBarProps) {
  const { theme, toggleTheme } = useTheme();
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
  const [isCreating, setIsCreating] = useState(false);

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
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: input }),
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
        setEditDueDate(data.calculated_due_date);
      }
    } catch (err) {
      console.error("Triage failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriorityChange = (newP: Priority) => {
    setEditPriority(newP);
    const newDate = calculateSlaDueDate(newP);
    setEditDueDate(newDate);
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
  };

  const workAcc = accounts.find((a) => a.id === "work");
  const personalAcc = accounts.find((a) => a.id === "personal");

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-[#101118]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-black text-sm text-white shadow-sm">
          M
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              MontLife
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              Tasks
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Central de Demandas & Rotinas
          </p>
        </div>
      </div>

      {/* Center Command Bar + Nova Demanda */}
      <div className="flex-1 max-w-2xl mx-3 sm:mx-6 flex items-center gap-2">
        <form onSubmit={handleRunTriage} className="relative flex items-center flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Criar demanda rápida ou pesquisar (ex: atualizar TOTVS, comprar materiais)..."
            className="w-full h-10 pl-4 pr-32 rounded-xl bg-slate-100 dark:bg-[#161722] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Criar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {onOpenNewTaskModal && (
          <button
            type="button"
            onClick={() => onOpenNewTaskModal("")}
            className="flex items-center gap-1.5 px-3.5 py-2 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
            title="Adicionar demanda detalhada"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Demanda</span>
          </button>
        )}
      </div>

      {/* Right Navigation & Tools */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connected Accounts Status */}
        <button
          onClick={onOpenAccountsModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
            workAcc?.is_connected || personalAcc?.is_connected
              ? "bg-slate-50 dark:bg-[#161722] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-zinc-700"
              : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60"
          }`}
          title="Gerenciar Contas Google"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                workAcc?.is_connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-600"
              }`}
            />
            <Briefcase className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                personalAcc?.is_connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-600"
              }`}
            />
            <User className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
          </div>
          {!(workAcc?.is_connected || personalAcc?.is_connected) && (
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hidden md:inline ml-1">
              Vincular Google
            </span>
          )}
        </button>

        {/* Annual Report Button */}
        <button
          onClick={onOpenReportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#161722] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-xs font-medium transition-all shadow-sm"
          title="Relatório Executivo & SLA"
        >
          <Award className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden lg:inline">Relatório</span>
        </button>

        {/* Theme Switcher Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alternar modo claro e escuro"
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#161722] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Floating Confirmation Modal with Backdrop */}
      {triageData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
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

                {/* Category */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Categoria:
                  </label>
                  <input
                    list="header-categories-list"
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="Categoria da demanda..."
                    className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="header-categories-list">
                    <option value="BI & Analytics" />
                    <option value="Sistemas ERP" />
                    <option value="Gestão & Contratos" />
                    <option value="Comunicação & Mensagens" />
                    <option value="Finanças & Tesouraria" />
                    <option value="Infraestrutura & Redes" />
                    <option value="Engenharia & Automações" />
                    <option value="Gestão Educacional" />
                    <option value="Eventos & Vendas" />
                    <option value="Estudos & Capacitação" />
                    <option value="Saúde & Bem-estar" />
                    <option value="Vida Pessoal & Casa" />
                    <option value="Suporte & Demandas" />
                  </datalist>
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
                    Prazo Calculado (Último Prazo):
                  </label>
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">
                      {editDueDate
                        ? format(parseISO(editDueDate), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : "Hoje"}
                    </span>
                  </div>
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
    </header>
  );
}
