"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Palette,
  Layers,
  ShieldCheck,
  Plug,
  Bell,
  Layout,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Plus,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Wifi,
  WifiOff,
  ExternalLink,
  Crown,
  Download,
  Mail,
  Sliders,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace, isTaskMatchingWorkspace } from "@/context/WorkspaceContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SettingsTab =
  | "perfil"
  | "aparencia"
  | "workspaces"
  | "contas"
  | "integracoes"
  | "notificacoes"
  | "layout"
  | "ia"
  | "sincronizacao";

const CATEGORIES: {
  id: SettingsTab;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "perfil", label: "Perfil", desc: "Conta mestra e sessão", icon: User },
  { id: "aparencia", label: "Aparência", desc: "Tema, densidade e conforto", icon: Palette },
  { id: "workspaces", label: "Workspaces", desc: "Trabalho, Pessoal e escopo", icon: Layers },
  { id: "contas", label: "Contas Google", desc: "Conta mestra e vinculadas", icon: ShieldCheck },
  { id: "integracoes", label: "Integrações", desc: "Calendar, Meet e YouTube", icon: Plug },
  { id: "notificacoes", label: "Notificações", desc: "Web Push e lembretes", icon: Bell },
  { id: "layout", label: "Preferências de layout", desc: "Sidebar e SplitView", icon: Layout },
  { id: "ia", label: "Inteligência artificial", desc: "Chat Gemini e briefing", icon: Sparkles },
  { id: "sincronizacao", label: "Sincronização e dados", desc: "Offline, PWA e backup", icon: RefreshCw },
];

export function SettingsWorkspaceView() {
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const {
    tasks,
    notes,
    accounts,
    currentUser,
    accountFilter,
    setAccountFilter,
    isOnline,
    isSyncingGoogle,
    offlinePendingCount,
    lastSyncedAt,
    triggerGoogleSync,
    handleLogout,
    setIsAccountsModalOpen,
    setUndoToast,
    prefs,
    updatePrefs,
    setSplitRatio,
    setTaskDensity,
    resetPreferences,
  } = useWorkspace();

  const tabParam = searchParams?.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam && CATEGORIES.some((c) => c.id === tabParam) ? tabParam : "perfil"
  );
  const [pushStatus, setPushStatus] = useState<string>("default");
  const [chatStyle, setChatStyle] = useState<"objetivo" | "detalhado" | "executivo">("objetivo");

  useEffect(() => {
    if (tabParam && CATEGORIES.some((c) => c.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      setPushStatus(Notification.permission);
    }
    try {
      const savedStyle = localStorage.getItem("montlife_ai_chat_style");
      if (
        savedStyle === "objetivo" ||
        savedStyle === "detalhado" ||
        savedStyle === "executivo"
      ) {
        setChatStyle(savedStyle);
      }
    } catch {}
  }, []);

  const masterEmail = useMemo(
    () => (currentUser?.email || "").toLowerCase().trim(),
    [currentUser?.email]
  );

  const isAccountMaster = (email?: string, index?: number) => {
    const clean = (email || "").toLowerCase().trim();
    if (masterEmail && clean) return clean === masterEmail;
    return index === 0;
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setPushStatus(perm);
    setUndoToast({
      id: `notif-${Date.now()}`,
      message:
        perm === "granted"
          ? "Notificações Web Push ativadas!"
          : "Permissão de notificação não concedida.",
      variant: perm === "granted" ? "success" : "warning",
    });
  };

  const testBrowserNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") {
      requestNotificationPermission();
      return;
    }
    new Notification("MontLife — Teste de Notificação", {
      body: "Seus alertas de lembrete e vencimento estão funcionando perfeitamente!",
      icon: "/icon-192x192.png",
    });
  };

  const clearLocalCache = () => {
    if (typeof window === "undefined" || !currentUser?.userId) return;
    try {
      localStorage.removeItem(`montlife_cached_tasks_${currentUser.userId}`);
      localStorage.removeItem(`montlife_cached_notes_${currentUser.userId}`);
      setUndoToast({
        id: `cache-${Date.now()}`,
        message: "Cache local limpo",
        detail: "Os dados no Cloud Firestore permanecem intactos.",
        variant: "success",
      });
    } catch {}
  };

  const handleExportLocalBackup = () => {
    if (typeof window === "undefined") return;
    let wikiCustom: unknown[] = [];
    try {
      const raw = localStorage.getItem(
        `montlife_offline_wiki_${currentUser?.userId || "local"}`
      );
      if (raw) wikiCustom = JSON.parse(raw);
    } catch {}

    const payload = {
      exported_at: new Date().toISOString(),
      master_email: currentUser?.email || "",
      tasks,
      notes,
      wiki_articles: wikiCustom,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `montlife-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setUndoToast({
      id: `backup-${Date.now()}`,
      message: "Backup JSON exportado com sucesso",
      variant: "success",
    });
  };

  const workTasks = tasks.filter((t) => isTaskMatchingWorkspace(t, "work"));
  const personalTasks = tasks.filter((t) => isTaskMatchingWorkspace(t, "personal"));
  const completedTotal = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-canvas">
      {/* Left Internal Category Navigation */}
      <aside className="w-full lg:w-[276px] shrink-0 bg-sidebar border-b lg:border-b-0 lg:border-r border-line p-3.5 overflow-x-auto lg:overflow-y-auto">
        <p className="hidden lg:block px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Categorias de configuração
        </p>
        <div className="flex lg:flex-col gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left transition-colors whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
                  active
                    ? "bg-lavender-soft text-ink font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-lavender-soft/50 font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? "text-brand" : "text-ink-muted"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs leading-tight">{cat.label}</p>
                  <p className="hidden lg:block text-[10px] text-ink-muted truncate mt-0.5">
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Expansive Settings Content Panel (Wide fluid layout!) */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto p-5 sm:p-8 lg:px-10">
        <div className="w-full max-w-6xl space-y-6">
          {/* 1. PERFIL */}
          {activeTab === "perfil" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Perfil & Identidade</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Seu Perfil Mestre centraliza todas as contas Google vinculadas com isolamento seguro no Cloud Firestore.
                </p>
              </div>

              <div className="ml-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  {currentUser?.picture ? (
                    <img
                      src={currentUser.picture}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-[14px] border border-line object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-[14px] bg-brand text-brand-fg font-bold text-xl flex items-center justify-center">
                      {(currentUser?.name || "ML").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink">
                        {currentUser?.name || "Usuário MontLife"}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] bg-lavender-soft border border-lavender-mid text-brand text-[10px] font-bold">
                        <Crown className="w-3 h-3" /> Conta Mestra
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-brand" />
                      {currentUser?.email || "Sem e-mail identificado"}
                    </p>
                    <p className="text-[11px] font-mono text-ink-muted">
                      Master UID: {currentUser?.userId || "—"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Encerrar sessão</span>
                </button>
              </div>

              {/* Profile Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="ml-card p-4 space-y-1">
                  <p className="text-[11px] text-ink-muted">Total de demandas</p>
                  <p className="text-2xl font-bold font-mono text-ink">{tasks.length}</p>
                </div>
                <div className="ml-card p-4 space-y-1">
                  <p className="text-[11px] text-ink-muted">Demandas concluídas</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {completedTotal}
                  </p>
                </div>
                <div className="ml-card p-4 space-y-1">
                  <p className="text-[11px] text-ink-muted">Anotações ativas</p>
                  <p className="text-2xl font-bold font-mono text-brand">
                    {notes.filter((n) => !n.archived).length}
                  </p>
                </div>
                <div className="ml-card p-4 space-y-1">
                  <p className="text-[11px] text-ink-muted">Contas vinculadas</p>
                  <p className="text-2xl font-bold font-mono text-ink">{accounts.length}</p>
                </div>
              </div>
            </section>
          )}

          {/* 2. APARÊNCIA */}
          {activeTab === "aparencia" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Aparência & Conforto Visual</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Identidade visual Creme, Roxo e Lavanda projetada para uso confortável por longos períodos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-5 rounded-[12px] border text-left transition-all cursor-pointer space-y-3.5 ${
                    theme === "light"
                      ? "border-brand bg-lavender-soft/60 ring-1 ring-brand/30"
                      : "border-line bg-surface hover:border-lavender-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                      <Sun className="w-4 h-4 text-brand" /> Modo Claro — Creme & Roxo
                    </span>
                    {theme === "light" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                  </div>
                  <p className="text-xs text-ink-muted">
                    Superfícies creme suaves (`#F5F1E8` / `#FFFCF6`) com destaque roxo (`#7455AD`) e lavanda (`#E7DFF5`).
                  </p>
                  <div className="flex gap-2">
                    {["#F5F1E8", "#FAF6EF", "#FFFCF6", "#E7DFF5", "#D8C9EE", "#7455AD", "#392D4B"].map(
                      (hex) => (
                        <span
                          key={hex}
                          className="w-7 h-7 rounded-[7px] border border-black/10"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-5 rounded-[12px] border text-left transition-all cursor-pointer space-y-3.5 ${
                    theme === "dark"
                      ? "border-brand bg-lavender-soft/60 ring-1 ring-brand/30"
                      : "border-line bg-surface hover:border-lavender-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                      <Moon className="w-4 h-4 text-brand" /> Modo Escuro — Roxo & Lavanda
                    </span>
                    {theme === "dark" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                  </div>
                  <p className="text-xs text-ink-muted">
                    Roxo profundo confortável (`#1D1925` / `#2C2637`) com acentos em lavanda luminosa (`#B6A2DB`).
                  </p>
                  <div className="flex gap-2">
                    {["#1D1925", "#241F2D", "#2C2637", "#352D42", "#B6A2DB", "#D8C9EE", "#F5F1E8"].map(
                      (hex) => (
                        <span
                          key={hex}
                          className="w-7 h-7 rounded-[7px] border border-white/15"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>
                </button>
              </div>

              <div className="ml-card p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-ink">Densidade da lista de demandas</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Confortável exibe metadados completos; Compacto maximiza o número de linhas visíveis.
                  </p>
                </div>
                <div className="inline-flex p-1 rounded-[10px] bg-canvas border border-line">
                  <button
                    type="button"
                    onClick={() => setTaskDensity("comfortable")}
                    className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer ${
                      prefs.taskDensity === "comfortable"
                        ? "bg-surface text-ink shadow-xs-subtle"
                        : "text-ink-muted"
                    }`}
                  >
                    Confortável
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskDensity("compact")}
                    className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer ${
                      prefs.taskDensity === "compact"
                        ? "bg-surface text-ink shadow-xs-subtle"
                        : "text-ink-muted"
                    }`}
                  >
                    Compacto
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 3. WORKSPACES */}
          {activeTab === "workspaces" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Workspaces</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Alterne ou inspecione o volume operacional entre seus contextos de trabalho e vida pessoal.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: "all",
                    label: "Todos os espaços",
                    total: tasks.length,
                    open: tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length,
                    desc: "Visão consolidada de Trabalho e Pessoal",
                  },
                  {
                    id: "work",
                    label: "Trabalho",
                    total: workTasks.length,
                    open: workTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length,
                    desc: "Demandas corporativas, TI, BI e reuniões",
                  },
                  {
                    id: "personal",
                    label: "Pessoal",
                    total: personalTasks.length,
                    open: personalTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED").length,
                    desc: "Rotina pessoal, saúde, estudos e lembretes",
                  },
                ].map((ws) => {
                  const active = accountFilter === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setAccountFilter(ws.id)}
                      className={`p-5 rounded-[12px] border text-left transition-all cursor-pointer space-y-2 ${
                        active
                          ? "bg-lavender-soft border-brand ring-1 ring-brand/25"
                          : "bg-surface border-line hover:border-lavender-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-ink">{ws.label}</p>
                        {active && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-brand text-brand-fg text-[10px] font-bold">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold font-mono text-brand">{ws.total}</p>
                      <p className="text-[11px] font-mono text-ink">
                        {ws.open} em aberto
                      </p>
                      <p className="text-xs text-ink-muted">{ws.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. CONTAS GOOGLE (COM INDICAÇÃO EXPLICITA DE CONTA MESTRA!) */}
          {activeTab === "contas" && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-ink">Contas Google</h1>
                  <p className="text-xs text-ink-muted mt-0.5">
                    A <strong>Conta Mestra</strong> identifica seu Perfil Mestre principal; contas adicionais sincronizam agenda e espaços no mesmo painel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountsModalOpen(true)}
                    className="px-3.5 py-2 rounded-[10px] bg-sidebar border border-line text-xs font-semibold text-ink hover:bg-lavender-soft cursor-pointer"
                  >
                    Renomear / Revogar
                  </button>
                  <a
                    href="/api/google/auth?action=link"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Vincular nova conta Google
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.length === 0 ? (
                  <div className="md:col-span-2 ml-card p-8 text-center text-xs text-ink-muted">
                    Nenhuma conta Google vinculada ainda.
                  </div>
                ) : (
                  accounts.map((acc, idx) => {
                    const master = isAccountMaster(acc.email, idx);
                    const connected = Boolean(acc.is_connected || acc.refresh_token);
                    return (
                      <div
                        key={acc.id}
                        className={`ml-card p-5 flex flex-col justify-between gap-4 ${
                          master ? "border-brand ring-1 ring-brand/25" : ""
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-ink">
                                {acc.label || "Conta Google"}
                              </span>
                              {master ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] bg-brand text-brand-fg text-[10px] font-bold">
                                  <Crown className="w-3 h-3" /> Conta Mestra
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-[7px] bg-sidebar border border-line text-ink-muted text-[10px] font-semibold">
                                  Conta Vinculada
                                </span>
                              )}
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                                connected
                                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {connected ? "Conectada" : "Requer reconexão"}
                            </span>
                          </div>

                          <p className="text-xs font-mono text-ink-muted break-all">
                            {acc.email}
                          </p>

                          <p className="text-[11px] text-ink-muted">
                            {master
                              ? "Perfil principal responsável pela identidade e isolamento dos dados."
                              : "Sincronizada ao Perfil Mestre para consolidar demandas e compromissos."}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-ink-muted">
                            {acc.last_sync_at
                              ? `Sync: ${format(parseISO(acc.last_sync_at), "dd/MM HH:mm", {
                                  locale: ptBR,
                                })}`
                              : "Aguardando sincronização"}
                          </span>

                          <button
                            type="button"
                            onClick={triggerGoogleSync}
                            disabled={isSyncingGoogle}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-sidebar hover:bg-lavender-soft border border-line text-xs font-semibold text-ink cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isSyncingGoogle ? "animate-spin text-brand" : ""
                              }`}
                            />
                            <span>Sincronizar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* 5. INTEGRAÇÕES */}
          {activeTab === "integracoes" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Integrações</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Serviços reais integrados ao ecossistema MontLife.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: "Google Calendar",
                    status: accounts.length > 0 ? "Ativo" : "Aguardando conta",
                    desc: "Sincronização na Agenda com deduplicação automática contra demandas já vinculadas e alerta de conflitos.",
                    href: "/agenda",
                    cta: "Abrir Agenda",
                  },
                  {
                    name: "Google Meet",
                    status: "Ativo",
                    desc: "Geração e abertura de salas Meet em 1 clique diretamente nas linhas de Demandas, Agenda e Meu dia.",
                    href: "/meu-dia",
                    cta: "Ver Meu dia",
                  },
                  {
                    name: "YouTube Data API v3",
                    status: "Ativo",
                    desc: "Curadoria de vídeos de estudo salvos automaticamente na Wiki Técnica e na aba de estudos.",
                    href: "/wiki",
                    cta: "Abrir Wiki",
                  },
                  {
                    name: "Cloud Firestore & Gemini AI",
                    status: "Nativo",
                    desc: "Persistência segura multi-tenant na nuvem com IA generativa para Chat, Notas, Triagem e Briefing.",
                    href: "/assistente-ia",
                    cta: "Abrir Assistente IA",
                  },
                ].map((intg) => (
                  <div
                    key={intg.name}
                    className="ml-card p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{intg.name}</p>
                        <span className="px-2.5 py-0.5 rounded-[7px] bg-lavender-soft text-brand text-[11px] font-semibold">
                          {intg.status}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">{intg.desc}</p>
                    </div>
                    <Link
                      href={intg.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                    >
                      {intg.cta} <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. NOTIFICAÇÕES */}
          {activeTab === "notificacoes" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Notificações & Lembretes</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Configure alertas nativos do navegador (Web Push PWA) e o tempo padrão de aviso antes de compromissos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ml-card p-5 space-y-3">
                  <p className="text-sm font-bold text-ink">Notificações Web Push</p>
                  <p className="text-xs text-ink-muted">
                    Permissão atual:{" "}
                    <strong className="text-ink font-mono">{pushStatus}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="px-3.5 py-2 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
                    >
                      {pushStatus === "granted" ? "Permissão ativa" : "Ativar notificações"}
                    </button>
                    <button
                      type="button"
                      onClick={testBrowserNotification}
                      className="px-3.5 py-2 rounded-[9px] bg-sidebar hover:bg-lavender-soft border border-line text-ink text-xs font-semibold cursor-pointer"
                    >
                      Testar alerta agora
                    </button>
                  </div>
                </div>

                <div className="ml-card p-5 space-y-3">
                  <p className="text-sm font-bold text-ink">Antecedência padrão de lembretes</p>
                  <p className="text-xs text-ink-muted">
                    Aplicada automaticamente ao criar novas demandas ou eventos com lembrete.
                  </p>
                  <select
                    value={prefs.defaultReminderMinutes}
                    onChange={(e) =>
                      updatePrefs({ defaultReminderMinutes: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 rounded-[9px] ml-input text-xs font-mono font-semibold"
                  >
                    <option value={5}>5 minutos antes</option>
                    <option value={10}>10 minutos antes</option>
                    <option value={15}>15 minutos antes</option>
                    <option value={30}>30 minutos antes (padrão)</option>
                    <option value={60}>1 hora antes</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* 7. PREFERÊNCIAS DE LAYOUT */}
          {activeTab === "layout" && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-ink">Preferências de layout</h1>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Personalize a sidebar recolhível e as proporções salvas de todos os módulos com SplitView.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetPreferences();
                    setUndoToast({
                      id: `reset-layout-${Date.now()}`,
                      message: "Preferências de layout restauradas",
                      variant: "success",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-sidebar border border-line hover:bg-lavender-soft text-xs font-semibold text-ink cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ml-card p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand">
                    <Sliders className="w-4 h-4" />
                    <span>Navegação & Geral</span>
                  </div>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-ink">Sidebar recolhida por padrão</p>
                      <p className="text-[11px] text-ink-muted">
                        Alterne rapidamente com a tecla `[`
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs.sidebarCollapsed}
                      onChange={(e) =>
                        updatePrefs({ sidebarCollapsed: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#7455AD] cursor-pointer"
                    />
                  </label>
                </div>

                <div className="ml-card p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand">
                    <Layout className="w-4 h-4" />
                    <span>Proporções SplitView (Master-Detail)</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">Demandas (Lista / Detalhes)</span>
                      <span className="font-mono text-brand font-semibold">
                        {Math.round(prefs.splitRatios.demandas)}% /{" "}
                        {Math.round(100 - prefs.splitRatios.demandas)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={70}
                      value={prefs.splitRatios.demandas}
                      onChange={(e) => setSplitRatio("demandas", Number(e.target.value))}
                      className="w-full accent-[#7455AD]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">Agenda (Calendário / Lista)</span>
                      <span className="font-mono text-brand font-semibold">
                        {Math.round(prefs.splitRatios.agenda)}% /{" "}
                        {Math.round(100 - prefs.splitRatios.agenda)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={48}
                      max={76}
                      value={prefs.splitRatios.agenda}
                      onChange={(e) => setSplitRatio("agenda", Number(e.target.value))}
                      className="w-full accent-[#7455AD]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">Kanban (Painel de detalhes)</span>
                      <span className="font-mono text-brand font-semibold">
                        {Math.round(prefs.splitRatios.kanbanDetail)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={28}
                      max={52}
                      value={prefs.splitRatios.kanbanDetail}
                      onChange={(e) => setSplitRatio("kanbanDetail", Number(e.target.value))}
                      className="w-full accent-[#7455AD]"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 8. INTELIGÊNCIA ARTIFICIAL */}
          {activeTab === "ia" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Inteligência artificial (Gemini)</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Personalize o comportamento do Chat Assistente IA, do Briefing diário e das ferramentas em Notas.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ml-card p-5 space-y-3">
                  <p className="text-sm font-bold text-ink">Estilo padrão do Chat IA</p>
                  <p className="text-xs text-ink-muted">
                    Define como o Assistente IA responde às suas perguntas e consultas sobre demandas.
                  </p>
                  <select
                    value={chatStyle}
                    onChange={(e) => {
                      const next = e.target.value as "objetivo" | "detalhado" | "executivo";
                      setChatStyle(next);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("montlife_ai_chat_style", next);
                      }
                    }}
                    className="w-full h-9 px-3 rounded-[9px] ml-input text-xs font-semibold"
                  >
                    <option value="objetivo">Objetivo e direto ao ponto</option>
                    <option value="executivo">Executivo (focado em decisão)</option>
                    <option value="detalhado">Detalhado (técnico passo a passo)</option>
                  </select>
                </div>

                <div className="ml-card p-5 space-y-4">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-bold text-ink">Briefing automático na Visão geral</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Carrega o resumo de prioridades automaticamente ao abrir a página inicial.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs.autoBriefingOnOverview}
                      onChange={(e) =>
                        updatePrefs({ autoBriefingOnOverview: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#7455AD] cursor-pointer"
                    />
                  </label>
                  <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Chat conectado aos seus dados reais</span>
                    <Link
                      href="/assistente-ia"
                      className="font-semibold text-brand hover:underline inline-flex items-center gap-1"
                    >
                      Abrir Chat IA <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 9. SINCRONIZAÇÃO E ARMAZENAMENTO */}
          {activeTab === "sincronizacao" && (
            <section className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-ink">Sincronização, Offline & Backup</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Monitore a conectividade PWA, fila de mutações offline e exporte uma cópia local dos seus dados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ml-card p-4">
                  <p className="text-xs text-ink-muted">Conectividade</p>
                  <p className="text-sm font-bold text-ink mt-1.5 inline-flex items-center gap-1.5">
                    {isOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-600" /> Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-amber-600" /> Modo Offline
                      </>
                    )}
                  </p>
                </div>
                <div className="ml-card p-4">
                  <p className="text-xs text-ink-muted">Fila offline pendente</p>
                  <p className="text-xl font-bold font-mono text-ink mt-1">
                    {offlinePendingCount}
                  </p>
                </div>
                <div className="ml-card p-4">
                  <p className="text-xs text-ink-muted">Última sincronização</p>
                  <p className="text-xs font-mono font-bold text-brand mt-2">
                    {lastSyncedAt
                      ? format(parseISO(lastSyncedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "Recente"}
                  </p>
                </div>
              </div>

              <div className="ml-card p-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={triggerGoogleSync}
                  disabled={!isOnline || isSyncingGoogle}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer disabled:opacity-45"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogle ? "animate-spin" : ""}`} />
                  <span>Sincronizar agora</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportLocalBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-sidebar hover:bg-lavender-soft border border-line text-xs font-semibold text-ink cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-brand" />
                  <span>Exportar backup JSON</span>
                </button>
                <button
                  type="button"
                  onClick={clearLocalCache}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-sidebar hover:bg-rose-500/10 border border-line text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar cache local</span>
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
