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
  Check,
  CheckCircle2,
  Clock,
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
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Note,
  NoteCategory,
  NoteChecklistItem,
  NoteColor,
  Task,
  ExtractedNoteTaskDraft,
} from "@/types";

interface NotesViewProps {
  notes: Note[];
  tasks: Task[];
  accountFilter?: "all" | string;
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

const CATEGORY_META: Record<
  NoteCategory,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
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
  geral: {
    label: "Geral",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700",
    icon: <FileText className="w-3 h-3" />,
  },
};

const COLOR_STYLES: Record<
  NoteColor,
  { dot: string; accentBorder: string; subtleBg: string; label: string }
> = {
  default: {
    dot: "bg-slate-400",
    accentBorder: "border-l-slate-400 dark:border-l-zinc-600",
    subtleBg: "bg-white dark:bg-[#12131c]",
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

export function NotesView({
  notes,
  tasks,
  accountFilter = "all",
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateTasksFromNote,
  onOpenNewTaskModalWithDraft,
  onSelectTask,
}: NotesViewProps) {
  // Quick Capture bar state
  const [quickText, setQuickText] = useState("");
  const [quickCategory, setQuickCategory] = useState<NoteCategory>("reuniao");
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);

  // List & Filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChip, setFilterChip] = useState<"all" | NoteCategory | "pinned">("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mobileScreen, setMobileScreen] = useState<"list" | "editor">("list");

  // Local editor draft state (synced with selected note + debounced autosave)
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Voice Dictation (Web Speech API)
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<"quick" | "editor" | "checklist" | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningTargetRef = useRef<"quick" | "editor" | "checklist" | null>(null);

  // AI Actions state
  const [isOrganizingAi, setIsOrganizingAi] = useState(false);
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    noteId: string;
    title: string;
    content: string;
    checklist: NoteChecklistItem[];
    tags: string[];
    ai_summary?: string | null;
    key_decisions?: string[];
  } | null>(null);

  // Extracted tasks review modal state
  const [extractedModalData, setExtractedModalData] = useState<{
    note: Note;
    summary: string;
    keyDecisions: string[];
    drafts: (ExtractedNoteTaskDraft & { selected: boolean })[];
  } | null>(null);
  const [isCreatingBatchTasks, setIsCreatingBatchTasks] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyNoteRef = useRef<{
    noteId: string;
    title: string;
    content: string;
  } | null>(null);

  // Filtered notes based on workspace filter, chip & search query
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (n.archived) return false;
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
      if (
        filterChip !== "all" &&
        filterChip !== "pinned" &&
        n.category !== filterChip
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const inTitle = (n.title || "").toLowerCase().includes(q);
        const inContent = (n.content || "").toLowerCase().includes(q);
        const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
        const inChecklist = (n.checklist || []).some((c) => c.text.toLowerCase().includes(q));
        if (!inTitle && !inContent && !inTags && !inChecklist) return false;
      }

      return true;
    });
  }, [notes, accountFilter, filterChip, searchTerm]);

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
        title: pending.title.trim() || "Sem título",
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
      setSaveState("saved");
      return;
    }
    setDraftTitle(activeNoteTitle);
    setDraftContent(activeNoteContent);
    setSaveState("saved");
    setShowColorPicker(false);
    setConfirmDeleteId(null);
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
          title: pending.title.trim() || "Sem título",
          content: pending.content,
        });
      }
    };
  }, [onUpdateNote]);

  // Initialize Speech Recognition safely (graceful fallback if browser lacks Web Speech API)
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
          const next = prev ? `${prev}${prev.endsWith("\n") ? "" : "\n"}${transcript}` : transcript;
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

  const handleQuickCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = quickText.trim();
    if (!raw || isCreatingQuick) return;

    await flushPendingSave();
    setIsCreatingQuick(true);
    try {
      const firstLine = raw.split(/\r?\n/)[0].trim();
      const autoTitle =
        firstLine.length > 52 ? `${firstLine.slice(0, 50).trim()}...` : firstLine;
      const defaultAcc =
        accountFilter === "personal" || accountFilter.toLowerCase().includes("pess")
          ? "personal"
          : "work";

      const created = await onCreateNote({
        title: autoTitle || "Anotação Rápida",
        content: raw,
        category: quickCategory,
        account_type: defaultAcc,
        color: quickCategory === "reuniao" ? "blue" : quickCategory === "ideia" ? "amber" : "default",
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

  const handleCreateTemplateNote = async (template: "reuniao" | "ideia" | "checklist") => {
    await flushPendingSave();
    setIsCreatingQuick(true);
    try {
      const defaultAcc =
        accountFilter === "personal" || accountFilter.toLowerCase().includes("pess")
          ? "personal"
          : "work";
      const todayLabel = format(new Date(), "dd/MM HH:mm", { locale: ptBR });
      const configByTemplate = {
        reuniao: {
          title: `Reunião • ${todayLabel}`,
          content: "Pauta:\n\nPontos discutidos:\n- \n\nPróximos passos:\n",
          color: "blue" as NoteColor,
          checklist: [{ id: `chk-${Date.now()}`, text: "Definir responsáveis e prazos", checked: false }],
        },
        ideia: {
          title: `Ideia • ${todayLabel}`,
          content: "Objetivo da ideia:\n\nBenefício esperado:\n",
          color: "amber" as NoteColor,
          checklist: [],
        },
        checklist: {
          title: `Checklist • ${todayLabel}`,
          content: "",
          color: "emerald" as NoteColor,
          checklist: [{ id: `chk-${Date.now()}`, text: "Primeiro ponto a verificar", checked: false }],
        },
      }[template];

      const created = await onCreateNote({
        ...configByTemplate,
        category: template,
        account_type: defaultAcc,
        tags: [],
      });
      if (created) {
        setSelectedNoteId(created.id);
        setDraftTitle(created.title);
        setDraftContent(created.content);
        setMobileScreen("editor");
      }
    } finally {
      setIsCreatingQuick(false);
    }
  };

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
        description: `Ponto originado da anotação "${activeNote.title}": ${item.text}.`,
        account_type: activeNote.account_type || "work",
        item_type: "task",
      },
      activeNote.id,
      item.id
    );
  };

  const handleConvertWholeNoteOrSelection = () => {
    if (!activeNote) return;
    let selectedExcerpt = "";
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart ?? 0;
      const end = textareaRef.current.selectionEnd ?? 0;
      if (end > start) {
        selectedExcerpt = draftContent.slice(start, end).trim();
      }
    }

    const effectiveContent = selectedExcerpt || draftContent.trim();
    const firstLine = (selectedExcerpt || draftTitle || effectiveContent).split(/\r?\n/)[0]?.trim() || "";
    onOpenNewTaskModalWithDraft(
      {
        title: firstLine.slice(0, 70),
        description: effectiveContent || draftTitle,
        account_type: activeNote.account_type || "work",
        item_type: activeNote.category === "reuniao" ? "activity" : "task",
        tags: activeNote.tags || [],
      },
      activeNote.id
    );
  };

  const handleOrganizeWithAI = async () => {
    if (!activeNote || isOrganizingAi) return;
    await flushPendingSave();
    setIsOrganizingAi(true);
    setAiMessage(null);

    try {
      const snapshot = {
        noteId: activeNote.id,
        title: draftTitle,
        content: draftContent,
        checklist: activeNote.checklist || [],
        tags: activeNote.tags || [],
        ai_summary: activeNote.ai_summary,
        key_decisions: activeNote.key_decisions,
      };

      const res = await fetch("/api/notes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "organize",
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
      const nextTitle =
        !draftTitle.trim() ||
        draftTitle.startsWith("Reunião •") ||
        draftTitle.startsWith("Ideia •") ||
        draftTitle === "Sem título" ||
        draftTitle === "Anotação Rápida"
          ? data.refined_title || draftTitle
          : draftTitle;
      const nextContent = data.organized_content || draftContent;

      const existingTexts = new Set(
        (activeNote.checklist || []).map((c) => c.text.trim().toLowerCase())
      );
      const newChecklistItems: NoteChecklistItem[] = Array.isArray(data.checklist_items)
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
      const mergedTags = Array.from(
        new Set([...(activeNote.tags || []), ...(Array.isArray(data.tags) ? data.tags : [])])
      ).slice(0, 6);

      setDraftTitle(nextTitle);
      setDraftContent(nextContent);
      await onUpdateNote(activeNote.id, {
        title: nextTitle,
        content: nextContent,
        checklist: mergedChecklist,
        tags: mergedTags,
        ai_summary: data.ai_summary || null,
        key_decisions: Array.isArray(data.key_decisions) ? data.key_decisions : [],
      });
      setAiMessage("Nota estruturada pela IA! Use 'Desfazer' se quiser voltar ao rascunho anterior.");
    } catch {
      setAiMessage("Erro ao comunicar com o serviço de IA.");
    } finally {
      setIsOrganizingAi(false);
    }
  };

  const handleUndoOrganize = async () => {
    if (!undoSnapshot || !activeNote || undoSnapshot.noteId !== activeNote.id) return;
    setDraftTitle(undoSnapshot.title);
    setDraftContent(undoSnapshot.content);
    await onUpdateNote(activeNote.id, {
      title: undoSnapshot.title,
      content: undoSnapshot.content,
      checklist: undoSnapshot.checklist,
      tags: undoSnapshot.tags,
      ai_summary: undoSnapshot.ai_summary ?? null,
      key_decisions: undoSnapshot.key_decisions ?? [],
    });
    setUndoSnapshot(null);
    setAiMessage("Rascunho original restaurado.");
  };

  const handleExtractTasksWithAI = async () => {
    if (!activeNote || isExtractingAi) return;
    await flushPendingSave();
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

  return (
    <div className="w-full max-w-[1600px] mx-auto h-full flex flex-col gap-3">
      {/* ========================================================================= */}
      {/* 1. BARRA DE CAPTURA RÁPIDA (MOBILE & DESKTOP) */}
      {/* ========================================================================= */}
      <div
        className={`rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-zinc-800/90 shadow-sm p-2.5 sm:p-3.5 space-y-2.5 shrink-0 ${
          mobileScreen === "editor" ? "hidden lg:block" : "block"
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/50 shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Bloco de Notas & Reuniões
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Anote ideias, atas e pontos rápidos e transforme em demandas com IA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleCreateTemplateNote("reuniao")}
              disabled={isCreatingQuick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Reunião</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateTemplateNote("ideia")}
              disabled={isCreatingQuick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>+ Ideia</span>
            </button>
          </div>
        </div>

        {/* Captura imediata com ditado por voz */}
        <form onSubmit={handleQuickCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-100 dark:bg-[#171825] border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Anotar ideia rápida ou ponto de reunião..."
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none py-1"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={() => toggleDictation("quick")}
                title={listeningTarget === "quick" ? "Parar ditado" : "Ditar nota por voz"}
                className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                  listeningTarget === "quick"
                    ? "bg-rose-500/15 text-rose-500 animate-pulse"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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

          <div className="flex items-center gap-1.5 justify-between sm:justify-end shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#171825] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px]">
              {(["reuniao", "ideia", "checklist", "geral"] as NoteCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setQuickCategory(cat)}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    quickCategory === cat
                      ? "bg-white dark:bg-[#222436] text-purple-600 dark:text-purple-300 shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {CATEGORY_META[cat].label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!quickText.trim() || isCreatingQuick}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
            >
              {isCreatingQuick ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. ÁREA PRINCIPAL: SPLIT-PANE NO DESKTOP | LISTA <-> EDITOR NO MOBILE */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* COLUNA ESQUERDA: LISTA DE NOTAS */}
        <section
          className={`${
            mobileScreen === "list" ? "flex" : "hidden"
          } lg:flex flex-col w-full lg:w-[320px] xl:w-[360px] shrink-0 rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-zinc-800/90 shadow-sm overflow-hidden min-h-0 flex-1 lg:flex-none`}
        >
          {/* Busca + Chips */}
          <div className="p-3 border-b border-slate-100 dark:border-zinc-800/80 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar anotações, atas, pontos..."
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-100 dark:bg-[#171825] border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
              {[
                { id: "all", label: `Todas (${notes.filter((n) => !n.archived).length})` },
                { id: "reuniao", label: "Reuniões" },
                { id: "ideia", label: "Ideias" },
                { id: "checklist", label: "Checklist" },
                { id: "pinned", label: "Fixadas" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterChip(chip.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    filterChip === chip.id
                      ? "bg-purple-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-[#171825] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
              <div className="py-12 px-4 text-center space-y-2 text-slate-400 dark:text-slate-500">
                <StickyNote className="w-8 h-8 mx-auto opacity-35 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma anotação por aqui ainda
                </p>
                <p className="text-[11px] leading-relaxed">
                  Use a barra acima ou toque em <strong>+ Reunião</strong> para registrar pontos e depois transformá-los em demandas.
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                const catMeta = CATEGORY_META[note.category] || CATEGORY_META.geral;
                const colMeta = COLOR_STYLES[(note.color as NoteColor) || "default"] || COLOR_STYLES.default;
                const checkedCount = (note.checklist || []).filter((c) => c.checked).length;
                const totalChecklist = (note.checklist || []).length;
                const convertedCount = Array.from(
                  new Set([
                    ...(note.converted_task_ids || []),
                    ...(note.checklist || [])
                      .map((c) => c.linked_task_id)
                      .filter((id): id is string => Boolean(id)),
                  ])
                ).length;

                let relDate = "";
                try {
                  relDate = formatDistanceToNow(parseISO(note.updated_at || note.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  });
                } catch {}

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNote(note)}
                    className={`w-full text-left p-3 rounded-xl border border-l-4 ${colMeta.accentBorder} transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "border-purple-500/70 bg-purple-50/70 dark:bg-purple-950/30 shadow-sm ring-1 ring-purple-500/30"
                        : `${colMeta.subtleBg} border-slate-200/80 dark:border-zinc-800/80 hover:border-purple-300 dark:hover:border-purple-700/60`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${catMeta.badgeClass}`}
                      >
                        {catMeta.icon}
                        <span>{catMeta.label}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {note.pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        {convertedCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                            {convertedCount} dem.
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">
                      {note.title || "Sem título"}
                    </h3>

                    {(note.content || note.ai_summary) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                        {note.ai_summary || note.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                      <span className="flex items-center gap-2">
                        {totalChecklist > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                            <ListChecks className="w-3 h-3 text-indigo-500" />
                            {checkedCount}/{totalChecklist}
                          </span>
                        )}
                        {isWorkAccountType(note.account_type) ? (
                          <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                            <Briefcase className="w-2.5 h-2.5" /> Trabalho
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                            <User className="w-2.5 h-2.5" /> Pessoal
                          </span>
                        )}
                      </span>
                      <span className="truncate">{relDate}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* COLUNA DIREITA: EDITOR COMPLETO + IA + CHECKLIST */}
        <section
          className={`${
            mobileScreen === "editor" ? "flex" : "hidden"
          } lg:flex flex-1 min-w-0 min-h-0 flex-col rounded-2xl bg-white dark:bg-[#12131c] border border-slate-200 dark:border-zinc-800/90 shadow-sm overflow-hidden`}
        >
          {!activeNote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400 dark:text-slate-500">
              <StickyNote className="w-10 h-10 opacity-30 text-purple-500" />
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Selecione ou crie uma anotação
                </h3>
                <p className="text-xs leading-relaxed">
                  Registre pontos de reuniões, ideias e listas rápidas. Quando quiser, peça para a IA organizar ou transformar tudo em demandas com prazo e checklist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCreateTemplateNote("reuniao")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Anotação de Reunião</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header do Editor */}
              <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-[#151624] flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await flushPendingSave();
                      setMobileScreen("list");
                    }}
                    className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Notas</span>
                  </button>

                  <select
                    value={activeNote.category}
                    onChange={(e) =>
                      onUpdateNote(activeNote.id, { category: e.target.value as NoteCategory })
                    }
                    className="h-8 px-2 rounded-xl bg-white dark:bg-[#1b1d2c] border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="reuniao">Reunião</option>
                    <option value="ideia">Ideia</option>
                    <option value="checklist">Checklist</option>
                    <option value="geral">Geral</option>
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNote(activeNote.id, {
                        account_type: isWorkAccountType(activeNote.account_type)
                          ? "personal"
                          : "work",
                      })
                    }
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors ${
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

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mr-1">
                    {saveState === "saving"
                      ? "Salvando..."
                      : saveState === "dirty"
                      ? "Editando..."
                      : "Salvo"}
                  </span>

                  {/* Seletor de Cor */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker((prev) => !prev)}
                      className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                      title="Cor da anotação"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                    {showColorPicker && (
                      <div className="absolute right-0 mt-1 p-2 rounded-xl bg-white dark:bg-[#1a1b28] border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center gap-1.5 z-20">
                        {(Object.keys(COLOR_STYLES) as NoteColor[]).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              onUpdateNote(activeNote.id, { color: col });
                              setShowColorPicker(false);
                            }}
                            className={`w-5 h-5 rounded-full ${COLOR_STYLES[col].dot} ${
                              activeNote.color === col ? "ring-2 ring-offset-2 ring-purple-500" : ""
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
                        : "hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-400"
                    }`}
                    title={activeNote.pinned ? "Desafixar nota" : "Fixar nota no topo"}
                  >
                    {activeNote.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
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

              {/* Barra de Superpoderes de IA & Conversão em Demanda */}
              <div className="px-3 sm:px-5 py-2 border-b border-slate-100 dark:border-zinc-800/70 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-transparent dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-transparent flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={handleOrganizeWithAI}
                  disabled={isOrganizingAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1a1b2a] border border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isOrganizingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  <span>Organizar com IA</span>
                </button>

                <button
                  type="button"
                  onClick={handleExtractTasksWithAI}
                  disabled={isExtractingAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isExtractingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Extrair Demandas com IA</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvertWholeNoteOrSelection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
                  title="Transformar nota ou trecho selecionado em uma demanda detalhada"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Virar Demanda</span>
                </button>

                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => toggleDictation("editor")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      listeningTarget === "editor"
                        ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                        : "bg-white dark:bg-[#1a1b2a] border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {listeningTarget === "editor" ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span className="hidden sm:inline">
                      {listeningTarget === "editor" ? "Ouvindo..." : "Ditar"}
                    </span>
                  </button>
                )}

                {undoSnapshot && undoSnapshot.noteId === activeNote.id && (
                  <button
                    type="button"
                    onClick={handleUndoOrganize}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Desfazer</span>
                  </button>
                )}
              </div>

              {/* Feedback de IA */}
              {aiMessage && (
                <div className="mx-3 sm:mx-5 mt-2.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-200 flex items-center justify-between gap-2 shrink-0">
                  <span>{aiMessage}</span>
                  <button
                    type="button"
                    onClick={() => setAiMessage(null)}
                    className="text-indigo-500 hover:text-indigo-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Corpo Rolável do Editor */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar">
                {/* Título + Texto Livre */}
                <div className={`space-y-2.5 border-l-4 pl-3 ${activeColorStyle.accentBorder}`}>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftTitle(val);
                      scheduleAutosave(activeNote.id, val, draftContent);
                    }}
                    placeholder="Título da anotação ou reunião..."
                    className="w-full text-base sm:text-xl font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-400"
                  />

                  <textarea
                    ref={textareaRef}
                    rows={7}
                    value={draftContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftContent(val);
                      scheduleAutosave(activeNote.id, draftTitle, val);
                    }}
                    placeholder="Escreva os pontos da reunião, ideias, pendências ou links aqui... (Você também pode selecionar um trecho e clicar em 'Virar Demanda')"
                    className="w-full text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50/70 dark:bg-[#0d0e15] border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 leading-relaxed resize-y min-h-[150px]"
                  />
                </div>

                {/* Resumo IA & Decisões Chave */}
                {(activeNote.ai_summary || (activeNote.key_decisions && activeNote.key_decisions.length > 0)) && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200/80 dark:border-purple-800/50 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Síntese & Decisões da IA</span>
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
                            className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{dec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Pontos / Checklist da Reunião (com conversão 1-toque em demanda) */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-[#161724] border border-slate-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Pontos de Ação & Checklist ({(activeNote.checklist || []).length})
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Toque em → Demanda para enviar direto ao fluxo
                    </span>
                  </div>

                  {/* Input adicionar item */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddChecklistItem();
                        }
                      }}
                      placeholder="Adicionar ponto ou próximo passo..."
                      className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-[#0d0e15] border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={() => toggleDictation("checklist")}
                        className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                          listeningTarget === "checklist"
                            ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                            : "bg-white dark:bg-[#0d0e15] border-slate-200 dark:border-zinc-800 text-slate-500"
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
                      className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
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
                            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#10111a] border border-slate-200/80 dark:border-zinc-800/80"
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
                                    ? "line-through text-slate-400 dark:text-slate-500"
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
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold cursor-pointer hover:underline"
                                >
                                  <span>Ver demanda</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConvertSingleChecklistItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[10px] font-bold cursor-pointer transition-colors"
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#141624] border border-emerald-200 dark:border-emerald-800/70 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-emerald-400 transition-colors cursor-pointer shadow-2xs"
                        >
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
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
          <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#101118] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Demandas Identificadas pela IA ({extractedModalData.drafts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Selecione quais deseja criar diretamente ou edite antes de salvar.
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
                      ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-300 dark:border-purple-700/60"
                      : "bg-slate-50/60 dark:bg-[#101118] border-slate-200 dark:border-zinc-800 opacity-65"
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
                        <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
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
                        className="w-full text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-[#181926] border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 outline-none focus:border-purple-500"
                      />
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {draft.description}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                            {draft.priority}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-semibold">
                            {draft.category}
                          </span>
                          {draft.extracted_due_date_iso && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                              <Calendar className="w-2.5 h-2.5" />
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
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Editar antes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#101118] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExtractedModalData(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-md disabled:opacity-40 cursor-pointer"
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

