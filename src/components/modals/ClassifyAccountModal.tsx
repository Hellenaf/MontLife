"use client";

import React, { useState } from "react";
import { Briefcase, User, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6 text-center transition-all">
        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-black text-xl text-white shadow-sm">
            M
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Login Google Concluído</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bem-vinda ao MontLife
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Conectada como:{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">{email || "sua conta Google"}</strong>
            </p>
          </div>
        </div>

        {/* Question prompt */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Como você deseja classificar esta conta?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Essa será a sua conta principal para sincronizar suas demandas do Google Tasks.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs text-left">
            {errorMsg}
          </div>
        )}

        {/* Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* Card 1: Trabalho */}
          <button
            type="button"
            onClick={() => handleSelectType("work")}
            disabled={loadingType !== null}
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between group relative ${
              loadingType === "work"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-500/20"
                : "bg-slate-50/60 dark:bg-[#0c0d13] hover:bg-slate-100 dark:hover:bg-[#181926] border-slate-200 dark:border-zinc-800 hover:border-indigo-400"
            }`}
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conta de Trabalho
                </h4>
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                  Google Workspace / Escola
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Chamados de TI, TOTVS RM, laboratórios, suporte ao usuário e rotinas operacionais.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <span>{loadingType === "work" ? "Configurando..." : "Escolher Trabalho"}</span>
              {loadingType === "work" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
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
            className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between group relative ${
              loadingType === "personal"
                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-600 ring-2 ring-purple-500/20"
                : "bg-slate-50/60 dark:bg-[#0c0d13] hover:bg-slate-100 dark:hover:bg-[#181926] border-slate-200 dark:border-zinc-800 hover:border-purple-400"
            }`}
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conta Pessoal
                </h4>
                <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                  Gmail Pessoal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Finanças, contas a pagar, catequese, rotina de casa, estudos e metas particulares.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              <span>{loadingType === "personal" ? "Configurando..." : "Escolher Pessoal"}</span>
              {loadingType === "personal" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
              ) : (
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              )}
            </div>
          </button>
        </div>

        {/* Footer info about optional second account */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 text-left">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            <strong>Segunda conta opcional:</strong> Você poderá vincular a outra conta a qualquer momento de dentro do painel para separar o trabalho da vida pessoal.
          </span>
        </div>
      </div>
    </div>
  );
}
