"use client";

import React from "react";
import { Briefcase, User, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#090810] text-[#EAE9FC] p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7B61FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md p-8 rounded-3xl bg-[#131122]/90 border border-[#242038] shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7B61FF] to-[#9D8DF1] flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-[#7B61FF]/30">
            M
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-[#EAE9FC]">
                MONTLIFE
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7B61FF]/20 text-[#9D8DF1] border border-[#7B61FF]/30">
                Google Tasks Sync
              </span>
            </div>
            <p className="text-xs text-[#9490AC] mt-1.5 leading-relaxed">
              Gestão inteligente de chamados, suporte de TI e tarefas pessoais com sincronização em tempo real.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="p-4 rounded-2xl bg-[#090810] border border-[#242038] text-left space-y-2 text-xs text-[#9490AC]">
          <div className="flex items-center gap-2 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Importação direta das suas listas do Google Tasks</span>
          </div>
          <div className="flex items-center gap-2 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Controle automático de SLA e histórico de soluções</span>
          </div>
          <div className="flex items-center gap-2 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-[#9D8DF1] shrink-0" />
            <span>Classificação rápida com IA (Tarefas, Atividades e Lembretes)</span>
          </div>
        </div>

        {/* Login Buttons */}
        <div className="space-y-3 pt-2">
          <a
            href="/api/google/auth?type=work"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Conectar Conta de Trabalho (Workspace)</span>
          </a>

          <a
            href="/api/google/auth?type=personal"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-[#1C1A2E] hover:bg-[#25223D] border border-[#353150] text-[#EAE9FC] font-semibold text-xs sm:text-sm transition-all active:scale-[0.98]"
          >
            <User className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Conectar Conta Pessoal (Gmail)</span>
          </a>
        </div>

        {/* Footer Back Link */}
        <div className="pt-2 border-t border-[#242038]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#9490AC] hover:text-[#EAE9FC] transition-colors"
          >
            <span>Acessar Painel Principal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

