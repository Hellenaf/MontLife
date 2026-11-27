"use client";

import React from "react";
import {
  ArrowRight,
  Calendar,
  Sparkles,
  Layers,
  Kanban,
  Sun,
  Moon,
  CheckCircle2,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { MontLifeLogo } from "@/components/MontLifeLogo";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-canvas text-ink transition-colors duration-200 overflow-y-auto overflow-x-hidden relative">
      {/* Subtle architectural dot pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(116,85,173,0.22) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <MontLifeLogo size="md" showText={true} />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-mono font-semibold bg-lavender-soft text-ink border border-line">
            Workspace Modular
          </span>
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema"
          className="w-9 h-9 rounded-[10px] border border-line bg-surface text-ink-muted hover:text-ink hover:bg-lavender-soft flex items-center justify-center transition-colors duration-150 cursor-pointer"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-brand" />
          )}
        </button>
      </header>

      {/* Main Split Hero & Auth Card */}
      <main className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12 my-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left order-last lg:order-first">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-lavender-soft border border-line text-ink">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>Produtividade Pessoal & Operacional Integrada</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.12]">
                Seu workspace modular para{" "}
                <span className="text-brand">foco, clareza e execução</span>
              </h1>

              <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                Demandas em Master-Detail, Kanban, Agenda sincronizada com Google Calendar & Meet, Anotações editoriais com IA, Wiki Técnica e Relatórios executivos em um só ambiente confortável.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {[
                {
                  icon: Sparkles,
                  title: "IA Contextual & Assistente",
                  desc: "Triagem inteligente, organização de anotações em 6 modos, briefing diário e diagnóstico técnico.",
                },
                {
                  icon: Calendar,
                  title: "Agenda & Google Meet",
                  desc: "Calendário mensal, semanal e diário com deduplicação, detecção de conflitos e salas Meet em 1 clique.",
                },
                {
                  icon: Kanban,
                  title: "Master-Detail, Kanban & Wiki",
                  desc: "Painéis lado a lado redimensionáveis para trabalhar sem trocar de tela ou perder o contexto.",
                },
                {
                  icon: Users,
                  title: "Multi-Workspaces & Offline",
                  desc: "Separe Trabalho e Pessoal com Perfil Mestre unificado, Web Push e fila offline automática.",
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-4 rounded-[12px] bg-surface border border-line text-left space-y-2 shadow-xs-subtle"
                  >
                    <div className="w-8 h-8 rounded-[9px] bg-lavender-soft text-brand flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-[13px] font-semibold text-ink">{feat.title}</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Google OAuth 2.0
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Sessão Criptografada
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Zero Custódia de Senhas
              </span>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto order-first lg:order-last">
            <div className="rounded-[14px] bg-surface border border-line p-7 sm:p-8 shadow-popover space-y-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-[10px] bg-lavender-soft border border-line flex items-center justify-center text-brand">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-ink pt-1">
                  Acessar Workspace
                </h2>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Entre com sua conta Google para carregar suas demandas, anotações, agenda e histórico sincronizado.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="/api/google/auth"
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[10px] bg-brand hover:bg-brand-hover text-brand-fg font-semibold text-sm transition-all duration-150 active:scale-[0.99] group cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                  <ArrowRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition-transform ml-auto" />
                </a>

                <p className="text-[11px] text-center text-ink-muted">
                  Autenticação corporativa e pessoal via Google Identity.
                </p>
              </div>

              <div className="p-3.5 rounded-[10px] bg-sidebar border border-line space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <Layers className="w-3.5 h-3.5 text-brand" />
                  <span>Perfil Mestre Unificado</span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Vincule múltiplas contas Google em um único painel com isolamento por usuário e histórico completo na nuvem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-5 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted border-t border-line">
        <div className="flex items-center gap-2">
          <MontLifeLogo size="sm" />
          <span className="font-semibold text-ink">MontLife</span>
          <span>&bull;</span>
          <span>Workspace de Produtividade</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          <span>Privacidade Garantida</span>
          <span>&bull;</span>
          <span>LGPD</span>
          <span>&bull;</span>
          <span>Google Workspace Ready</span>
        </div>
      </footer>
    </div>
  );
}
