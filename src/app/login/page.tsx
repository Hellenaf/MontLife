"use client";

import React from "react";
import {
  ArrowRight,
  RefreshCw,
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
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-[#F6F7F9] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 selection:bg-indigo-500/20 transition-colors duration-200 overflow-y-auto overflow-x-hidden relative">
      {/* Subtle architectural dot-grid & restrained top aura */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(100,116,139,0.28) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="fixed inset-x-0 top-0 h-[420px] pointer-events-none bg-gradient-to-b from-indigo-500/[0.06] via-transparent to-transparent dark:from-indigo-500/[0.10]" />

      {/* Top Navigation */}
      <header className="w-full max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <MontLifeLogo size="md" showText={true} />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white dark:bg-[#14141B] text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-[#24242F]">
            v2.0
          </span>
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema"
          className="w-9 h-9 rounded-lg border border-slate-200/80 dark:border-[#24242F] bg-white dark:bg-[#14141B] text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </header>

      {/* Main Split Hero & Auth Card */}
      <main className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12 my-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Brand & Feature Bento */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left order-last lg:order-first">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-[#14141B] border border-slate-200/80 dark:border-[#24242F] text-slate-700 dark:text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Gestão de Demandas & Produtividade com IA</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-zinc-50 leading-[1.12]">
                O workspace central para sua{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  operação e rotina
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Centralize demandas técnicas, agenda, anotações inteligentes e auditoria de SLA em uma plataforma rápida, limpa e sincronizada com o ecossistema Google.
              </p>
            </div>

            {/* Clean Hairline Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/80 dark:border-[#22222B] text-left space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Triagem & Organização IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Transforme mensagens e anotações rápidas em demandas estruturadas com prazo, categoria e etapas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/80 dark:border-[#22222B] text-left space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Agenda & Google Meet
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Sincronização com Google Calendar, detecção de conflitos de horário e acesso em 1 clique ao Meet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/80 dark:border-[#22222B] text-left space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Kanban className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Kanban, Wiki & Relatórios
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Acompanhe o fluxo visual, cataloge soluções técnicas e exporte relatórios executivos de SLA.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#111115] border border-slate-200/80 dark:border-[#22222B] text-left space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">
                  Espaços Isolados & Offline
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Separe trabalho e vida pessoal com isolamento seguro, cache local e modo offline automático.
                </p>
              </div>
            </div>

            {/* Trust Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Google OAuth 2.0
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Sessão Criptografada
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Zero Custódia de Senhas
              </span>
            </div>
          </div>

          {/* Right Column: Crisp Executive Auth Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto order-first lg:order-last">
            <div className="rounded-2xl bg-white dark:bg-[#111115] border border-slate-200/90 dark:border-[#23232D] p-7 sm:p-9 shadow-popover space-y-7">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-zinc-50 pt-1">
                  Acessar Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Entre com sua conta Google para acessar suas demandas, notas e agenda sincronizada.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="/api/google/auth"
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-sm transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform ml-auto" />
                </a>

                <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500">
                  Autenticação corporativa e pessoal via Google Identity.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAFB] dark:bg-[#16161C] border border-slate-200/75 dark:border-[#24242F] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Múltiplas Contas no Perfil Mestre</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Vincule contas corporativas e pessoais em um só painel mantendo armazenamento nativo e histórico completo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-5 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-zinc-500 border-t border-slate-200/75 dark:border-[#1E1E26]">
        <div className="flex items-center gap-2">
          <MontLifeLogo size="sm" />
          <span className="font-semibold text-slate-700 dark:text-zinc-300">
            MontLife
          </span>
          <span>&bull;</span>
          <span>Operações & Produtividade</span>
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
