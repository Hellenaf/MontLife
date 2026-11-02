"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Youtube,
  Search,
  ExternalLink,
  CheckCircle2,
  Tag,
  Paperclip,
  Download,
  Filter,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  CheckSquare,
  FileText,
} from "lucide-react";
import { Task, YouTubeVideo } from "@/types";
import { FormattedText } from "@/components/FormattedText";

interface WikiTechnicalViewProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
  onBackToTasks?: () => void;
}

export function WikiTechnicalView({
  tasks,
  onSelectTask,
  onBackToTasks,
}: WikiTechnicalViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "queries" | "resolutions">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Extract all unique YouTube videos with task context
  const allVideos = useMemo(() => {
    const list: { video: YouTubeVideo; task: Task }[] = [];
    const seenUrls = new Set<string>();

    tasks.forEach((task) => {
      const vids = task.learning_resources?.youtube_videos || [];
      vids.forEach((v) => {
        if (!seenUrls.has(v.url)) {
          seenUrls.add(v.url);
          list.push({ video: v, task });
        }
      });
    });
    return list;
  }, [tasks]);

  // Extract all AI search queries with task context
  const allQueries = useMemo(() => {
    const list: { query: string; task: Task }[] = [];
    const seenQueries = new Set<string>();

    tasks.forEach((task) => {
      const queries = task.learning_resources?.search_queries || [];
      queries.forEach((q) => {
        if (!seenQueries.has(q.toLowerCase())) {
          seenQueries.add(q.toLowerCase());
          list.push({ query: q, task });
        }
      });
    });
    return list;
  }, [tasks]);

  // Extract all documented resolutions
  const allResolutions = useMemo(() => {
    return tasks.filter((t) => t.resolution_notes && t.resolution_notes.trim().length > 0);
  }, [tasks]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filtered lists based on search & category
  const q = searchQuery.trim().toLowerCase();

  const filteredVideos = useMemo(() => {
    return allVideos.filter(({ video, task }) => {
      const matchCat = selectedCategory === "ALL" || task.category === selectedCategory;
      const matchSearch =
        !q ||
        video.title.toLowerCase().includes(q) ||
        video.channel.toLowerCase().includes(q) ||
        task.title.toLowerCase().includes(q) ||
        (task.category && task.category.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allVideos, selectedCategory, q]);

  const filteredQueries = useMemo(() => {
    return allQueries.filter(({ query, task }) => {
      const matchCat = selectedCategory === "ALL" || task.category === selectedCategory;
      const matchSearch =
        !q ||
        query.toLowerCase().includes(q) ||
        task.title.toLowerCase().includes(q) ||
        (task.category && task.category.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allQueries, selectedCategory, q]);

  const filteredResolutions = useMemo(() => {
    return allResolutions.filter((task) => {
      const matchCat = selectedCategory === "ALL" || task.category === selectedCategory;
      const matchSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.resolution_notes && task.resolution_notes.toLowerCase().includes(q)) ||
        (task.category && task.category.toLowerCase().includes(q)) ||
        task.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allResolutions, selectedCategory, q]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Wiki Técnica & Base de Conhecimento
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                Curadoria IA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acervo inteligente de tutoriais, tópicos de aprendizado da IA e soluções técnicas catalogadas.
            </p>
          </div>
        </div>

        {onBackToTasks && (
          <button
            type="button"
            onClick={onBackToTasks}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Demandas</span>
          </button>
        )}
      </div>

      {/* 2. Top Metric KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
            <Youtube className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Vídeos & Tutoriais Curados
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {allVideos.length}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Tópicos de Estudo da IA
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {allQueries.length}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Soluções Técnicas Catalogadas
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {allResolutions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Category Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#12131A] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutoriais, tópicos de estudo, TOTVS, ERP, Power BI, soluções..."
              className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-slate-50 dark:bg-[#16152a] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-60">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-50 dark:bg-[#16152a] border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-purple-500"
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "all"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-50 dark:bg-[#16152a] text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-zinc-800"
            }`}
          >
            Todos ({filteredVideos.length + filteredQueries.length + filteredResolutions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "videos"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-50 dark:bg-[#16152a] text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-zinc-800"
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>Vídeos & Tutoriais ({filteredVideos.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("queries")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "queries"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-50 dark:bg-[#16152a] text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-zinc-800"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Tópicos de Estudo ({filteredQueries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolutions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === "resolutions"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 dark:bg-[#16152a] text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-zinc-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Soluções Técnicas ({filteredResolutions.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Main Content Sections */}
      <div className="space-y-6">
        {/* SECTION: YOUTUBE VIDEOS */}
        {(activeTab === "all" || activeTab === "videos") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <Youtube className="w-4 h-4" />
                Tutoriais Recomendados no YouTube ({filteredVideos.length})
              </h3>
            </div>

            {filteredVideos.length === 0 ? (
              activeTab === "videos" && (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-white dark:bg-[#141520] rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <Youtube className="w-8 h-8 mx-auto opacity-30 text-rose-500" />
                  <p className="text-xs">Nenhum vídeo encontrado com os filtros atuais.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map(({ video, task }, idx) => (
                  <div
                    key={idx}
                    className="group flex flex-col rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 overflow-hidden hover:border-rose-500/50 hover:shadow-lg transition-all"
                  >
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video w-full relative overflow-hidden bg-black/20 block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-rose-500" />
                        <span>Assistir</span>
                      </div>
                    </a>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        >
                          {video.title}
                        </a>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Canal: {video.channel}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px]">
                        <span
                          onClick={() => onSelectTask?.(task)}
                          className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer truncate max-w-[180px]"
                          title={`Origem: ${task.title}`}
                        >
                          📌 {task.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {task.category}
                        </span>
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                Tópicos de Estudo & Sugestões de Pesquisa ({filteredQueries.length})
              </h3>
            </div>

            {filteredQueries.length === 0 ? (
              activeTab === "queries" && (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-white dark:bg-[#141520] rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <Lightbulb className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
                  <p className="text-xs">Nenhum tópico de estudo encontrado com os filtros atuais.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredQueries.map(({ query, task }, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3 hover:border-indigo-500/40 transition-all shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {query}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span
                          onClick={() => onSelectTask?.(task)}
                          className="hover:underline cursor-pointer text-purple-500 truncate"
                        >
                          Demanda: {task.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                        title="Pesquisar no YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-white transition-colors"
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Soluções Técnicas & Histórico de Resoluções ({filteredResolutions.length})
              </h3>
            </div>

            {filteredResolutions.length === 0 ? (
              activeTab === "resolutions" && (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-white dark:bg-[#141520] rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <CheckCircle2 className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
                  <p className="text-xs">Nenhuma solução técnica documentada encontrada.</p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {filteredResolutions.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 hover:border-emerald-500/40 transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Resolvida
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                            {task.category}
                          </span>
                          {task.tags?.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] text-purple-600 dark:text-purple-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {task.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTask?.(task)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors shrink-0"
                      >
                        <span>Ver Demanda</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Resolution Body */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-slate-300">
                      <FormattedText text={task.resolution_notes || ""} />
                    </div>

                    {/* Resolution Attachments */}
                    {task.resolution_attachments && task.resolution_attachments.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          Evidências Anexadas ({task.resolution_attachments.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {task.resolution_attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              download={att.name}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <Download className="w-3 h-3 text-purple-500" />
                              <span className="truncate max-w-[200px]">{att.name}</span>
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
