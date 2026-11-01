"use client";

import React, { useState } from "react";
import { Briefcase, User, Sparkles, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { AccountType } from "@/types";

interface ClassifyAccountModalProps {
  isOpen: boolean;
  email: string;
  onClassified: (type: AccountType, importedCount: number) => void;
  onClose?: () => void;
}

export function ClassifyAccountModal({
  isOpen,
  email,
  onClassified,
  onClose,
}: ClassifyAccountModalProps) {
  const [loadingType, setLoadingType] = useState<AccountType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectType = async (type: AccountType) => {
    setLoadingType(type);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/accounts/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao classificar a conta.");
      }

      onClassified(type, data.imported_count || 0);
    } catch (err: any) {
      console.error("Error classifying account:", err);
      setErrorMsg(err.message || "Erro de conexão. Tente novamente.");
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#131122] border border-[#2E2B44] shadow-2xl p-6 sm:p-8 space-y-6 text-center glow-lavender">
        {/* Glow behind modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#7B61FF]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center space-y-3 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7B61FF] to-[#9D8DF1] flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-[#7B61FF]/30">
            M
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Login Google Realizado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#EAE9FC]">
              Bem-vinda ao MontLife!
            </h2>
            <p className="text-xs text-[#9490AC] mt-1">
              Conectada como:{" "}
              <strong className="text-[#EAE9FC] font-semibold">{email || "sua conta Google"}</strong>
            </p>
          </div>
        </div>

        {/* Question prompt */}
        <div className="space-y-1 relative">
          <h3 className="text-sm font-bold text-[#EAE9FC]">
            Como você deseja classificar esta conta?
          </h3>
          <p className="text-xs text-[#9490AC]">
            Essa será a sua conta principal de sincronização de tarefas.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
            {errorMsg}
          </div>
        )}

        {/* Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left relative">
          {/* Card 1: Trabalho */}
          <button
            type="button"
            onClick={() => handleSelectType("work")}
            disabled={loadingType !== null}
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between group relative overflow-hidden ${
              loadingType === "work"
                ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40"
                : "bg-[#090810] hover:bg-[#18152B] border-[#242038] hover:border-indigo-500/60"
            }`}
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#EAE9FC] group-hover:text-white flex items-center gap-1.5">
                  Conta de Trabalho
                </h4>
                <span className="text-[10px] font-medium text-indigo-400">
                  Google Workspace / Escola
                </span>
              </div>
              <p className="text-[11px] text-[#9490AC] leading-relaxed">
                Chamados de TI, TOTVS RM, laboratórios de informática, suporte e rotinas operacionais.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#242038] flex items-center justify-between text-[11px] font-semibold text-indigo-300">
              <span>{loadingType === "work" ? "Configurando..." : "Escolher Trabalho"}</span>
              {loadingType === "work" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              )}
            </div>
          </button>

          {/* Card 2: Pessoal */}
          <button
            type="button"
            onClick={() => handleSelectType("personal")}
            disabled={loadingType !== null}
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between group relative overflow-hidden ${
              loadingType === "personal"
                ? "bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40"
                : "bg-[#090810] hover:bg-[#18152B] border-[#242038] hover:border-purple-500/60"
            }`}
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#EAE9FC] group-hover:text-white flex items-center gap-1.5">
                  Conta Pessoal
                </h4>
                <span className="text-[10px] font-medium text-purple-400">
                  Gmail Pessoal
                </span>
              </div>
              <p className="text-[11px] text-[#9490AC] leading-relaxed">
                Finanças, contas a pagar, catequese, rotina de casa, idiomas e metas particulares.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#242038] flex items-center justify-between text-[11px] font-semibold text-purple-300">
              <span>{loadingType === "personal" ? "Configurando..." : "Escolher Pessoal"}</span>
              {loadingType === "personal" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              )}
            </div>
          </button>
        </div>

        {/* Footer info about optional second account */}
        <div className="p-3 rounded-2xl bg-[#090810] border border-[#242038] text-xs text-[#9490AC] flex items-center gap-2 text-left">
          <Sparkles className="w-4 h-4 text-[#9D8DF1] shrink-0" />
          <span>
            <strong>Segunda conta opcional:</strong> Você poderá vincular a outra conta a qualquer momento de dentro do painel se desejar separar trabalho e rotina pessoal.
          </span>
        </div>
      </div>
    </div>
  );
}

