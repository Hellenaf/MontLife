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
} from "lucide-react";
import { ConnectedAccount } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ConnectedAccount[];
  onRefreshAccounts: () => Promise<void>;
}

export function AccountsModal({
  isOpen,
  onClose,
  accounts,
  onRefreshAccounts,
}: AccountsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const workAccount = accounts.find((a) => a.id === "work");
  const personalAccount = accounts.find((a) => a.id === "personal");

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`Sincronizado com sucesso! ${data.imported_count || 0} novas tarefas importadas.`);
        await onRefreshAccounts();
      } else {
        setSyncFeedback("Erro ao sincronizar. Verifique credenciais do Google.");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Falha de conexão com a API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSimulation = async (type: "work" | "personal", currentStatus: boolean) => {
    try {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: type,
          email: type === "work" ? "institucional@escola.edu.br" : "pessoal.mont@gmail.com",
          is_connected: !currentStatus,
          last_sync_at: new Date().toISOString(),
        }),
      });
      await onRefreshAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#1A1829] border border-[#2E2B44] shadow-2xl overflow-hidden glow-lavender">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2E2B44] bg-[#141221]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#7B61FF]/10 text-[#9D8DF1] border border-[#7B61FF]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#EAE9FC]">
                Contas Google Conectadas (Multi-Account)
              </h3>
              <p className="text-xs text-[#9490AC]">
                Sincronização bidirecional com Google Tasks API v1 & Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9490AC] hover:text-white hover:bg-[#2E2B44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Work Account */}
          <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#EAE9FC] uppercase tracking-wide">
                    Conta de Trabalho (Google Workspace)
                  </h4>
                  <p className="text-xs text-[#9490AC]">
                    {workAccount?.email || "institucional@escola.edu.br"}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 ${
                  workAccount?.is_connected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {workAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Desconectada
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9490AC] pt-2 border-t border-[#2E2B44]/60">
              <span>
                Última sincronização:{" "}
                {workAccount?.last_sync_at
                  ? format(parseISO(workAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })
                  : "Nunca"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleToggleSimulation("work", !!workAccount?.is_connected)
                  }
                  className="text-[11px] text-[#9D8DF1] hover:underline"
                >
                  {workAccount?.is_connected ? "Alternar Demo" : "Conectar Demo"}
                </button>
                <a
                  href="/api/google/auth?type=work"
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#2E2B44] hover:bg-[#3B3857] text-[#EAE9FC] text-xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  OAuth 2.0
                </a>
              </div>
            </div>
          </div>

          {/* Personal Account */}
          <div className="p-4 rounded-xl bg-[#0F0E17] border border-[#2E2B44] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#EAE9FC] uppercase tracking-wide">
                    Conta Pessoal (Google Account)
                  </h4>
                  <p className="text-xs text-[#9490AC]">
                    {personalAccount?.email || "pessoal.mont@gmail.com"}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 ${
                  personalAccount?.is_connected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {personalAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Desconectada
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#9490AC] pt-2 border-t border-[#2E2B44]/60">
              <span>
                Última sincronização:{" "}
                {personalAccount?.last_sync_at
                  ? format(parseISO(personalAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })
                  : "Nunca"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleToggleSimulation(
                      "personal",
                      !!personalAccount?.is_connected
                    )
                  }
                  className="text-[11px] text-[#9D8DF1] hover:underline"
                >
                  {personalAccount?.is_connected
                    ? "Alternar Demo"
                    : "Conectar Demo"}
                </button>
                <a
                  href="/api/google/auth?type=personal"
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#2E2B44] hover:bg-[#3B3857] text-[#EAE9FC] text-xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  OAuth 2.0
                </a>
              </div>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 rounded-xl bg-[#7B61FF]/10 border border-[#7B61FF]/20 text-xs text-[#9D8DF1] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Sync CTA */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#9490AC]">
              Sincroniza status: [▶️] Em Progresso, [⏳] Aguardando, [✅] Concluído
            </span>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#9D8DF1] hover:brightness-110 text-white font-medium text-xs shadow-lg shadow-[#7B61FF]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Bidirecional"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

