"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  ItemType,
  AccountType,
  Priority,
  TaskCategory,
  Task,
  GeminiTriageResponse,
} from "@/types";
import { calculateSlaDueDate } from "@/lib/sla";
import { format } from "date-fns";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  initialText?: string;
  initialType?: ItemType;
}

const CATEGORIES: TaskCategory[] = [
  "Suporte TI",
  "TOTVS RM",
  "Google Workspace",
  "Automações & Scripts",
  "Infra & Hardware",
  "Catequese",
  "Idiomas & Estudos",
  "Finanças & Pessoal",
];

export function NewTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  initialText = "",
  initialType = "task",
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<ItemType>(initialType);
  const [accountType, setAccountType] = useState<AccountType>("work");
  const [category, setCategory] = useState<TaskCategory>("Suporte TI");
  const [priority, setPriority] = useState<Priority>("P3");
  const [dueDate, setDueDate] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<GeminiTriageResponse | null>(null);

  // Sync initial text when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialText) {
        // If initial text is multi-line or long, place in description
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
      // Format for datetime-local input (YYYY-MM-DDTHH:mm)
      try {
        setDueDate(format(new Date(defaultDate), "yyyy-MM-dd'T'HH:mm"));
      } catch {
        setDueDate(defaultDate.substring(0, 16));
      }
    } else {
      // Reset when closed
      setTitle("");
      setDescription("");
      setAiSuggestions(null);
      setTagsInput("");
    }
  }, [isOpen, initialText, initialType]);

  if (!isOpen) return null;

  const handlePriorityChange = (newP: Priority) => {
    setPriority(newP);
    const calculated = calculateSlaDueDate(newP);
    try {
      setDueDate(format(new Date(calculated), "yyyy-MM-dd'T'HH:mm"));
    } catch {
      setDueDate(calculated.substring(0, 16));
    }
  };

  const handleAnalyzeWithAI = async () => {
    const textToAnalyze = `${title}\n${description}`.trim();
    if (!textToAnalyze || isAnalyzingAI) return;

    setIsAnalyzingAI(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: textToAnalyze }),
      });
      const data = await res.json();
      if (data.success && data.triage) {
        const triage: GeminiTriageResponse = data.triage;
        setAiSuggestions(triage);

        // Preenche o título se estiver vazio ou genérico
        if (!title.trim() || title === textToAnalyze.substring(0, 80)) {
          setTitle(triage.refined_title);
        }

        // Sugere o tipo caso ainda não tenha sido alterado manualmente
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

        if (data.calculated_due_date) {
          try {
            setDueDate(format(new Date(data.calculated_due_date), "yyyy-MM-dd'T'HH:mm"));
          } catch {
            setDueDate(data.calculated_due_date.substring(0, 16));
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
    try {
      const parsedTags = tagsInput
        ? tagsInput
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean)
        : aiSuggestions?.search_tags || [];

      let finalDueDateIso = dueDate ? new Date(dueDate).toISOString() : calculateSlaDueDate(priority);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        account_type: accountType,
        item_type: itemType,
        category,
        priority,
        due_date: finalDueDateIso,
        tags: parsedTags,
        learning_resources: {
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
        onClose();
      }
    } catch (err) {
      console.error("Falha ao salvar:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#131122] border border-[#2E2B44] shadow-2xl overflow-hidden glow-lavender">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242038] bg-[#0E0C18] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7B61FF] to-[#9D8DF1] flex items-center justify-center text-white shadow-md shadow-[#7B61FF]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#EAE9FC]">
                Nova Demanda / Registro
              </h2>
              <p className="text-xs text-[#9490AC]">
                Insira textos elaborados, encaminhamentos ou notas diretas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9490AC] hover:text-[#EAE9FC] hover:bg-[#242038] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Seletor de Tipo (Tarefa, Atividade, Lembrete) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9490AC] uppercase tracking-wider block">
              1. O que você está inserindo?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setItemType("task")}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "task"
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                    : "bg-[#090810] border-[#242038] text-[#9490AC] hover:border-[#383353] hover:text-[#EAE9FC]"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-indigo-300">
                  <ListTodo className="w-4 h-4" />
                  📌 Tarefa
                </div>
                <span className="text-[11px] text-[#9490AC] leading-tight">
                  Demanda com SLA, prazo e execução.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setItemType("activity")}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "activity"
                    ? "bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/20"
                    : "bg-[#090810] border-[#242038] text-[#9490AC] hover:border-[#383353] hover:text-[#EAE9FC]"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-purple-300">
                  <Activity className="w-4 h-4" />
                  ⚡ Atividade
                </div>
                <span className="text-[11px] text-[#9490AC] leading-tight">
                  Ação prática, atendimento ou rotina diária.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setItemType("reminder")}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "reminder"
                    ? "bg-amber-600/20 border-amber-500 text-white shadow-md shadow-amber-600/20"
                    : "bg-[#090810] border-[#242038] text-[#9490AC] hover:border-[#383353] hover:text-[#EAE9FC]"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-amber-300">
                  <Bell className="w-4 h-4" />
                  🔔 Lembrete
                </div>
                <span className="text-[11px] text-[#9490AC] leading-tight">
                  Aviso pontual ou data de alerta.
                </span>
              </button>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9490AC] uppercase tracking-wider block">
              2. Título / Resumo da Demanda:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ajuste de relatórios no TOTVS RM / Reunião com a coordenação..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090810] border border-[#242038] text-sm text-[#EAE9FC] placeholder-[#9490AC]/50 focus:outline-none focus:border-[#7B61FF] transition-all"
            />
          </div>

          {/* Descrição Detalhada / Mensagem Repassada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#9490AC] uppercase tracking-wider block">
                3. Detalhes / Texto Elaborado da Demanda:
              </label>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzingAI || (!title.trim() && !description.trim())}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#7B61FF]/15 hover:bg-[#7B61FF]/25 text-[#9D8DF1] border border-[#7B61FF]/30 transition-all disabled:opacity-40"
                title="A IA analisa o texto colado para sugerir título, categoria, prioridade e tags sem apagar seu texto"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sugerir Metadados com IA</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cole aqui o e-mail completo, mensagem repassada do WhatsApp, instruções detalhadas, etapas a seguir ou notas operacionais..."
              className="w-full p-3.5 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#EAE9FC] placeholder-[#9490AC]/50 focus:outline-none focus:border-[#7B61FF] leading-relaxed resize-y font-sans"
            />
          </div>

          {/* Contexto & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contexto: Trabalho ou Pessoal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9490AC] block">
                Contexto:
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-[#090810] p-1 rounded-xl border border-[#242038]">
                <button
                  type="button"
                  onClick={() => setAccountType("work")}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    accountType === "work"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> Trabalho
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("personal")}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    accountType === "personal"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-[#9490AC] hover:text-[#EAE9FC]"
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Pessoal
                </button>
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9490AC] block">
                Categoria:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-[#090810] border border-[#242038] text-[#EAE9FC] focus:outline-none focus:border-[#7B61FF]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prioridade & Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Prioridade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9490AC] block">
                Prioridade & SLA:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => {
                  const label =
                    p === "P1"
                      ? "P1 (4h)"
                      : p === "P2"
                      ? "P2 (24h)"
                      : p === "P3"
                      ? "P3 (48h)"
                      : "P4 (72h)";
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
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center ${
                        priority === p
                          ? `bg-[#242038] ${color} shadow-sm`
                          : "bg-[#090810] border-[#242038] text-[#9490AC] hover:border-[#383353]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prazo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9490AC] block">
                Prazo / Data Limite:
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl bg-[#090810] border border-[#242038] text-[#EAE9FC] focus:outline-none focus:border-[#7B61FF]"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9490AC] block">
              Tags (separadas por vírgula):
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-[#9490AC] absolute left-3 top-3" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="suporte, totvs, pedagógico, redes"
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-[#090810] border border-[#242038] text-[#EAE9FC] placeholder-[#9490AC]/50 focus:outline-none focus:border-[#7B61FF]"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#242038] bg-[#0E0C18] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#9490AC] hover:text-[#EAE9FC] transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white font-semibold text-xs shadow-lg shadow-[#7B61FF]/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Criar{" "}
                  {itemType === "reminder"
                    ? "Lembrete"
                    : itemType === "activity"
                    ? "Atividade"
                    : "Tarefa"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

