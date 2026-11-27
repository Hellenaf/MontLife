"use client";

import React, { useState, useEffect } from "react";
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
  { id: "perfil", label: "Perfil", desc: "Dados da conta e sessão", icon: User },
  { id: "aparencia", label: "Aparência", desc: "Tema claro/escuro e densidade", icon: Palette },
  { id: "workspaces", label: "Workspaces", desc: "Trabalho, Pessoal e filtros", icon: Layers },
  { id: "contas", label: "Contas Google", desc: "Perfil Mestre e OAuth", icon: ShieldCheck },
  { id: "integracoes", label: "Integrações", desc: "Calendar, Meet e YouTube", icon: Plug },
  { id: "notificacoes", label: "Notificações", desc: "Web Push e lembretes", icon: Bell },
  { id: "layout", label: "Preferências de layout", desc: "Sidebar e painéis SplitView", icon: Layout },
  { id: "ia", label: "Inteligência artificial", desc: "Gemini AI e briefing", icon: Sparkles },
  { id: "sincronizacao", label: "Sincronização e armazenamento", desc: "Offline, PWA e cache", icon: RefreshCw },
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

  useEffect(() => {
    if (tabParam && CATEGORIES.some((c) => c.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

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

  const clearLocalCache = () => {
    if (typeof window === "undefined" || !currentUser?.userId) return;
    try {
      localStorage.removeItem(`montlife_cached_tasks_${currentUser.userId}`);
      localStorage.removeItem(`montlife_cached_notes_${currentUser.userId}`);
      setUndoToast({
        id: `cache-${Date.now()}`,
        message: "Cache local limpo",
        detail: "Os dados na nuvem permanecem intactos.",
        variant: "success",
      });
    } catch {}
  };

  const workCount = tasks.filter((t) => isTaskMatchingWorkspace(t, "work")).length;
  const personalCount = tasks.filter((t) => isTaskMatchingWorkspace(t, "personal")).length;

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-canvas">
      {/* Left Internal Category Navigation */}
      <aside className="w-full lg:w-[272px] shrink-0 bg-sidebar border-b lg:border-b-0 lg:border-r border-line p-3.5 overflow-x-auto lg:overflow-y-auto">
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
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-left transition-colors whitespace-nowrap lg:whitespace-normal shrink-0 cursor-pointer ${
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

      {/* Right Settings Content Panel */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto p-5 sm:p-8">
        <div className="max-w-3xl space-y-6">
          {/* 1. PERFIL */}
          {activeTab === "perfil" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">Perfil</h1>
                <p className="text-xs text-ink-muted">
                  Informações do seu Perfil Mestre autenticado via Google OAuth 2.0.
                </p>
              </div>
              <div className="ml-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {currentUser?.picture ? (
                    <img
                      src={currentUser.picture}
                      alt={currentUser.name}
                      className="w-14 h-14 rounded-[12px] border border-line object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-[12px] bg-brand text-brand-fg font-bold text-lg flex items-center justify-center">
                      {(currentUser?.name || "ML").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      {currentUser?.name || "Usuário MontLife"}
                    </h2>
                    <p className="text-xs text-ink-muted">
                      {currentUser?.email || "Sem e-mail identificado"}
                    </p>
                    <p className="text-[11px] font-mono text-brand mt-1">
                      ID: {currentUser?.userId || "—"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Encerrar sessão</span>
                </button>
              </div>
            </section>
          )}

          {/* 2. APARÊNCIA */}
          {activeTab === "aparencia" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">Aparência</h1>
                <p className="text-xs text-ink-muted">
                  Identidade visual exclusiva Creme, Roxo e Lavanda com contraste ergonômico.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-[12px] border text-left transition-all cursor-pointer space-y-3 ${
                    theme === "light"
                      ? "border-brand bg-lavender-soft/60 ring-1 ring-brand/30"
                      : "border-line bg-surface hover:border-lavender-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-ink">
                      <Sun className="w-4 h-4 text-brand" /> Modo Claro (Creme & Roxo)
                    </span>
                    {theme === "light" && (
                      <CheckCircle2 className="w-4 h-4 text-brand" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {["#F5F1E8", "#FAF6EF", "#FFFCF6", "#E7DFF5", "#7455AD", "#392D4B"].map(
                      (hex) => (
                        <span
                          key={hex}
                          className="w-6 h-6 rounded-[6px] border border-black/10"
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
                  className={`p-4 rounded-[12px] border text-left transition-all cursor-pointer space-y-3 ${
                    theme === "dark"
                      ? "border-brand bg-lavender-soft/60 ring-1 ring-brand/30"
                      : "border-line bg-surface hover:border-lavender-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-ink">
                      <Moon className="w-4 h-4 text-brand" /> Modo Escuro (Roxo & Lavanda)
                    </span>
                    {theme === "dark" && (
                      <CheckCircle2 className="w-4 h-4 text-brand" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {["#1D1925", "#241F2D", "#2C2637", "#352D42", "#B6A2DB", "#F5F1E8"].map(
                      (hex) => (
                        <span
                          key={hex}
                          className="w-6 h-6 rounded-[6px] border border-white/15"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>
                </button>
              </div>

              <div className="ml-card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-ink">Densidade da lista de demandas</p>
                  <p className="text-[11px] text-ink-muted">
                    Escolha entre visualização mais espaçada ou compacta para listas longas.
                  </p>
                </div>
                <div className="inline-flex p-0.5 rounded-[9px] bg-canvas border border-line">
                  <button
                    type="button"
                    onClick={() => setTaskDensity("comfortable")}
                    className={`px-3 py-1 rounded-[7px] text-xs font-semibold cursor-pointer ${
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
                    className={`px-3 py-1 rounded-[7px] text-xs font-semibold cursor-pointer ${
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
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">Workspaces</h1>
                <p className="text-xs text-ink-muted">
                  Controle o contexto ativo exibido em todos os módulos do MontLife.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  { id: "all", label: "Todos os espaços", count: tasks.length, desc: "Visão unificada completa" },
                  { id: "work", label: "Trabalho", count: workCount, desc: "Demandas corporativas e TI" },
                  { id: "personal", label: "Pessoal", count: personalCount, desc: "Rotina e organização pessoal" },
                ].map((ws) => {
                  const active = accountFilter === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => setAccountFilter(ws.id)}
                      className={`p-4 rounded-[12px] border text-left transition-all cursor-pointer space-y-1.5 ${
                        active
                          ? "bg-lavender-soft border-brand"
                          : "bg-surface border-line hover:border-lavender-strong"
                      }`}
                    >
                      <p className="text-xs font-bold text-ink">{ws.label}</p>
                      <p className="text-xl font-bold font-mono text-brand">{ws.count}</p>
                      <p className="text-[11px] text-ink-muted">{ws.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. CONTAS GOOGLE */}
          {activeTab === "contas" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-ink">Contas Google</h1>
                  <p className="text-xs text-ink-muted">
                    Gerencie contas vinculadas ao seu Perfil Mestre Unificado.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountsModalOpen(true)}
                    className="px-3 py-1.5 rounded-[9px] bg-sidebar border border-line text-xs font-semibold text-ink hover:bg-lavender-soft cursor-pointer"
                  >
                    Gerenciamento avançado
                  </button>
                  <a
                    href="/api/google/auth?mode=link"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Vincular conta Google
                  </a>
                </div>
              </div>

              <div className="space-y-2.5">
                {accounts.length === 0 ? (
                  <div className="ml-card p-6 text-center text-xs text-ink-muted">
                    Nenhuma conta Google vinculada ainda.
                  </div>
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="ml-card p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">
                            {acc.label || "Conta Google"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                              acc.is_connected || acc.refresh_token
                                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {acc.is_connected || acc.refresh_token
                              ? "Conectada"
                              : "Requer reconexão"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">{acc.email}</p>
                      </div>

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
                  ))
                )}
              </div>
            </section>
          )}

          {/* 5. INTEGRAÇÕES */}
          {activeTab === "integracoes" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">Integrações</h1>
                <p className="text-xs text-ink-muted">
                  Serviços conectados ao MontLife com preservação integral de dados.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "Google Calendar",
                    status: accounts.length > 0 ? "Ativo" : "Aguardando conta",
                    desc: "Visualização unificada na Agenda com deduplicação automática contra demandas vinculadas.",
                  },
                  {
                    name: "Google Meet",
                    status: "Ativo",
                    desc: "Links de reunião em 1 clique na Agenda, Meu dia e Demandas.",
                  },
                  {
                    name: "YouTube Data API v3",
                    status: "Ativo",
                    desc: "Curadoria de materiais técnicos na Wiki e aba de estudos das demandas.",
                  },
                  {
                    name: "Cloud Firestore",
                    status: "Nativo",
                    desc: "Armazenamento em nuvem isolado por usuário com auditoria de SLA e histórico.",
                  },
                ].map((intg) => (
                  <div
                    key={intg.name}
                    className="ml-card p-4 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink">{intg.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{intg.desc}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-[7px] bg-lavender-soft text-brand text-[11px] font-semibold shrink-0">
                      {intg.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. NOTIFICAÇÕES */}
          {activeTab === "notificacoes" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">Notificações</h1>
                <p className="text-xs text-ink-muted">
                  Alertas nativos Web Push (PWA) e antecedência padrão de lembretes.
                </p>
              </div>

              <div className="ml-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-ink">Notificações Web Push</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Status atual no navegador:{" "}
                    <strong className="text-ink font-mono">{pushStatus}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="px-3.5 py-2 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer"
                >
                  {pushStatus === "granted"
                    ? "Permissão ativa"
                    : "Ativar notificações"}
                </button>
              </div>

              <div className="ml-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-ink">
                    Antecedência padrão de lembretes
                  </p>
                  <p className="text-xs text-ink-muted">
                    Usada ao criar compromissos e demandas com lembrete.
                  </p>
                </div>
                <select
                  value={prefs.defaultReminderMinutes}
                  onChange={(e) =>
                    updatePrefs({ defaultReminderMinutes: Number(e.target.value) })
                  }
                  className="h-9 px-3 rounded-[9px] ml-input text-xs font-mono font-semibold"
                >
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes (padrão)</option>
                  <option value={60}>1 hora antes</option>
                </select>
              </div>
            </section>
          )}

          {/* 7. PREFERÊNCIAS DE LAYOUT */}
          {activeTab === "layout" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-ink">
                    Preferências de layout
                  </h1>
                  <p className="text-xs text-ink-muted">
                    Ajuste fino da sidebar recolhível e das proporções persistidas dos painéis SplitView.
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-sidebar border border-line hover:bg-lavender-soft text-xs font-semibold text-ink cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
                </button>
              </div>

              <div className="ml-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">Sidebar recolhida por padrão</p>
                    <p className="text-[11px] text-ink-muted">
                      Também pode ser alternada a qualquer momento pela tecla [
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
                </div>

                <div className="pt-3 border-t border-line space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">
                        Proporção Demandas (Lista / Detalhes)
                      </span>
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
                      onChange={(e) =>
                        setSplitRatio("demandas", Number(e.target.value))
                      }
                      className="w-full accent-[#7455AD]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">
                        Proporção Agenda (Calendário / Agendamentos)
                      </span>
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
                      onChange={(e) =>
                        setSplitRatio("agenda", Number(e.target.value))
                      }
                      className="w-full accent-[#7455AD]"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 8. INTELIGÊNCIA ARTIFICIAL */}
          {activeTab === "ia" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">
                  Inteligência artificial
                </h1>
                <p className="text-xs text-ink-muted">
                  Integração oficial Google Gemini AI para triagem, notas, Wiki e briefing.
                </p>
              </div>
              <div className="ml-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-ink">
                      Carregar Briefing IA automaticamente na Visão geral
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      Quando desativado, o briefing é gerado apenas sob demanda ao clicar no botão.
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
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted">
                    6 modos de IA ativos em Anotações (checklist sempre sob demanda).
                  </span>
                  <Link
                    href="/assistente-ia"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Abrir Assistente IA <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* 9. SINCRONIZAÇÃO E ARMAZENAMENTO */}
          {activeTab === "sincronizacao" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink">
                  Sincronização e armazenamento
                </h1>
                <p className="text-xs text-ink-muted">
                  Estado da conectividade PWA, fila offline e cache local isolado por usuário.
                </p>
              </div>

              <div className="ml-card p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-[10px] bg-sidebar border border-line">
                    <p className="text-[11px] text-ink-muted">Conectividade</p>
                    <p className="text-xs font-bold text-ink mt-1 inline-flex items-center gap-1.5">
                      {isOnline ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-amber-600" /> Offline
                        </>
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-[10px] bg-sidebar border border-line">
                    <p className="text-[11px] text-ink-muted">Fila offline</p>
                    <p className="text-sm font-bold font-mono text-ink mt-0.5">
                      {offlinePendingCount} pendência(s)
                    </p>
                  </div>
                  <div className="p-3 rounded-[10px] bg-sidebar border border-line">
                    <p className="text-[11px] text-ink-muted">Dados em cache</p>
                    <p className="text-xs font-mono font-bold text-ink mt-1">
                      {tasks.length} dem. • {notes.length} notas
                    </p>
                  </div>
                </div>

                {lastSyncedAt && (
                  <p className="text-[11px] font-mono text-ink-muted">
                    Última sincronização:{" "}
                    {format(parseISO(lastSyncedAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={triggerGoogleSync}
                    disabled={!isOnline || isSyncingGoogle}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-brand hover:bg-brand-hover text-brand-fg text-xs font-semibold cursor-pointer disabled:opacity-45"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncingGoogle ? "animate-spin" : ""}`}
                    />
                    <span>Sincronizar agora</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearLocalCache}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-sidebar hover:bg-lavender-soft border border-line text-xs font-semibold text-ink cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Limpar cache local</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

