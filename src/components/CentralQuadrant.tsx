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
  ArrowRightLeft,
  PlayCircle,
  Video,
  PanelRightClose,
  PanelRightOpen,
  Wand2,
  Lightbulb,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { AttachmentManager } from "@/components/AttachmentManager";
import { MediaLightboxModal, MediaItem } from "@/components/modals/MediaLightboxModal";
import {
  Task,
  TaskAttachment,
  ValidationStep,
  TaskStatus,
  ItemType,
  AccountType,
  Priority,
  WebArticleResource,
  TaskAiAssistResponse,
} from "@/types";
import { processFileToAttachment, formatFileSize } from "@/lib/attachmentUtils";
import { calculateSlaDueDate } from "@/lib/sla";
import { getAllCategories } from "@/lib/categories";
import { FormattedText } from "@/components/FormattedText";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { ScheduleReminderFields } from "@/components/ScheduleReminderFields";
import {
  formatReminderLeadTime,
  formatTaskTimeRange,
  getTaskReminderDate,
  getTaskScheduleDate,
  getTaskScheduleEnd,
  hasScheduledTimeRange,
  isTaskScheduledForDay,
  isTaskAllDay,
  isTaskAllDay as checkTaskIsAllDay,
  isValidIsoDate,
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

const SHORT_WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

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
  onCloseDrawer?: () => void;
  isKpiPanelOpen?: boolean;
  onToggleKpiPanel?: () => void;
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
  onCloseDrawer,
  isKpiPanelOpen = true,
  onToggleKpiPanel,
}: CentralQuadrantProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<"details" | "study">("details");
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = (tab: "details" | "study") => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  // Task AI Assistant states
  const [aiAssistResult, setAiAssistResult] = useState<TaskAiAssistResponse | null>(null);
  const [aiAssistMode, setAiAssistMode] = useState<"refine" | "action_plan" | "diagnose" | null>(null);
  const [isLoadingAiAssist, setIsLoadingAiAssist] = useState(false);
  const [aiAssistError, setAiAssistError] = useState<string | null>(null);
  const [isApplyingAiAssist, setIsApplyingAiAssist] = useState(false);

  // Collapsible secondary sections & Sticky Action Bar dropdown
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);
  const [isSolutionExpanded, setIsSolutionExpanded] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  useEffect(() => {
    if (!isMoreActionsOpen) return;
    const close = () => setIsMoreActionsOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [isMoreActionsOpen]);

  // Automatically open Details tab whenever a task is selected or clicked
  useEffect(() => {
    if (selectedTask?.id) {
      setActiveTab("details");
      setIsEditingCategory(false);
      setIsAddingTag(false);
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setAiAssistResult(null);
      setAiAssistMode(null);
      setAiAssistError(null);
      setIsMoreActionsOpen(false);
      setIsScheduleExpanded(false);
      const totalAtt =
        (selectedTask.attachments?.length || 0) +
        (selectedTask.resolution_attachments?.length || 0);
      setIsAttachmentsExpanded(totalAtt > 0);
      setIsSolutionExpanded(
        Boolean(
          selectedTask.resolution_notes ||
            (selectedTask.recurrence_count || 1) > 1 ||
            selectedTask.status === "COMPLETED"
        )
      );
    }
  }, [selectedTask?.id]);

  const handleRunTaskAiAssist = async (mode: "refine" | "action_plan" | "diagnose") => {
    if (!selectedTask || isLoadingAiAssist) return;
    setIsLoadingAiAssist(true);
    setAiAssistMode(mode);
    setAiAssistError(null);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.assist) {
        setAiAssistResult(data.assist);
      } else {
        setAiAssistError(data?.error || "Não foi possível consultar o assistente IA.");
      }
    } catch {
      setAiAssistError("Erro de comunicação ao consultar o assistente IA.");
    } finally {
      setIsLoadingAiAssist(false);
    }
  };

  const handleApplyTaskAiAssist = async () => {
    if (!selectedTask || !aiAssistResult || !onUpdateTaskFields || isApplyingAiAssist) return;
    setIsApplyingAiAssist(true);
    try {
      const patch: Partial<Task> = {};
      if (aiAssistMode === "refine" && aiAssistResult.refined_title) {
        patch.title = aiAssistResult.refined_title;
      }
      if (aiAssistMode === "refine" && aiAssistResult.structured_description) {
        patch.description = aiAssistResult.structured_description;
      }
      if (aiAssistResult.category_suggestion) {
        patch.category = aiAssistResult.category_suggestion;
      }
      if (aiAssistResult.tags_suggestion && aiAssistResult.tags_suggestion.length > 0) {
        patch.tags = Array.from(
          new Set([...(selectedTask.tags || []), ...aiAssistResult.tags_suggestion])
        ).slice(0, 6);
      }
      if (aiAssistResult.validation_steps && aiAssistResult.validation_steps.length > 0) {
        const existingTexts = new Set(
          (selectedTask.validation_steps || []).map((s) => s.text.trim().toLowerCase())
        );
        const addedSteps: ValidationStep[] = aiAssistResult.validation_steps
          .filter((txt) => !existingTexts.has(txt.trim().toLowerCase()))
          .map((txt, idx) => ({
            id: `step-${Date.now()}-${idx}`,
            text: txt,
            completed: false,
          }));
        if (addedSteps.length > 0) {
          patch.validation_steps = [...(selectedTask.validation_steps || []), ...addedSteps];
        }
      }
      await onUpdateTaskFields(selectedTask.id, patch);
      setAiAssistResult(null);
      setAiAssistMode(null);
    } finally {
      setIsApplyingAiAssist(false);
    }
  };

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

  // Attachment & Media states (Lightbox popup preview and detail upload)
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);
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

  // Change deadline / scheduled start directly in details (preserves event duration if scheduled_end exists)
  const handleChangeDetailDueDate = async (newDueDateIso: string) => {
    if (!selectedTask || !onUpdateTaskFields || !newDueDateIso) return;
    const patch: Partial<Task> = {
      current_due_date: newDueDateIso,
      scheduled_start: newDueDateIso,
    };

    const existingStart = selectedTask.scheduled_start || selectedTask.current_due_date;
    const existingEnd = getTaskScheduleEnd(selectedTask);
    if (existingEnd && isValidIsoDate(existingStart)) {
      const durationMs = new Date(existingEnd).getTime() - new Date(existingStart).getTime();
      if (durationMs > 0) {
        patch.scheduled_end = new Date(new Date(newDueDateIso).getTime() + durationMs).toISOString();
      }
    }

    await onUpdateTaskFields(selectedTask.id, patch);
  };

  const handleChangeDetailEndDate = async (newEndIso: string) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    await onUpdateTaskFields(selectedTask.id, {
      scheduled_end: isValidIsoDate(newEndIso) ? newEndIso : null,
    });
  };

  const handleChangeDetailReminderEnabled = async (enabled: boolean) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    await onUpdateTaskFields(selectedTask.id, {
      reminder_enabled: enabled,
      reminder_minutes_before: enabled
        ? (selectedTask.reminder_minutes_before ?? 30)
        : null,
    });
  };

  const handleChangeDetailReminderMinutes = async (minutes: number) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    await onUpdateTaskFields(selectedTask.id, {
      reminder_enabled: true,
      reminder_minutes_before: minutes,
    });
  };

  const handleChangeDetailMeetLink = async (link: string | null) => {
    if (!selectedTask || !onUpdateTaskFields) return;
    await onUpdateTaskFields(selectedTask.id, {
      meet_link: link,
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
        accent: "#d97706", // Amber / Warm Orange
        pillBg: "bg-amber-600 text-white hover:bg-amber-500",
        cardBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-amber-500 border-[#DCD7CC] dark:border-[#343F56]",
        sourceName: "Google Agenda",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        icon: <Activity className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (task.item_type === "reminder") {
      return {
        accent: "#e37400", // Google Tangerine Orange
        pillBg: "bg-[#e37400] text-white hover:bg-[#c96600]",
        cardBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-l-4 border-l-[#e37400] border-[#DCD7CC] dark:border-[#343F56]",
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
        cardBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-l-4 border-l-[#1a73e8] border-[#DCD7CC] dark:border-[#343F56]",
        sourceName: "Trabalho (Notre Dame)",
        badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
        icon: <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />,
      };
    }
    return {
      accent: "#8e24aa", // Grape Purple
      pillBg: "bg-[#8e24aa] text-white hover:bg-[#7b1fa2]",
      cardBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 border-l-4 border-l-[#8e24aa] border-[#DCD7CC] dark:border-[#343F56]",
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
    <main className="flex-1 h-full flex flex-col bg-[#F7F6F1] dark:bg-[#222938] overflow-hidden transition-colors duration-200">
      {/* Top Underline Tab Bar */}
      <div className="h-12 border-b border-[#DCD7CC]/75 dark:border-[#2E384D] px-4 sm:px-6 flex items-center justify-between gap-2 shrink-0 bg-[#F7F6F1] dark:bg-[#222938] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 h-full shrink-0">
          {onBackToTasks && (
            <button
              type="button"
              onClick={onBackToTasks}
              className="lg:hidden flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-[#E7E3DA] dark:bg-white/[0.06] text-slate-700 dark:text-zinc-200 transition-colors shrink-0 cursor-pointer"
              title="Voltar para a lista de demandas"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`relative h-full flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === "details"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeTab === "details" ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
            <span>Detalhes</span>
            {activeTab === "details" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("study")}
            className={`relative h-full flex items-center gap-1.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === "study"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
            }`}
          >
            <Youtube className={`w-3.5 h-3.5 ${activeTab === "study" ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"}`} />
            <span className="sm:hidden">Estudos</span>
            <span className="hidden sm:inline">Estudo & Referências</span>
            {selectedTask?.learning_resources?.youtube_videos?.length ? (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            ) : null}
            {activeTab === "study" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedTask && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate max-w-[200px]">
              <span className="truncate">{selectedTask.category}</span>
            </span>
          )}

          {onToggleKpiPanel && !onCloseDrawer && (
            <button
              type="button"
              onClick={onToggleKpiPanel}
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                isKpiPanelOpen
                  ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                  : "border-[#DCD7CC]/80 dark:border-[#343F56] bg-[#F7F6F1] dark:bg-[#293244] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D] text-slate-600 dark:text-zinc-300"
              }`}
              title={isKpiPanelOpen ? "Fechar painel de Métricas & IA" : "Abrir painel de Métricas & Briefing IA"}
            >
              {isKpiPanelOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>Métricas & IA</span>
            </button>
          )}

          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#DCD6CA] dark:border-[#323D54] bg-[#EFECE4] dark:bg-[#273043] hover:bg-[#E3DFD5] dark:hover:bg-[#2F3A50] text-slate-600 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              title="Fechar painel de detalhes (Esc)"
              aria-label="Fechar painel de detalhes"
            >
              <span className="hidden sm:inline text-[10px] font-mono text-slate-400 dark:text-slate-400">ESC</span>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sticky Primary Action & Status Bar */}
      {activeTab === "details" && selectedTask && (
        <div className="shrink-0 bg-[#F0EDE6]/95 dark:bg-[#1C2230]/95 backdrop-blur-sm border-b border-[#DCD7CC]/75 dark:border-[#2E384D] px-4 sm:px-6 py-2 flex items-center justify-between gap-2 flex-wrap z-20">
          {/* Left: Segmented Status Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedTask.status === "COMPLETED" ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluída
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(selectedTask.id, "TODO")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F7F6F1] dark:bg-[#293244] border border-[#DCD7CC]/80 dark:border-[#343F56] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D] text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-indigo-500" />
                  <span>Reabrir</span>
                </button>
              </div>
            ) : selectedTask.status === "CANCELED" ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
                  <Ban className="w-3.5 h-3.5" />
                  Cancelada
                </span>
                {onReopenTask && (
                  <button
                    type="button"
                    onClick={() => onReopenTask(selectedTask.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reabrir</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#E2DED4]/80 dark:bg-[#293244] border border-[#DCD7CC]/70 dark:border-[#343F56] text-[11px]">
                {[
                  { status: "TODO" as TaskStatus, label: "A Fazer", dot: "bg-slate-400" },
                  { status: "IN_PROGRESS" as TaskStatus, label: "Em Andamento", dot: "bg-indigo-500" },
                  { status: "WAITING" as TaskStatus, label: "Aguardando", dot: "bg-amber-500" },
                ].map((stage) => {
                  const isCurrent =
                    selectedTask.status === stage.status ||
                    (stage.status === "TODO" && selectedTask.status === "TRIAGE");
                  return (
                    <button
                      key={stage.status}
                      type="button"
                      onClick={() => onUpdateStatus(selectedTask.id, stage.status)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#F7F6F1] dark:bg-[#313B50] text-slate-950 dark:text-white font-semibold shadow-xs-subtle"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                      <span>{stage.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Meet CTA + Adiar + Concluir + Overflow */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {selectedTask.meet_link && (
              <a
                href={selectedTask.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 transition-colors"
                title="Entrar na sala do Google Meet"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Meet</span>
              </a>
            )}

            {selectedTask.status !== "COMPLETED" && selectedTask.status !== "CANCELED" && (
              <>
                <button
                  type="button"
                  onClick={() => onRequestExtendDeadline(selectedTask)}
                  className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium bg-[#F7F6F1] dark:bg-[#293244] hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D] border border-[#DCD7CC]/80 dark:border-[#343F56] text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  title="Adiar ou estender prazo"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Adiar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRequestResolution(selectedTask)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.98] cursor-pointer"
                  title="Concluir demanda"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Concluir</span>
                </button>
              </>
            )}

            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMoreActionsOpen((prev) => !prev);
                }}
                className="w-8 h-8 rounded-lg border border-[#DCD7CC]/80 dark:border-[#343F56] bg-[#F7F6F1] dark:bg-[#293244] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-[#EBE7DE] dark:hover:bg-[#2F394D] flex items-center justify-center transition-colors cursor-pointer"
                title="Mais opções da demanda"
                aria-label="Mais opções da demanda"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreActionsOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1.5 w-52 rounded-xl bg-[#F7F6F1] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#343F56] shadow-popover py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  {onTransferTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onTransferTask(selectedTask, isWorkItem(selectedTask) ? "personal" : "work");
                        setIsMoreActionsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-[#EBE7DE] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        {isWorkItem(selectedTask)
                          ? "Transferir p/ Pessoal"
                          : "Transferir p/ Trabalho"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsSolutionExpanded(true);
                      setIsAddingRecurrence(true);
                      setIsMoreActionsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-[#EBE7DE] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Registrar Nova Ocorrência</span>
                  </button>

                  {onRequestCancelTask &&
                    selectedTask.status !== "CANCELED" &&
                    selectedTask.status !== "COMPLETED" && (
                      <>
                        <div className="my-1 border-t border-[#E5E0D6] dark:border-[#343F56]" />
                        <button
                          type="button"
                          onClick={() => {
                            onRequestCancelTask(selectedTask);
                            setIsMoreActionsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancelar Demanda</span>
                        </button>
                      </>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB 1: LINEAR-STYLE 2-ZONE DETAILS WORKSPACE */}
        {activeTab === "details" && (
          !selectedTask ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
              <FileText className="w-8 h-8 opacity-25 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                Nenhuma demanda selecionada
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                Selecione uma demanda na lista à esquerda para visualizar e editar os detalhes.
              </p>
            </div>
          ) : (
            <div className="min-h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]">
              {/* LEFT ZONE: SPACIOUS EDITORIAL CANVAS */}
              <div className="px-5 sm:px-8 py-6 space-y-6 min-w-0">
                {/* Canceled Banner */}
                {selectedTask.status === "CANCELED" && (
                  <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>Motivo do Cancelamento</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {selectedTask.cancel_reason || "Cancelada pelo usuário."}
                    </p>
                  </div>
                )}

                {/* TITLE + DESCRIPTION */}
                <div className="space-y-4">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                        className="flex-1 px-3 py-2 rounded-lg text-lg sm:text-xl font-bold border border-indigo-500 bg-[#F7F6F1] dark:bg-[#293244] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Título da demanda..."
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveTitle}
                        className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                        title="Salvar título"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTitle(false)}
                        className="p-2 rounded-lg bg-[#E7E3DA] dark:bg-white/[0.06] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 group">
                      <h2
                        onClick={handleStartEditTitle}
                        className="text-xl sm:text-[22px] font-bold tracking-tight text-slate-950 dark:text-zinc-50 leading-snug flex-1 cursor-text hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        title="Clique para editar o título"
                      >
                        {selectedTask.title}
                      </h2>
                      <button
                        type="button"
                        onClick={handleStartEditTitle}
                        className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#E4E0D6] dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shrink-0 cursor-pointer"
                        title="Editar título"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Description */}
                  {isEditingDescription ? (
                    <div className="space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                          Editar descrição
                        </label>
                        <button
                          type="button"
                          onClick={handleCleanAsterisks}
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Remover asteriscos (**)
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        className="w-full p-3.5 rounded-xl text-sm border border-indigo-500 bg-[#F7F6F1] dark:bg-[#293244] text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-y"
                        placeholder="Descrição da demanda..."
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDescription(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-[#E4E0D6] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDescription}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                        >
                          Salvar Descrição
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative space-y-2">
                      <div className="text-[14px] text-slate-700 dark:text-zinc-300 leading-7">
                        <FormattedText text={selectedTask.description || "Nenhuma descrição fornecida."} />
                      </div>
                      <button
                        type="button"
                        onClick={handleStartEditDescription}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Editar texto da descrição"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar descrição</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* CHECKLIST / PONTOS DE VALIDAÇÃO */}
                <div className="pt-6 border-t border-[#DCD7CC]/75 dark:border-[#2E384D] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                        Checklist & Validação
                      </h3>
                      {selectedTask.validation_steps && selectedTask.validation_steps.length > 0 && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 tabular-nums">
                          {selectedTask.validation_steps.filter((s) => s.completed).length}/
                          {selectedTask.validation_steps.length}
                        </span>
                      )}
                    </div>

                    {!isAddingDetailStep && (
                      <button
                        type="button"
                        onClick={() => setIsAddingDetailStep(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-[#E4E0D6] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Etapa</span>
                      </button>
                    )}
                  </div>

                  {selectedTask.validation_steps && selectedTask.validation_steps.length > 0 && (
                    <div className="w-full bg-[#E7E3DA] dark:bg-white/[0.06] rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-400 h-1 rounded-full transition-all duration-300"
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

                  {(!selectedTask.validation_steps || selectedTask.validation_steps.length === 0) && !isAddingDetailStep ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingDetailStep(true)}
                      className="w-full p-3.5 rounded-xl border border-dashed border-[#DCD7CC] dark:border-[#343F56] hover:border-indigo-400 dark:hover:border-indigo-500/40 bg-[#F0EDE6]/60 dark:bg-[#222938]/50 text-left flex items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Adicionar primeiro ponto de validação ou etapa...</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {selectedTask.validation_steps?.map((step, idx) => (
                        <div
                          key={step.id || `step-${idx}`}
                          className={`group flex items-start justify-between gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                            step.completed
                              ? "bg-emerald-50/40 dark:bg-emerald-500/[0.06] text-slate-500 dark:text-zinc-500"
                              : "hover:bg-[#EBE7DE] dark:hover:bg-white/[0.03] text-slate-800 dark:text-zinc-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTaskValidationStep(step.id)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            {step.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-zinc-600" />
                            )}
                          </button>

                          <span
                            onClick={() => handleToggleTaskValidationStep(step.id)}
                            className={`flex-1 text-[13px] cursor-pointer select-none leading-relaxed ${
                              step.completed ? "line-through text-slate-400 dark:text-zinc-500" : ""
                            }`}
                          >
                            {step.text}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveDetailValidationStep(step.id)}
                            className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all rounded cursor-pointer"
                            title="Remover etapa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAddingDetailStep && (
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-500/[0.06] animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Ex: Validar conciliação bancária do extrato..."
                        value={newDetailStepText}
                        onChange={(e) => setNewDetailStepText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDetailValidationStep()}
                        className="w-full sm:flex-1 px-3 py-1.5 rounded-lg text-xs bg-[#F7F6F1] dark:bg-[#293244] border border-[#DCD7CC] dark:border-[#343F56] text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleAddDetailValidationStep}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingDetailStep(false);
                            setNewDetailStepText("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-[#DDD8CD]/70 dark:hover:bg-white/[0.06] text-xs font-medium cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ASSISTENTE IA NA DEMANDA */}
                <div className="p-4 rounded-xl bg-[#F0EDE6] dark:bg-[#273042] border border-[#DCD7CC]/90 dark:border-[#354158] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Assistente IA</span>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleRunTaskAiAssist("refine")}
                        disabled={isLoadingAiAssist}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                          aiAssistMode === "refine" && aiAssistResult
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-[#F7F6F1] dark:bg-[#293244] text-slate-700 dark:text-zinc-200 border-[#DCD7CC]/90 dark:border-[#343F56] hover:border-indigo-400"
                        }`}
                      >
                        {isLoadingAiAssist && aiAssistMode === "refine" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3 text-indigo-500" />
                        )}
                        <span>Refinar Texto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunTaskAiAssist("action_plan")}
                        disabled={isLoadingAiAssist}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                          aiAssistMode === "action_plan" && aiAssistResult
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-[#F7F6F1] dark:bg-[#293244] text-slate-700 dark:text-zinc-200 border-[#DCD7CC]/90 dark:border-[#343F56] hover:border-indigo-400"
                        }`}
                      >
                        {isLoadingAiAssist && aiAssistMode === "action_plan" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckSquare className="w-3 h-3 text-indigo-500" />
                        )}
                        <span>Plano de Ação</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunTaskAiAssist("diagnose")}
                        disabled={isLoadingAiAssist}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                          aiAssistMode === "diagnose" && aiAssistResult
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-[#F7F6F1] dark:bg-[#293244] text-slate-700 dark:text-zinc-200 border-[#DCD7CC]/90 dark:border-[#343F56] hover:border-indigo-400"
                        }`}
                      >
                        {isLoadingAiAssist && aiAssistMode === "diagnose" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                        )}
                        <span>Diagnóstico + Wiki</span>
                      </button>
                    </div>
                  </div>

                  {aiAssistError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{aiAssistError}</p>
                  )}

                  {aiAssistResult && (
                    <div className="p-3.5 rounded-lg bg-[#F7F6F1] dark:bg-[#1C2230] border border-indigo-200/80 dark:border-indigo-500/30 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Sugestão da IA
                          {aiAssistResult.estimated_effort ? ` • ${aiAssistResult.estimated_effort}` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAiAssistResult(null);
                            setAiAssistMode(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                        {aiAssistResult.technical_guidance}
                      </p>

                      {aiAssistMode === "refine" && aiAssistResult.refined_title && (
                        <div className="p-2.5 rounded-lg bg-[#F0EDE6] dark:bg-[#293244] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-1 text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {aiAssistResult.refined_title}
                          </div>
                          {aiAssistResult.structured_description && (
                            <div className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                              {aiAssistResult.structured_description}
                            </div>
                          )}
                        </div>
                      )}

                      {aiAssistResult.validation_steps && aiAssistResult.validation_steps.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                            Etapas sugeridas ({aiAssistResult.validation_steps.length})
                          </span>
                          <ul className="space-y-1">
                            {aiAssistResult.validation_steps.map((step, i) => (
                              <li
                                key={i}
                                className="text-xs text-slate-600 dark:text-zinc-300 flex items-start gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleApplyTaskAiAssist}
                          disabled={isApplyingAiAssist}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isApplyingAiAssist ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Aplicar na Demanda</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* COLLAPSIBLE SECTION: ANEXOS & LINKS */}
                {(() => {
                  const totalAttachments =
                    (selectedTask.attachments?.length || 0) +
                    (selectedTask.resolution_attachments?.length || 0);
                  return (
                    <div className="pt-5 border-t border-[#DCD7CC]/75 dark:border-[#2E384D] space-y-3">
                      <button
                        type="button"
                        onClick={() => setIsAttachmentsExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-500 transition-colors shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                            Anexos & Links
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">
                            {totalAttachments}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isAttachmentsExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isAttachmentsExpanded && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                          <AttachmentManager
                            attachments={selectedTask.attachments || []}
                            onChange={async (updated) => {
                              if (onUpdateTaskFields) {
                                await onUpdateTaskFields(selectedTask.id, { attachments: updated });
                              }
                            }}
                            stage="creation"
                            label="Arquivos & Links da Demanda"
                            onPreviewMedia={(media) => setActiveMediaItem(media)}
                          />

                          {selectedTask.resolution_attachments && selectedTask.resolution_attachments.length > 0 && (
                            <div className="pt-3 border-t border-[#E5E0D6] dark:border-[#2E384D]">
                              <AttachmentManager
                                attachments={selectedTask.resolution_attachments || []}
                                onChange={async (updated) => {
                                  if (onUpdateTaskFields) {
                                    await onUpdateTaskFields(selectedTask.id, { resolution_attachments: updated });
                                  }
                                }}
                                stage="resolution"
                                label="Comprovantes & Links da Solução"
                                onPreviewMedia={(media) => setActiveMediaItem(media)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* COLLAPSIBLE SECTION: BASE DE SOLUÇÕES & RECORRÊNCIA */}
                <div className="pt-5 border-t border-[#DCD7CC]/75 dark:border-[#2E384D] space-y-3 pb-4">
                  <div
                    onClick={() => setIsSolutionExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 flex-wrap cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                        Solução & Recorrência
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E7E3DA] dark:bg-white/[0.06] text-slate-600 dark:text-zinc-300 font-mono text-[10px] font-semibold">
                        <Repeat className="w-2.5 h-2.5 text-indigo-500" />
                        {selectedTask.recurrence_count || 1}x
                      </span>
                      {selectedTask.resolution_notes && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                          Documentada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSolutionExpanded(true);
                          setIsAddingRecurrence((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ocorrência</span>
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isSolutionExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {isSolutionExpanded && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {isAddingRecurrence && (
                        <div className="p-4 rounded-xl bg-[#F0EDE6] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#343F56] space-y-3 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-zinc-100">
                            <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Registrar Nova Execução (Sem Duplicar Base)</span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">
                                Notas / Contexto desta reincidência:
                              </label>
                              <textarea
                                rows={2}
                                value={recurrenceNotes}
                                onChange={(e) => setRecurrenceNotes(e.target.value)}
                                placeholder="Descreva o contexto desta nova ocorrência..."
                                className="w-full text-xs p-2.5 rounded-lg bg-[#F7F6F1] dark:bg-[#1C2230] border border-[#DCD7CC] dark:border-[#343F56] text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">
                                Método alternativo (opcional):
                              </label>
                              <input
                                type="text"
                                value={recurrenceMethod}
                                onChange={(e) => setRecurrenceMethod(e.target.value)}
                                placeholder="Ex: Script alternativo aplicado..."
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#F7F6F1] dark:bg-[#1C2230] border border-[#DCD7CC] dark:border-[#343F56] text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={recurrenceReopen}
                                onChange={(e) => setRecurrenceReopen(e.target.checked)}
                                className="rounded border-slate-300 dark:border-[#404D68] text-indigo-600 focus:ring-0"
                              />
                              <span>Reabrir demanda para Em Andamento</span>
                            </label>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCD7CC]/80 dark:border-[#343F56]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingRecurrence(false);
                                setRecurrenceNotes("");
                                setRecurrenceMethod("");
                              }}
                              className="px-3 py-1 rounded-lg text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingRecurrence}
                              onClick={handleSaveRecurrence}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {isSubmittingRecurrence ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Gravar Ocorrência</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedTask.resolution_notes ? (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Solução Documentada</span>
                          </span>
                          <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-500/[0.06] border border-emerald-200/70 dark:border-emerald-500/20 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                            {selectedTask.resolution_notes}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-zinc-500 italic">
                          Nenhuma resolução documentada até o momento.
                        </p>
                      )}

                      {selectedTask.execution_history && selectedTask.execution_history.length > 0 && (
                        <div className="pt-2 border-t border-[#E5E0D6] dark:border-[#2E384D] space-y-2">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                            <Repeat className="w-3 h-3 text-indigo-500" />
                            Histórico de Execuções ({selectedTask.execution_history.length})
                          </span>
                          <div className="space-y-1.5">
                            {selectedTask.execution_history.map((exec) => (
                              <div
                                key={exec.id}
                                className="p-2.5 rounded-lg bg-[#F0EDE6] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {format(parseISO(exec.date), "dd/MM/yyyy 'às' HH:mm")}
                                  </span>
                                  <span>{exec.registered_by || "Usuário"}</span>
                                </div>
                                {exec.notes && (
                                  <p className="text-slate-700 dark:text-zinc-200 text-xs">
                                    {exec.notes}
                                  </p>
                                )}
                                {exec.method && (
                                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded">
                                    <strong>Método:</strong> {exec.method}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedTask.alternative_resolutions && selectedTask.alternative_resolutions.length > 0 && (
                        <div className="pt-2 border-t border-[#E5E0D6] dark:border-[#2E384D] space-y-2">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Métodos Alternativos Catalogados
                          </span>
                          <div className="space-y-1.5">
                            {selectedTask.alternative_resolutions.map((alt) => (
                              <div
                                key={alt.id}
                                className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-500/[0.06] border border-amber-200/70 dark:border-amber-500/20 text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-400">
                                  <span className="font-semibold">{alt.method}</span>
                                  <span>{format(parseISO(alt.date), "dd/MM/yyyy")}</span>
                                </div>
                                {alt.notes && (
                                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 italic">{alt.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT ZONE: LINEAR-STYLE PROPERTIES INSPECTOR RAIL */}
              <div className="border-t xl:border-t-0 xl:border-l border-[#DCD7CC]/75 dark:border-[#2E384D] bg-[#F0EDE6] dark:bg-[#1C2230] px-5 py-6 space-y-5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Propriedades
                </div>

                {/* Prioridade */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                    Prioridade
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => {
                      const isSel = selectedTask.priority === p;
                      const activeClass =
                        p === "P1"
                          ? "bg-rose-600 text-white border-rose-600"
                          : p === "P2"
                          ? "bg-amber-500 text-white border-amber-500"
                          : p === "P3"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-700 text-white border-slate-700";
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleChangeDetailPriority(p)}
                          className={`py-1 rounded-lg border font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                            isSel
                              ? activeClass
                              : "bg-[#F7F6F1] dark:bg-[#222938] text-slate-600 dark:text-zinc-400 border-[#DCD7CC]/80 dark:border-[#343F56] hover:border-indigo-400"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prazo, Horário, Lembrete & Google Meet */}
                <div className="space-y-2 pt-3 border-t border-[#DCD7CC]/70 dark:border-[#2E384D]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                      Prazo & Agenda
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsScheduleExpanded((prev) => !prev)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {isScheduleExpanded ? "Fechar" : "Editar"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScheduleExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] hover:border-indigo-400 text-[11px] font-mono font-medium text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate tabular-nums">
                        {format(parseISO(getTaskScheduleDate(selectedTask)), "dd/MM/yy", { locale: ptBR })}
                        {(hasScheduledTimeRange(selectedTask) || !isTaskAllDay(selectedTask))
                          ? ` • ${formatTaskTimeRange(selectedTask)}`
                          : ""}
                      </span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedTask.reminder_enabled && (
                        <Bell className="w-3 h-3 text-indigo-500" />
                      )}
                      {selectedTask.meet_link && (
                        <Video className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                  </button>

                  {isScheduleExpanded && (
                    <div className="pt-2 space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { label: "Hoje 18h", days: 0 },
                          { label: "Amanhã", days: 1 },
                          { label: "+4 dias", days: 4 },
                          { label: "+1 sem", days: 7 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + preset.days);
                              d.setHours(18, 0, 0, 0);
                              handleChangeDetailDueDate(d.toISOString());
                            }}
                            className="px-2 py-1 rounded-md text-[11px] font-medium bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] hover:border-indigo-400 text-slate-600 dark:text-zinc-300 cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <ScheduleReminderFields
                        valueFormat="iso"
                        itemType={selectedTask.item_type}
                        startValue={selectedTask.scheduled_start || selectedTask.current_due_date || ""}
                        endValue={selectedTask.scheduled_end || ""}
                        onChangeStart={handleChangeDetailDueDate}
                        onChangeEnd={handleChangeDetailEndDate}
                        reminderEnabled={Boolean(selectedTask.reminder_enabled)}
                        reminderMinutesBefore={selectedTask.reminder_minutes_before ?? 30}
                        onChangeReminderEnabled={handleChangeDetailReminderEnabled}
                        onChangeReminderMinutes={handleChangeDetailReminderMinutes}
                        meetLink={selectedTask.meet_link || null}
                        onChangeMeetLink={handleChangeDetailMeetLink}
                        tasks={allTasks}
                        excludeTaskId={selectedTask.id}
                        compact
                      />
                    </div>
                  )}
                </div>

                {/* Categoria */}
                <div className="space-y-1.5 pt-3 border-t border-[#DCD7CC]/70 dark:border-[#2E384D]">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                    Categoria
                  </span>
                  {isEditingCategory ? (
                    <div className="flex items-center gap-1">
                      <CategoryCombobox
                        value={tempCategory}
                        onChange={(val) => setTempCategory(val)}
                        categories={categoriesList}
                        className="flex-1 min-w-0"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveCategory}
                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shrink-0"
                        title="Salvar categoria"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingCategory(false)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-zinc-300 cursor-pointer shrink-0"
                        title="Cancelar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempCategory(selectedTask.category);
                        setIsEditingCategory(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] hover:border-indigo-400 text-xs font-medium text-slate-800 dark:text-zinc-200 transition-colors group cursor-pointer"
                      title="Clique para editar a categoria"
                    >
                      <span className="truncate">{selectedTask.category}</span>
                      <Edit2 className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  )}
                </div>

                {/* Tipo & Espaço */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[#DCD7CC]/70 dark:border-[#2E384D]">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                      Tipo
                    </span>
                    {onUpdateItemType && (
                      <select
                        value={selectedTask.item_type || "task"}
                        onChange={(e) =>
                          onUpdateItemType(selectedTask.id, e.target.value as ItemType)
                        }
                        aria-label="Tipo do item"
                        className="w-full px-2 py-1.5 rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] text-xs font-medium text-slate-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="task">Tarefa</option>
                        <option value="activity">Atividade</option>
                        <option value="reminder">Lembrete</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                      Espaço
                    </span>
                    <div
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                        isWorkItem(selectedTask)
                          ? "bg-blue-50/70 text-blue-700 border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                          : "bg-violet-50/70 text-violet-700 border-violet-200/80 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20"
                      }`}
                    >
                      {isWorkItem(selectedTask) ? (
                        <>
                          <Briefcase className="w-3 h-3 shrink-0" />
                          <span>Trabalho</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 shrink-0" />
                          <span>Pessoal</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2 pt-3 border-t border-[#DCD7CC]/70 dark:border-[#2E384D]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Tags
                    </span>
                    {!isAddingTag && (
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(true)}
                        className="inline-flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedTask.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F7F6F1] dark:bg-[#222938] text-slate-700 dark:text-zinc-300 border border-[#DCD7CC]/80 dark:border-[#343F56]"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title={`Remover tag #${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {(!selectedTask.tags || selectedTask.tags.length === 0) && !isAddingTag && (
                      <span className="text-[11px] text-slate-400 dark:text-zinc-600">
                        Nenhuma tag
                      </span>
                    )}

                    {isAddingTag && (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          placeholder="Nova tag..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                          className="flex-1 min-w-0 px-2 py-1 rounded-md text-xs border border-indigo-500 bg-[#F7F6F1] dark:bg-[#222938] text-slate-800 dark:text-zinc-100 outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="p-1 rounded bg-indigo-600 text-white cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(false)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quiet Audit Metadata */}
                <div className="pt-3 border-t border-[#DCD7CC]/70 dark:border-[#2E384D] space-y-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  {selectedTask.created_at && (
                    <div className="flex items-center justify-between">
                      <span>Criada em</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                        {(() => {
                          try {
                            return format(parseISO(selectedTask.created_at), "dd/MM/yy");
                          } catch {
                            return "—";
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  {(selectedTask.extension_count || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Prorrogações</span>
                      <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {selectedTask.extension_count}x
                      </span>
                    </div>
                  )}
                  {(selectedTask.recurrence_count || 1) > 1 && (
                    <div className="flex items-center justify-between">
                      <span>Recorrências</span>
                      <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                        {selectedTask.recurrence_count}x
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 2: ESTUDO & TUTORIAIS */}
        {activeTab === "study" && (
          <div className="max-w-5xl mx-auto p-5 sm:p-8 space-y-5">
            {/* 1. SEÇÃO DE SITES, ARTIGOS TÉCNICOS & DOCUMENTAÇÕES */}
            <div className="p-5 rounded-xl bg-[#F0EDE6] dark:bg-[#222938] border border-[#DCD7CC]/80 dark:border-[#343F56] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E0D6] dark:border-[#343F56]/80 pb-3 flex-wrap gap-2">
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
                <div className="p-4 rounded-xl bg-[#F0EDE6] dark:bg-[#171C26] border border-[#DCD7CC] dark:border-[#343F56] space-y-3 animate-in fade-in">
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
                        className="w-full h-8 px-3 text-xs rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#404D68] text-slate-900 dark:text-white outline-none focus:border-sky-500"
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
                        className="w-full h-8 px-3 text-xs rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#404D68] text-slate-900 dark:text-white outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <input
                      type="text"
                      placeholder="Fonte / Autor (opcional, ex: Microsoft Learn, MDN, Medium)"
                      value={newArticleSource}
                      onChange={(e) => setNewArticleSource(e.target.value)}
                      className="w-full sm:w-64 h-8 px-3 text-xs rounded-lg bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#404D68] text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    />

                    <div className="flex items-center justify-end gap-2 shrink-0">
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
                        className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 cursor-pointer"
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
                      className="group flex flex-col justify-between p-4 rounded-xl border border-[#DCD7CC] dark:border-[#343F56] bg-[#F0EDE6]/60 dark:bg-[#222938] hover:border-sky-400 dark:hover:border-sky-500/50 hover:bg-[#FBF9F5] dark:hover:bg-[#2F394D] transition-all shadow-xs hover:shadow-md space-y-2.5"
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

                      <div className="pt-2 border-t border-[#DCD7CC]/60 dark:border-[#343F56]/80 flex items-center justify-between text-[11px]">
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
                <div className="pt-2 border-t border-[#E5E0D6] dark:border-[#343F56]/80 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Pesquisar diretamente:
                  </span>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      `${selectedTask.title} documentacao artigo tutorial`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E7E3DA] dark:bg-[#293244] hover:bg-[#DDD8CD] dark:hover:bg-[#38445C] text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E7E3DA] dark:bg-[#293244] hover:bg-[#DDD8CD] dark:hover:bg-[#38445C] text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
                  >
                    Dev.to <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            {/* 2. SEÇÃO DE VÍDEOS & TUTORIAIS DO YOUTUBE */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#343F56] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E0D6] dark:border-[#343F56]/80 pb-3">
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
                    <div
                      key={idx}
                      onClick={() =>
                        setActiveMediaItem({
                          url: vid.url,
                          title: vid.title,
                          type: "video/youtube",
                        })
                      }
                      className="group block rounded-2xl border border-[#DCD7CC] dark:border-[#343F56] overflow-hidden bg-[#F0EDE6]/50 dark:bg-[#293244] hover:border-rose-400 dark:hover:border-rose-500/50 transition-all shadow-sm hover:shadow-md cursor-pointer"
                      title="Clique para assistir ao tutorial no visualizador interno"
                    >
                      <div className="aspect-video w-full relative overflow-hidden bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <div className="w-10 h-10 rounded-full bg-rose-600/90 group-hover:bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <PlayCircle className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {vid.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{vid.channel}</span>
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                            Assistir <PlayCircle className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#F7F6F1] dark:bg-[#222938] border border-[#DCD7CC] dark:border-[#343F56] shadow-2xl">
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-[#E4E0D6] dark:hover:bg-[#2F394D] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time & Date + Reminder */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <span className="sm:hidden">
                      {(() => {
                        const d = parseISO(getTaskScheduleDate(previewTask));
                        return `${SHORT_WEEKDAYS[d.getDay()]}, ${format(d, "d 'de' MMM", {
                          locale: ptBR,
                        })} • ${formatTaskTimeRange(previewTask)}`;
                      })()}
                    </span>
                    <span className="hidden sm:inline">
                      {format(parseISO(getTaskScheduleDate(previewTask)), "EEEE, d 'de' MMMM", {
                        locale: ptBR,
                      })}{" "}
                      • {formatTaskTimeRange(previewTask)}
                    </span>
                  </span>
                </div>
                {previewTask.reminder_enabled && (
                  <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                    <Bell className="w-4 h-4 shrink-0" />
                    <span>
                      Lembrete configurado: {formatReminderLeadTime(previewTask.reminder_minutes_before ?? 30)}
                    </span>
                  </div>
                )}
              </div>

              {/* Category & Tags */}
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{previewTask.category}</span>
                  {previewTask.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#E7E3DA] dark:bg-[#293244] text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description preview */}
              {previewTask.description && (
                <div className="p-3 rounded-xl bg-[#F0EDE6] dark:bg-[#171C26] border border-[#DCD7CC] dark:border-[#343F56] text-xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto leading-relaxed">
                  <FormattedText text={previewTask.description} />
                </div>
              )}

              {/* Google Meet Quick Action */}
              {previewTask.meet_link && (
                <div className="pt-1">
                  <a
                    href={previewTask.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Video className="w-4 h-4" />
                    <span>Entrar no Google Meet</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E5E0D6] dark:border-[#343F56]">
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

      {/* Media Lightbox Modal (Images, Videos, Tutorials) */}
      <MediaLightboxModal
        isOpen={Boolean(activeMediaItem)}
        onClose={() => setActiveMediaItem(null)}
        media={activeMediaItem}
      />
    </main>
  );
}
