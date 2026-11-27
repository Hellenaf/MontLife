"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  WifiOff,
  Menu,
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckSquare,
  StickyNote,
  Calendar,
  LogOut,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { getTaskScheduleDate, formatTaskTimeRange } from "@/lib/taskSchedule";
import { isTaskOverdue } from "@/lib/sla";
import { format, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROUTE_META: Record<string, { section: string; label: string }> = {
  "/": { section: "Workspace", label: "Visão geral" },
  "/meu-dia": { section: "Workspace", label: "Meu dia" },
  "/demandas": { section: "Organização", label: "Demandas" },
  "/kanban": { section: "Organização", label: "Kanban" },
  "/agenda": { section: "Organização", label: "Agenda" },
  "/anotacoes": { section: "Conhecimento", label: "Anotações" },
  "/wiki": { section: "Conhecimento", label: "Wiki técnica" },
  "/assistente-ia": { section: "Inteligência", label: "Assistente IA" },
  "/relatorios": { section: "Inteligência", label: "Relatórios" },
  "/configuracoes": { section: "Sistema", label: "Configurações" },
};

interface GlobalHeaderProps {
  onOpenMobileMenu: () => void;
}

export function GlobalHeader({ onOpenMobileMenu }: GlobalHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    tasks,
    accounts,
    currentUser,
    accountFilter,
    setAccountFilter,
    isOnline,
    isSyncingGoogle,
    offlinePendingCount,
    triggerGoogleSync,
    setIsCommandPaletteOpen,
    openNewTaskModal,
    openTaskInModule,
    handleCreateNote,
    handleLogout,
    handleTaskCreated,
    setUndoToast,
  } = useWorkspace();

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isAiQuickOpen, setIsAiQuickOpen] = useState(false);
  const [aiQuickText, setAiQuickText] = useState("");
  const [isRunningAiQuick, setIsRunningAiQuick] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifPos, setNotifPos] = useState({ top: 62, right: 16 });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const createRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const notifPopoverRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const meta = ROUTE_META[pathname] || { section: "Workspace", label: "MontLife" };

  // Close popovers on outside click
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isCreateMenuOpen && !createRef.current?.contains(target)) {
        setIsCreateMenuOpen(false);
      }
      if (isProfileOpen && !profileRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }
      if (
        isNotifOpen &&
        !notifBtnRef.current?.contains(target) &&
        !notifPopoverRef.current?.contains(target)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isCreateMenuOpen, isProfileOpen, isNotifOpen]);

  // Notifications: overdue + due today + reminders
  const alerts = useMemo(() => {
    const open = tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELED"
    );
    const overdue = open.filter((t) =>
      isTaskOverdue(t.current_due_date || t.original_due_date, t.status)
    );
    const dueToday = open.filter((t) => {
      if (isTaskOverdue(t.current_due_date || t.original_due_date, t.status)) return false;
      const d = getTaskScheduleDate(t);
      if (!d) return false;
      try {
        return isToday(parseISO(d));
      } catch {
        return false;
      }
    });
    return { overdue, dueToday, total: overdue.length + dueToday.length };
  }, [tasks]);

  const connectedAccountsCount = accounts.filter(
    (a) => Boolean(a.is_connected || a.access_token || a.refresh_token) && Boolean(a.email)
  ).length;

  const displayName = currentUser?.name || "Usuário MontLife";
  const displayEmail =
    currentUser?.email ||
    accounts.find((a) => a.email)?.email ||
    "usuario@montlife.com";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "ML";

  const activeScope: "all" | "work" | "personal" = useMemo(() => {
    const f = (accountFilter || "all").toLowerCase();
    if (f === "all") return "all";
    if (f.includes("pess") || f.includes("person") || f.includes("hellen")) {
      return "personal";
    }
    return "work";
  }, [accountFilter]);

  const toggleNotif = () => {
    if (!isNotifOpen && notifBtnRef.current) {
      const rect = notifBtnRef.current.getBoundingClientRect();
      setNotifPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    setIsNotifOpen((prev) => !prev);
  };

  const handleVoiceCapture = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionApi =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setUndoToast({
        id: `voice-err-${Date.now()}`,
        message: "Navegador sem suporte a ditado por voz",
        variant: "warning",
      });
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognitionApi as any)();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setAiQuickText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.start();
  };

  const handleAiQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = aiQuickText.trim();
    if (!clean || isRunningAiQuick) return;
    setIsRunningAiQuick(true);
    try {
      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: clean }),
      });
      const triageJson = await triageRes.json();
      const t = triageJson?.triage;

      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_input: clean,
          title: t?.refined_title || clean,
          description: t?.structured_description || "",
          account_type:
            activeScope === "personal"
              ? "personal"
              : t?.account_type || "work",
          item_type: t?.item_type || "task",
          category: t?.category || "Operações & Demandas",
          priority: t?.priority || "P3",
          due_date: triageJson?.calculated_due_date || undefined,
          scheduled_start: t?.extracted_due_date_iso || null,
          scheduled_end: t?.extracted_end_date_iso || null,
          meet_link: t?.extracted_meet_link || null,
          tags: t?.search_tags || [],
          validation_steps: (t?.validation_steps || []).map(
            (text: string, idx: number) => ({
              id: `step-${Date.now()}-${idx}`,
              text,
              completed: false,
            })
          ),
          learning_resources: triageJson?.learning_resources || {
            youtube_videos: [],
            articles: [],
            search_queries: [],
          },
        }),
      });
      const createdJson = await createRes.json();
      if (createdJson.success && createdJson.task) {
        handleTaskCreated(createdJson.task);
        setAiQuickText("");
        setIsAiQuickOpen(false);
        setUndoToast({
          id: `ai-task-${createdJson.task.id}`,
          message: `Demanda criada via IA (${createdJson.task.priority})`,
          detail: createdJson.task.title,
          variant: "success",
        });
      }
    } catch {
      setUndoToast({
        id: `ai-err-${Date.now()}`,
        message: "Erro ao processar comando com IA",
        variant: "danger",
      });
    } finally {
      setIsRunningAiQuick(false);
    }
  };

  return (
    <header className="no-print relative z-30 h-[56px] w-full shrink-0 bg-surface border-b border-line px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 transition-colors duration-200">
      {/* Left: Mobile Drawer Trigger + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir navegação"
          className="lg:hidden w-8 h-8 rounded-[9px] flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="hidden sm:inline text-ink-muted font-medium truncate">
            {meta.section}
          </span>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-ink-muted/60 shrink-0" />
          <span className="font-semibold text-[13px] sm:text-sm text-ink truncate">
            {meta.label}
          </span>
        </nav>
      </div>

      {/* Center: Global Search & Command Palette Trigger */}
      <div className="flex-1 max-w-md hidden md:flex items-center">
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full h-9 px-3 rounded-[10px] bg-surface-input hover:bg-lavender-soft/60 border border-line hover:border-lavender-strong flex items-center justify-between gap-2 text-xs text-ink-muted transition-colors duration-150 cursor-pointer"
          title="Abrir busca global e comandos (Ctrl+K)"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-brand shrink-0" />
            <span className="truncate">
              Buscar demandas, notas, wiki ou executar comando...
            </span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded-[6px] bg-surface border border-line font-mono text-[10px] text-ink shrink-0">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Utility Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Search Trigger */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          aria-label="Pesquisar"
          className="md:hidden w-8 h-8 rounded-[9px] flex items-center justify-center text-ink-muted hover:text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Workspace Switcher: Todos | Trabalho | Pessoal */}
        <div
          role="group"
          aria-label="Filtrar workspace"
          className="hidden sm:inline-flex items-center p-0.5 rounded-[10px] bg-canvas border border-line"
        >
          {(
            [
              { id: "all", label: "Todos" },
              { id: "work", label: "Trabalho" },
              { id: "personal", label: "Pessoal" },
            ] as const
          ).map((ws) => {
            const active = activeScope === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => setAccountFilter(ws.id)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-surface text-ink shadow-xs-subtle border border-line/80"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {ws.label}
              </button>
            );
          })}
        </div>

        {/* Quick Creation Split Button */}
        <div ref={createRef} className="relative flex items-center">
          <button
            type="button"
            onClick={() => openNewTaskModal()}
            className="inline-flex items-center gap-1.5 pl-3 pr-2.5 h-8 sm:h-9 rounded-l-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold transition-colors duration-150 cursor-pointer"
            title="Criar nova demanda"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Criar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateMenuOpen((prev) => !prev)}
            aria-label="Mais opções de criação rápida"
            className="inline-flex items-center justify-center w-6 h-8 sm:h-9 rounded-r-[10px] bg-brand hover:bg-brand-hover text-brand-fg border-l border-white/20 dark:border-black/20 transition-colors duration-150 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isCreateMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-[12px] bg-surface border border-line shadow-popover p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  openNewTaskModal();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-brand" />
                <span>Nova Demanda</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  setIsAiQuickOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Criar com Triagem IA</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsCreateMenuOpen(false);
                  await handleCreateNote({
                    title: "",
                    content: "",
                    category: "geral",
                    account_type: activeScope === "personal" ? "personal" : "work",
                    checklist: [],
                  });
                  router.push("/anotacoes");
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                <StickyNote className="w-3.5 h-3.5 text-brand" />
                <span>Nova Nota em Branco</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateMenuOpen(false);
                  openNewTaskModal({ initialDate: new Date() });
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-brand" />
                <span>Agendar Compromisso</span>
              </button>
            </div>
          )}
        </div>

        {/* Sync & Connectivity Indicator */}
        <button
          type="button"
          onClick={triggerGoogleSync}
          disabled={!isOnline || isSyncingGoogle}
          title={
            !isOnline
              ? `Modo offline (${offlinePendingCount} pendência(s))`
              : isSyncingGoogle
              ? "Sincronizando..."
              : "Sincronizado — clique para atualizar contas Google"
          }
          className={`h-8 sm:h-9 px-2 rounded-[9px] border flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
            !isOnline
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-surface border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                Offline{offlinePendingCount > 0 ? ` (${offlinePendingCount})` : ""}
              </span>
            </>
          ) : (
            <>
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncingGoogle ? "animate-spin text-brand" : "text-emerald-600 dark:text-emerald-400"
                }`}
              />
              <span className="hidden 2xl:inline">
                {isSyncingGoogle ? "Sincronizando" : "Sincronizado"}
              </span>
            </>
          )}
        </button>

        {/* Notifications Bell */}
        <button
          ref={notifBtnRef}
          type="button"
          onClick={toggleNotif}
          aria-label="Notificações e vencimentos"
          title="Alertas de vencimento e agenda de hoje"
          className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-[9px] border flex items-center justify-center transition-colors cursor-pointer ${
            isNotifOpen
              ? "bg-lavender-soft border-lavender-strong text-brand"
              : "bg-surface border-line text-ink-muted hover:text-ink hover:bg-lavender-soft"
          }`}
        >
          <Bell className="w-4 h-4" />
          {alerts.total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
              {alerts.total > 9 ? "9+" : alerts.total}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Alternar tema"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[9px] border border-line bg-surface text-ink-muted hover:text-ink hover:bg-lavender-soft flex items-center justify-center transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-brand" />
          )}
        </button>

        {/* Profile & Connected Accounts Popover */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-label="Perfil do usuário"
            className="flex items-center gap-2 pl-1 pr-2 h-8 sm:h-9 rounded-[10px] border border-line bg-surface hover:bg-lavender-soft transition-colors cursor-pointer"
          >
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={displayName}
                className="w-6 h-6 rounded-[7px] object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-[7px] bg-brand text-brand-fg text-[10px] font-bold flex items-center justify-center">
                {initials}
              </div>
            )}
            <span className="hidden xl:inline text-xs font-medium text-ink max-w-[100px] truncate">
              {displayName.split(" ")[0]}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-[12px] bg-surface border border-line shadow-popover p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="pb-2.5 border-b border-line">
                <p className="text-xs font-bold text-ink truncate">{displayName}</p>
                <p className="text-[11px] text-ink-muted truncate">{displayEmail}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-[7px] bg-lavender-soft text-[10px] font-semibold text-ink">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectedAccountsCount > 0 ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {connectedAccountsCount} conta(s) Google vinculada(s)
                </span>
              </div>

              <div className="space-y-1">
                <Link
                  href="/configuracoes"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-lavender-soft transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-brand" />
                  <span>Contas e Configurações</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Portal */}
      {isNotifOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={notifPopoverRef}
            style={{ top: notifPos.top, right: notifPos.right }}
            className="fixed w-[340px] max-w-[calc(100vw-24px)] max-h-[440px] flex flex-col rounded-[14px] bg-surface border border-line shadow-popover z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-sidebar">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-brand" />
                <span className="text-xs font-bold text-ink">
                  Alertas & Agenda de Hoje
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifOpen(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-line">
              {alerts.total === 0 ? (
                <div className="py-10 px-4 text-center space-y-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-ink">Tudo em dia!</p>
                  <p className="text-[11px] text-ink-muted">
                    Nenhum vencimento crítico ou atraso pendente.
                  </p>
                </div>
              ) : (
                <>
                  {alerts.overdue.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        setIsNotifOpen(false);
                        openTaskInModule(task, "/demandas");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-lavender-soft/50 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                          Atrasada • {task.priority}
                        </p>
                      </div>
                    </button>
                  ))}
                  {alerts.dueToday.map((task) => {
                    const sched = getTaskScheduleDate(task);
                    const timeStr = formatTaskTimeRange(task);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setIsNotifOpen(false);
                          openTaskInModule(task, "/demandas");
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-lavender-soft/50 transition-colors cursor-pointer flex items-start gap-2.5"
                      >
                        <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink truncate">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-ink-muted font-mono mt-0.5">
                            Hoje{" "}
                            {timeStr ||
                              (sched
                                ? format(parseISO(sched), "HH:mm", { locale: ptBR })
                                : "")}{" "}
                            • {task.priority}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Quick AI Triage Dialog */}
      {isAiQuickOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-[#1D1925]/55 backdrop-blur-[2px] flex items-start justify-center pt-[14vh] p-4 animate-in fade-in duration-150"
            onClick={() => !isRunningAiQuick && setIsAiQuickOpen(false)}
          >
            <form
              onSubmit={handleAiQuickCreate}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-[14px] bg-surface border border-line shadow-popover p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-lavender-soft text-brand flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      Criar demanda com Triagem IA
                    </h3>
                    <p className="text-[11px] text-ink-muted">
                      A IA classifica prioridade, SLA, categoria, horário e etapas automaticamente.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiQuickOpen(false)}
                  className="p-1 rounded-md text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                rows={3}
                autoFocus
                value={aiQuickText}
                onChange={(e) => setAiQuickText(e.target.value)}
                placeholder="Ex.: Revisar renovação de licenças cloud até amanhã às 15h com urgência alta..."
                className="w-full p-3 rounded-[10px] ml-input text-xs resize-none"
                disabled={isRunningAiQuick}
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleVoiceCapture}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-xs font-medium border transition-colors cursor-pointer ${
                    isListening
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400"
                      : "bg-sidebar border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                  <span>{isListening ? "Ouvindo..." : "Ditar por voz"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const txt = aiQuickText;
                      setIsAiQuickOpen(false);
                      openNewTaskModal({ initialText: txt });
                    }}
                    className="px-3 py-1.5 rounded-[9px] text-xs font-medium bg-sidebar border border-line text-ink hover:bg-lavender-soft cursor-pointer"
                  >
                    Abrir formulário completo
                  </button>
                  <button
                    type="submit"
                    disabled={isRunningAiQuick || !aiQuickText.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    {isRunningAiQuick ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Criar com IA</span>
                  </button>
                </div>
              </div>
            </form>
          </div>,
          document.body
        )}
    </header>
  );
}
