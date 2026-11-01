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

  useEffect(() => {
    if (isOpen) {
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

        if (!title.trim() || title === textToAnalyze.substring(0, 80)) {
          setTitle(triage.refined_title);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Nova Demanda Detalhada
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insira textos elaborados, encaminhamentos ou especificações técnicas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Seletor de Tipo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              1. Classificação do Registro:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setItemType("task")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "task"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/20"
                    : "bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 dark:text-blue-300">
                  <ListTodo className="w-4 h-4" />
                  Tarefa
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Demanda com SLA, prazo e execução.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setItemType("activity")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "activity"
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/20"
                    : "bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-700 dark:text-purple-300">
                  <Activity className="w-4 h-4" />
                  Atividade
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Ação prática, atendimento ou rotina.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setItemType("reminder")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  itemType === "reminder"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/20"
                    : "bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-300">
                  <Bell className="w-4 h-4" />
                  Lembrete
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Aviso pontual ou data de alerta.
                </span>
              </button>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              2. Título / Assunto:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ajuste de relatórios no TOTVS RM / Reunião de equipe..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                3. Detalhes / Conteúdo da Mensagem:
              </label>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzingAI || (!title.trim() && !description.trim())}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all disabled:opacity-40"
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
              placeholder="Cole aqui o e-mail completo, mensagem encaminhada, orientações recebidas ou anotações detalhadas..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y font-sans"
            />
          </div>

          {/* Contexto & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Contexto:
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-[#0c0d13] p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAccountType("work")}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    accountType === "work"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Pessoal
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Categoria:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
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
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center ${
                        priority === p
                          ? `${activeColor} shadow-sm border-transparent`
                          : "bg-slate-50 dark:bg-[#0c0d13] border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Prazo / Data Limite:
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
              Tags (separadas por vírgula):
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="suporte, totvs, professores, laboratório"
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#101118] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
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
