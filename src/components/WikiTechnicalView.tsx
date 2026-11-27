"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Youtube,
  Search,
  ExternalLink,
  CheckCircle2,
  Paperclip,
  Download,
  Sparkles,
  Lightbulb,
  Globe,
  X,
} from "lucide-react";
import { Task, YouTubeVideo, WebArticleResource } from "@/types";
import { FormattedText } from "@/components/FormattedText";

interface WikiTechnicalViewProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
  onBackToTasks?: () => void;
}

export function WikiTechnicalView({ tasks }: WikiTechnicalViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "videos" | "articles" | "queries" | "resolutions"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Extract all unique YouTube videos
  const allVideos = useMemo(() => {
    const list: { video: YouTubeVideo; category: string }[] = [];
    const seenUrls = new Set<string>();

    tasks.forEach((task) => {
      const vids = task.learning_resources?.youtube_videos || [];
      vids.forEach((v) => {
        if (!seenUrls.has(v.url)) {
          seenUrls.add(v.url);
          list.push({ video: v, category: task.category || "Geral" });
        }
      });
    });
    return list;
  }, [tasks]);

  // Extract all unique technical articles & documentation sites
  const allArticles = useMemo(() => {
    const list: { article: WebArticleResource; category: string }[] = [];
    const seenUrls = new Set<string>();

    tasks.forEach((task) => {
      const arts = task.learning_resources?.articles || [];
      arts.forEach((a) => {
        if (!seenUrls.has(a.url)) {
          seenUrls.add(a.url);
          list.push({ article: a, category: task.category || "Geral" });
        }
      });
    });
    return list;
  }, [tasks]);

  // Extract all AI search queries / study topics
  const allQueries = useMemo(() => {
    const list: { query: string; category: string }[] = [];
    const seenQueries = new Set<string>();

    tasks.forEach((task) => {
      const queries = task.learning_resources?.search_queries || [];
      queries.forEach((q) => {
        if (!seenQueries.has(q.toLowerCase())) {
          seenQueries.add(q.toLowerCase());
          list.push({ query: q, category: task.category || "Geral" });
        }
      });
    });
    return list;
  }, [tasks]);

  // Extract all documented technical solutions
  const allResolutions = useMemo(() => {
    return tasks.filter(
      (t) => t.resolution_notes && t.resolution_notes.trim().length > 0
    );
  }, [tasks]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Local instant search across all study items (works offline)
  const q = searchQuery.trim().toLowerCase();

  const filteredVideos = useMemo(() => {
    return allVideos.filter(({ video, category }) => {
      const matchCat = selectedCategory === "ALL" || category === selectedCategory;
      const matchSearch =
        !q ||
        video.title.toLowerCase().includes(q) ||
        video.channel.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allVideos, selectedCategory, q]);

  const filteredArticles = useMemo(() => {
    return allArticles.filter(({ article, category }) => {
      const matchCat = selectedCategory === "ALL" || category === selectedCategory;
      const matchSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        (article.source && article.source.toLowerCase().includes(q)) ||
        (article.snippet && article.snippet.toLowerCase().includes(q)) ||
        category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allArticles, selectedCategory, q]);

  const filteredQueries = useMemo(() => {
    return allQueries.filter(({ query, category }) => {
      const matchCat = selectedCategory === "ALL" || category === selectedCategory;
      const matchSearch =
        !q || query.toLowerCase().includes(q) || category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allQueries, selectedCategory, q]);

  const filteredResolutions = useMemo(() => {
    return allResolutions.filter((item) => {
      const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.resolution_notes && item.resolution_notes.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.tags || []).some((tag) => tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allResolutions, selectedCategory, q]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8 lg:pb-12 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="ml-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-lavender-soft text-brand border border-lavender-mid flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight text-ink">
                Wiki Técnica & Biblioteca de Estudo
              </h2>
              <span className="px-2 py-0.5 rounded-[7px] text-[10px] font-semibold bg-lavender-soft text-brand">
                Curadoria IA
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Acervo centralizado de tutoriais, documentações, tópicos de pesquisa e soluções técnicas.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ml-card p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-rose-500/12 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Youtube className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-ink-muted block leading-tight">
              Vídeos & Tutoriais
            </span>
            <span className="text-lg font-bold font-mono tabular text-ink">
              {allVideos.length}
            </span>
          </div>
        </div>

        <div className="ml-card p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-lavender-soft text-brand flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-ink-muted block leading-tight">
              Tópicos de Estudo
            </span>
            <span className="text-lg font-bold font-mono tabular text-ink">
              {allQueries.length}
            </span>
          </div>
        </div>

        <div className="ml-card p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-ink-muted block leading-tight">
              Soluções Documentadas
            </span>
            <span className="text-lg font-bold font-mono tabular text-ink">
              {allResolutions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Category Filters */}
      <div className="ml-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutoriais, tópicos de estudo, artigos, TOTVS, ERP, Power BI, soluções..."
              className="w-full h-9 pl-9 pr-8 text-xs rounded-[9px] ml-input font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-[9px] ml-input font-medium cursor-pointer"
            >
              <option value="ALL">Todas as categorias ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clean Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-[9px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === "all"
                ? "bg-brand text-brand-fg font-semibold"
                : "bg-sidebar border border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
            }`}
          >
            Todos (
            {filteredVideos.length +
              filteredArticles.length +
              filteredQueries.length +
              filteredResolutions.length}
            )
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("articles")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === "articles"
                ? "bg-brand text-brand-fg font-semibold"
                : "bg-sidebar border border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Sites & Artigos ({filteredArticles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === "videos"
                ? "bg-brand text-brand-fg font-semibold"
                : "bg-sidebar border border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>Vídeos & Tutoriais ({filteredVideos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("queries")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === "queries"
                ? "bg-brand text-brand-fg font-semibold"
                : "bg-sidebar border border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tópicos de Estudo ({filteredQueries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolutions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === "resolutions"
                ? "bg-brand text-brand-fg font-semibold"
                : "bg-sidebar border border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Soluções Técnicas ({filteredResolutions.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Main Content Sections */}
      <div className="space-y-6">
        {/* SECTION: SITES & ARTIGOS TÉCNICOS */}
        {(activeTab === "all" || activeTab === "articles") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Sites, Artigos & Documentações Técnicas ({filteredArticles.length})
            </h3>

            {filteredArticles.length === 0 ? (
              activeTab === "articles" && (
                <div className="ml-card py-12 text-center text-ink-muted space-y-2">
                  <Globe className="w-8 h-8 mx-auto opacity-35 text-brand" />
                  <p className="text-xs">
                    Nenhum artigo ou site técnico encontrado com os filtros atuais.
                  </p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredArticles.map(({ article, category }, idx) => (
                  <div
                    key={idx}
                    className="ml-card p-4 flex flex-col justify-between hover:border-brand transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-[7px] bg-lavender-soft text-brand text-[10px] font-bold uppercase tracking-wider border border-lavender-mid flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {article.source || "Artigo / Web"}
                        </span>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-ink-muted hover:text-brand transition-colors"
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-ink group-hover:text-brand transition-colors line-clamp-2 block leading-snug"
                      >
                        {article.title}
                      </a>

                      {article.snippet && (
                        <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                          {article.snippet}
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 mt-3 border-t border-line flex items-center justify-between gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-[6px] bg-sidebar border border-line text-ink-muted font-medium">
                        {category}
                      </span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand font-semibold hover:underline"
                      >
                        Ler artigo →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: YOUTUBE VIDEOS */}
        {(activeTab === "all" || activeTab === "videos") && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Youtube className="w-4 h-4" />
              Tutoriais Recomendados no YouTube ({filteredVideos.length})
            </h3>

            {filteredVideos.length === 0 ? (
              activeTab === "videos" && (
                <div className="ml-card py-12 text-center text-ink-muted space-y-2">
                  <Youtube className="w-8 h-8 mx-auto opacity-35 text-rose-500" />
                  <p className="text-xs">Nenhum vídeo encontrado com os filtros atuais.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map(({ video, category }, idx) => (
                  <div
                    key={idx}
                    className="ml-card group flex flex-col overflow-hidden hover:border-brand transition-all"
                  >
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video w-full relative overflow-hidden bg-sidebar block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors" />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[6px] bg-[#1D1925]/85 text-[#F5F1E8] text-[10px] font-bold flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-rose-400" />
                        <span>Assistir</span>
                      </div>
                    </a>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-ink line-clamp-2 hover:text-brand transition-colors"
                        >
                          {video.title}
                        </a>
                        <p className="text-[11px] text-ink-muted truncate">
                          Canal: {video.channel}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-line flex items-center justify-between gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-[6px] bg-sidebar border border-line text-ink-muted font-medium">
                          {category}
                        </span>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand font-semibold hover:underline"
                        >
                          YouTube →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: AI SEARCH QUERIES / TOPICS */}
        {(activeTab === "all" || activeTab === "queries") && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              Tópicos de Estudo & Sugestões de Pesquisa ({filteredQueries.length})
            </h3>

            {filteredQueries.length === 0 ? (
              activeTab === "queries" && (
                <div className="ml-card py-12 text-center text-ink-muted space-y-2">
                  <Lightbulb className="w-8 h-8 mx-auto opacity-35 text-brand" />
                  <p className="text-xs">
                    Nenhum tópico de estudo encontrado com os filtros atuais.
                  </p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredQueries.map(({ query, category }, idx) => (
                  <div
                    key={idx}
                    className="ml-card p-3.5 flex items-start justify-between gap-3 hover:border-brand transition-all"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span className="text-xs font-bold text-ink leading-tight">
                          {query}
                        </span>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-[6px] bg-sidebar border border-line text-[10px] text-ink-muted font-medium">
                        {category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-[8px] bg-rose-500/12 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Pesquisar no YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-[8px] bg-lavender-soft text-brand hover:bg-lavender-mid transition-colors"
                        title="Pesquisar no Google"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: TECHNICAL RESOLUTIONS & KNOWLEDGE BASE */}
        {(activeTab === "all" || activeTab === "resolutions") && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Soluções Técnicas & Base de Conhecimento ({filteredResolutions.length})
            </h3>

            {filteredResolutions.length === 0 ? (
              activeTab === "resolutions" && (
                <div className="ml-card py-12 text-center text-ink-muted space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto opacity-35 text-emerald-500" />
                  <p className="text-xs">
                    Nenhuma solução técnica documentada encontrada.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {filteredResolutions.map((item) => (
                  <div
                    key={item.id}
                    className="ml-card p-4 hover:border-brand transition-all space-y-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                          Documentada
                        </span>
                        <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-sidebar border border-line text-ink-muted">
                          {item.category}
                        </span>
                        {(item.tags || [])
                          .filter((t) => !t.startsWith("gcal-"))
                          .map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono text-brand"
                            >
                              #{t}
                            </span>
                          ))}
                      </div>
                      <h4 className="text-sm font-bold text-ink">{item.title}</h4>
                    </div>

                    {/* Resolution Body */}
                    <div className="p-3.5 rounded-[10px] bg-sidebar border border-line text-xs text-ink leading-relaxed">
                      <FormattedText text={item.resolution_notes || ""} />
                    </div>

                    {/* Resolution Attachments */}
                    {item.resolution_attachments &&
                      item.resolution_attachments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            Evidências Anexadas ({item.resolution_attachments.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {item.resolution_attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-sidebar border border-line hover:bg-lavender-soft text-ink transition-colors"
                              >
                                <Download className="w-3 h-3 text-brand" />
                                <span className="truncate max-w-[200px]">
                                  {att.name}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
