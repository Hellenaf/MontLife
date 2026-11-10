"use client";

import React from "react";
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  Kanban,
  Lock,
  Sun,
  Moon,
  CheckCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { MontLifeLogo } from "@/components/MontLifeLogo";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-slate-50 dark:bg-[#07080c] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/20 transition-colors duration-200 overflow-y-auto overflow-x-hidden">
      {/* Background radial gradients for subtle tech aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full bg-purple-500/10 dark:bg-purple-600/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <MontLifeLogo size="md" showText={true} />
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            Enterprise v2.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Alternar tema"
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-[#12131A]/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs cursor-pointer active:scale-95"
            title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Dual-Column Hero / Auth Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 my-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Brand, Value Proposition & Features (order-last on mobile so auth card is visible upfront) */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left order-last lg:order-first">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shadow-xs text-slate-700 dark:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Gestão Autônoma de Demandas & Tarefas com IA</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                O ponto central para sua{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  operação e produtividade
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                Conecte seus chamados de TI, rotinas institucionais e projetos pessoais em um único ecossistema inteligente, com armazenamento 100% nativo e seguro na nuvem.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111219]/70 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 text-left space-y-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Triagem Autônoma IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Entrada em linguagem natural transformada em título, SLA, categoria e checklist de validação instantâneo.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111219]/70 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 text-left space-y-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-semibold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Armazenamento 100% Nativo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Persistência autônoma no Cloud Firestore: demandas, anexos, SLAs e histórico centralizados.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111219]/70 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 text-left space-y-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-semibold">
                  <Kanban className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quadro Kanban Interativo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Arraste demandas entre etapas, registre reincidências e consulte a base de soluções anteriores.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111219]/70 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 text-left space-y-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-semibold">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multi-usuário & Isolamento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Cada usuário autenticado possui seu próprio espaço isolado e seguro para tarefas corporativas e pessoais.
                </p>
              </div>
            </div>

            {/* Trust Seals */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Google OAuth 2.0 Oficial</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Criptografia de Sessão</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Custódia de Senhas</span>
              </span>
            </div>
          </div>

          {/* Right Column: High-End Auth Card (order-first on mobile for instant 1-tap Google login) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto order-first lg:order-last">
            <div className="relative">
              {/* Outer decorative gradient glow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 blur-xl opacity-75" />

              <div className="relative rounded-3xl bg-white/95 dark:bg-[#11121A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 p-6 sm:p-10 shadow-2xl space-y-6 sm:space-y-7">
                {/* Auth Header */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shadow-xs">
                    <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Acessar Workspace
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Entre com sua conta Google para gerenciar suas tarefas e chamados. Novos usuários recebem um espaço de trabalho dedicado automaticamente.
                  </p>
                </div>

                {/* Google Sign-In Button */}
                <div className="space-y-3">
                  <a
                    href="/api/google/auth"
                    className="w-full flex items-center justify-center gap-3.5 py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-[#1a1b26] dark:hover:bg-[#202230] border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-[0.99] group cursor-pointer"
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
                    <span>Entrar com o Google</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all ml-auto" />
                  </a>

                  <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500">
                    Acesso corporativo e pessoal seguro via Google Identity.
                  </p>
                </div>

                {/* Scope Guidance */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Múltiplas Contas & Espaços Ilimitados</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Vincule quantas contas Google desejar ao seu <strong>Perfil Mestre</strong>. Suas tarefas nativas e sincronizadas são preservadas e unificadas de forma transparente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <MontLifeLogo size="sm" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            MontLife Platform
          </span>
          <span>&bull;</span>
          <span>Sistemas Operacionais & TI</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-center">
          <span>Privacidade Garantida</span>
          <span>&bull;</span>
          <span>Conformidade LGPD</span>
          <span>&bull;</span>
          <span>Google Workspace Partner Ready</span>
        </div>
      </footer>
    </div>
  );
}
