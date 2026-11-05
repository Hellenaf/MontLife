"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Calendar as CalendarIcon,
  FileText,
  Youtube,
  Clock,
  Briefcase,
  User,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Sparkles,
  History,
  Tag,
  ListTodo,
  Activity,
  Bell,
  Edit2,
  Edit3,
  ArrowRight,
  Check,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  CheckSquare,
  Square,
  Paperclip,
  Download,
  Eye,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Repeat,
  Ban,
  RotateCcw,
  Globe,
  Mail,
  ArrowRightLeft,
} from "lucide-react";
import { AttachmentManager } from "@/components/AttachmentManager";
import {
  Task,
  TaskAttachment,
  ValidationStep,
  TaskStatus,
  ItemType,
  AccountType,
  Priority,
  WebArticleResource,
} from "@/types";
import { processFileToAttachment, formatFileSize } from "@/lib/attachmentUtils";
import { calculateSlaDueDate } from "@/lib/sla";
import { getAllCategories } from "@/lib/categories";
import { FormattedText } from "@/components/FormattedText";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import {
  getTaskScheduleDate,
  isTaskScheduledForDay,
  isTaskAllDay,
  isTaskAllDay as checkTaskIsAllDay,
} from "@/lib/taskSchedule";
import {
  format,
  parseISO,
  isToday,
  getHours,
  getMinutes,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface CentralQuadrantProps {
  selectedTask: Task | null;
  allTasks: Task[];
  onRequestResolution: (task: Task) => void;
  onRequestExtendDeadline: (task: Task) => void;
  onRequestCancelTask?: (task: Task) => void;
  onReopenTask?: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateItemType?: (taskId: string, itemType: ItemType) => void;
  onUpdateTaskFields?: (taskId: string, fields: Partial<Task>) => Promise<void> | void;
  onTransferTask?: (task: Task, targetAccount: "work" | "personal" | string) => void;
  onSelectTask?: (task: Task) => void;
  onOpenNewTaskModal?: () => void;
  activeTab?: "details" | "study";
  onTabChange?: (tab: "details" | "study") => void;
  onBackToTasks?: () => void;
}

const CATEGORY_SUGGESTIONS = [
  "BI & Analytics",
  "Sistemas ERP",
  "Gestão & Contratos",
  "Comunicação & Mensagens",
  "Finanças & Tesouraria",
  "Infraestrutura & Redes",
  "Engenharia & Automações",
  "Gestão Educacional",
  "Eventos & Vendas",
  "Estudos & Capacitação",
  "Saúde & Bem-estar",
  "Vida Pessoal & Casa",
  "Suporte & Demandas",
  "Agenda & Compromissos",
];

export function CentralQuadrant({
  selectedTask,
  allTasks,
  onRequestResolution,
  onRequestExtendDeadline,
  onRequestCancelTask,
  onReopenTask,
  onUpdateStatus,
  onUpdateItemType,
  onUpdateTaskFields,
  onTransferTask,
  onSelectTask,
  onOpenNewTaskModal,
  activeTab: propActiveTab,
  onTabChange,
  onBackToTasks,
}: CentralQuadrantProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<"details" | "study">("details");
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: "details" | "study") => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  // Automatically open Details tab whenever a task is selected or clicked
  useEffect(() => {
    if (selectedTask?.id) {
      setActiveTab("details");
      setIsEditingCategory(false);
      setIsAddingTag(false);
      setIsEditingTitle(false);
      setIsEditingDescription(false);
    }
  }, [selectedTask?.id]);

  // Category and Tag Editing States
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // Title and Description Editing States
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");

  // Complete list of categories (standard + dynamic from all tasks)
  const categoriesList = React.useMemo(() => {
    return getAllCategories(allTasks);
  }, [allTasks]);

  // Google Calendar View States (Mês | Semana | Dia | Programação)
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<"all" | "work" | "personal" | "agenda" | "reminder">("all");
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // Attachment states (lightbox preview and detail upload)
  const [previewImageAttachment, setPreviewImageAttachment] = useState<TaskAttachment | null>(null);
  const [isUploadingDetailFile, setIsUploadingDetailFile] = useState(false);
  const detailFileInputRef = React.useRef<HTMLInputElement>(null);

  // Validation steps states in Details view
  const [newDetailStepText, setNewDetailStepText] = useState("");
  const [isAddingDetailStep, setIsAddingDetailStep] = useState(false);

  // Article and Technical Site states
  const [isAddingArticle, setIsAddingArticle] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState("");
  const [newArticleUrl, setNewArticleUrl] = useState("");
  const [newArticleSource, setNewArticleSource] = useState("");

  const handleAddArticle = async () => {
    if (!selectedTask || !newArticleUrl.trim()) return;
    const cleanUrl = newArticleUrl.trim().startsWith("http")
      ? newArticleUrl.trim()
      : `https://${newArticleUrl.trim()}`;

    let derivedSource = newArticleSource.trim();
    if (!derivedSource) {
      try {
        derivedSource = new URL(cleanUrl).hostname.replace(/^www\./, "");
      } catch {
        derivedSource = "Site / Artigo";
      }
    }

    const newArt: WebArticleResource = {
      title: newArticleTitle.trim() || cleanUrl,
      url: cleanUrl,
      source: derivedSource,
      snippet: "Artigo ou documentação técnica vinculada à demanda para consulta e aprendizado.",
    };

    const currentResources = selectedTask.learning_resources || { youtube_videos: [], search_queries: [] };
    const updatedArticles = [...(currentResources.articles || []), newArt];
    const updatedResources = {
      ...currentResources,
      articles: updatedArticles,
    };

    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, {
        learning_resources: updatedResources,
      });
    }

    setNewArticleTitle("");
    setNewArticleUrl("");
    setNewArticleSource("");
    setIsAddingArticle(false);
  };

  const displayArticles: WebArticleResource[] = React.useMemo(() => {
    if (!selectedTask) return [];
    const custom = selectedTask.learning_resources?.articles || [];
    if (custom.length > 0) return custom;

    const qList = selectedTask.learning_resources?.search_queries?.length
      ? selectedTask.learning_resources.search_queries
      : [selectedTask.title, selectedTask.category];

    const generated: WebArticleResource[] = [];
    for (const q of qList.slice(0, 3)) {
      if (!q.trim()) continue;
      generated.push({
        title: `Documentação Oficial & Guias: ${q}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(q + " tutorial documentacao oficial")}`,
        source: "Documentação & Web",
        snippet: `Pesquisa direta por especificações técnicas e manuais oficiais sobre "${q}".`,
      });
      generated.push({
        title: `Discussões Técnicas & Soluções: ${q}`,
        url: `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
        source: "Stack Overflow",
        snippet: `Casos práticos de implementação, tratamento de erros e respostas técnicas sobre "${q}".`,
      });
      generated.push({
        title: `Artigos Especializados & Posts (Dev.to / Medium): ${q}`,
        url: `https://dev.to/search?q=${encodeURIComponent(q)}`,
        source: "Dev.to / Engenharia",
        snippet: `Artigos aprofundados, arquitetura e boas práticas publicadas por especialistas sobre "${q}".`,
      });
    }
    return generated;
  }, [selectedTask]);

  // Recurrence states in Details view
  const [isAddingRecurrence, setIsAddingRecurrence] = useState(false);
  const [recurrenceNotes, setRecurrenceNotes] = useState("");
  const [recurrenceMethod, setRecurrenceMethod] = useState("");
  const [recurrenceReopen, setRecurrenceReopen] = useState(false);
  const [isSubmittingRecurrence, setIsSubmittingRecurrence] = useState(false);

  const handleSaveRecurrence = async () => {
    if (!selectedTask) return;
    setIsSubmittingRecurrence(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/recurrence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: recurrenceNotes.trim() || undefined,
          method: recurrenceMethod.trim() || undefined,
          reopen_status: recurrenceReopen ? "IN_PROGRESS" : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.task && onUpdateTaskFields) {
        await onUpdateTaskFields(selectedTask.id, data.task);
      }
      setIsAddingRecurrence(false);
      setRecurrenceNotes("");
      setRecurrenceMethod("");
      setRecurrenceReopen(false);
    } catch (err) {
      console.error("Erro ao registrar recorrência:", err);
    } finally {
      setIsSubmittingRecurrence(false);
    }
  };

  // Live timer for Google Calendar current-time red line
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isWorkItem = (t: Task) => {
    if (t.transferred_to === "personal") return false;
    if (t.manually_assigned && (t.account_type === "personal" || t.account_type === "Pessoal")) return false;
    return true;
  };

  // Filter tasks for calendar based on calendar source
  const calendarTasks = allTasks.filter((t) => {
    if (calendarSourceFilter === "all") return true;
    if (calendarSourceFilter === "work") {
      return isWorkItem(t);
    }
    if (calendarSourceFilter === "personal") {
      return (
        !isWorkItem(t) &&
        (t.account_type === "personal" ||
          t.account_type?.toLowerCase().includes("pess") ||
          Boolean(t.account_email?.toLowerCase().includes("hellen")))
      );
    }
    if (calendarSourceFilter === "agenda") return t.item_type === "activity" || t.tags?.includes("google-agenda");
    if (calendarSourceFilter === "reminder") return t.item_type === "reminder";
    return true;
  });

  // Hours array for Google Calendar timeline grid (06:00 to 23:00)
  const START_HOUR = 6;
  const END_HOUR = 23;
  const dayHours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  // Week calculation (Monday to Sunday, matching user mockup Seg -> Dom)
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Tasks scheduled for the currently selected day in Agenda do Dia
  const tasksForSelectedDay = React.useMemo(() => {
    return allTasks
      .filter((t) => isTaskScheduledForDay(t, calendarDate))
      .sort((a, b) => {
        const dateA = new Date(getTaskScheduleDate(a)).getTime();
        const dateB = new Date(getTaskScheduleDate(b)).getTime();
        return dateA - dateB;
      });
  }, [allTasks, calendarDate]);

  // Month calculation
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

  // Navigation handlers (Google Calendar style)
  const handlePrev = () => {
    if (calendarViewMode === "week") setCalendarDate((d) => subWeeks(d, 1));
    else setCalendarDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (calendarViewMode === "week") setCalendarDate((d) => addWeeks(d, 1));
    else setCalendarDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Category change handler
  const handleSaveCategory = async () => {
    const clean = tempCategory.trim();
    if (!clean || !selectedTask) return;
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { category: clean });
    }
    setIsEditingCategory(false);
  };

  // Tag add handler
  const handleAddTag = async () => {
    const clean = newTagInput.trim().replace(/^#/, "");
    if (!clean || !selectedTask) return;
    const currentTags = selectedTask.tags || [];
    if (!currentTags.includes(clean)) {
      const updatedTags = [...currentTags, clean];
      if (onUpdateTaskFields) {
        await onUpdateTaskFields(selectedTask.id, { tags: updatedTags });
      }
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  // Tag remove handler
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedTask) return;
    const currentTags = selectedTask.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { tags: updatedTags });
    }
  };

  // Title handlers
  const handleStartEditTitle = () => {
    if (!selectedTask) return;
    setTempTitle(selectedTask.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const clean = tempTitle.trim();
    if (!clean || !selectedTask) return;
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { title: clean });
    }
    setIsEditingTitle(false);
  };

  // Description handlers
  const handleStartEditDescription = () => {
    if (!selectedTask) return;
    setTempDescription(selectedTask.description || "");
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!selectedTask) return;
    if (onUpdateTaskFields) {
      await onUpdateTaskFields(selectedTask.id, { description: tempDescription });
    }
    setIsEditingDescription(false);
  };

  const handleCleanAsterisks = () => {
    setTempDescription((prev) => prev.replace(/\*\*/g, ""));
  };

  // Upload attachment directly from Details view
  const handleUploadDetailAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTask) return;

    setIsUploadingDetailFile(true);
    try {
      const newAttachments: TaskAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const att = await processFileToAttachment(file, "creation");
        newAttachments.push(att);
      }
      const updatedAttachments = [...(selectedTask.attachments || []), ...newAttachments];
      if (onUpdateTaskFields) {
        await onUpdateTaskFields(selectedTask.id, { attachments: updatedAttachments });
      }
    } catch (err) {
      console.error("Erro ao anexar arquivo nos detalhes:", err);
    } finally {
      setIsUploadingDetailFile(false);
      if (detailFileInputRef.current) {
        detailFileInputRef.current.value = "";
      }
    }
  };

  // Remove attachment from task in Details view
  const handleRemoveDetailAttachment = async (attachmentId: string, stage: "creation" | "resolution") => {
    if (!selectedTask || !onUpdateTaskFields) return;
    if (stage === "creation") {
      const updated = (selectedTask.attachments || []).filter((a) => a.id !== attachmentId);
      await onUpdateTaskFields(selectedTask.id, { attachments: updated });
    } else {
      const updated = (selectedTask.resolution_attachments || []).filter((a) => a.id !== attachmentId);
      await onUpdateTaskFields(selectedTask.id, { resolution_attachments: updated });
    }
  };

  // Toggle validation step
  const handleToggleTaskValidationStep = async (stepId: string) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    const currentSteps = selectedTask.validation_steps || [];
    const updated = currentSteps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    await onUpdateTaskFields(selectedTask.id, { validation_steps: updated });
  };

  // Add validation step in details
  const handleAddDetailValidationStep = async () => {
    const clean = newDetailStepText.trim();
    if (!selectedTask || !clean || !onUpdateTaskFields) return;
    const newStep: ValidationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: clean,
      completed: false,
    };
    const updated = [...(selectedTask.validation_steps || []), newStep];
    await onUpdateTaskFields(selectedTask.id, { validation_steps: updated });
    setNewDetailStepText("");
    setIsAddingDetailStep(false);
  };

  // Remove validation step in details
  const handleRemoveDetailValidationStep = async (stepId: string) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    const currentSteps = selectedTask.validation_steps || [];
    const updated = currentSteps.filter((s) => s.id !== stepId);
    await onUpdateTaskFields(selectedTask.id, { validation_steps: updated });
  };

  // Change priority level directly in details (independent of deadline)
  const handleChangeDetailPriority = async (newPriority: Priority) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    await onUpdateTaskFields(selectedTask.id, {
      priority: newPriority,
    });
  };

  // Change deadline directly in details (independent of priority)
  const handleChangeDetailDueDate = async (newDueDateIso: string) => {
    if (!selectedTask || !onUpdateTaskFields || !newDueDateIso) return;
    await onUpdateTaskFields(selectedTask.id, {
      current_due_date: newDueDateIso,
    });
  };

  // Helper: check if task is all-day (no specific hour or spans full day)
  const isAllDayTask = (task: Task): boolean => {
    return checkTaskIsAllDay(task);
  };

  // Helper: get tasks for a specific day (using Último Prazo or Created At for undated)
  const getTasksForDay = (day: Date) => {
    return calendarTasks.filter((t) => isTaskScheduledForDay(t, day));
  };

  // Helper: Google Calendar authentic color tokens
  const getGoogleCalendarColor = (task: Task) => {
    if (task.item_type === "activity" || task.tags?.includes("google-agenda")) {
      return {
        accent: "#0b8043", // Google Basil Green
        pillBg: "bg-[#0b8043] text-white hover:bg-[#09713a]",
        cardBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-[#0b8043] border-slate-200 dark:border-zinc-800",
        sourceName: "Google Agenda",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
        icon: <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (task.item_type === "reminder") {
      return {
        accent: "#e37400", // Google Tangerine Orange
        pillBg: "bg-[#e37400] text-white hover:bg-[#c96600]",
        cardBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-[#e37400] border-slate-200 dark:border-zinc-800",
        sourceName: "Lembretes",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        icon: <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (
      task.account_type === "work" ||
      task.account_type?.toLowerCase().includes("trab") ||
      Boolean(task.account_email?.toLowerCase().includes("notredame"))
    ) {
      return {
        accent: "#1a73e8", // Blue
        pillBg: "bg-[#1a73e8] text-white hover:bg-[#1557b0]",
        cardBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-l-4 border-l-[#1a73e8] border-slate-200 dark:border-zinc-800",
        sourceName: "Trabalho (Notre Dame)",
        badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        icon: <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />,
      };
    }
    return {
      accent: "#8e24aa", // Grape Purple
      pillBg: "bg-[#8e24aa] text-white hover:bg-[#7b1fa2]",
      cardBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 border-l-4 border-l-[#8e24aa] border-slate-200 dark:border-zinc-800",
      sourceName: "Pessoal",
      badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
      icon: <User className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />,
    };
  };

  // Google Calendar current time red line position (in pixels, 56px per hour)
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const isCurrentTimeInGrid = currentHour >= START_HOUR && currentHour <= END_HOUR;
  const currentTimeTopPx = (currentHour - START_HOUR) * 56 + (currentMinute / 60) * 56;

  return (
    <main className="flex-1 h-full flex flex-col bg-slate-100/50 dark:bg-[#0c0d13] overflow-hidden transition-colors duration-200">
      {/* Top Tab Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-zinc-800/80 px-3 sm:px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#101118]">
        <div className="flex items-center gap-1.5">
          {onBackToTasks && (
            <button
              type="button"
              onClick={onBackToTasks}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors mr-1"
              title="Voltar para a lista de demandas"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Lista</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "details"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Detalhes da Demanda
          </button>

          <button
            onClick={() => setActiveTab("study")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "study"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-500" />
            Estudo & Tutoriais
            {selectedTask?.learning_resources?.youtube_videos?.length ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ) : null}
          </button>
        </div>

        {selectedTask && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Demanda:</span>
            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[180px]">
              {selectedTask.title}
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {/* TAB 2: DETAILS OF SELECTED ITEM (ABOVE) & AGENDA DO DIA (BELOW) */}
        {activeTab === "details" && (
          <div className="max-w-4xl mx-auto space-y-4">
            {!selectedTask ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 text-center space-y-2 shadow-sm">
                <FileText className="w-8 h-8 mx-auto opacity-30 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma demanda selecionada
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Selecione uma tarefa na lista à esquerda para visualizar e editar todos os detalhes.
                </p>
              </div>
            ) : (
              <>
                {/* Header card of selected item */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  {/* Top Bar with Context + Category Editor + Type Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isWorkItem(selectedTask) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20">
                            <Briefcase className="w-3.5 h-3.5" /> Trabalho
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/50">
                            <Mail className="w-3 h-3 text-blue-500" />
                            haferreira@notredamecampinas.net.br
                          </span>
                          {onTransferTask && (
                            <button
                              type="button"
                              onClick={() => onTransferTask(selectedTask, "personal")}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-xs ml-0.5"
                              title="Transferir esta demanda para a conta Pessoal (hellenalvesferreira.s2@gmail.com)"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>Transferir p/ Pessoal</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                            <User className="w-3.5 h-3.5" /> Pessoal
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/50">
                            <Mail className="w-3 h-3 text-purple-500" />
                            hellenalvesferreira.s2@gmail.com
                          </span>
                          {onTransferTask && (
                            <button
                              type="button"
                              onClick={() => onTransferTask(selectedTask, "work")}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-xs ml-0.5"
                              title="Transferir esta demanda para a conta de Trabalho (haferreira@notredamecampinas.net.br)"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Transferir p/ Trabalho</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Interactive Editable Category (Single Unified Combobox) */}
                      {isEditingCategory ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <CategoryCombobox
                            value={tempCategory}
                            onChange={(val) => setTempCategory(val)}
                            categories={categoriesList}
                            className="w-48"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveCategory}
                            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm"
                            title="Salvar categoria"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingCategory(false)}
                            className="p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTempCategory(selectedTask.category);
                            setIsEditingCategory(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 transition-colors group"
                          title="Clique para editar a categoria"
                        >
                          <span>{selectedTask.category}</span>
                          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Right-aligned Header Controls: Item Type Selector */}
                    <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                      {/* Canceled Status Badge in Header if task is canceled */}
                      {selectedTask.status === "CANCELED" && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
                            <Ban className="w-3.5 h-3.5" /> Cancelada
                          </span>
                          {onReopenTask && (
                            <button
                              type="button"
                              onClick={() => onReopenTask(selectedTask.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                              title="Reabrir demanda cancelada"
                            >
                              <RotateCcw className="w-3 h-3 text-indigo-500" />
                              Reabrir
                            </button>
                          )}
                        </div>
                      )}

                      {/* Item Type Selector (Tarefas, Atividades, Lembretes) - Pushed to the far right */}
                      {onUpdateItemType && (
                        <div className="flex items-center bg-slate-100 dark:bg-[#0c0d13] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs shadow-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateItemType(selectedTask.id, "task")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                              (selectedTask.item_type || "task") === "task"
                                ? "bg-white dark:bg-[#1a1b26] text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                            Tarefa
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateItemType(selectedTask.id, "activity")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                              selectedTask.item_type === "activity"
                                ? "bg-white dark:bg-[#1a1b26] text-purple-600 dark:text-purple-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Atividade
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateItemType(selectedTask.id, "reminder")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                              selectedTask.item_type === "reminder"
                                ? "bg-white dark:bg-[#1a1b26] text-amber-600 dark:text-amber-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            Lembrete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Banner if Task is Canceled */}
                  {selectedTask.status === "CANCELED" && (
                    <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs sm:text-sm">
                          <Ban className="w-4 h-4 shrink-0" />
                          <span>Esta demanda foi cancelada</span>
                        </div>
                        {onReopenTask && (
                          <button
                            type="button"
                            onClick={() => onReopenTask(selectedTask.id)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/40 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                            title="Reativar e mover de volta para A Fazer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reabrir Demanda
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-black/40 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-1">
                        <span className="font-semibold text-rose-600 dark:text-rose-400 text-[11px] uppercase tracking-wide block">
                          Motivo / Justificativa do Cancelamento:
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {selectedTask.cancel_reason || "Cancelada pelo usuário."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Title & Description */}
                  <div className="space-y-3">
                    {/* Title */}
                    {isEditingTitle ? (
                      <div className="space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                            className="flex-1 px-3 py-1.5 rounded-xl text-base font-bold border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a1b26] text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Título da demanda..."
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveTitle}
                            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold shadow-sm"
                            title="Salvar título"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingTitle(false)}
                            className="p-2 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3 group">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug flex-1">
                          {selectedTask.title}
                        </h2>
                        <button
                          type="button"
                          onClick={handleStartEditTitle}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shrink-0"
                          title="Editar título"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Description with Formatted Text (no raw asterisks) & Edit */}
                    {isEditingDescription ? (
                      <div className="space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Editar Descrição da Demanda:
                          </label>
                          <button
                            type="button"
                            onClick={handleCleanAsterisks}
                            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            title="Remover todos os asteriscos (**) do texto"
                          >
                            Remover asteriscos (**)
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          className="w-full p-3 rounded-xl text-xs sm:text-sm border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a1b26] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed resize-y"
                          placeholder="Descrição da demanda..."
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingDescription(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDescription}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                          >
                            Salvar Descrição
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="group relative">
                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          <FormattedText text={selectedTask.description || "Nenhuma descrição fornecida."} />
                        </div>
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={handleStartEditDescription}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Editar texto da descrição"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar descrição</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags Manager with Autonomous AI and Manual Editing */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        Tags & Classificação Autônoma:
                      </span>
                      {!isAddingTag && (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Tag
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedTask.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            title={`Remover tag #${tag}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {isAddingTag && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Nova tag..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                            className="px-2 py-0.5 rounded text-xs border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a1b26] text-slate-800 dark:text-slate-100 outline-none w-28"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="p-1 rounded bg-indigo-600 text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingTag(false)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Steps Checklist Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                            Pontos de Validação & Etapas de Conclusão
                          </h3>
                          {selectedTask.validation_steps && selectedTask.validation_steps.length > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {selectedTask.validation_steps.filter((s) => s.completed).length} de {selectedTask.validation_steps.length} concluídas
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Checklist sugerido pela IA ou personalizado para orientar a finalização da demanda.
                        </p>
                      </div>
                    </div>

                    {!isAddingDetailStep && (
                      <button
                        type="button"
                        onClick={() => setIsAddingDetailStep(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Etapa</span>
                      </button>
                    )}
                  </div>

                  {/* Progress bar if steps exist */}
                  {selectedTask.validation_steps && selectedTask.validation_steps.length > 0 && (
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            (selectedTask.validation_steps.filter((s) => s.completed).length /
                              selectedTask.validation_steps.length) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  {/* Step List */}
                  {(!selectedTask.validation_steps || selectedTask.validation_steps.length === 0) && !isAddingDetailStep ? (
                    <div
                      onClick={() => setIsAddingDetailStep(true)}
                      className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0c0d13]/50 text-center cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <CheckSquare className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-zinc-600" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Nenhuma etapa de validação cadastrada.
                      </p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        Clique aqui para inserir o primeiro ponto de validação
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTask.validation_steps?.map((step, idx) => (
                        <div
                          key={step.id || `step-${idx}`}
                          className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl border transition-all ${
                            step.completed
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                              : "bg-slate-50/70 dark:bg-[#0f1017] border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTaskValidationStep(step.id)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {step.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                            )}
                          </button>

                          <span
                            onClick={() => handleToggleTaskValidationStep(step.id)}
                            className={`flex-1 text-xs cursor-pointer select-none leading-relaxed ${
                              step.completed
                                ? "line-through text-slate-400 dark:text-slate-500 font-normal"
                                : "font-medium"
                            }`}
                          >
                            {step.text}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveDetailValidationStep(step.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-md"
                            title="Remover etapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Step input */}
                  {isAddingDetailStep && (
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Ex: Verificar conciliação bancária do extrato..."
                        value={newDetailStepText}
                        onChange={(e) => setNewDetailStepText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDetailValidationStep()}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddDetailValidationStep}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDetailStep(false);
                          setNewDetailStepText("");
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {/* Attachments Card (Criação & Solução) */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  <AttachmentManager
                    attachments={selectedTask.attachments || []}
                    onChange={async (updated) => {
                      if (onUpdateTaskFields) {
                        await onUpdateTaskFields(selectedTask.id, { attachments: updated });
                      }
                    }}
                    stage="creation"
                    label="Arquivos & Links da Demanda (Criação)"
                  />

                  {selectedTask.resolution_attachments && selectedTask.resolution_attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                      <AttachmentManager
                        attachments={selectedTask.resolution_attachments || []}
                        onChange={async (updated) => {
                          if (onUpdateTaskFields) {
                            await onUpdateTaskFields(selectedTask.id, { resolution_attachments: updated });
                          }
                        }}
                        stage="resolution"
                        label="Comprovantes & Links da Solução"
                      />
                    </div>
                  )}
                </div>

                {/* Deadlines & SLA Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Prazos & Linha do Tempo (SLA)
                    </h3>
                    {selectedTask.status !== "COMPLETED" && (
                      <button
                        onClick={() => onRequestExtendDeadline(selectedTask)}
                        className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium transition-colors"
                      >
                        Adiar / Estender Prazo
                      </button>
                    )}
                  </div>

                  {/* Priority & Deadline Control - Separated and Independent */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Priority Selector (Independent) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nível de Prioridade:
                        </span>
                        <span className="text-[10px] text-slate-400">
                          O que priorizar
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { p: "P1" as Priority, label: "P1 - Crítica", color: "border-rose-500 text-rose-600 bg-rose-50/80 dark:bg-rose-950/40" },
                          { p: "P2" as Priority, label: "P2 - Alta", color: "border-orange-500 text-orange-600 bg-orange-50/80 dark:bg-orange-950/40" },
                          { p: "P3" as Priority, label: "P3 - Média", color: "border-amber-500 text-amber-600 bg-amber-50/80 dark:bg-amber-950/40" },
                          { p: "P4" as Priority, label: "P4 - Baixa", color: "border-emerald-500 text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40" },
                        ].map((item) => {
                          const isSelected = selectedTask.priority === item.p;
                          return (
                            <button
                              key={item.p}
                              type="button"
                              onClick={() => handleChangeDetailPriority(item.p)}
                              className={`py-1.5 px-2 rounded-lg border text-center transition-all text-xs font-semibold ${
                                isSelected
                                  ? `${item.color} font-bold ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-[#141520] shadow-xs`
                                  : "border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Deadline / Due Date Editor (Independent) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Prazo / Limite da Demanda:
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Data limite independente
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={
                          selectedTask.current_due_date
                            ? format(parseISO(selectedTask.current_due_date), "yyyy-MM-dd'T'HH:mm")
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            handleChangeDetailDueDate(new Date(e.target.value).toISOString());
                          }
                        }}
                        className="w-full h-8 px-2.5 text-xs rounded-lg bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setHours(18, 0, 0, 0);
                            handleChangeDetailDueDate(d.toISOString());
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400"
                        >
                          Hoje 18h
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(18, 0, 0, 0);
                            handleChangeDetailDueDate(d.toISOString());
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400"
                        >
                          Amanhã
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 4);
                            d.setHours(18, 0, 0, 0);
                            handleChangeDetailDueDate(d.toISOString());
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800"
                          title="Definir prazo para 4 dias"
                        >
                          +4 dias
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            d.setHours(18, 0, 0, 0);
                            handleChangeDetailDueDate(d.toISOString());
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-zinc-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-400"
                        >
                          +1 semana
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Base de Soluções & Controle de Recorrência */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          Base de Soluções & Recorrência
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Resolução documentada e histórico de execuções reincidentes.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Recurrence counter badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-semibold">
                        <Repeat className="w-3 h-3 text-indigo-500" />
                        <span>{selectedTask.recurrence_count || 1}x ocorrências</span>
                      </span>

                      {/* Register New Occurrence Button */}
                      <button
                        type="button"
                        onClick={() => setIsAddingRecurrence((prev) => !prev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nova Ocorrência</span>
                      </button>

                      {selectedTask.status === "COMPLETED" ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                        </span>
                      ) : selectedTask.status === "CANCELED" ? (
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" /> Demanda Cancelada
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRequestResolution(selectedTask)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
                            title="Concluir demanda (preenchimento de solução opcional)"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                          {onRequestCancelTask && (
                            <button
                              type="button"
                              onClick={() => onRequestCancelTask(selectedTask)}
                              className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-medium transition-colors flex items-center gap-1"
                              title="Cancelar esta demanda e informar motivo"
                            >
                              <Ban className="w-3 h-3" />
                              Cancelar Demanda
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form to Register Recurrence / Reincidence */}
                  {isAddingRecurrence && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700/80 space-y-3 animate-fadeIn text-xs text-slate-800 dark:text-zinc-200">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-zinc-200">
                        <Repeat className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        <span>Registrar Nova Execução no Mesmo Item (Sem Duplicar Base)</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1">
                            Notas / Contexto desta reincidência:
                          </label>
                          <textarea
                            rows={2}
                            value={recurrenceNotes}
                            onChange={(e) => setRecurrenceNotes(e.target.value)}
                            placeholder="Descreva onde ou por que a ocorrência se repetiu (ex: usuário reportou o mesmo erro no TOTVS)..."
                            className="w-full text-xs p-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-zinc-400 block mb-1">
                            Método de conclusão alternativo (opcional se utilizou solução diferente):
                          </label>
                          <input
                            type="text"
                            value={recurrenceMethod}
                            onChange={(e) => setRecurrenceMethod(e.target.value)}
                            placeholder="Ex: Executado script PowerShell alternativo ao invés de reiniciar servidor..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={recurrenceReopen}
                            onChange={(e) => setRecurrenceReopen(e.target.checked)}
                            className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Reabrir demanda para Em Andamento (trabalho ativo)</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingRecurrence(false);
                            setRecurrenceNotes("");
                            setRecurrenceMethod("");
                          }}
                          className="px-3 py-1 rounded text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingRecurrence}
                          onClick={handleSaveRecurrence}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isSubmittingRecurrence ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Gravar Ocorrência no Histórico</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary Solution */}
                  {selectedTask.resolution_notes ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Solução Registrada na Base de Conhecimento:</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTask.resolution_notes}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Nenhuma anotação de resolução registrada até o momento.
                    </p>
                  )}

                  {/* Execution History Timeline */}
                  {selectedTask.execution_history && selectedTask.execution_history.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        <Repeat className="w-3 h-3 text-indigo-500" />
                        Histórico de Execuções e Reincidências ({selectedTask.execution_history.length}):
                      </span>
                      <div className="space-y-1.5">
                        {selectedTask.execution_history.map((exec) => (
                          <div
                            key={exec.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span className="text-indigo-400 font-semibold">
                                Ocorrência em {format(parseISO(exec.date), "dd/MM/yyyy 'às' HH:mm")}
                              </span>
                              <span>Registrado por: {exec.registered_by || "Usuário"}</span>
                            </div>
                            {exec.notes && (
                              <p className="text-slate-700 dark:text-slate-200 text-xs">
                                {exec.notes}
                              </p>
                            )}
                            {exec.method && (
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                                <strong>Método aplicado:</strong> {exec.method}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternative Resolution Methods */}
                  {selectedTask.alternative_resolutions && selectedTask.alternative_resolutions.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Métodos Alternativos de Resolução Catalogados:
                      </span>
                      <div className="space-y-1.5">
                        {selectedTask.alternative_resolutions.map((alt) => (
                          <div
                            key={alt.id}
                            className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                              <span className="font-semibold">{alt.method}</span>
                              <span>{format(parseISO(alt.date), "dd/MM/yyyy")}</span>
                            </div>
                            {alt.notes && (
                              <p className="text-[11px] text-zinc-300 italic">{alt.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ESTUDO & TUTORIAIS (SITES, ARTIGOS E VÍDEOS) */}
        {activeTab === "study" && (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* 1. SEÇÃO DE SITES, ARTIGOS TÉCNICOS & DOCUMENTAÇÕES */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Sites, Artigos Técnicos & Documentações Oficiais
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Materiais de apoio, guias de engenharia e referências técnicas com foco na demanda.
                    </p>
                  </div>
                </div>

                {selectedTask && (
                  <button
                    type="button"
                    onClick={() => setIsAddingArticle((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Site / Artigo</span>
                  </button>
                )}
              </div>

              {/* Form to add custom article / documentation link */}
              {isAddingArticle && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                      Vincular Novo Artigo, Documentação ou Site de Estudo
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingArticle(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        URL do Artigo ou Site *
                      </label>
                      <input
                        type="url"
                        placeholder="https://developer.mozilla.org/... ou https://dev.to/..."
                        value={newArticleUrl}
                        onChange={(e) => setNewArticleUrl(e.target.value)}
                        className="w-full h-8 px-3 text-xs rounded-lg bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Título do Artigo / Descrição Curta
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Guia Oficial de Migração e Arquitetura..."
                        value={newArticleTitle}
                        onChange={(e) => setNewArticleTitle(e.target.value)}
                        className="w-full h-8 px-3 text-xs rounded-lg bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="text"
                      placeholder="Fonte / Autor (opcional, ex: Microsoft Learn, MDN, Medium)"
                      value={newArticleSource}
                      onChange={(e) => setNewArticleSource(e.target.value)}
                      className="w-64 h-8 px-3 text-xs rounded-lg bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingArticle(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddArticle}
                        disabled={!newArticleUrl.trim()}
                        className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
                      >
                        Salvar Artigo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Articles & Sites Grid */}
              {displayArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {displayArticles.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-[#111218] hover:border-sky-400 dark:hover:border-sky-500/50 hover:bg-white dark:hover:bg-[#161822] transition-all shadow-xs hover:shadow-md space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 truncate max-w-[140px]">
                            {art.source || "Artigo & Documentação"}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors shrink-0" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-snug">
                          {art.title}
                        </h4>
                        {art.snippet && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {art.snippet}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 truncate max-w-[160px]">
                          {art.url.replace(/^https?:\/\//, "")}
                        </span>
                        <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 group-hover:underline">
                          Abrir site
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1">
                  <Globe className="w-7 h-7 mx-auto opacity-30 text-sky-500" />
                  <p className="text-xs">Nenhum artigo adicionado. Clique no botão acima para vincular artigos e sites de estudo.</p>
                </div>
              )}

              {/* Direct Quick Research Chips */}
              {selectedTask && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Pesquisar diretamente:
                  </span>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      `${selectedTask.title} documentacao artigo tutorial`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    Google Web <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://stackoverflow.com/search?q=${encodeURIComponent(selectedTask.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 text-[11px] font-medium transition-colors"
                  >
                    Stack Overflow <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://dev.to/search?q=${encodeURIComponent(selectedTask.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    Dev.to <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            {/* 2. SEÇÃO DE VÍDEOS & TUTORIAIS DO YOUTUBE */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Curadoria de Aprendizado em Vídeo (YouTube)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vídeos e tutoriais audiovisuais selecionados para a demanda.
                    </p>
                  </div>
                </div>
              </div>

              {selectedTask?.learning_resources?.youtube_videos &&
              selectedTask.learning_resources.youtube_videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {selectedTask.learning_resources.youtube_videos.map((vid, idx) => (
                    <a
                      key={idx}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50/50 dark:bg-[#181926] hover:border-rose-400 dark:hover:border-rose-500/50 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="aspect-video w-full relative overflow-hidden bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {vid.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{vid.channel}</span>
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                            Assistir <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-1">
                  <BookOpen className="w-7 h-7 mx-auto opacity-30 text-rose-500" />
                  <p className="text-xs">Selecione uma demanda para visualizar os tutoriais relacionados.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GOOGLE CALENDAR QUICK EVENT MODAL / PREVIEW */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            {/* Top color bar */}
            <div
              className="h-2.5 w-full"
              style={{ backgroundColor: getGoogleCalendarColor(previewTask).accent }}
            />

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      getGoogleCalendarColor(previewTask).badgeBg
                    }`}
                  >
                    {getGoogleCalendarColor(previewTask).sourceName}
                  </span>
                  <h3
                    onClick={() => {
                      onSelectTask?.(previewTask);
                      setActiveTab("details");
                      setPreviewTask(null);
                    }}
                    className="text-base font-bold text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {previewTask.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {format(parseISO(getTaskScheduleDate(previewTask)), "EEEE, d 'de' MMMM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>

              {/* Category & Tags */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{previewTask.category}</span>
                  {previewTask.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description preview */}
              {previewTask.description && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto leading-relaxed">
                  <FormattedText text={previewTask.description} />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                {previewTask.status !== "COMPLETED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(previewTask.id, "COMPLETED");
                      setPreviewTask(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Marcar como Concluído
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTask?.(previewTask);
                      setActiveTab("details");
                      setPreviewTask(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Attachment Lightbox Modal */}
      {previewImageAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#141520] border border-zinc-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#101118] shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  {previewImageAttachment.name}
                </span>
                <span className="text-[10px] text-zinc-400 shrink-0">
                  ({formatFileSize(previewImageAttachment.size)})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewImageAttachment.url}
                  download={previewImageAttachment.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageAttachment(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image viewer body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
              <img
                src={previewImageAttachment.url}
                alt={previewImageAttachment.name}
                className="max-w-full max-h-[78vh] rounded-lg object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
