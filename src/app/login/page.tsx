"use client";

import React from "react";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
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
              Gestão de chamados de TI, suporte e rotinas pessoais com sincronização direta do Google Tasks.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="p-4 rounded-2xl bg-[#090810] border border-[#242038] text-left space-y-2.5 text-xs text-[#9490AC]">
          <div className="flex items-center gap-2.5 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sincronização bidirecional com o Google Tasks</span>
          </div>
          <div className="flex items-center gap-2.5 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Classifique como Trabalho ou Pessoal após o login</span>
          </div>
          <div className="flex items-center gap-2.5 text-[#EAE9FC]">
            <CheckCircle2 className="w-4 h-4 text-[#9D8DF1] shrink-0" />
            <span>Vincule uma segunda conta a qualquer momento (opcional)</span>
          </div>
        </div>

        {/* Single Primary Google Login Button */}
        <div className="pt-2">
          <a
            href="/api/google/auth"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm shadow-xl shadow-white/10 transition-all active:scale-[0.98]"
          >
            {/* Google G Logo SVG */}
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

        {/* Footer Back Link */}
        <div className="pt-2 border-t border-[#242038]">
          <Link
            href="/?guest=true"
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
