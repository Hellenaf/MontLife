"use client";

import React, { useState } from "react";
import {
  X,
  Briefcase,
  User,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  LogOut,
  Trash2,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import { ConnectedAccount } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ConnectedAccount[];
  onRefreshAccounts: () => Promise<void>;
  onPurgeSeedTasks?: () => Promise<void>;
}

export function AccountsModal({
  isOpen,
  onClose,
  accounts,
  onRefreshAccounts,
  onPurgeSeedTasks,
}: AccountsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  if (!isOpen) return null;

  const workAccount = accounts.find((a) => a.id === "work");
  const personalAccount = accounts.find((a) => a.id === "personal");

  const hasAnyAccount = Boolean(workAccount?.is_connected || personalAccount?.is_connected);
  const hasBothAccounts = Boolean(workAccount?.is_connected && personalAccount?.is_connected);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(
          `Sincronizado com sucesso! ${data.imported_count || 0} tarefas do Google Tasks importadas.`
        );
        await onRefreshAccounts();
      } else {
        setSyncFeedback("Erro ao sincronizar. Verifique se a conta está conectada.");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Falha de conexão com a API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async (type: "work" | "personal") => {
    const label = type === "work" ? "de Trabalho" : "Pessoal";
    if (!confirm(`Deseja realmente desconectar a conta ${label}?`)) {
      return;
    }

    try {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: type,
          email: "",
          is_connected: false,
          access_token: null,
          refresh_token: null,
          last_sync_at: null,
        }),
      });
      await onRefreshAccounts();
      setSyncFeedback(`Conta ${label} desconectada com sucesso.`);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handlePurge = async () => {
    if (!confirm("Deseja remover as tarefas de exemplo/teste da base?")) return;
    setIsPurging(true);
    try {
      if (onPurgeSeedTasks) {
        await onPurgeSeedTasks();
      }
      setSyncFeedback("Tarefas de exemplo removidas com sucesso.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#151324] border border-[#2E2B44] shadow-2xl overflow-hidden glow-lavender">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#242038] bg-[#0E0C18]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7B61FF]/15 text-[#9D8DF1] border border-[#7B61FF]/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#EAE9FC]">
                Contas Google & Sincronização
              </h3>
              <p className="text-xs text-[#9490AC]">
                Gerencie suas contas vinculadas e sincronize tarefas reais do Google Tasks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9490AC] hover:text-white hover:bg-[#242038] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner: Optional Second Account */}
        <div className="px-6 pt-4">
          <div className="p-3 rounded-xl bg-[#090810] border border-[#242038] text-xs text-[#9490AC] flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#9D8DF1] shrink-0" />
            <span>
              {hasBothAccounts ? (
                <strong className="text-emerald-400">Suas duas contas estão sincronizadas!</strong>
              ) : hasAnyAccount ? (
                <>
                  Você já tem uma conta conectada. Vincular uma <strong>segunda conta é opcional</strong> e serve para separar chamados de trabalho e afazeres pessoais.
                </>
              ) : (
                <>
                  Conecte sua conta do Google para importar automaticamente suas tarefas do Google Tasks.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Work Account Card */}
          <div className="p-4 rounded-xl bg-[#090810] border border-[#242038] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#EAE9FC] uppercase tracking-wide">
                      Conta de Trabalho
                    </h4>
                    {!workAccount?.is_connected && personalAccount?.is_connected && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                        Opcional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9490AC]">
                    {workAccount?.is_connected && workAccount.email
                      ? workAccount.email
                      : "Google Workspace / Escola (Nenhuma conta conectada)"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  workAccount?.is_connected
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {workAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Não conectada
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9490AC] pt-2 border-t border-[#242038]">
              <span>
                {workAccount?.is_connected && workAccount?.last_sync_at
                  ? `Último sync: ${format(parseISO(workAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}`
                  : "Sincronização de tarefas desativada"}
              </span>

              {workAccount?.is_connected ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/api/google/auth?type=work"
                    className="px-3 py-1 rounded-lg bg-[#242038] hover:bg-[#2F2A47] text-[#EAE9FC] text-xs font-medium transition-colors"
                  >
                    Reconectar
                  </a>
                  <button
                    onClick={() => handleDisconnect("work")}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Desconectar conta de trabalho"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/google/auth?type=work"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Vincular Trabalho
                </a>
              )}
            </div>
          </div>

          {/* Personal Account Card */}
          <div className="p-4 rounded-xl bg-[#090810] border border-[#242038] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-[#EAE9FC] uppercase tracking-wide">
                      Conta Pessoal
                    </h4>
                    {!personalAccount?.is_connected && workAccount?.is_connected && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                        Opcional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9490AC]">
                    {personalAccount?.is_connected && personalAccount.email
                      ? personalAccount.email
                      : "Gmail Pessoal (Nenhuma conta conectada)"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  personalAccount?.is_connected
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {personalAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Não conectada
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9490AC] pt-2 border-t border-[#242038]">
              <span>
                {personalAccount?.is_connected && personalAccount?.last_sync_at
                  ? `Último sync: ${format(parseISO(personalAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}`
                  : "Sincronização de tarefas desativada"}
              </span>

              {personalAccount?.is_connected ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/api/google/auth?type=personal"
                    className="px-3 py-1 rounded-lg bg-[#242038] hover:bg-[#2F2A47] text-[#EAE9FC] text-xs font-medium transition-colors"
                  >
                    Reconectar
                  </a>
                  <button
                    onClick={() => handleDisconnect("personal")}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Desconectar conta pessoal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/google/auth?type=personal"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Vincular Pessoal
                </a>
              )}
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 rounded-xl bg-[#7B61FF]/10 border border-[#7B61FF]/30 text-xs text-[#9D8DF1] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Sync CTA & Clean Tasks */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#242038]">
            {onPurgeSeedTasks && (
              <button
                type="button"
                onClick={handlePurge}
                disabled={isPurging}
                className="flex items-center gap-1 text-[11px] text-[#9490AC] hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isPurging ? "Removendo..." : "Limpar tarefas de exemplo"}</span>
              </button>
            )}

            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !hasAnyAccount}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white font-semibold text-xs shadow-lg shadow-[#7B61FF]/25 transition-all active:scale-95 disabled:opacity-40 ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Google Tasks"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
