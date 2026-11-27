"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  Tag,
  Youtube,
  Globe,
  ExternalLink,
  Sparkles,
  Loader2,
  FileText,
  Layers,
  CheckSquare,
  Clock,
  X,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  HardDrive,
  BookMarked,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { FormattedText } from "@/components/FormattedText";
import { EmptyState, ConfirmDialog } from "@/components/ui/WorkspacePrimitives";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomWikiEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  references: { title: string; url: string }[];
  updatedAt: string;
}

interface UnifiedWikiEntry {
  id: string;
  sourceKind: "custom" | "knowledge" | "video" | "link";
  title: string;
  category: string;
  tags: string[];
  content: string;
  steps?: string[];
  videos?: { title: string; url: string; channel?: string; thumbnail?: string }[];
  links?: { title: string; url: string; source?: string }[];
  updatedAt?: string;
}

type WikiFilterType = "all" | "custom" | "knowledge" | "video" | "link";

export function WikiWorkspaceView() {
  const { tasks, notes, currentUser, isOnline, setUndoToast } = useWorkspace();

  const storageKey = `montlife_offline_wiki_${currentUser?.userId || "local"}`;

  const [customEntries, setCustomEntries] = useState<CustomWikiEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WikiFilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [mobileShowReader, setMobileShowReader] = useState(false);

  // Create / Edit custom offline Wiki entry
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState("Estudos & Pesquisa");
  const [draftTags, setDraftTags] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftRefUrl, setDraftRefUrl] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomWikiEntry | null>(null);

  // Optional online AI Study Guide Generator (saves directly into offline Wiki!)
  const [isAiResearchOpen, setIsAiResearchOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState("Estudos & Pesquisa");
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

  // Hydrate offline custom Wiki entries
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomEntries(parsed);
      }
    } catch {}
  }, [storageKey]);

  const persistCustom = (next: CustomWikiEntry[]) => {
    setCustomEntries(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
  };

  // Assemble the unified OFFLINE-SEARCHABLE Knowledge & Study Base (decoupled from Tasks UI!)
  const allEntries = useMemo<UnifiedWikiEntry[]>(() => {
    const list: UnifiedWikiEntry[] = [];
    const seenVideoUrls = new Set<string>();
    const seenArticleUrls = new Set<string>();

    // 1. Custom Wiki Articles & Offline Study Guides
    for (const c of customEntries) {
      list.push({
        id: c.id,
        sourceKind: "custom",
        title: c.title,
        category: c.category || "Estudos & Pesquisa",
        tags: c.tags || [],
        content: c.content,
        links: c.references || [],
        updatedAt: c.updatedAt,
      });
    }

    // 2. Compiled Solutions, Procedures, Videos & Web Docs collected across history
    for (const t of tasks) {
      const hasDoc = Boolean(t.resolution_notes && t.resolution_notes.trim());
      const hasSteps = Boolean(t.validation_steps && t.validation_steps.length >= 2);
      const vids = t.learning_resources?.youtube_videos || [];
      const arts = t.learning_resources?.articles || [];

      if (hasDoc || hasSteps) {
        const contentParts: string[] = [];
        if (t.description?.trim()) contentParts.push(t.description.trim());
        if (t.resolution_notes?.trim()) {
          contentParts.push(`### Solução & Procedimento\n${t.resolution_notes.trim()}`);
        }
        if (t.alternative_resolutions?.length) {
          contentParts.push(
            `### Abordagens Alternativas\n${t.alternative_resolutions
              .map((a) => `- **${a.method}:** ${a.notes}`)
              .join("\n")}`
          );
        }

        list.push({
          id: `kb-${t.id}`,
          sourceKind: "knowledge",
          title: t.title,
          category: t.category || "Base Técnica",
          tags: (t.tags || []).filter((tag) => !tag.startsWith("gcal-")),
          content: contentParts.join("\n\n"),
          steps: (t.validation_steps || []).map((s) => s.text),
          videos: vids,
          links: arts,
          updatedAt: t.completed_at || t.created_at,
        });
      }

      // Also index standalone YouTube study videos
      for (const v of vids) {
        if (!v.url || seenVideoUrls.has(v.url)) continue;
        seenVideoUrls.add(v.url);
        list.push({
          id: `vid-${encodeURIComponent(v.url).slice(0, 40)}`,
          sourceKind: "video",
          title: v.title,
          category: t.category || "Vídeos de Estudo",
          tags: (t.tags || []).filter((tag) => !tag.startsWith("gcal-")),
          content: `Vídeo de estudo catalogado no canal **${v.channel || "YouTube"}** relacionado ao tema *${t.title}*.`,
          videos: [v],
          updatedAt: t.created_at,
        });
      }

      // Index standalone technical web references/docs
      for (const a of arts) {
        if (!a.url || seenArticleUrls.has(a.url)) continue;
        seenArticleUrls.add(a.url);
        list.push({
          id: `doc-${encodeURIComponent(a.url).slice(0, 40)}`,
          sourceKind: "link",
          title: a.title,
          category: t.category || "Referências & Docs",
          tags: (t.tags || []).filter((tag) => !tag.startsWith("gcal-")),
          content:
            a.snippet ||
            `Referência técnica salva (${a.source || "Documentação Web"}) relacionada a *${t.title}*.`,
          links: [a],
          updatedAt: t.created_at,
        });
      }
    }

    // 3. Include pinned/reference notes that carry technical/study knowledge
    for (const n of notes) {
      if (n.archived) continue;
      if (n.category === "ideia" || n.pinned || (n.ai_summary && n.content.length > 140)) {
        list.push({
          id: `note-ref-${n.id}`,
          sourceKind: "knowledge",
          title: n.title || "Anotação de Referência",
          category: n.category === "ideia" ? "Ideias & Pesquisa" : "Notas de Referência",
          tags: n.tags || [],
          content: [n.ai_summary ? `> **Resumo:** ${n.ai_summary}` : "", n.content]
            .filter(Boolean)
            .join("\n\n"),
          updatedAt: n.updated_at || n.created_at,
        });
      }
    }

    return list;
  }, [customEntries, tasks, notes]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allEntries) {
      map.set(e.category, (map.get(e.category) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allEntries]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allEntries) {
      for (const tag of e.tags) {
        map.set(tag, (map.get(tag) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
  }, [allEntries]);

  // 100% Instant Offline Full-Text Search (supports multi-word token matching!)
  const filteredEntries = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return allEntries.filter((e) => {
      if (typeFilter !== "all" && e.sourceKind !== typeFilter) return false;
      if (selectedCategory !== "ALL" && e.category !== selectedCategory) return false;
      if (selectedTag && !e.tags.includes(selectedTag)) return false;
      if (tokens.length === 0) return true;

      const haystack = [
        e.title,
        e.category,
        e.content,
        ...(e.tags || []),
        ...(e.steps || []),
        ...(e.videos || []).map((v) => `${v.title} ${v.channel || ""}`),
        ...(e.links || []).map((l) => `${l.title} ${l.url}`),
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [allEntries, typeFilter, selectedCategory, selectedTag, searchQuery]);

  useEffect(() => {
    if (
      filteredEntries.length > 0 &&
      (!selectedEntryId || !filteredEntries.some((e) => e.id === selectedEntryId))
    ) {
      setSelectedEntryId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedEntryId]);

  const activeEntry = useMemo(
    () =>
      filteredEntries.find((e) => e.id === selectedEntryId) ||
      filteredEntries[0] ||
      null,
    [filteredEntries, selectedEntryId]
  );

  const relatedEntries = useMemo(() => {
    if (!activeEntry) return [];
    const tagSet = new Set(activeEntry.tags.map((t) => t.toLowerCase()));
    return allEntries
      .filter((e) => e.id !== activeEntry.id)
      .map((e) => {
        let score = 0;
        if (e.category === activeEntry.category) score += 2;
        for (const t of e.tags) {
          if (tagSet.has(t.toLowerCase())) score += 1;
        }
        return { entry: e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.entry);
  }, [activeEntry, allEntries]);

  const openCreateEditor = () => {
    setEditingEntryId(null);
    setDraftTitle("");
    setDraftCategory(selectedCategory !== "ALL" ? selectedCategory : "Estudos & Pesquisa");
    setDraftTags("");
    setDraftContent("");
    setDraftRefUrl("");
    setIsEditorOpen(true);
  };

  const openEditCustom = (entry: UnifiedWikiEntry) => {
    const raw = customEntries.find((c) => c.id === entry.id);
    if (!raw) return;
    setEditingEntryId(raw.id);
    setDraftTitle(raw.title);
    setDraftCategory(raw.category);
    setDraftTags(raw.tags.join(", "));
    setDraftContent(raw.content);
    setDraftRefUrl(raw.references?.[0]?.url || "");
    setIsEditorOpen(true);
  };

  const handleSaveCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftContent.trim()) return;
    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const refs = draftRefUrl.trim()
      ? [{ title: draftRefUrl.trim(), url: draftRefUrl.trim() }]
      : [];

    if (editingEntryId) {
      const next = customEntries.map((c) =>
        c.id === editingEntryId
          ? {
              ...c,
              title: draftTitle.trim(),
              category: draftCategory.trim() || "Estudos & Pesquisa",
              tags,
              content: draftContent.trim(),
              references: refs,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      persistCustom(next);
      setSelectedEntryId(editingEntryId);
    } else {
      const created: CustomWikiEntry = {
        id: `wiki-custom-${Date.now()}`,
        title: draftTitle.trim(),
        category: draftCategory.trim() || "Estudos & Pesquisa",
        tags,
        content: draftContent.trim(),
        references: refs,
        updatedAt: new Date().toISOString(),
      };
      persistCustom([created, ...customEntries]);
      setSelectedEntryId(created.id);
    }

    setIsEditorOpen(false);
    setMobileShowReader(true);
    setUndoToast({
      id: `wiki-saved-${Date.now()}`,
      message: "Artigo salvo na Wiki offline!",
      variant: "success",
    });
  };

  const handleGenerateAiStudyGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim() || isGeneratingGuide) return;
    setIsGeneratingGuide(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: aiTopic.trim(),
          mode: "wiki_guide",
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        const created: CustomWikiEntry = {
          id: `wiki-ai-${Date.now()}`,
          title: aiTopic.trim(),
          category: aiCategory.trim() || "Estudos & Pesquisa",
          tags: ["guia-ia", "estudo"],
          content: data.reply,
          references: [],
          updatedAt: new Date().toISOString(),
        };
        persistCustom([created, ...customEntries]);
        setSelectedEntryId(created.id);
        setAiTopic("");
        setIsAiResearchOpen(false);
        setMobileShowReader(true);
        setUndoToast({
          id: `wiki-ai-ok-${Date.now()}`,
          message: "Guia gerado e salvo para consulta offline!",
          detail: created.title,
          variant: "success",
        });
      }
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const kindLabel = (kind: UnifiedWikiEntry["sourceKind"]) => {
    switch (kind) {
      case "custom":
        return "Artigo da Wiki";
      case "video":
        return "Vídeo de Estudo";
      case "link":
        return "Documentação & Link";
      default:
        return "Guia & Procedimento";
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full flex overflow-hidden bg-canvas">
      {/* 1. LEFT ZONE: Offline Research Search + Categories + Index */}
      <aside
        className={`${
          mobileShowReader ? "hidden lg:flex" : "flex"
        } w-full lg:w-[320px] xl:w-[350px] shrink-0 h-full flex-col bg-sidebar border-r border-line overflow-hidden`}
      >
        <div className="p-3.5 border-b border-line space-y-2.5 shrink-0">
          {/* Header Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <BookMarked className="w-4 h-4 text-brand" />
              <span>Base de Pesquisa</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openCreateEditor}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-brand hover:bg-brand-hover text-brand-fg text-[11px] font-semibold cursor-pointer"
                title="Criar novo artigo/pesquisa na Wiki (salvo offline)"
              >
                <Plus className="w-3 h-3" /> Novo Artigo
              </button>
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => setIsAiResearchOpen(true)}
                title={
                  isOnline
                    ? "Pesquisar tema com IA e salvar guia offline na Wiki"
                    : "Requer internet para gerar novo guia IA"
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] bg-lavender-soft hover:bg-lavender-mid text-brand text-[11px] font-semibold cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-3 h-3" /> IA
              </button>
            </div>
          </div>

          {/* Instant Offline Full-Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-brand absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar na Wiki (funciona sem internet)..."
              className="w-full h-9 pl-8 pr-7 rounded-[9px] ml-input text-xs"
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

          {/* Offline Status Indicator */}
          <div className="flex items-center justify-between text-[10px] text-ink-muted px-0.5">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <HardDrive className="w-3 h-3" /> Pesquisa local offline ativa
            </span>
            <span className="font-mono">{filteredEntries.length} itens</span>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                { id: "all", label: "Tudo" },
                { id: "custom", label: "Meus Artigos" },
                { id: "knowledge", label: "Guias" },
                { id: "video", label: "Vídeos" },
                { id: "link", label: "Docs" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-2 py-1 rounded-[7px] text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  typeFilter === t.id
                    ? "bg-lavender-soft text-brand border border-lavender-mid"
                    : "text-ink-muted hover:text-ink hover:bg-surface"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 max-h-[76px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold cursor-pointer ${
                selectedCategory === "ALL"
                  ? "bg-brand text-brand-fg"
                  : "bg-surface border border-line text-ink-muted hover:text-ink"
              }`}
            >
              Todas categorias
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium cursor-pointer ${
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

        {/* Wiki Articles Index */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-xs font-semibold text-ink">
                Nenhum conteúdo encontrado na Wiki
              </p>
              <p className="text-[11px] text-ink-muted">
                Crie um novo artigo de estudo ou pesquise um tema com a IA para salvar localmente.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const active = entry.id === activeEntry?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedEntryId(entry.id);
                    setMobileShowReader(true);
                  }}
                  className={`w-full text-left px-3.5 py-3 transition-colors cursor-pointer ${
                    active
                      ? "bg-lavender-soft border-l-[3px] border-l-brand"
                      : "hover:bg-lavender-soft/40"
                  }`}
                >
                  <p className="text-xs font-semibold text-ink line-clamp-2">
                    {entry.title}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-ink-muted">
                    <span className="truncate">{entry.category}</span>
                    <span className="shrink-0 font-mono text-brand">
                      {kindLabel(entry.sourceKind)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. CENTER ZONE: Clean Encyclopedia / Study Reader */}
      <main
        className={`${
          mobileShowReader ? "flex" : "hidden lg:flex"
        } flex-1 min-w-0 h-full flex-col bg-surface overflow-hidden`}
      >
        <div className="lg:hidden px-3 py-2 border-b border-line bg-sidebar shrink-0">
          <button
            type="button"
            onClick={() => setMobileShowReader(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-brand" /> Voltar para índice da Wiki
          </button>
        </div>

        {!activeEntry ? (
          <EmptyState
            className="flex-1"
            icon={<BookOpen className="w-5 h-5" />}
            title="Sua Wiki de Pesquisa & Estudos"
            description="Reúna aqui tutoriais, comandos, anotações técnicas, vídeos e guias de referência — tudo pesquisável instantaneamente sem depender da internet."
            action={
              <button
                type="button"
                onClick={openCreateEditor}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Criar primeiro artigo
              </button>
            }
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-7">
            <article className="max-w-3xl space-y-6">
              <header className="space-y-3 pb-5 border-b border-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[7px] bg-lavender-soft text-brand font-semibold">
                      <Layers className="w-3 h-3" />
                      {activeEntry.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-[7px] bg-sidebar border border-line text-[11px] font-medium text-ink-muted">
                      {kindLabel(activeEntry.sourceKind)}
                    </span>
                    {activeEntry.updatedAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(activeEntry.updatedAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>

                  {activeEntry.sourceKind === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditCustom(activeEntry)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-xs font-medium text-ink cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-brand" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const raw = customEntries.find((c) => c.id === activeEntry.id);
                          if (raw) setDeleteTarget(raw);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-sidebar hover:bg-rose-500/10 border border-line text-xs font-medium text-rose-600 dark:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    </div>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink leading-snug">
                  {activeEntry.title}
                </h1>

                {activeEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeEntry.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-sidebar border border-line text-[11px] font-mono text-ink-muted hover:text-brand cursor-pointer"
                      >
                        <Tag className="w-2.5 h-2.5 text-brand" />
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </header>

              {/* Main Knowledge Content */}
              {activeEntry.content && (
                <section className="space-y-2">
                  <div className="p-5 rounded-[12px] bg-sidebar border border-line text-sm text-ink leading-relaxed">
                    <FormattedText text={activeEntry.content} />
                  </div>
                </section>
              )}

              {/* Step-by-Step Procedure */}
              {activeEntry.steps && activeEntry.steps.length > 0 && (
                <section className="space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-brand" />
                    Passo a passo / Checklist de Referência
                  </h2>
                  <ol className="space-y-2">
                    {activeEntry.steps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-[10px] bg-sidebar border border-line text-xs sm:text-sm text-ink"
                      >
                        <span className="w-5 h-5 rounded-full bg-lavender-soft text-brand font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Videos */}
              {activeEntry.videos && activeEntry.videos.length > 0 && (
                <section className="space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5 text-brand" />
                    Vídeos de Estudo
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeEntry.videos.map((vid, idx) => (
                      <a
                        key={idx}
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[10px] bg-sidebar border border-line hover:border-brand p-2.5 flex items-center gap-3 transition-colors"
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
                          {vid.channel && (
                            <p className="text-[10px] text-ink-muted truncate mt-0.5">
                              {vid.channel}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* References / Links */}
              {activeEntry.links && activeEntry.links.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-brand" />
                    Documentações & Links Salvos
                  </h2>
                  <div className="space-y-1.5">
                    {activeEntry.links.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-sidebar hover:bg-lavender-soft/60 border border-line transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">
                            {ref.title}
                          </p>
                          <p className="text-[11px] text-ink-muted truncate">
                            {ref.source || ref.url}
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-brand shrink-0" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </article>
          </div>
        )}
      </main>

      {/* 3. RIGHT ZONE: Tags Cloud & Related Study Topics (Zero Task Coupling!) */}
      <aside className="hidden xl:flex w-[264px] shrink-0 h-full flex-col bg-sidebar border-l border-line overflow-y-auto p-4 space-y-5">
        <div className="p-3.5 rounded-[11px] bg-surface border border-line space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <FileText className="w-3.5 h-3.5 text-brand" />
            <span>Acervo Offline</span>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Todo o conteúdo aqui fica indexado localmente para você pesquisar procedimentos, estudos e comandos sem depender da internet.
          </p>
          <p className="text-[11px] font-mono text-brand font-semibold">
            {allEntries.length} itens na base
          </p>
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Explorar por tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-[7px] text-[10px] font-mono transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? "bg-brand text-brand-fg font-semibold"
                      : "bg-surface border border-line text-ink-muted hover:text-brand"
                  }`}
                >
                  #{tag} ({count})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Conteúdos relacionados
          </h3>
          {relatedEntries.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Sem itens relacionados na mesma categoria ou tags.
            </p>
          ) : (
            <div className="space-y-1.5">
              {relatedEntries.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => setSelectedEntryId(rel.id)}
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

      {/* Modal: Create / Edit Offline Wiki Article */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1D1925]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setIsEditorOpen(false)}
        >
          <form
            onSubmit={handleSaveCustomEntry}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-[14px] bg-surface border border-line shadow-popover p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                {editingEntryId ? "Editar artigo da Wiki" : "Novo artigo / pesquisa na Wiki"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              required
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Título do artigo, comando ou tema de estudo..."
              className="w-full h-9 px-3 rounded-[9px] ml-input text-xs font-semibold"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder="Categoria (ex.: SQL, Power BI, TOTVS, Estudos)"
                className="h-9 px-3 rounded-[9px] ml-input text-xs"
              />
              <input
                type="text"
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                placeholder="Tags separadas por vírgula (ex.: dax, bi, guia)"
                className="h-9 px-3 rounded-[9px] ml-input text-xs"
              />
            </div>

            <textarea
              rows={9}
              required
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Escreva o guia, resumo de estudo, passo a passo, fórmulas ou comandos (suporta Markdown simples)..."
              className="w-full p-3 rounded-[10px] ml-input text-xs leading-relaxed resize-y"
            />

            <input
              type="url"
              value={draftRefUrl}
              onChange={(e) => setDraftRefUrl(e.target.value)}
              placeholder="Link de referência opcional (https://...)"
              className="w-full h-9 px-3 rounded-[9px] ml-input text-xs"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-3.5 py-1.5 rounded-[9px] bg-sidebar border border-line text-xs font-medium text-ink cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Salvar na Wiki
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Generate Study Guide with AI and Save Offline */}
      {isAiResearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1D1925]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => !isGeneratingGuide && setIsAiResearchOpen(false)}
        >
          <form
            onSubmit={handleGenerateAiStudyGuide}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[14px] bg-surface border border-line shadow-popover p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-bold text-ink">
                  Pesquisar tema com IA e salvar offline
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAiResearchOpen(false)}
                className="p-1 text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-muted">
              A IA gera um guia técnico estruturado e salva automaticamente na sua Wiki para você consultar depois sem precisar de internet.
            </p>
            <input
              type="text"
              required
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Ex.: Fórmulas DAX para Lead Time no Power BI..."
              className="w-full h-9 px-3 rounded-[9px] ml-input text-xs"
            />
            <input
              type="text"
              value={aiCategory}
              onChange={(e) => setAiCategory(e.target.value)}
              placeholder="Categoria na Wiki"
              className="w-full h-9 px-3 rounded-[9px] ml-input text-xs"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsAiResearchOpen(false)}
                className="px-3.5 py-1.5 rounded-[9px] bg-sidebar border border-line text-xs font-medium text-ink cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isGeneratingGuide || !aiTopic.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer disabled:opacity-45"
              >
                {isGeneratingGuide ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingGuide ? "Gerando guia..." : "Gerar e salvar"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Custom Wiki Article */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Excluir artigo da Wiki?"
        description="Este artigo será removido da sua biblioteca local."
        highlight={deleteTarget?.title}
        confirmLabel="Excluir"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const next = customEntries.filter((c) => c.id !== deleteTarget.id);
          persistCustom(next);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
