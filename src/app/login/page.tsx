"use client";

import React from "react";
import { ArrowRight, ShieldCheck, RefreshCw, Layers, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { MontLifeLogo } from "@/components/MontLifeLogo";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-between bg-slate-50 dark:bg-[#090A0F] text-slate-800 dark:text-slate-100 p-4 sm:p-8 relative selection:bg-indigo-500/20 transition-colors duration-200">
      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <MontLifeLogo size="sm" />
          <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
            MontLife
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema"
          className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#12131A] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 w-full max-w-[440px] my-auto">
        <div className="rounded-3xl bg-white dark:bg-[#12131A] border border-slate-200/90 dark:border-zinc-800/80 p-8 sm:p-10 shadow-xl shadow-slate-200/40 dark:shadow-black/50 space-y-7 transition-all">
          {/* Card Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Acesse sua conta
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Central de chamados de TI, suporte ao usuário e tarefas pessoais integradas ao Google Tasks.
            </p>
          </div>

          {/* Single Google Sign-In Button */}
          <div>
            <a
              href="/api/google/auth"
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm transition-all active:scale-[0.99] group"
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
              <span>Continuar com o Google</span>
            </a>
          </div>

          {/* Informational Pillars */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200 font-medium block">
                  Sincronização Bidirecional
                </strong>
                <span>Suas tarefas reais do Google Tasks refletidas e atualizadas em tempo real.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Layers className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200 font-medium block">
                  Classificação Pós-Login
                </strong>
                <span>Escolha se a conta é de Trabalho ou Pessoal logo após a autenticação.</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-200 font-medium block">
                  Segurança Oficial
                </strong>
                <span>Conexão direta aos serviços Google sem armazenamento de senhas.</span>
              </div>
            </div>
          </div>

          {/* Guest Access Link */}
          <div className="pt-2 text-center">
            <Link
              href="/?guest=true"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
              <span>Visualizar painel sem conectar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 relative z-10 text-[11px] text-slate-400 dark:text-slate-500">
        MontLife &bull; Gestão Operacional &bull; Google Tasks Integration
      </footer>
    </div>
  );
}
