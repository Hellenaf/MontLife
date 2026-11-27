"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckSquare,
  Sunrise,
  BookOpen,
  StickyNote,
  ArrowUpRight,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus,
  Layers,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import {
  useWorkspace,
  isTaskMatchingWorkspace,
  isNoteMatchingWorkspace,
} from "@/context/WorkspaceContext";
import { FormattedText } from "@/components/FormattedText";
import { format } from "date-fns";

interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  referencedTaskIds?: string[];
  aiSource?: string;
}

const CHAT_HISTORY_KEY = "montlife_ai_chat_messages_v2";

const CATEGORIZED_PROMPTS: {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; prompt: string }[];
}[] = [
  {
    category: "Demandas & Prazos",
    icon: CheckSquare,
    items: [
      {
        label: "Quais demandas estão atrasadas?",
        prompt: "Liste minhas demandas atrasadas em ordem de prioridade e sugira como regularizar hoje.",
      },
      {
        label: "O que devo priorizar hoje?",
        prompt: "Analise minhas demandas abertas e diga exatamente quais 3 itens devo atacar primeiro hoje.",
      },
      {
        label: "Resumo da minha carga atual",
        prompt: "Faça um diagnóstico da minha carga atual de trabalho por categoria e prioridade.",
      },
    ],
  },
  {
    category: "Dúvidas Técnicas & Estudo",
    icon: Lightbulb,
    items: [
      {
        label: "Consultar soluções anteriores",
        prompt: "Quais soluções técnicas importantes eu já documentei recentemente na minha base?",
      },
      {
        label: "Plano de ação para item crítico",
        prompt: "Pegue minha demanda P1 ou P2 mais urgente e monte um passo a passo prático para resolvê-la.",
      },
      {
        label: "Tirar dúvida técnica geral",
        prompt: "Quero tirar uma dúvida técnica rápida — me pergunte qual sistema ou problema estou analisando.",
      },
    ],
  },
  {
    category: "Anotações & Organização",
    icon: StickyNote,
    items: [
      {
        label: "Revisar notas fixadas",
        prompt: "Resuma o que tenho nas minhas anotações fixadas ou recentes e diga se algo deveria virar demanda.",
      },
      {
        label: "Preparar pauta executiva",
        prompt: "Monte uma pauta rápida de status das minhas entregas em andamento para apresentar à liderança.",
      },
    ],
  },
];

export function AiAssistantWorkspace() {
  const {
    tasks,
    notes,
    accountFilter,
    openTaskInModule,
    loadTasks,
    setUndoToast,
  } = useWorkspace();

  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<"objetivo" | "detalhado" | "executivo">("objetivo");
  const [isSending, setIsSending] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) setMessages(JSON.parse(saved));
      const savedStyle = localStorage.getItem("montlife_ai_chat_style");
      if (
        savedStyle === "objetivo" ||
        savedStyle === "detalhado" ||
        savedStyle === "executivo"
      ) {
        setStyle(savedStyle);
      }
    } catch {}
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const persistMessages = (next: ChatBubble[]) => {
    setMessages(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next.slice(-40)));
      } catch {}
    }
  };

  const scopedOpenCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          isTaskMatchingWorkspace(t, accountFilter) &&
          t.status !== "COMPLETED" &&
          t.status !== "CANCELED"
      ).length,
    [tasks, accountFilter]
  );

  const scopedNotesCount = useMemo(
    () =>
      notes.filter((n) => !n.archived && isNoteMatchingWorkspace(n, accountFilter))
        .length,
    [notes, accountFilter]
  );

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || isSending) return;

    const userMsg: ChatBubble = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const nextWithUser = [...messages, userMsg];
    persistMessages(nextWithUser);
    if (!textOverride) setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          style,
          history: nextWithUser.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatBubble = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          data?.reply ||
          data?.error ||
          "Não consegui gerar uma resposta neste momento. Tente novamente.",
        createdAt: new Date().toISOString(),
        referencedTaskIds: Array.isArray(data?.referenced_task_ids)
          ? data.referenced_task_ids
          : [],
        aiSource: data?.ai_source,
      };
      persistMessages([...nextWithUser, assistantMsg]);
    } catch {
      persistMessages([
        ...nextWithUser,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Erro de conexão ao consultar o Assistente IA. Verifique sua internet e tente novamente.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleBatchCategorize = async () => {
    setIsCategorizing(true);
    try {
      const res = await fetch("/api/tasks/ai-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        await loadTasks();
        setUndoToast({
          id: `cat-${Date.now()}`,
          message: data.message || "Categorias organizadas pela IA!",
          variant: "success",
        });
      }
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full flex overflow-hidden bg-canvas">
      {/* Left Categorized Prompts & Shortcuts Panel */}
      {isSidebarOpen && (
        <aside className="hidden lg:flex w-[300px] xl:w-[320px] shrink-0 h-full flex-col bg-sidebar border-r border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Sparkles className="w-4 h-4 text-brand" />
              <span>Atalhos & Categorias</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              title="Recolher painel de atalhos"
              className="p-1 rounded-[7px] text-ink-muted hover:text-ink hover:bg-lavender-soft cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {CATEGORIZED_PROMPTS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.category} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    <Icon className="w-3.5 h-3.5 text-brand" />
                    <span>{group.category}</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={isSending}
                        onClick={() => sendMessage(item.prompt)}
                        className="w-full text-left px-3 py-2 rounded-[9px] bg-surface hover:bg-lavender-soft border border-line hover:border-lavender-strong text-xs font-medium text-ink transition-colors cursor-pointer disabled:opacity-45"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Direct Workspace Batch Action */}
            <div className="pt-3 border-t border-line space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-1">
                Automação rápida
              </p>
              <button
                type="button"
                disabled={isCategorizing}
                onClick={handleBatchCategorize}
                className="w-full px-3 py-2 rounded-[9px] bg-lavender-soft hover:bg-lavender-mid text-brand text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCategorizing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>Organizar categorias das demandas</span>
              </button>
            </div>

            <div className="p-3 rounded-[10px] bg-surface border border-line text-[11px] text-ink-muted space-y-1">
              <p className="font-semibold text-ink">Contexto conectado ao chat</p>
              <p className="font-mono">
                {scopedOpenCount} demandas abertas • {scopedNotesCount} notas
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Main Conversational Chat Area */}
      <main className="flex-1 min-w-0 h-full flex flex-col bg-surface overflow-hidden">
        {/* Chat Top Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-line bg-sidebar flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title="Mostrar atalhos categorizados"
                className="hidden lg:flex w-8 h-8 rounded-[8px] bg-surface border border-line items-center justify-center text-ink-muted hover:text-brand hover:bg-lavender-soft cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-[9px] bg-lavender-soft text-brand flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-ink truncate">
                Chat Assistente MontLife
              </h1>
              <p className="text-[11px] text-ink-muted truncate">
                Consulte suas demandas, prazos, notas ou tire qualquer dúvida técnica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={style}
              onChange={(e) => {
                const next = e.target.value as "objetivo" | "detalhado" | "executivo";
                setStyle(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("montlife_ai_chat_style", next);
                }
              }}
              title="Estilo de resposta da IA"
              className="h-8 px-2.5 rounded-[8px] ml-input text-[11px] font-semibold"
            >
              <option value="objetivo">Estilo: Objetivo</option>
              <option value="executivo">Estilo: Executivo</option>
              <option value="detalhado">Estilo: Detalhado</option>
            </select>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  persistMessages([]);
                }}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[8px] bg-surface border border-line hover:bg-lavender-soft text-[11px] font-semibold text-ink cursor-pointer"
                title="Iniciar nova conversa"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-brand" />
                <span className="hidden sm:inline">Nova conversa</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-5 py-8">
              <div className="w-12 h-12 rounded-[14px] bg-lavender-soft border border-lavender-mid text-brand flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-ink">
                  Como posso te ajudar hoje?
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Tenho acesso em tempo real às suas demandas, prazos, soluções documentadas e anotações. Pergunte sobre sua rotina ou tire qualquer dúvida técnica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                {[
                  {
                    icon: AlertCircle,
                    text: "Quais demandas estão atrasadas ou perto do SLA?",
                  },
                  {
                    icon: Sunrise,
                    text: "O que devo priorizar primeiro hoje?",
                  },
                  {
                    icon: BookOpen,
                    text: "Quais soluções técnicas já tenho documentadas?",
                  },
                  {
                    icon: Lightbulb,
                    text: "Me ajude a montar um plano de ação para a semana",
                  },
                ].map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.text}
                      type="button"
                      onClick={() => sendMessage(chip.text)}
                      className="p-3.5 rounded-[11px] bg-sidebar hover:bg-lavender-soft border border-line hover:border-lavender-strong text-left flex items-start gap-2.5 transition-colors cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-ink leading-snug">
                        {chip.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-[14px] px-4 py-3 space-y-2 ${
                        isUser
                          ? "bg-brand text-brand-fg rounded-br-[4px]"
                          : "bg-sidebar border border-line text-ink rounded-bl-[4px]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-mono">
                        <span>{isUser ? "Você" : "MontLife IA"}</span>
                        <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                      </div>

                      <div className="text-xs sm:text-[13px] leading-relaxed">
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <FormattedText text={msg.content} />
                        )}
                      </div>

                      {!isUser &&
                        msg.referencedTaskIds &&
                        msg.referencedTaskIds.length > 0 && (
                          <div className="pt-2 border-t border-line flex flex-wrap gap-1.5">
                            {msg.referencedTaskIds.map((tid) => {
                              const found = tasks.find((t) => t.id === tid);
                              if (!found) return null;
                              return (
                                <button
                                  key={tid}
                                  type="button"
                                  onClick={() => openTaskInModule(found, "/demandas")}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] bg-surface hover:bg-lavender-soft border border-line text-[11px] font-medium text-ink cursor-pointer"
                                >
                                  <CheckSquare className="w-3 h-3 text-brand" />
                                  <span className="truncate max-w-[200px]">
                                    {found.title}
                                  </span>
                                  <ArrowUpRight className="w-3 h-3 text-brand" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-[14px] rounded-bl-[4px] bg-sidebar border border-line inline-flex items-center gap-2 text-xs text-ink-muted">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                    <span>MontLife IA analisando seu workspace...</span>
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>
          )}
        </div>

        {/* Chat Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="px-4 sm:px-6 py-3.5 border-t border-line bg-sidebar shrink-0"
        >
          <div className="max-w-4xl mx-auto flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre suas demandas, prazos, anotações ou tire uma dúvida... (Enter envia, Shift+Enter quebra linha)"
              className="flex-1 p-3 rounded-[11px] ml-input text-xs sm:text-[13px] resize-none leading-relaxed"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="h-10 px-4 rounded-[11px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
          {messages.length > 0 && (
            <div className="max-w-4xl mx-auto mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
              <span>Conectado ao Gemini AI com dados reais do seu perfil</span>
              <button
                type="button"
                onClick={() => persistMessages([])}
                className="inline-flex items-center gap-1 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Limpar conversa
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
