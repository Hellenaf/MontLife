"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  StickyNote,
  Plus,
  Search,
  Mic,
  MicOff,
  Sparkles,
  Wand2,
  ListChecks,
  ArrowRight,
  Pin,
  PinOff,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Check,
  CheckCircle2,
  Briefcase,
  User,
  Lightbulb,
  Users,
  FileText,
  Undo2,
  X,
  Loader2,
  ExternalLink,
  Palette,
  Square,
  CheckSquare,
  Calendar,
  Archive,
  ArchiveRestore,
  Copy,
  Tag,
  Target,
  List,
  AlignLeft,
  FileCheck2,
  Clock,
  Sparkle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Note,
  NoteCategory,
  NoteChecklistItem,
  NoteColor,
  NoteOrganizeMode,
  Task,
  Priority,
  ItemType,
  ExtractedNoteTaskDraft,
} from "@/types";

interface NotesViewProps {
  notes: Note[];
  tasks: Task[];
  accountFilter?: "all" | string;
  initialSelectedNoteId?: string | null;
  onCreateNote: (draft: Partial<Note>) => Promise<Note | null>;
  onUpdateNote: (noteId: string, patch: Partial<Note>) => Promise<Note | null>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCreateTasksFromNote: (
    note: Note,
    drafts: ExtractedNoteTaskDraft[],
    checklistItemId?: string
  ) => Promise<Task[]>;
  onOpenNewTaskModalWithDraft: (
    draft: Partial<ExtractedNoteTaskDraft>,
    sourceNoteId: string,
    checklistItemId?: string
  ) => void;
  onSelectTask: (task: Task) => void;
}

type ScopePresetId = "reuniao" | "ideia" | "escopo_demanda" | "checklist";

const CATEGORY_META: Record<
  NoteCategory,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  geral: {
    label: "Livre",
    badgeClass:
      "bg-[#F2ECE2] text-slate-700 border-[#E4DCE4] dark:bg-[#352D42] dark:text-slate-300 dark:border-[#44394F]",
    icon: <FileText className="w-3 h-3" />,
  },
  reuniao: {
    label: "Reunião",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
    icon: <Users className="w-3 h-3" />,
  },
  ideia: {
    label: "Ideia",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    icon: <Lightbulb className="w-3 h-3" />,
  },
  checklist: {
    label: "Checklist",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
    icon: <ListChecks className="w-3 h-3" />,
  },
};

const SCOPE_PRESETS: Record<
  ScopePresetId,
  {
    label: string;
    shortDesc: string;
    category: NoteCategory;
    color: NoteColor;
    icon: React.ReactNode;
    buildTemplate: (todayLabel: string) => {
      title: string;
      content: string;
      checklist: NoteChecklistItem[];
    };
  }
> = {
  escopo_demanda: {
    label: "Escopo de Demanda",
    shortDesc: "Contexto, requisitos e critérios para virar tarefa",
    category: "geral",
    color: "purple",
    icon: <Target className="w-3.5 h-3.5 text-purple-500" />,
    buildTemplate: () => ({
      title: "",
      content:
        "Contexto / Problema:\n\nSistema ou área envolvida:\n\nO que precisa ser feito:\n• \n\nCritérios de validação:\n• ",
      checklist: [],
    }),
  },
  reuniao: {
    label: "Modo Reunião",
    shortDesc: "Pauta, participantes, decisões e próximos passos",
    category: "reuniao",
    color: "blue",
    icon: <Users className="w-3.5 h-3.5 text-blue-500" />,
    buildTemplate: (todayLabel) => ({
      title: `Reunião • ${todayLabel}`,
      content: "Pauta:\n\nParticipantes:\n\nPontos discutidos:\n• \n\nDecisões tomadas:\n• \n\nPróximos passos:\n",
      checklist: [],
    }),
  },
  ideia: {
    label: "Modo Ideia",
    shortDesc: "Objetivo, proposta de melhoria e impacto esperado",
    category: "ideia",
    color: "amber",
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500" />,
    buildTemplate: () => ({
      title: "",
      content: "Ideia / Proposta:\n\nProblema que resolve:\n\nBenefício esperado:\n",
      checklist: [],
    }),
  },
  checklist: {
    label: "Modo Checklist",
    shortDesc: "Lista direta de itens acionáveis",
    category: "checklist",
    color: "emerald",
    icon: <ListChecks className="w-3.5 h-3.5 text-emerald-500" />,
    buildTemplate: () => ({
      title: "",
      content: "",
      checklist: [],
    }),
  },
};

const AI_ORGANIZE_MODES: {
  id: NoteOrganizeMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "auto",
    label: "Organização Completa",
    desc: "Estrutura texto, cria título, resumo, pontos-chave e tags",
    icon: <Wand2 className="w-3.5 h-3.5 text-purple-500" />,
  },
  {
    id: "demand_scope",
    label: "Preparar Escopo de Demanda",
    desc: "Reescreve em Objetivo, Contexto, Requisitos e Critérios",
    icon: <Target className="w-3.5 h-3.5 text-[#7455AD]" />,
  },
  {
    id: "topics",
    label: "Estruturar em Tópicos",
    desc: "Agrupa anotações soltas em tópicos limpos por assunto",
    icon: <List className="w-3.5 h-3.5 text-blue-500" />,
  },
  {
    id: "summary",
    label: "Resumir & Enxugar",
    desc: "Condensa notas longas preservando fatos e pendências",
    icon: <AlignLeft className="w-3.5 h-3.5 text-amber-500" />,
  },
  {
    id: "checklist",
    label: "Extrair para Checklist",
    desc: "Converte pendências em itens acionáveis no checklist",
    icon: <ListChecks className="w-3.5 h-3.5 text-emerald-500" />,
  },
  {
    id: "polish",
    label: "Corrigir & Polir Texto",
    desc: "Melhora clareza e pontuação mantendo seu estilo",
    icon: <FileCheck2 className="w-3.5 h-3.5 text-sky-500" />,
  },
];

const COLOR_STYLES: Record<
  NoteColor,
  { dot: string; accentBorder: string; subtleBg: string; label: string }
> = {
  default: {
    dot: "bg-slate-400",
    accentBorder: "border-l-[#D8C9EE] dark:border-l-[#574966]",
    subtleBg: "bg-[#FFFCF6] dark:bg-[#273042]",
    label: "Padrão",
  },
  purple: {
    dot: "bg-purple-500",
    accentBorder: "border-l-purple-500",
    subtleBg: "bg-purple-50/40 dark:bg-purple-950/15",
    label: "Roxo",
  },
  blue: {
    dot: "bg-blue-500",
    accentBorder: "border-l-blue-500",
    subtleBg: "bg-blue-50/40 dark:bg-blue-950/15",
    label: "Azul",
  },
  amber: {
    dot: "bg-amber-500",
    accentBorder: "border-l-amber-500",
    subtleBg: "bg-amber-50/40 dark:bg-amber-950/15",
    label: "Âmbar",
  },
  emerald: {
    dot: "bg-emerald-500",
    accentBorder: "border-l-emerald-500",
    subtleBg: "bg-emerald-50/40 dark:bg-emerald-950/15",
    label: "Verde",
  },
  rose: {
    dot: "bg-rose-500",
    accentBorder: "border-l-rose-500",
    subtleBg: "bg-rose-50/40 dark:bg-rose-950/15",
    label: "Rosa",
  },
};

function isWorkAccountType(accountType?: string): boolean {
  const lower = (accountType || "work").toLowerCase();
  if (lower === "personal" || lower.includes("pess") || lower.includes("vida")) return false;
  return true;
}

function getConvertedTaskCount(note: Note): number {
  return Array.from(
    new Set([
      ...(note.converted_task_ids || []),
      ...(note.checklist || [])
        .map((c) => c.linked_task_id)
        .filter((id): id is string => Boolean(id)),
    ])
  ).length;
}

export function NotesView({
  notes,
  tasks,
  accountFilter = "all",
  initialSelectedNoteId = null,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateTasksFromNote,
  onOpenNewTaskModalWithDraft,
  onSelectTask,
}: NotesViewProps) {
  // Quick Capture bar state (always free-form, zero forced category!)
  const [quickText, setQuickText] = useState("");
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);

  // Dropdown menus
  const [showTopScopeMenu, setShowTopScopeMenu] = useState(false);
  const [showEditorScopeMenu, setShowEditorScopeMenu] = useState(false);
  const [showAiModesMenu, setShowAiModesMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // List & Filtering state (single filter location below search!)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChip, setFilterChip] = useState<
    "all" | NoteCategory | "pinned" | "converted"
  >("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialSelectedNoteId);
  const [mobileScreen, setMobileScreen] = useState<"list" | "editor">("list");
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  useEffect(() => {
    if (initialSelectedNoteId) {
      setSelectedNoteId(initialSelectedNoteId);
      setMobileScreen("editor");
    }
  }, [initialSelectedNoteId]);

  // Local editor draft state (synced with selected note + debounced autosave)
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [selectedTextExcerpt, setSelectedTextExcerpt] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Voice Dictation (Web Speech API)
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<"quick" | "editor" | "checklist" | null>(
    null
  );
  const recognitionRef = useRef<any>(null);
  const listeningTargetRef = useRef<"quick" | "editor" | "checklist" | null>(null);

  // AI Actions state
  const [isOrganizingAi, setIsOrganizingAi] = useState(false);
  const [organizingModeLabel, setOrganizingModeLabel] = useState<string | null>(null);
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [isBatchOrganizing, setIsBatchOrganizing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    noteId: string;
    title: string;
    content: string;
    category: NoteCategory;
    checklist: NoteChecklistItem[];
    tags: string[];
    ai_summary?: string | null;
    key_decisions?: string[];
    demand_readiness?: "pronta" | "parcial" | "referencia" | null;
  } | null>(null);

  // Extracted tasks review modal state
  const [extractedModalData, setExtractedModalData] = useState<{
    note: Note;
    summary: string;
    keyDecisions: string[];
    drafts: (ExtractedNoteTaskDraft & { selected: boolean })[];
  } | null>(null);
  const [isCreatingBatchTasks, setIsCreatingBatchTasks] = useState(false);
  const [showChecklistSection, setShowChecklistSection] = useState(false);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const checklistInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyNoteRef = useRef<{
    noteId: string;
    title: string;
    content: string;
  } | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    if (!showTopScopeMenu && !showEditorScopeMenu && !showAiModesMenu && !showColorPicker) return;
    const handleOutside = () => {
      setShowTopScopeMenu(false);
      setShowEditorScopeMenu(false);
      setShowAiModesMenu(false);
      setShowColorPicker(false);
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, [showTopScopeMenu, showEditorScopeMenu, showAiModesMenu, showColorPicker]);

  const activeNotesCount = useMemo(() => notes.filter((n) => !n.archived).length, [notes]);
  const archivedNotesCount = useMemo(() => notes.filter((n) => n.archived).length, [notes]);

  // Filtered notes based on workspace filter, archive toggle, chip & search query
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (showArchived ? !n.archived : Boolean(n.archived)) return false;

      if (accountFilter !== "all") {
        const wantsWork =
          accountFilter === "work" ||
          accountFilter.toLowerCase().includes("trab") ||
          accountFilter.toLowerCase().includes("notre");
        const wantsPersonal =
          accountFilter === "personal" ||
          accountFilter.toLowerCase().includes("pess") ||
          accountFilter.toLowerCase().includes("hellen");
        if (wantsWork && !isWorkAccountType(n.account_type)) return false;
        if (wantsPersonal && isWorkAccountType(n.account_type)) return false;
      }

      if (filterChip === "pinned" && !n.pinned) return false;
      if (filterChip === "converted" && getConvertedTaskCount(n) === 0) return false;
      if (
        filterChip !== "all" &&
        filterChip !== "pinned" &&
        filterChip !== "converted" &&
        n.category !== filterChip
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const inTitle = (n.title || "").toLowerCase().includes(q);
        const inContent = (n.content || "").toLowerCase().includes(q);
        const inSummary = (n.ai_summary || "").toLowerCase().includes(q);
        const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        const inChecklist = (n.checklist || []).some((c) => c.text.toLowerCase().includes(q));
        if (!inTitle && !inContent && !inSummary && !inTags && !inChecklist) return false;
      }

      return true;
    });
  }, [notes, accountFilter, filterChip, searchTerm, showArchived]);

  const activeNote = useMemo(() => {
    if (selectedNoteId) {
      const exact = notes.find((n) => n.id === selectedNoteId);
      if (exact) return exact;
    }
    return filteredNotes[0] || null;
  }, [notes, selectedNoteId, filteredNotes]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = dirtyNoteRef.current;
    if (!pending) return;
    dirtyNoteRef.current = null;
    setSaveState("saving");
    try {
      await onUpdateNote(pending.noteId, {
        title: pending.title.trim(),
        content: pending.content,
      });
    } finally {
      setSaveState("saved");
    }
  }, [onUpdateNote]);

  // Sync draft state when activeNote id changes
  const activeNoteId = activeNote?.id || null;
  const activeNoteTitle = activeNote?.title || "";
  const activeNoteContent = activeNote?.content || "";

  useEffect(() => {
    if (!activeNoteId) {
      setDraftTitle("");
      setDraftContent("");
      setSelectedTextExcerpt("");
      setSaveState("saved");
      return;
    }
    setDraftTitle(activeNoteTitle === "Sem título" ? "" : activeNoteTitle);
    setDraftContent(activeNoteContent);
    setSelectedTextExcerpt("");
    setSaveState("saved");
    setShowColorPicker(false);
    setShowEditorScopeMenu(false);
    setShowAiModesMenu(false);
    setConfirmDeleteId(null);
    setIsAddingTag(false);
    setNewTagInput("");
    setShowChecklistSection(false);
    setAiMessage(null);
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending autosave on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (dirtyNoteRef.current) {
        const pending = dirtyNoteRef.current;
        dirtyNoteRef.current = null;
        void onUpdateNote(pending.noteId, {
          title: pending.title.trim(),
          content: pending.content,
        });
      }
    };
  }, [onUpdateNote]);

  // Initialize Speech Recognition safely
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "pt-BR";

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
      const target = listeningTargetRef.current;
      setListeningTarget(null);
      listeningTargetRef.current = null;
      if (!transcript) return;

      if (target === "quick") {
        setQuickText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else if (target === "checklist") {
        setNewChecklistText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else if (target === "editor") {
        setDraftContent((prev) => {
          const next = prev
            ? `${prev}${prev.endsWith("\n") ? "" : "\n"}${transcript}`
            : transcript;
          if (activeNote) {
            dirtyNoteRef.current = {
              noteId: activeNote.id,
              title: draftTitle,
              content: next,
            };
            setSaveState("dirty");
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
              void flushPendingSave();
            }, 700);
          }
          return next;
        });
      }
    };

    recognition.onerror = () => {
      setListeningTarget(null);
      listeningTargetRef.current = null;
    };

    recognition.onend = () => {
      setListeningTarget(null);
      listeningTargetRef.current = null;
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {}
    };
  }, [activeNote, draftTitle, flushPendingSave]);

  const toggleDictation = (target: "quick" | "editor" | "checklist") => {
    if (!recognitionRef.current) {
      setAiMessage("Ditado por voz não disponível neste navegador. Digite normalmente.");
      return;
    }
    if (listeningTarget) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setListeningTarget(null);
      listeningTargetRef.current = null;
      return;
    }
    try {
      listeningTargetRef.current = target;
      setListeningTarget(target);
      recognitionRef.current.start();
    } catch {
      setListeningTarget(null);
      listeningTargetRef.current = null;
    }
  };

  const getDefaultAccountType = () =>
    accountFilter === "personal" || accountFilter.toLowerCase().includes("pess")
      ? "personal"
      : "work";

  const handleSelectNote = async (note: Note) => {
    if (dirtyNoteRef.current && dirtyNoteRef.current.noteId !== note.id) {
      await flushPendingSave();
    }
    setSelectedNoteId(note.id);
    setMobileScreen("editor");
  };

  const scheduleAutosave = (noteId: string, nextTitle: string, nextContent: string) => {
    dirtyNoteRef.current = { noteId, title: nextTitle, content: nextContent };
    setSaveState("dirty");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void flushPendingSave();
    }, 700);
  };

  // Create a completely BLANK free-form note (no forced meeting/idea scope!)
  const handleCreateBlankNote = async () => {
    if (isCreatingQuick) return;
    await flushPendingSave();
    setIsCreatingQuick(true);
    setShowArchived(false);
    try {
      const created = await onCreateNote({
        title: "",
        content: "",
        category: "geral",
        account_type: getDefaultAccountType(),
        color: "default",
        checklist: [],
        tags: [],
      });
      if (created) {
        setSelectedNoteId(created.id);
        setDraftTitle("");
        setDraftContent("");
        setMobileScreen("editor");
        setFilterChip("all");
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    } finally {
      setIsCreatingQuick(false);
    }
  };

  // Quick capture bar -> saves a free note immediately without forcing category
  const handleQuickCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = quickText.trim();
    if (!raw || isCreatingQuick) return;

    await flushPendingSave();
    setIsCreatingQuick(true);
    setShowArchived(false);
    try {
      const firstLine = raw.split(/\r?\n/)[0].trim();
      const autoTitle =
        firstLine.length > 56 ? `${firstLine.slice(0, 54).trim()}...` : firstLine;

      const created = await onCreateNote({
        title: autoTitle,
        content: raw,
        category: "geral",
        account_type: getDefaultAccountType(),
        color: "default",
        checklist: [],
        tags: [],
      });
      if (created) {
        setQuickText("");
        setSelectedNoteId(created.id);
        setDraftTitle(created.title);
        setDraftContent(created.content);
        setMobileScreen("editor");
      }
    } finally {
      setIsCreatingQuick(false);
    }
  };

  // Optional Scope Mode creation (when user explicitly chooses a scope template)
  const handleCreateScopedNote = async (presetId: ScopePresetId) => {
    if (isCreatingQuick) return;
    setShowTopScopeMenu(false);
    await flushPendingSave();
    setIsCreatingQuick(true);
    setShowArchived(false);
    try {
      const preset = SCOPE_PRESETS[presetId];
      const todayLabel = format(new Date(), "dd/MM HH:mm", { locale: ptBR });
      const tpl = preset.buildTemplate(todayLabel);

      const created = await onCreateNote({
        title: tpl.title,
        content: tpl.content,
        category: preset.category,
        account_type: getDefaultAccountType(),
        color: preset.color,
        checklist: tpl.checklist,
        tags: [],
      });
      if (created) {
        setSelectedNoteId(created.id);
        setDraftTitle(created.title);
        setDraftContent(created.content);
        setMobileScreen("editor");
        if (presetId === "checklist") {
          setShowChecklistSection(true);
          requestAnimationFrame(() => checklistInputRef.current?.focus());
        } else {
          requestAnimationFrame(() => {
            if (!tpl.title) titleInputRef.current?.focus();
            else textareaRef.current?.focus();
          });
        }
      }
    } finally {
      setIsCreatingQuick(false);
    }
  };

  // Apply optional Scope Mode inside the currently open note without erasing existing text
  const handleApplyScopeToActiveNote = async (presetId: ScopePresetId) => {
    if (!activeNote) return;
    setShowEditorScopeMenu(false);
    const preset = SCOPE_PRESETS[presetId];
    const todayLabel = format(new Date(), "dd/MM HH:mm", { locale: ptBR });
    const tpl = preset.buildTemplate(todayLabel);

    const nextTitle = draftTitle.trim() ? draftTitle : tpl.title;
    const nextContent = draftContent.trim()
      ? tpl.content
        ? `${draftContent.trim()}\n\n${tpl.content}`
        : draftContent
      : tpl.content;

    setDraftTitle(nextTitle);
    setDraftContent(nextContent);
    await onUpdateNote(activeNote.id, {
      title: nextTitle,
      content: nextContent,
      category: preset.category,
      color: activeNote.color === "default" ? preset.color : activeNote.color,
    });
    if (presetId === "checklist") {
      setShowChecklistSection(true);
      requestAnimationFrame(() => checklistInputRef.current?.focus());
    } else {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  // Lightweight editor helper insertions
  const insertSnippetAtCursor = (snippet: string) => {
    if (!activeNote) return;
    const el = textareaRef.current;
    if (!el) {
      const next = draftContent ? `${draftContent}\n${snippet}` : snippet;
      setDraftContent(next);
      scheduleAutosave(activeNote.id, draftTitle, next);
      return;
    }
    const start = el.selectionStart ?? draftContent.length;
    const end = el.selectionEnd ?? draftContent.length;
    const before = draftContent.slice(0, start);
    const after = draftContent.slice(end);
    const prefix = before && !before.endsWith("\n") && snippet.startsWith("•") ? "\n" : "";
    const next = `${before}${prefix}${snippet}${after}`;
    setDraftContent(next);
    scheduleAutosave(activeNote.id, draftTitle, next);
    requestAnimationFrame(() => {
      const pos = start + prefix.length + snippet.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCopyNoteText = async () => {
    if (!activeNote) return;
    const parts = [
      draftTitle.trim(),
      draftContent.trim(),
      (activeNote.checklist || []).length > 0
        ? "\nChecklist:\n" +
          (activeNote.checklist || [])
            .map((c) => `${c.checked ? "[x]" : "[ ]"} ${c.text}`)
            .join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(parts);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1800);
    } catch {}
  };

  const handleTrackSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (end > start) {
      setSelectedTextExcerpt(draftContent.slice(start, end).trim());
    } else {
      setSelectedTextExcerpt("");
    }
  };

  // Tags management
  const handleAddTag = async () => {
    if (!activeNote) return;
    const clean = newTagInput.trim().replace(/^#/, "").toLowerCase();
    if (!clean) return;
    const nextTags = Array.from(new Set([...(activeNote.tags || []), clean])).slice(0, 8);
    setNewTagInput("");
    setIsAddingTag(false);
    await onUpdateNote(activeNote.id, { tags: nextTags });
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeNote) return;
    const nextTags = (activeNote.tags || []).filter((t) => t !== tagToRemove);
    await onUpdateNote(activeNote.id, { tags: nextTags });
  };

  // Checklist actions
  const handleAddChecklistItem = async () => {
    if (!activeNote) return;
    const clean = newChecklistText.trim();
    if (!clean) return;
    await flushPendingSave();
    const newItem: NoteChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: clean,
      checked: false,
      linked_task_id: null,
    };
    const nextChecklist = [...(activeNote.checklist || []), newItem];
    setNewChecklistText("");
    await onUpdateNote(activeNote.id, { checklist: nextChecklist });
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!activeNote) return;
    const nextChecklist = (activeNote.checklist || []).map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    await onUpdateNote(activeNote.id, { checklist: nextChecklist });
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!activeNote) return;
    const nextChecklist = (activeNote.checklist || []).filter((item) => item.id !== itemId);
    await onUpdateNote(activeNote.id, { checklist: nextChecklist });
  };

  const handleConvertSingleChecklistItem = (item: NoteChecklistItem) => {
    if (!activeNote) return;
    onOpenNewTaskModalWithDraft(
      {
        title: item.text,
        description: `Ponto originado da anotação "${activeNote.title || "Anotação Rápida"}": ${item.text}.`,
        account_type: activeNote.account_type || "work",
        item_type: "task",
        tags: activeNote.tags || [],
      },
      activeNote.id,
      item.id
    );
  };

  const handleConvertWholeNoteOrSelection = () => {
    if (!activeNote) return;
    let selectedExcerpt = selectedTextExcerpt;
    if (!selectedExcerpt && textareaRef.current) {
      const start = textareaRef.current.selectionStart ?? 0;
      const end = textareaRef.current.selectionEnd ?? 0;
      if (end > start) {
        selectedExcerpt = draftContent.slice(start, end).trim();
      }
    }

    const effectiveContent = selectedExcerpt || draftContent.trim();
    const firstLine =
      (selectedExcerpt || draftTitle || effectiveContent).split(/\r?\n/)[0]?.trim() || "";
    onOpenNewTaskModalWithDraft(
      {
        title: firstLine.slice(0, 70),
        description: effectiveContent || draftTitle,
        account_type: activeNote.account_type || "work",
        item_type: activeNote.category === "reuniao" ? "activity" : "task",
        tags: activeNote.tags || [],
        validation_steps: (activeNote.checklist || [])
          .filter((c) => !c.checked)
          .map((c) => c.text),
      },
      activeNote.id
    );
  };

  // AI Organization with selectable style/mode
  const handleOrganizeWithAI = async (mode: NoteOrganizeMode = "auto") => {
    if (!activeNote || isOrganizingAi) return;
    setShowAiModesMenu(false);
    await flushPendingSave();

    if (!draftTitle.trim() && !draftContent.trim() && (activeNote.checklist || []).length === 0) {
      setAiMessage("Escreva ou dite algo na nota antes de pedir para a IA organizar.");
      return;
    }

    const modeMeta = AI_ORGANIZE_MODES.find((m) => m.id === mode);
    setIsOrganizingAi(true);
    setOrganizingModeLabel(modeMeta?.label || "Organizando");
    setAiMessage(null);

    try {
      const snapshot = {
        noteId: activeNote.id,
        title: draftTitle,
        content: draftContent,
        category: activeNote.category,
        checklist: activeNote.checklist || [],
        tags: activeNote.tags || [],
        ai_summary: activeNote.ai_summary,
        key_decisions: activeNote.key_decisions,
        demand_readiness: activeNote.demand_readiness,
      };

      const res = await fetch("/api/notes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "organize",
          mode,
          title: draftTitle,
          content: draftContent,
          checklist: activeNote.checklist || [],
          category: activeNote.category,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiMessage(data?.error || "Não foi possível organizar a nota com IA.");
        return;
      }

      setUndoSnapshot(snapshot);
      const isGenericTitle =
        !draftTitle.trim() ||
        draftTitle.startsWith("Reunião •") ||
        draftTitle.startsWith("Ideia •") ||
        draftTitle === "Sem título" ||
        draftTitle === "Anotação Rápida" ||
        draftTitle.endsWith("...");

      const nextTitle = isGenericTitle ? data.refined_title || draftTitle : draftTitle;
      const nextContent =
        mode === "checklist" && draftContent.trim()
          ? data.organized_content || draftContent
          : data.organized_content || draftContent;

      const existingTexts = new Set(
        (activeNote.checklist || []).map((c) => c.text.trim().toLowerCase())
      );
      // Só gera/adiciona itens de checklist quando o usuário solicitar explicitamente o modo "checklist"
      const newChecklistItems: NoteChecklistItem[] =
        mode === "checklist" && Array.isArray(data.checklist_items)
          ? data.checklist_items
              .filter((txt: string) => txt && !existingTexts.has(txt.trim().toLowerCase()))
              .map((txt: string, idx: number) => ({
                id: `chk-${Date.now()}-${idx}`,
                text: txt.trim(),
                checked: false,
                linked_task_id: null,
              }))
          : [];

      const mergedChecklist = [...(activeNote.checklist || []), ...newChecklistItems];
      if (mode === "checklist") {
        setShowChecklistSection(true);
      }
      const mergedTags = Array.from(
        new Set([...(activeNote.tags || []), ...(Array.isArray(data.tags) ? data.tags : [])])
      ).slice(0, 6);

      const nextReadiness =
        data.demand_readiness === "pronta" ||
        data.demand_readiness === "parcial" ||
        data.demand_readiness === "referencia"
          ? data.demand_readiness
          : activeNote.demand_readiness ?? null;

      setDraftTitle(nextTitle);
      setDraftContent(nextContent);
      await onUpdateNote(activeNote.id, {
        title: nextTitle,
        content: nextContent,
        checklist: mergedChecklist,
        tags: mergedTags,
        ai_summary: data.ai_summary || null,
        key_decisions: Array.isArray(data.key_decisions) ? data.key_decisions : [],
        demand_readiness: nextReadiness,
      });

      const addedStepsMsg =
        newChecklistItems.length > 0
          ? ` (+${newChecklistItems.length} ${newChecklistItems.length === 1 ? "item" : "itens"} no checklist)`
          : "";
      setAiMessage(
        `${modeMeta?.label || "Nota organizada"} aplicada pela IA${addedStepsMsg}. Use "Desfazer" se quiser voltar ao rascunho original.`
      );
    } catch {
      setAiMessage("Erro ao comunicar com o serviço de IA.");
    } finally {
      setIsOrganizingAi(false);
      setOrganizingModeLabel(null);
    }
  };

  const handleUndoOrganize = async () => {
    if (!undoSnapshot || !activeNote || undoSnapshot.noteId !== activeNote.id) return;
    setDraftTitle(undoSnapshot.title);
    setDraftContent(undoSnapshot.content);
    await onUpdateNote(activeNote.id, {
      title: undoSnapshot.title,
      content: undoSnapshot.content,
      category: undoSnapshot.category,
      checklist: undoSnapshot.checklist,
      tags: undoSnapshot.tags,
      ai_summary: undoSnapshot.ai_summary ?? null,
      key_decisions: undoSnapshot.key_decisions ?? [],
      demand_readiness: undoSnapshot.demand_readiness ?? null,
    });
    setUndoSnapshot(null);
    setAiMessage("Rascunho original restaurado.");
  };

  // Batch AI Organization across active notes (titles, tags, summaries, readiness)
  const handleBatchOrganizeNotes = async () => {
    if (isBatchOrganizing) return;
    const candidates = notes
      .filter((n) => !n.archived && ((n.title || "").trim() || (n.content || "").trim()))
      .slice(0, 15);
    if (candidates.length === 0) return;

    await flushPendingSave();
    setIsBatchOrganizing(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/notes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_organize",
          notes: candidates.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            category: n.category,
            tags: n.tags,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.updates)) {
        setAiMessage(data?.error || "Não foi possível organizar a lista de notas.");
        return;
      }

      let updatedCount = 0;
      for (const upd of data.updates) {
        const current = notes.find((n) => n.id === upd.id);
        if (!current) continue;
        const mergedTags = Array.from(new Set([...(current.tags || []), ...(upd.tags || [])])).slice(
          0,
          6
        );
        const nextTitle = upd.title || current.title;
        await onUpdateNote(current.id, {
          title: nextTitle,
          tags: mergedTags,
          ai_summary: upd.ai_summary || current.ai_summary || null,
          demand_readiness: upd.demand_readiness || current.demand_readiness || null,
        });
        if (activeNote && current.id === activeNote.id && !draftTitle.trim() && nextTitle) {
          setDraftTitle(nextTitle);
        }
        updatedCount++;
      }

      setAiMessage(
        `${updatedCount} ${updatedCount === 1 ? "anotação organizada" : "anotações organizadas"} com títulos, resumos, tags e sinalização de demanda pela IA!`
      );
    } catch {
      setAiMessage("Erro ao organizar anotações em lote com IA.");
    } finally {
      setIsBatchOrganizing(false);
    }
  };

  // Extract multiple demands from active note with AI
  const handleExtractTasksWithAI = async () => {
    if (!activeNote || isExtractingAi) return;
    await flushPendingSave();
    if (!draftTitle.trim() && !draftContent.trim() && (activeNote.checklist || []).length === 0) {
      setAiMessage("Escreva algo na anotação antes de extrair demandas com IA.");
      return;
    }

    setIsExtractingAi(true);
    setAiMessage(null);

    try {
      const res = await fetch("/api/notes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract_tasks",
          title: draftTitle,
          content: draftContent,
          checklist: activeNote.checklist || [],
          category: activeNote.category,
          account_type: activeNote.account_type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        setAiMessage(data?.error || "Nenhuma demanda acionável identificada nesta nota.");
        return;
      }

      setExtractedModalData({
        note: activeNote,
        summary: data.summary || "",
        keyDecisions: Array.isArray(data.key_decisions) ? data.key_decisions : [],
        drafts: data.tasks.map((t: ExtractedNoteTaskDraft) => ({ ...t, selected: true })),
      });
    } catch {
      setAiMessage("Erro ao extrair demandas da anotação com IA.");
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleConfirmBatchCreateTasks = async () => {
    if (!extractedModalData || isCreatingBatchTasks) return;
    const selected = extractedModalData.drafts.filter((d) => d.selected);
    if (selected.length === 0) return;

    setIsCreatingBatchTasks(true);
    try {
      const created = await onCreateTasksFromNote(extractedModalData.note, selected);
      if (created.length > 0) {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#8b5cf6", "#10b981"],
        });
        setAiMessage(
          `${created.length} demanda${created.length > 1 ? "s criadas" : " criada"} e vinculada${created.length > 1 ? "s" : ""} a esta nota!`
        );
      }
      setExtractedModalData(null);
    } finally {
      setIsCreatingBatchTasks(false);
    }
  };

  const linkedTasksList = useMemo(() => {
    if (!activeNote) return [];
    const ids = new Set<string>(activeNote.converted_task_ids || []);
    for (const item of activeNote.checklist || []) {
      if (item.linked_task_id) ids.add(item.linked_task_id);
    }
    return tasks.filter((t) => ids.has(t.id));
  }, [activeNote, tasks]);

  const activeColorStyle =
    COLOR_STYLES[(activeNote?.color as NoteColor) || "default"] || COLOR_STYLES.default;

  const wordCount = useMemo(() => {
    const clean = draftContent.trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  }, [draftContent]);

  const isBlankActiveNote =
    Boolean(activeNote) &&
    !draftTitle.trim() &&
    !draftContent.trim() &&
    (activeNote?.checklist || []).length === 0;

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* ========================================================================= */}
      {/* 1. MENU SUPERIOR LIMPO: CAPTURA RÁPIDA + NOVA NOTA EM BRANCO (SEM BARRA DE CATEGORIAS!) */}
      {/* ========================================================================= */}
      <div
        className={`rounded-xl bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4]/80 dark:border-[#44394F] p-3.5 space-y-2.5 shrink-0 ${
          mobileScreen === "editor" ? "hidden lg:block" : "block"
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[#392D4B] dark:text-[#F5F1E8] leading-tight tracking-tight">
                Anotações Rápidas
              </h1>
              <p className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] truncate">
                Anote livremente, organize com IA e transforme em demanda quando precisar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCreateBlankNote}
              disabled={isCreatingQuick}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              title="Criar uma nova anotação em branco"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Nota</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopScopeMenu((prev) => !prev);
                }}
                disabled={isCreatingQuick}
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[#FFFCF6] hover:bg-[#E7DFF5] dark:bg-[#352D42] dark:hover:bg-[#3D344C] text-slate-700 dark:text-zinc-200 border border-[#E4DCE4]/80 dark:border-[#44394F] text-xs font-medium transition-colors cursor-pointer"
                title="Criar nota usando um modo/escopo opcional"
              >
                <span>Escopos</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {showTopScopeMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1.5 w-64 rounded-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] shadow-popover p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Modos de Escopo (Opcional)
                  </div>
                  {(Object.keys(SCOPE_PRESETS) as ScopePresetId[]).map((presetId) => {
                    const preset = SCOPE_PRESETS[presetId];
                    return (
                      <button
                        key={presetId}
                        type="button"
                        onClick={() => handleCreateScopedNote(presetId)}
                        className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#E7DFF5] dark:hover:bg-white/[0.05] text-left transition-colors cursor-pointer"
                      >
                        <div className="mt-0.5 shrink-0">{preset.icon}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-[#F5F1E8]">
                            {preset.label}
                          </div>
                          <div className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] leading-snug">
                            {preset.shortDesc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Captura Rápida Limpa */}
        <form onSubmit={handleQuickCreate} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#F2ECE2]/80 dark:bg-[#352D42] border border-[#E4DCE4]/80 dark:border-[#44394F] focus-within:bg-[#FFFCF6] dark:focus-within:bg-[#352D42] rounded-lg px-3 py-1 focus-within:border-[#7455AD] focus-within:ring-2 focus-within:ring-[#7455AD]/15 transition-all">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Anotar algo rápido para lembrar ou transformar em demanda depois..."
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] text-[#392D4B] dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-zinc-500 outline-none py-1"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={() => toggleDictation("quick")}
                title={listeningTarget === "quick" ? "Parar ditado" : "Ditar nota por voz"}
                className={`p-1.5 rounded-md transition-colors shrink-0 cursor-pointer ${
                  listeningTarget === "quick"
                    ? "bg-rose-500/15 text-rose-500 animate-pulse"
                    : "text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-white"
                }`}
              >
                {listeningTarget === "quick" ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!quickText.trim() || isCreatingQuick}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-[#7455AD] dark:hover:bg-[#654696] text-white text-xs font-semibold transition-colors disabled:opacity-35 cursor-pointer shrink-0"
          >
            {isCreatingQuick ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Salvar</span>
          </button>
        </form>
      </div>

      {/* 2. SPLIT-PANE NOTES WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        <section
          className={`${
            mobileScreen === "list" ? "flex" : "hidden"
          } ${
            isLibraryCollapsed ? "lg:hidden" : "lg:flex"
          } flex-col w-full lg:w-[330px] xl:w-[364px] shrink-0 rounded-xl bg-surface border border-line overflow-hidden min-h-0 flex-1 lg:flex-none`}
        >
          <div className="p-3 border-b border-[#E4DCE4]/75 dark:border-[#44394F] space-y-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar anotações, tags, resumos..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-[#F2ECE2]/80 dark:bg-[#352D42] border border-[#E4DCE4]/80 dark:border-[#44394F] focus:bg-[#FFFCF6] dark:focus:bg-[#352D42] text-xs text-[#392D4B] dark:text-[#F5F1E8] placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#7455AD]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleBatchOrganizeNotes}
                disabled={isBatchOrganizing || activeNotesCount === 0}
                title="Usar IA para gerar títulos, resumos, tags e sinalizar quais notas estão prontas para virar demanda"
                className="h-8 px-2.5 rounded-lg bg-[#E7DFF5] hover:bg-[#D8C9EE] dark:bg-[#332A45] dark:hover:bg-[#654696]/25 text-[#654696] dark:text-[#D8C9EE] border border-[#D8C9EE]/80 dark:border-[#7455AD]/30 inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isBatchOrganizing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>IA</span>
              </button>
            </div>

            {/* Menu de Filtros abaixo da busca */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
              {[
                { id: "all", label: `Todas (${showArchived ? archivedNotesCount : activeNotesCount})` },
                { id: "geral", label: "Livres" },
                { id: "reuniao", label: "Reuniões" },
                { id: "ideia", label: "Ideias" },
                { id: "checklist", label: "Checklist" },
                { id: "pinned", label: "Fixadas" },
                { id: "converted", label: "Viraram Demanda" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterChip(chip.id as any)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterChip === chip.id
                      ? "bg-[#7455AD] text-white font-semibold"
                      : "bg-[#F2ECE2]/80 dark:bg-[#352D42] text-slate-600 dark:text-[#B6A9C3] hover:text-[#392D4B] dark:hover:text-zinc-100"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista rolável de notas */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
            {filteredNotes.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2.5 text-slate-400 dark:text-[#756B80]">
                <StickyNote className="w-8 h-8 mx-auto opacity-35 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {showArchived
                    ? "Nenhuma anotação arquivada"
                    : "Nenhuma anotação encontrada"}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {showArchived
                    ? "Notas arquivadas aparecem aqui para consulta futura."
                    : "Crie uma nota em branco ou digite algo rápido no campo acima."}
                </p>
                {!showArchived && (
                  <button
                    type="button"
                    onClick={handleCreateBlankNote}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Nota em Branco</span>
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                const catMeta = CATEGORY_META[note.category] || CATEGORY_META.geral;
                const colMeta =
                  COLOR_STYLES[(note.color as NoteColor) || "default"] || COLOR_STYLES.default;
                const checkedCount = (note.checklist || []).filter((c) => c.checked).length;
                const totalChecklist = (note.checklist || []).length;
                const convertedCount = getConvertedTaskCount(note);

                let relDate = "";
                try {
                  relDate = formatDistanceToNow(parseISO(note.updated_at || note.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  });
                } catch {}

                const displayTitle =
                  note.title && note.title.trim() && note.title !== "Sem título"
                    ? note.title
                    : note.content?.trim()
                    ? note.content.trim().split(/\r?\n/)[0].slice(0, 52)
                    : "Nota em branco";

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNote(note)}
                    className={`w-full text-left p-3 rounded-xl border border-l-[3px] ${colMeta.accentBorder} transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "border-[#7455AD]/70 bg-[#E7DFF5]/70 dark:bg-[#332A45] shadow-sm ring-1 ring-[#7455AD]/25"
                        : `${colMeta.subtleBg} border-[#E4DCE4]/80 dark:border-[#44394F]/80 hover:border-[#B6A2DB] dark:hover:border-indigo-700/60`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13px] font-bold text-[#392D4B] dark:text-white line-clamp-1 flex-1 min-w-0">
                        {displayTitle}
                      </h3>

                      <div className="flex items-center gap-1 shrink-0">
                        {note.pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        {convertedCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                            {convertedCount} dem.
                          </span>
                        ) : note.demand_readiness === "pronta" ? (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-semibold"
                            title="A IA identificou ações prontas para virar demanda"
                          >
                            Pronta
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {(note.ai_summary || note.content) && (
                      <p className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] line-clamp-2 leading-snug">
                        {note.ai_summary || note.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-[#756B80] pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {note.category !== "geral" && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${catMeta.badgeClass}`}
                          >
                            {catMeta.icon}
                            <span>{catMeta.label}</span>
                          </span>
                        )}
                        {totalChecklist > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-slate-600 dark:text-slate-300 font-mono font-semibold">
                            <ListChecks className="w-3 h-3 text-[#7455AD]" />
                            {checkedCount}/{totalChecklist}
                          </span>
                        )}
                        {note.tags && note.tags.length > 0 && (
                          <span className="text-[#7455AD]/80 dark:text-[#B6A2DB]/80 truncate max-w-[90px]">
                            #{note.tags[0]}
                          </span>
                        )}
                      </div>
                      <span className="truncate shrink-0">{relDate}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé da lista: Alternar Ativas / Arquivadas */}
          {archivedNotesCount > 0 && (
            <div className="px-3 py-2 border-t border-[#E5E0D6] dark:border-[#44394F]/80 bg-[#FAF6EF]/70 dark:bg-[#241F2D] flex items-center justify-between text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-[#B6A9C3] hover:text-[#7455AD] dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>
                  {showArchived
                    ? `Voltar para ativas (${activeNotesCount})`
                    : `Ver arquivadas (${archivedNotesCount})`}
                </span>
              </button>
            </div>
          )}
        </section>

        {/* COLUNA DIREITA: EDITOR COMPLETO + MODOS OPCIONAIS + SUÍTE DE IA */}
        <section
          className={`${
            mobileScreen === "editor" ? "flex" : "hidden"
          } lg:flex flex-1 min-w-0 min-h-0 flex-col rounded-xl bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4]/80 dark:border-[#44394F] overflow-hidden`}
        >
          {!activeNote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400 dark:text-[#756B80]">
              <StickyNote className="w-10 h-10 opacity-30 text-[#7455AD]" />
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Comece uma anotação em branco
                </h3>
                <p className="text-xs leading-relaxed">
                  Anote ideias, recados ou detalhes rápidos sem burocracia. Quando quiser, peça para a IA organizar ou transformar em demanda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBlankNote}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Nota em Branco</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header do Editor */}
              <div className="px-4 sm:px-5 py-2.5 border-b border-[#E4DCE4]/75 dark:border-[#44394F] bg-[#FAF6EF] dark:bg-[#241F2D] flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      await flushPendingSave();
                      setMobileScreen("list");
                    }}
                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface border border-line text-ink text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Notas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLibraryCollapsed((prev) => !prev)}
                    title={
                      isLibraryCollapsed
                        ? "Mostrar biblioteca de notas"
                        : "Recolher biblioteca (Modo foco de escrita)"
                    }
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-surface border border-line hover:border-brand text-ink-muted hover:text-brand text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isLibraryCollapsed ? (
                      <>
                        <PanelLeftOpen className="w-3.5 h-3.5" />
                        <span>Biblioteca</span>
                      </>
                    ) : (
                      <>
                        <PanelLeftClose className="w-3.5 h-3.5" />
                        <span>Modo foco</span>
                      </>
                    )}
                  </button>

                  {/* Seletor sutil de Modo/Escopo (Livre por padrão) */}
                  <select
                    value={activeNote.category}
                    onChange={(e) =>
                      onUpdateNote(activeNote.id, { category: e.target.value as NoteCategory })
                    }
                    title="Modo de organização da nota (opcional)"
                    className="h-8 px-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="geral">Modo: Livre</option>
                    <option value="reuniao">Modo: Reunião</option>
                    <option value="ideia">Modo: Ideia</option>
                    <option value="checklist">Modo: Checklist</option>
                  </select>

                  {/* Botão opcional para inserir estrutura de escopo sem perder texto */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditorScopeMenu((prev) => !prev);
                      }}
                      className="h-8 inline-flex items-center gap-1 px-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] hover:border-[#B6A2DB] text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Inserir escopo estruturado nesta nota (opcional)"
                    >
                      <Sparkle className="w-3 h-3 text-[#7455AD]" />
                      <span className="hidden sm:inline">Inserir Escopo</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {showEditorScopeMenu && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          Aplicar Escopo na Nota
                        </div>
                        {(Object.keys(SCOPE_PRESETS) as ScopePresetId[]).map((presetId) => {
                          const preset = SCOPE_PRESETS[presetId];
                          return (
                            <button
                              key={presetId}
                              type="button"
                              onClick={() => handleApplyScopeToActiveNote(presetId)}
                              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#E7DFF5] dark:hover:bg-white/[0.05] text-left transition-colors cursor-pointer"
                            >
                              <div className="mt-0.5 shrink-0">{preset.icon}</div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-800 dark:text-white">
                                  {preset.label}
                                </div>
                                <div className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] leading-snug">
                                  {preset.shortDesc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Contexto Trabalho / Pessoal */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNote(activeNote.id, {
                        account_type: isWorkAccountType(activeNote.account_type)
                          ? "personal"
                          : "work",
                      })
                    }
                    className={`h-8 inline-flex items-center gap-1 px-2.5 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors ${
                      isWorkAccountType(activeNote.account_type)
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                        : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
                    }`}
                    title="Alternar contexto Trabalho / Pessoal"
                  >
                    {isWorkAccountType(activeNote.account_type) ? (
                      <>
                        <Briefcase className="w-3 h-3" />
                        <span>Trabalho</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        <span>Pessoal</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Ações Utilitárias Direitas */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-[#756B80] mr-1 hidden sm:inline">
                    {saveState === "saving"
                      ? "Salvando..."
                      : saveState === "dirty"
                      ? "Editando..."
                      : "Salvo"}
                  </span>

                  {/* Copiar */}
                  <button
                    type="button"
                    onClick={handleCopyNoteText}
                    className="p-1.5 rounded-xl hover:bg-[#E7DFF5]/70 dark:hover:bg-[#3D344C] text-[#756B80] dark:text-[#B6A9C3] cursor-pointer"
                    title="Copiar conteúdo da nota"
                  >
                    {copiedFeedback ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Seletor de Cor */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker((prev) => !prev);
                      }}
                      className="p-1.5 rounded-xl hover:bg-[#E7DFF5]/70 dark:hover:bg-[#3D344C] text-[#756B80] dark:text-[#B6A9C3] cursor-pointer"
                      title="Cor da anotação"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    {showColorPicker && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 p-2 rounded-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] shadow-xl flex items-center gap-1.5 z-30"
                      >
                        {(Object.keys(COLOR_STYLES) as NoteColor[]).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              onUpdateNote(activeNote.id, { color: col });
                              setShowColorPicker(false);
                            }}
                            className={`w-5 h-5 rounded-full ${COLOR_STYLES[col].dot} ${
                              activeNote.color === col ? "ring-2 ring-offset-2 ring-[#7455AD]" : ""
                            } cursor-pointer`}
                            title={COLOR_STYLES[col].label}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pin */}
                  <button
                    type="button"
                    onClick={() => onUpdateNote(activeNote.id, { pinned: !activeNote.pinned })}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      activeNote.pinned
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        : "hover:bg-[#E7DFF5]/70 dark:hover:bg-[#3D344C] text-[#756B80] dark:text-[#B6A9C3]"
                    }`}
                    title={activeNote.pinned ? "Desafixar nota" : "Fixar nota no topo"}
                  >
                    {activeNote.pinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </button>

                  {/* Arquivar / Restaurar */}
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNote(activeNote.id, { archived: !activeNote.archived })
                    }
                    className="p-1.5 rounded-xl hover:bg-[#E7DFF5]/70 dark:hover:bg-[#3D344C] text-[#756B80] dark:text-[#B6A9C3] cursor-pointer"
                    title={activeNote.archived ? "Restaurar para notas ativas" : "Arquivar anotação"}
                  >
                    {activeNote.archived ? (
                      <ArchiveRestore className="w-4 h-4 text-[#7455AD]" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>

                  {/* Delete */}
                  {confirmDeleteId === activeNote.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        dirtyNoteRef.current = null;
                        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                        await onDeleteNote(activeNote.id);
                        setConfirmDeleteId(null);
                        setMobileScreen("list");
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeNote.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Barra Completa de IA & Conversão em Demanda */}
              <div className="px-4 sm:px-5 py-2 border-b border-[#E4DCE4]/75 dark:border-[#44394F] bg-[#FFFCF6] dark:bg-[#2C2637] flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Split button: Organizar com IA + Menu de Modos Especializados */}
                  <div className="relative inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => handleOrganizeWithAI("auto")}
                      disabled={isOrganizingAi}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-l-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isOrganizingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                      )}
                      <span>{isOrganizingAi ? organizingModeLabel || "Organizando..." : "Organizar com IA"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isOrganizingAi}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAiModesMenu((prev) => !prev);
                      }}
                      title="Escolher estilo de organização da IA"
                      className="px-2 py-1.5 rounded-r-xl bg-[#FFFCF6] dark:bg-[#352D42] border border-l-0 border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {showAiModesMenu && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          Como a IA deve organizar esta nota?
                        </div>
                        {AI_ORGANIZE_MODES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleOrganizeWithAI(m.id)}
                            className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[#E7DFF5]/70 dark:hover:bg-white/[0.05] text-left transition-colors cursor-pointer"
                          >
                            <div className="mt-0.5 shrink-0">{m.icon}</div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 dark:text-white">
                                {m.label}
                              </div>
                              <div className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] leading-snug">
                                {m.desc}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extrair Múltiplas Demandas com IA */}
                  <button
                    type="button"
                    onClick={handleExtractTasksWithAI}
                    disabled={isExtractingAi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Deixar a IA identificar e criar uma ou várias demandas a partir desta anotação"
                  >
                    {isExtractingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Extrair Demandas</span>
                  </button>

                  {/* Conversão Direta (Nota Inteira ou Trecho Selecionado) */}
                  <button
                    type="button"
                    onClick={handleConvertWholeNoteOrSelection}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      selectedTextExcerpt
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs"
                        : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                    }`}
                    title={
                      selectedTextExcerpt
                        ? "Transformar o trecho selecionado em demanda"
                        : "Transformar esta nota em uma demanda detalhada"
                    }
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>{selectedTextExcerpt ? "Virar Demanda (seleção)" : "Virar Demanda"}</span>
                  </button>

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleDictation("editor")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        listeningTarget === "editor"
                          ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                          : "bg-[#FFFCF6] dark:bg-[#352D42] border-[#E4DCE4] dark:border-[#44394F] text-slate-600 dark:text-slate-300"
                      }`}
                      title="Ditar diretamente no corpo da nota"
                    >
                      {listeningTarget === "editor" ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span className="hidden xl:inline">
                        {listeningTarget === "editor" ? "Ouvindo..." : "Ditar"}
                      </span>
                    </button>
                  )}

                  {undoSnapshot && undoSnapshot.noteId === activeNote.id && (
                    <button
                      type="button"
                      onClick={handleUndoOrganize}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-[#352D42] dark:hover:bg-[#38445C] text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Desfazer IA</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback de IA */}
              {aiMessage && (
                <div className="mx-3 sm:mx-5 mt-2.5 px-3 py-2 rounded-xl bg-[#E7DFF5] dark:bg-[#332A45] border border-[#D8C9EE] dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
                  <span>{aiMessage}</span>
                  <button
                    type="button"
                    onClick={() => setAiMessage(null)}
                    className="text-[#7455AD] hover:text-indigo-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Corpo Rolável do Editor */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar">
                {/* Título + Barra Leve de Inserção + Área de Texto Livre */}
                <div className={`space-y-2.5 border-l-[3px] pl-3.5 ${activeColorStyle.accentBorder}`}>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={draftTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftTitle(val);
                      scheduleAutosave(activeNote.id, val, draftContent);
                    }}
                    placeholder="Título da anotação (opcional — a IA também pode criar depois)..."
                    className="w-full text-base sm:text-xl font-bold text-[#392D4B] dark:text-white bg-transparent outline-none placeholder-slate-400/80"
                  />

                  {/* Barra rápida de escrita + status de palavras */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => insertSnippetAtCursor("• ")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F2ECE2] hover:bg-[#E7DFF5]/80 dark:bg-[#352D42]/80 dark:hover:bg-[#38445C] text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Inserir tópico"
                      >
                        <List className="w-3 h-3" />
                        <span>Tópico</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertSnippetAtCursor(`[${format(new Date(), "dd/MM HH:mm", { locale: ptBR })}] `)
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F2ECE2] hover:bg-[#E7DFF5]/80 dark:bg-[#352D42]/80 dark:hover:bg-[#38445C] text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Inserir data e hora atual"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Data/Hora</span>
                      </button>
                      {(activeNote.checklist || []).length === 0 && !showChecklistSection && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowChecklistSection(true);
                            requestAnimationFrame(() => checklistInputRef.current?.focus());
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E7DFF5] hover:bg-[#D8C9EE] dark:bg-[#332A45] dark:hover:bg-indigo-900/50 text-[11px] font-semibold text-[#654696] dark:text-[#D8C9EE] border border-[#D8C9EE]/70 dark:border-indigo-800/60 transition-colors cursor-pointer"
                          title="Adicionar checklist a esta anotação"
                        >
                          <ListChecks className="w-3 h-3" />
                          <span>+ Checklist</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                      {activeNote.demand_readiness === "pronta" && linkedTasksList.length === 0 && (
                        <button
                          type="button"
                          onClick={handleExtractTasksWithAI}
                          className="font-sans inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold hover:bg-purple-100 cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Pronta para virar demanda
                        </button>
                      )}
                      <span>{wordCount} {wordCount === 1 ? "palavra" : "palavras"}</span>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={8}
                    value={draftContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftContent(val);
                      scheduleAutosave(activeNote.id, draftTitle, val);
                    }}
                    onSelect={handleTrackSelection}
                    onKeyUp={handleTrackSelection}
                    onMouseUp={handleTrackSelection}
                    placeholder="Escreva livremente o que precisar registrar... Dica: depois você pode clicar em 'Organizar com IA' ou selecionar qualquer trecho para transformar em demanda."
                    className="w-full text-xs sm:text-sm text-slate-800 dark:text-[#F5F1E8] bg-[#FAF6EF]/70 dark:bg-[#241F2D] border border-[#E4DCE4]/80 dark:border-[#44394F] rounded-xl p-3.5 outline-none focus:border-[#7455AD] focus:ring-2 focus:ring-[#7455AD]/15 leading-relaxed resize-y min-h-[170px]"
                  />

                  {/* Sugestões opcionais discretas quando a folha está totalmente em branco */}
                  {isBlankActiveNote && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">
                      <span>Folha livre — ou aplique um escopo opcional:</span>
                      {(Object.keys(SCOPE_PRESETS) as ScopePresetId[]).map((presetId) => (
                        <button
                          key={presetId}
                          type="button"
                          onClick={() => handleApplyScopeToActiveNote(presetId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F2ECE2] hover:bg-[#E7DFF5] dark:bg-[#352D42]/80 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-slate-300 hover:text-[#7455AD] dark:hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                        >
                          {SCOPE_PRESETS[presetId].icon}
                          <span>{SCOPE_PRESETS[presetId].label.replace("Modo ", "")}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tags da Nota (Manuais + IA) */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {(activeNote.tags || []).map((tg) => (
                      <span
                        key={tg}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F2ECE2] dark:bg-[#352D42] text-slate-700 dark:text-slate-300 border border-[#E4DCE4]/80 dark:border-[#44394F] text-[11px] font-medium"
                      >
                        <span>#{tg}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tg)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}

                    {isAddingTag ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleAddTag();
                            }
                            if (e.key === "Escape") {
                              setIsAddingTag(false);
                              setNewTagInput("");
                            }
                          }}
                          placeholder="tag..."
                          className="w-24 px-2 py-0.5 rounded-md border border-[#B6A2DB] bg-[#FFFCF6] dark:bg-[#352D42] text-[11px] text-[#392D4B] dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="p-0.5 rounded bg-[#7455AD] text-white cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingTag(false);
                            setNewTagInput("");
                          }}
                          className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(true)}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#7455AD] dark:text-[#B6A2DB] hover:bg-[#E7DFF5] dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tag</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Síntese & Pontos-Chave da IA */}
                {(activeNote.ai_summary ||
                  (activeNote.key_decisions && activeNote.key_decisions.length > 0)) && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-800/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Síntese & Pontos-Chave (IA)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateNote(activeNote.id, { ai_summary: null, key_decisions: [] })
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        title="Ocultar resumo da IA"
                      >
                        Limpar
                      </button>
                    </div>
                    {activeNote.ai_summary && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeNote.ai_summary}
                      </p>
                    )}
                    {activeNote.key_decisions && activeNote.key_decisions.length > 0 && (
                      <ul className="space-y-1 pt-1">
                        {activeNote.key_decisions.map((dec, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{dec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Pontos de Ação & Checklist (exibido apenas se a nota já tiver itens ou se o usuário solicitar) */}
                {(showChecklistSection || (activeNote.checklist || []).length > 0) && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6EF]/80 dark:bg-[#352D42] border border-[#E4DCE4]/80 dark:border-[#44394F] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-[#7455AD]" />
                      <h4 className="text-xs font-bold text-[#392D4B] dark:text-white">
                        Checklist ({(activeNote.checklist || []).length})
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {(activeNote.checklist || []).length > 0 && (
                        <span className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] hidden sm:inline">
                          Toque em <strong>→ Demanda</strong> para enviar direto ao fluxo
                        </span>
                      )}
                      {draftContent.trim().length > 8 && (
                        <button
                          type="button"
                          disabled={isOrganizingAi}
                          onClick={() => handleOrganizeWithAI("checklist")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40"
                          title="Gerar itens do checklist a partir do texto da nota com IA"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Gerar c/ IA</span>
                        </button>
                      )}
                      {(activeNote.checklist || []).length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChecklistSection(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title="Ocultar checklist vazio"
                        >
                          Ocultar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Input adicionar item */}
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={checklistInputRef}
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddChecklistItem();
                        }
                      }}
                      placeholder="Adicionar item ao checklist..."
                      className="flex-1 h-9 px-3 rounded-xl bg-[#FFFCF6] dark:bg-[#241F2D] border border-[#E4DCE4] dark:border-[#44394F] text-xs text-[#392D4B] dark:text-white outline-none focus:border-[#7455AD]"
                    />
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={() => toggleDictation("checklist")}
                        className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                          listeningTarget === "checklist"
                            ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                            : "bg-[#FFFCF6] dark:bg-[#241F2D] border-[#E4DCE4] dark:border-[#44394F] text-[#756B80]"
                        }`}
                        title="Ditar item de checklist"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistText.trim()}
                      className="h-9 px-3 rounded-xl bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lista de itens */}
                  {(activeNote.checklist || []).length > 0 && (
                    <div className="space-y-1.5">
                      {(activeNote.checklist || []).map((item) => {
                        const linkedTask = item.linked_task_id
                          ? tasks.find((t) => t.id === item.linked_task_id)
                          : undefined;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-[#FFFCF6] dark:bg-[#241F2D] border border-[#E4DCE4]/80 dark:border-[#44394F]/80"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleChecklistItem(item.id)}
                              className="flex items-start gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                            >
                              {item.checked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <span
                                className={`text-xs leading-snug break-words ${
                                  item.checked
                                    ? "line-through text-slate-400 dark:text-[#756B80]"
                                    : "text-slate-800 dark:text-slate-200 font-medium"
                                }`}
                              >
                                {item.text}
                              </span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              {linkedTask ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectTask(linkedTask)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer hover:underline"
                                >
                                  <span>Ver demanda</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConvertSingleChecklistItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E7DFF5] hover:bg-[#D8C9EE] dark:bg-[#332A45] dark:hover:bg-indigo-900/60 text-[#654696] dark:text-[#D8C9EE] border border-[#D8C9EE] dark:border-indigo-800/60 text-[11px] font-bold cursor-pointer transition-colors"
                                  title="Transformar este ponto em demanda"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  <span>Demanda</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteChecklistItem(item.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Remover item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                )}

                {/* Demandas originadas desta nota */}
                {linkedTasksList.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Demandas criadas a partir desta nota ({linkedTasksList.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedTasksList.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onSelectTask(task)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFFCF6] dark:bg-[#2C2637] border border-emerald-200 dark:border-emerald-800/70 text-xs font-semibold text-slate-800 dark:text-[#F5F1E8] hover:border-emerald-400 transition-colors cursor-pointer shadow-2xs"
                        >
                          <span className="text-[10px] font-mono font-bold text-[#7455AD] dark:text-purple-400">
                            {task.priority}
                          </span>
                          <span className="truncate max-w-[200px] sm:max-w-[280px]">
                            {task.title}
                          </span>
                          <ExternalLink className="w-3 h-3 text-emerald-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL DE REVISÃO: DEMANDAS EXTRAÍDAS DA NOTA PELA IA */}
      {/* ========================================================================= */}
      {extractedModalData && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-2.5 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4] dark:border-[#44394F] shadow-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#E5E0D6] dark:border-[#44394F] bg-[#FAF6EF]/80 dark:bg-[#241F2D] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#392D4B] dark:text-white truncate">
                    Demandas Identificadas pela IA ({extractedModalData.drafts.length})
                  </h3>
                  <p className="text-[11px] text-[#756B80] dark:text-[#B6A9C3] truncate">
                    Revise título, prioridade, descrição ou clique em &quot;Editar antes&quot; para abrir o formulário completo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExtractedModalData(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 custom-scrollbar">
              {extractedModalData.drafts.map((draft, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    draft.selected
                      ? "bg-[#E7DFF5]/40 dark:bg-indigo-950/20 border-[#B6A2DB] dark:border-[#B6A2DB]/50"
                      : "bg-[#FAF6EF]/60 dark:bg-[#241F2D] border-[#E4DCE4] dark:border-[#44394F] opacity-65"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExtractedModalData((prev) =>
                          prev
                            ? {
                                ...prev,
                                drafts: prev.drafts.map((d, i) =>
                                  i === idx ? { ...d, selected: !d.selected } : d
                                ),
                              }
                            : null
                        )
                      }
                      className="mt-1 cursor-pointer shrink-0"
                    >
                      {draft.selected ? (
                        <CheckSquare className="w-4 h-4 text-[#7455AD] dark:text-[#B6A2DB]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) =>
                          setExtractedModalData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  drafts: prev.drafts.map((d, i) =>
                                    i === idx ? { ...d, title: e.target.value } : d
                                  ),
                                }
                              : null
                          )
                        }
                        className="w-full text-xs sm:text-sm font-bold text-[#392D4B] dark:text-white bg-[#FFFCF6] dark:bg-[#352D42] border border-[#E4DCE4] dark:border-[#44394F] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7455AD]"
                      />

                      <textarea
                        rows={2}
                        value={draft.description}
                        onChange={(e) =>
                          setExtractedModalData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  drafts: prev.drafts.map((d, i) =>
                                    i === idx ? { ...d, description: e.target.value } : d
                                  ),
                                }
                              : null
                          )
                        }
                        className="w-full text-[11px] text-slate-600 dark:text-slate-300 bg-[#FFFCF6]/80 dark:bg-[#2C2637] border border-[#E4DCE4]/80 dark:border-[#44394F] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7455AD] leading-relaxed resize-none"
                      />

                      <div className="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <select
                            value={draft.priority}
                            onChange={(e) =>
                              setExtractedModalData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      drafts: prev.drafts.map((d, i) =>
                                        i === idx
                                          ? { ...d, priority: e.target.value as Priority }
                                          : d
                                      ),
                                    }
                                  : null
                              )
                            }
                            className="px-2 py-0.5 rounded-md bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4] dark:border-[#44394F] font-mono font-bold text-[#7455AD] dark:text-purple-300 outline-none cursor-pointer"
                          >
                            <option value="P1">P1</option>
                            <option value="P2">P2</option>
                            <option value="P3">P3</option>
                            <option value="P4">P4</option>
                          </select>

                          <select
                            value={draft.item_type}
                            onChange={(e) =>
                              setExtractedModalData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      drafts: prev.drafts.map((d, i) =>
                                        i === idx
                                          ? { ...d, item_type: e.target.value as ItemType }
                                          : d
                                      ),
                                    }
                                  : null
                              )
                            }
                            className="px-2 py-0.5 rounded-md bg-[#FFFCF6] dark:bg-[#2C2637] border border-[#E4DCE4] dark:border-[#44394F] font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                          >
                            <option value="task">Tarefa</option>
                            <option value="activity">Atividade</option>
                            <option value="reminder">Lembrete</option>
                          </select>

                          <span className="px-2 py-0.5 rounded-md bg-[#F2ECE2] dark:bg-[#352D42] text-slate-600 dark:text-slate-300 font-semibold">
                            {draft.category}
                          </span>

                          {draft.extracted_due_date_iso && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E7DFF5] dark:bg-[#332A45] text-[#654696] dark:text-[#D8C9EE] font-semibold">
                              <Calendar className="w-3 h-3" />
                              {(() => {
                                try {
                                  return format(parseISO(draft.extracted_due_date_iso), "dd/MM HH:mm", {
                                    locale: ptBR,
                                  });
                                } catch {
                                  return "Com prazo";
                                }
                              })()}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const noteRef = extractedModalData.note;
                            setExtractedModalData(null);
                            onOpenNewTaskModalWithDraft(draft, noteRef.id);
                          }}
                          className="text-[11px] font-semibold text-[#7455AD] dark:text-[#B6A2DB] hover:underline cursor-pointer"
                        >
                          Editar antes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 sm:px-5 py-3 border-t border-[#E5E0D6] dark:border-[#44394F] bg-[#FAF6EF]/80 dark:bg-[#241F2D] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExtractedModalData(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#B6A9C3] hover:bg-[#E7DFF5]/70 dark:hover:bg-[#3D344C] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isCreatingBatchTasks ||
                  extractedModalData.drafts.filter((d) => d.selected).length === 0
                }
                onClick={handleConfirmBatchCreateTasks}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7455AD] hover:bg-[#654696] text-white text-xs font-bold shadow-md disabled:opacity-40 cursor-pointer"
              >
                {isCreatingBatchTasks ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  Criar {extractedModalData.drafts.filter((d) => d.selected).length} Demanda
                  {extractedModalData.drafts.filter((d) => d.selected).length === 1 ? "" : "s"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
