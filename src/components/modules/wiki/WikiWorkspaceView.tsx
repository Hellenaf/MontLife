"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  Tag,
  CheckCircle2,
  Youtube,
  Globe,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  Loader2,
  FileText,
  Layers,
  CheckSquare,
  ListTree,
  Clock,
  Paperclip,
  X,
  ArrowLeft,
} from "lucide-react";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";
import { Task, TaskAiAssistResponse } from "@/types";
import { FormattedText } from "@/components/FormattedText";
import { EmptyState } from "@/components/ui/WorkspacePrimitives";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function WikiWorkspaceView() {
  const { tasks, accountFilter, openTaskInModule } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [mobileShowReader, setMobileShowReader] = useState(false);

  // Contextual AI assistant on selected article
  const [aiResult, setAiResult] = useState<TaskAiAssistResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const scopedTasks = useMemo(
    () => tasks.filter((t) => isTaskMatchingWorkspace(t, accountFilter)),
    [tasks, accountFilter]
  );

  // Knowledge articles = tasks with documented resolutions, alternative resolutions, procedures, or curated learning resources
  const articles = useMemo(() => {
    return scopedTasks
      .filter(
        (t) =>
          (t.resolution_notes && t.resolution_notes.trim().length > 0) ||
          (t.alternative_resolutions && t.alternative_resolutions.length > 0) ||
          (t.learning_resources?.youtube_videos?.length || 0) > 0 ||
          (t.learning_resources?.articles?.length || 0) > 0 ||
          (t.validation_steps && t.validation_steps.length >= 2)
      )
      .sort((a, b) => {
        const aHasRes = a.resolution_notes ? 0 : 1;
        const bHasRes = b.resolution_notes ? 0 : 1;
        if (aHasRes !== bHasRes) return aHasRes - bHasRes;
        return (
          new Date(b.completed_at || b.created_at || 0).getTime() -
          new Date(a.completed_at || a.created_at || 0).getTime()
        );
      });
  }, [scopedTasks]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const art of articles) {
      const cat = art.category || "Geral";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const popularTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const art of articles) {
      for (const tag of art.tags || []) {
        if (tag.startsWith("gcal-")) continue;
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      if (selectedCategory !== "ALL" && (art.category || "Geral") !== selectedCategory) {
        return false;
      }
      if (selectedTag && !(art.tags || []).includes(selectedTag)) {
        return false;
      }
      if (!q) return true;
      return (
        (art.title || "").toLowerCase().includes(q) ||
        (art.resolution_notes || "").toLowerCase().includes(q) ||
        (art.description || "").toLowerCase().includes(q) ||
        (art.category || "").toLowerCase().includes(q) ||
        (art.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [articles, selectedCategory, selectedTag, searchQuery]);

  useEffect(() => {
    if (
      filteredArticles.length > 0 &&
      (!selectedArticleId || !filteredArticles.some((a) => a.id === selectedArticleId))
    ) {
      setSelectedArticleId(filteredArticles[0].id);
    }
  }, [filteredArticles, selectedArticleId]);

  useEffect(() => {
    setAiResult(null);
    setAiError(null);
  }, [selectedArticleId]);

  const activeArticle: Task | null = useMemo(
    () =>
      filteredArticles.find((a) => a.id === selectedArticleId) ||
      filteredArticles[0] ||
      null,
    [filteredArticles, selectedArticleId]
  );

  const relatedArticles = useMemo(() => {
    if (!activeArticle) return [];
    const activeTags = new Set((activeArticle.tags || []).map((t) => t.toLowerCase()));
    return articles
      .filter((a) => a.id !== activeArticle.id)
      .map((a) => {
        let score = 0;
        if (a.category && a.category === activeArticle.category) score += 2;
        for (const t of a.tags || []) {
          if (activeTags.has(t.toLowerCase())) score += 1;
        }
        return { article: a, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.article);
  }, [activeArticle, articles]);

  const handleRunContextualAi = async (mode: "diagnose" | "action_plan") => {
    if (!activeArticle || isLoadingAi) return;
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/tasks/${activeArticle.id}/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.assist) {
        setAiResult(data.assist);
      } else {
        setAiError(data?.error || "Não foi possível consultar o assistente IA.");
      }
    } catch {
      setAiError("Erro ao conectar com o assistente IA.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full flex overflow-hidden bg-canvas">
      {/* 1. LEFT ZONE: Categories, Tags & Article Index */}
      <aside
        className={`${
          mobileShowReader ? "hidden lg:flex" : "flex"
        } w-full lg:w-[300px] xl:w-[320px] shrink-0 h-full flex-col bg-sidebar border-r border-line overflow-hidden`}
      >
        <div className="p-3.5 border-b border-line space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar soluções, procedimentos..."
              className="w-full h-8.5 py-1.5 pl-8 pr-7 rounded-[9px] ml-input text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Filter */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-1">
              Categorias
            </p>
            <div className="flex flex-wrap gap-1 max-h-[96px] overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2 py-0.5 rounded-[7px] text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-brand text-brand-fg font-semibold"
                    : "bg-surface border border-line text-ink-muted hover:text-ink"
                }`}
              >
                Todas ({articles.length})
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-[7px] text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-brand text-brand-fg font-semibold"
                      : "bg-surface border border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {cat} ({count})
                </button>
              ))}
            </div>
          </div>

          {popularTags.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-1">
                Tags técnicas
              </p>
              <div className="flex flex-wrap gap-1">
                {popularTags.map(([tag]) => {
                  const active = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(active ? null : tag)}
                      className={`px-2 py-0.5 rounded-[6px] text-[10px] font-mono transition-colors cursor-pointer ${
                        active
                          ? "bg-lavender-mid text-ink font-semibold"
                          : "bg-surface border border-line text-ink-muted hover:text-brand"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Article Directory List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line">
          {filteredArticles.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-muted">
              Nenhuma solução ou procedimento encontrado.
            </div>
          ) : (
            filteredArticles.map((art) => {
              const active = art.id === activeArticle?.id;
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => {
                    setSelectedArticleId(art.id);
                    setMobileShowReader(true);
                  }}
                  className={`w-full text-left px-3.5 py-3 transition-colors cursor-pointer ${
                    active
                      ? "bg-lavender-soft border-l-[3px] border-l-brand"
                      : "hover:bg-lavender-soft/45"
                  }`}
                >
                  <p className="text-xs font-semibold text-ink line-clamp-2">
                    {art.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-muted">
                    <span className="truncate">{art.category || "Geral"}</span>
                    {art.resolution_notes && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                        • Documentado
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. CENTER ZONE: Editorial Knowledge Reader */}
      <main
        className={`${
          mobileShowReader ? "flex" : "hidden lg:flex"
        } flex-1 min-w-0 h-full flex-col bg-surface overflow-hidden`}
      >
        {/* Mobile Back Bar */}
        <div className="lg:hidden px-3 py-2 border-b border-line bg-sidebar shrink-0">
          <button
            type="button"
            onClick={() => setMobileShowReader(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-brand" /> Voltar ao índice da Wiki
          </button>
        </div>

        {!activeArticle ? (
          <EmptyState
            className="flex-1"
            icon={<BookOpen className="w-5 h-5" />}
            title="Biblioteca de conhecimento pronta"
            description="Conclua demandas documentando a solução técnica ou adicione procedimentos para construir automaticamente sua Wiki técnica."
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-7">
            <article className="max-w-3xl space-y-7">
              {/* Article Header */}
              <header className="space-y-3 pb-5 border-b border-line">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[7px] bg-lavender-soft text-brand font-semibold">
                    <Layers className="w-3 h-3" />
                    {activeArticle.category || "Geral"}
                  </span>
                  {activeArticle.status === "COMPLETED" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Solução Validada
                    </span>
                  )}
                  {activeArticle.completed_at && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(activeArticle.completed_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink leading-snug">
                  {activeArticle.title}
                </h1>

                {activeArticle.tags && activeArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeArticle.tags
                      .filter((t) => !t.startsWith("gcal-"))
                      .map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-sidebar border border-line text-[11px] font-mono text-ink-muted"
                        >
                          <Tag className="w-2.5 h-2.5 text-brand" />
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </header>

              {/* Context / Problem Description */}
              {activeArticle.description && (
                <section id="wiki-contexto" className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand" />
                    Contexto & Problema
                  </h2>
                  <div className="p-4 rounded-[11px] bg-sidebar border border-line text-sm text-ink leading-relaxed">
                    <FormattedText text={activeArticle.description} />
                  </div>
                </section>
              )}

              {/* Documented Resolution */}
              {activeArticle.resolution_notes && (
                <section id="wiki-solucao" className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solução Técnica Documentada
                  </h2>
                  <div className="p-5 rounded-[12px] bg-lavender-soft/35 border border-lavender-mid text-sm text-ink leading-relaxed">
                    <FormattedText text={activeArticle.resolution_notes} />
                  </div>
                </section>
              )}

              {/* Procedures / Validation Steps */}
              {activeArticle.validation_steps &&
                activeArticle.validation_steps.length > 0 && (
                  <section id="wiki-procedimento" className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-brand" />
                      Procedimento & Etapas de Validação
                    </h2>
                    <ol className="space-y-2">
                      {activeArticle.validation_steps.map((step, idx) => (
                        <li
                          key={step.id}
                          className="flex items-start gap-3 p-3 rounded-[10px] bg-sidebar border border-line text-xs sm:text-sm text-ink"
                        >
                          <span className="w-5 h-5 rounded-full bg-lavender-soft text-brand font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step.text}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

              {/* Alternative Resolutions / History */}
              {activeArticle.alternative_resolutions &&
                activeArticle.alternative_resolutions.length > 0 && (
                  <section className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Resoluções Alternativas Registradas
                    </h2>
                    <div className="space-y-2">
                      {activeArticle.alternative_resolutions.map((alt) => (
                        <div
                          key={alt.id}
                          className="p-3.5 rounded-[10px] bg-sidebar border border-line space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-ink">
                            <span>{alt.method}</span>
                            <span className="font-mono text-[10px] text-ink-muted">
                              {alt.date}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">
                            {alt.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* Technical References & YouTube Videos */}
              {((activeArticle.learning_resources?.articles?.length || 0) > 0 ||
                (activeArticle.learning_resources?.youtube_videos?.length || 0) >
                  0) && (
                <section id="wiki-referencias" className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Referências Técnicas & Materiais
                  </h2>

                  {activeArticle.learning_resources?.articles &&
                    activeArticle.learning_resources.articles.length > 0 && (
                      <div className="space-y-1.5">
                        {activeArticle.learning_resources.articles.map((ref, idx) => (
                          <a
                            key={idx}
                            href={ref.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-sidebar hover:bg-lavender-soft/60 border border-line transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Globe className="w-4 h-4 text-brand shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">
                                  {ref.title}
                                </p>
                                {ref.source && (
                                  <p className="text-[11px] text-ink-muted truncate">
                                    {ref.source}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}

                  {activeArticle.learning_resources?.youtube_videos &&
                    activeArticle.learning_resources.youtube_videos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeArticle.learning_resources.youtube_videos.map(
                          (vid, idx) => (
                            <a
                              key={idx}
                              href={vid.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-[10px] bg-sidebar border border-line hover:border-brand overflow-hidden flex items-center gap-3 p-2.5 transition-colors"
                            >
                              {vid.thumbnail ? (
                                <img
                                  src={vid.thumbnail}
                                  alt={vid.title}
                                  className="w-20 h-14 rounded-[7px] object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-20 h-14 rounded-[7px] bg-lavender-soft flex items-center justify-center shrink-0">
                                  <Youtube className="w-5 h-5 text-brand" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink line-clamp-2">
                                  {vid.title}
                                </p>
                                <p className="text-[10px] text-ink-muted truncate mt-0.5">
                                  {vid.channel}
                                </p>
                              </div>
                            </a>
                          )
                        )}
                      </div>
                    )}
                </section>
              )}

              {/* Resolution Attachments */}
              {activeArticle.resolution_attachments &&
                activeArticle.resolution_attachments.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-brand" />
                      Evidências & Anexos
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {activeArticle.resolution_attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-sidebar border border-line text-xs font-medium text-ink hover:border-brand"
                        >
                          <Paperclip className="w-3 h-3 text-brand" />
                          <span className="truncate max-w-[200px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

              {/* AI Contextual Output */}
              {(aiResult || aiError) && (
                <section className="p-4 rounded-[12px] bg-lavender-soft/45 border border-lavender-mid space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand">
                    <Sparkles className="w-4 h-4" />
                    <span>Análise do Assistente IA</span>
                  </div>
                  {aiError ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {aiError}
                    </p>
                  ) : (
                    aiResult && (
                      <div className="space-y-2 text-xs text-ink leading-relaxed">
                        <FormattedText text={aiResult.technical_guidance} />
                      </div>
                    )
                  )}
                </section>
              )}
            </article>
          </div>
        )}
      </main>

      {/* 3. RIGHT ZONE: Outline, Origin Demand, Related Articles & AI */}
      {activeArticle && (
        <aside className="hidden xl:flex w-[272px] shrink-0 h-full flex-col bg-sidebar border-l border-line overflow-y-auto p-4 space-y-5">
          {/* Origin Demand */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <ListTree className="w-3.5 h-3.5 text-brand" />
              Demanda de origem
            </h3>
            <button
              type="button"
              onClick={() => openTaskInModule(activeArticle, "/demandas")}
              className="w-full p-3 rounded-[10px] bg-surface hover:bg-lavender-soft/60 border border-line text-left transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-brand font-semibold">
                <span>{activeArticle.priority}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-semibold text-ink line-clamp-2">
                {activeArticle.title}
              </p>
              <p className="text-[11px] text-ink-muted">
                Abrir no Master-Detail
              </p>
            </button>
          </div>

          {/* Contextual AI Triggers */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Assistente IA contextual
            </h3>
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={isLoadingAi}
                onClick={() => handleRunContextualAi("diagnose")}
                className="w-full px-3 py-2 rounded-[9px] bg-surface hover:bg-lavender-soft border border-line text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingAi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                )}
                <span>Aprofundar diagnóstico</span>
              </button>
              <button
                type="button"
                disabled={isLoadingAi}
                onClick={() => handleRunContextualAi("action_plan")}
                className="w-full px-3 py-2 rounded-[9px] bg-surface hover:bg-lavender-soft border border-line text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
              >
                Gerar checklist operacional
              </button>
            </div>
          </div>

          {/* Related Articles */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Artigos relacionados
            </h3>
            {relatedArticles.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Sem artigos relacionados por categoria ou tags.
              </p>
            ) : (
              <div className="space-y-1.5">
                {relatedArticles.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => setSelectedArticleId(rel.id)}
                    className="w-full text-left p-2.5 rounded-[9px] bg-surface hover:bg-lavender-soft/60 border border-line transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-ink line-clamp-2">
                      {rel.title}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-0.5 truncate">
                      {rel.category}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

