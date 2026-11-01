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
  PlusCircle,
  Maximize2,
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
        body: JSON.stringify({ raw_input: input.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        const triage = data.triage as GeminiTriageResponse;
        setTriageData(triage);
        setSimilarResolutions(data.similar_resolutions || []);
        setLearningResources(data.learning_resources || null);
        setCalculatedDueDate(data.calculated_due_date);

        // Populate editable confirmation card
        setEditTitle(triage.refined_title);
        setEditDescription(triage.structured_description);
        setEditAccountType(triage.account_type);
        // Use preferred type if explicitly chosen, otherwise AI suggestion
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
        // Reset triage card & input
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
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-[#110F1C]/95 backdrop-blur-md border-b border-[#242038] px-4 sm:px-6 flex items-center justify-between shadow-lg shadow-black/20">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7B61FF] to-[#9D8DF1] flex items-center justify-center font-bold text-white shadow-md shadow-[#7B61FF]/25">
          M
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-widest text-[#EAE9FC]">
              MONT OPS
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#7B61FF]/15 text-[#9D8DF1] border border-[#7B61FF]/30">
              3.8 AI
            </span>
          </div>
          <p className="text-[10px] text-[#9490AC] hidden sm:block">
            Gestão & Inteligência Operacional
          </p>
        </div>
      </div>

      {/* Center Natural Language Command Bar + Nova Demanda */}
      <div className="flex-1 max-w-2xl mx-3 sm:mx-6 flex items-center gap-2">
        <form
          onSubmit={handleRunTriage}
          className="relative flex items-center flex-1"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite ou fale uma anotação rápida (ex: reunião amanhã às 14h, pagar fatura, consertar RM)..."
            className="w-full h-10 pl-4 pr-32 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#EAE9FC] placeholder-[#9490AC]/50 focus:outline-none focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition-all"
            disabled={isProcessing}
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {onOpenNewTaskModal && (
              <button
                type="button"
                onClick={() => onOpenNewTaskModal(input)}
                title="Expandir para modo detalhado (para textos longos / mensagens repassadas)"
                className="p-1.5 rounded-lg text-[#9490AC] hover:text-[#9D8DF1] hover:bg-[#1E1B2E] transition-colors"
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
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#1E1B2E]"
              }`}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6C50FF] text-white text-xs font-semibold shadow-md shadow-[#7B61FF]/20 transition-all disabled:opacity-40 disabled:hover:bg-[#7B61FF]"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">IA</span>
                </>
              )}
            </button>
          </div>
        </form>

        {onOpenNewTaskModal && (
          <button
            type="button"
            onClick={() => onOpenNewTaskModal("")}
            className="flex items-center gap-1.5 px-3 py-2 h-10 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white text-xs font-semibold shadow-md shadow-[#7B61FF]/20 transition-all shrink-0 active:scale-95"
            title="Adicionar demanda detalhada, tarefa ou atividade"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Demanda</span>
          </button>
        )}
      </div>

      {/* Right Account Badges & Navigation */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connected Accounts Status */}
        <button
          onClick={onOpenAccountsModal}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#090810] border border-[#242038] hover:border-[#7B61FF]/50 text-xs text-[#9490AC] transition-all"
          title="Gerenciar Contas Google Conectadas"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                workAcc?.is_connected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-[#242038]">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                personalAcc?.is_connected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <User className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </button>

        {/* Annual Report CTA */}
        <button
          onClick={onOpenReportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242038] hover:bg-[#2F2A47] text-[#EAE9FC] text-xs font-medium transition-colors"
        >
          <Award className="w-3.5 h-3.5 text-[#9D8DF1]" />
          <span className="hidden lg:inline">Relatório</span>
        </button>
      </div>

      {/* Floating / Embedded AI Confirmation Card */}
      {triageData && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 w-full max-w-3xl z-40 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="m-4 p-5 rounded-2xl bg-[#141221] border border-[#7B61FF]/40 shadow-2xl backdrop-blur-xl glow-lavender space-y-4">
            {/* Header of confirmation */}
            <div className="flex items-center justify-between border-b border-[#242038] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#7B61FF]/20 text-[#9D8DF1]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#EAE9FC]">
                    Triagem Inteligente — Revisão & Decisão de Tipo
                  </h3>
                  <p className="text-[11px] text-[#9490AC]">
                    A IA analisou sua anotação. Você pode alterar o tipo, prazo ou conta antes de salvar.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDiscardTriage}
                className="text-[#9490AC] hover:text-white p-1 rounded-lg hover:bg-[#242038]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SELETOR INTERATIVO: TAREFA, ATIVIDADE OU LEMBRETE (SOLICITADO) */}
            <div className="p-3 rounded-xl bg-[#090810] border border-[#242038] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#EAE9FC]">
                <span>Classificação do Registro:</span>
                <span className="text-[11px] text-[#9D8DF1] font-normal">
                  (Sugerido pela IA:{" "}
                  <strong>
                    {triageData.item_type === "reminder"
                      ? "Lembrete"
                      : triageData.item_type === "activity"
                      ? "Atividade"
                      : "Tarefa"}
                  </strong>
                  )
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#141221] p-1 rounded-xl border border-[#242038]">
                <button
                  type="button"
                  onClick={() => setEditItemType("task")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    editItemType === "task"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  📌 Tarefa
                </button>

                <button
                  type="button"
                  onClick={() => setEditItemType("activity")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    editItemType === "activity"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  ⚡ Atividade
                </button>

                <button
                  type="button"
                  onClick={() => setEditItemType("reminder")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    editItemType === "reminder"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  🔔 Lembrete
                </button>
              </div>
            </div>

            {/* Knowledge Base Alert: Past resolution match */}
            {similarResolutions.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    💡 Você já resolveu algo parecido em{" "}
                    {format(
                      parseISO(similarResolutions[0].completed_at),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                    :
                  </span>
                </div>
                <p className="italic text-amber-100/90 pl-6 text-[11px]">
                  &quot;{similarResolutions[0].resolution_notes}&quot;
                </p>
                <div className="pl-6 text-[10px] text-amber-400/80 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Tags coincidentes: {similarResolutions[0].matched_tags.join(", ")}
                </div>
              </div>
            )}

            {/* Title & Description Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Título Refinado:
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#090810] border border-[#242038] text-[#EAE9FC] focus:outline-none focus:border-[#7B61FF]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Descrição & Detalhes:
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#090810] border border-[#242038] text-[#EAE9FC] focus:outline-none focus:border-[#7B61FF] resize-none"
                />
              </div>
            </div>

            {/* Controls: Account, Category, Priority, SLA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Account toggle */}
              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Contexto:
                </label>
                <div className="flex rounded-lg bg-[#090810] border border-[#242038] p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditAccountType("work")}
                    className={`flex-1 py-1 text-[11px] rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                      editAccountType === "work"
                        ? "bg-indigo-600 text-white"
                        : "text-[#9490AC] hover:text-[#EAE9FC]"
                    }`}
                  >
                    <Briefcase className="w-3 h-3" /> Trabalho
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAccountType("personal")}
                    className={`flex-1 py-1 text-[11px] rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                      editAccountType === "personal"
                        ? "bg-purple-600 text-white"
                        : "text-[#9490AC] hover:text-[#EAE9FC]"
                    }`}
                  >
                    <User className="w-3 h-3" /> Pessoal
                  </button>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Prioridade:
                </label>
                <div className="flex gap-1">
                  {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => {
                    const color =
                      p === "P1"
                        ? "text-rose-400 border-rose-500/40"
                        : p === "P2"
                        ? "text-amber-400 border-amber-500/40"
                        : p === "P3"
                        ? "text-yellow-400 border-yellow-500/40"
                        : "text-purple-400 border-purple-500/40";
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePriorityChange(p)}
                        className={`flex-1 py-1 text-[11px] rounded-lg font-bold border transition-colors ${
                          editPriority === p
                            ? `bg-[#242038] ${color}`
                            : "bg-[#090810] border-[#242038] text-[#9490AC]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Categoria:
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                  className="w-full h-8 px-2 text-[11px] rounded-lg bg-[#090810] border border-[#242038] text-[#EAE9FC] focus:outline-none focus:border-[#7B61FF]"
                >
                  <option value="TOTVS RM">TOTVS RM</option>
                  <option value="Google Workspace">Google Workspace</option>
                  <option value="Suporte TI">Suporte TI</option>
                  <option value="Automações & Scripts">Automações & Scripts</option>
                  <option value="Infra & Hardware">Infra & Hardware</option>
                  <option value="Catequese">Catequese</option>
                  <option value="Idiomas & Estudos">Idiomas & Estudos</option>
                  <option value="Finanças & Pessoal">Finanças & Pessoal</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[11px] font-medium text-[#9490AC] block mb-1">
                  Prazo Calculado (SLA):
                </label>
                <div className="flex items-center gap-1 h-8 px-2 rounded-lg bg-[#090810] border border-[#242038] text-[11px] text-[#EAE9FC]">
                  <Clock className="w-3.5 h-3.5 text-[#9D8DF1] shrink-0" />
                  <span className="truncate">
                    {editDueDate
                      ? format(parseISO(editDueDate), "dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })
                      : "Hoje"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#242038]">
              <button
                type="button"
                onClick={handleDiscardTriage}
                className="px-4 py-2 text-xs font-medium text-[#9490AC] hover:text-[#EAE9FC] transition-colors"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleConfirmTask}
                disabled={isCreating || !editTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white font-medium text-xs shadow-lg shadow-[#7B61FF]/30 transition-all active:scale-95 disabled:opacity-50"
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
