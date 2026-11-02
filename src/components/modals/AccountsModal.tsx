"use client";

import React, { useState } from "react";
import {
  X,
  Briefcase,
  User,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  LogOut,
  Sparkles,
  PlusCircle,
  Smartphone,
  CheckSquare,
  ChevronDown,
  ChevronUp,
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
  const [isSyncingSamsung, setIsSyncingSamsung] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showSamsungGuide, setShowSamsungGuide] = useState(false);

  if (!isOpen) return null;

  const workAccount = accounts.find((a) => a.id === "work");
  const personalAccount = accounts.find((a) => a.id === "personal");
  const samsungAccount = accounts.find((a) => a.id === "samsung" || a.id === "microsoft");

  const hasAnyAccount = Boolean(
    workAccount?.is_connected || personalAccount?.is_connected || samsungAccount?.is_connected
  );
  const hasBothAccounts = Boolean(workAccount?.is_connected && personalAccount?.is_connected);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(
          `Google Tasks & Agenda sincronizados! ${data.imported_count || 0} itens importados.`
        );
        await onRefreshAccounts();
      } else {
        setSyncFeedback("Erro ao sincronizar. Verifique se a conta Google está conectada.");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Falha de conexão com a API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSamsung = async () => {
    setIsSyncingSamsung(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/microsoft/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(
          `Tarefas e lembretes do Microsoft To Do sincronizados! ${data.imported_count || 0} itens importados.`
        );
        await onRefreshAccounts();
      } else {
        setSyncFeedback(data.error || "Erro ao sincronizar Microsoft To Do.");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Falha de conexão com a API do Microsoft To Do.");
    } finally {
      setIsSyncingSamsung(false);
    }
  };

  const handleDisconnect = async (type: string) => {
    let label = "Pessoal";
    if (type === "work") label = "de Trabalho";
    if (type === "samsung" || type === "microsoft") label = "Microsoft To Do";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#141520] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#101118] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Contas Conectadas & Sincronização
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google Tasks, Google Agenda e Microsoft To Do.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 pt-4 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              {hasBothAccounts ? (
                <strong className="text-emerald-600 dark:text-emerald-400">
                  Suas contas de trabalho e pessoal estão conectadas!
                </strong>
              ) : hasAnyAccount ? (
                <>
                  Você já possui uma conta ativa. Adicionar uma segunda conta ou o Samsung Reminder é <strong>opcional</strong>.
                </>
              ) : (
                <>Conecte suas contas para sincronizar tarefas e compromissos reais.</>
              )}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Work Account Card */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Conta de Trabalho (Google)
                    </h4>
                    {!workAccount?.is_connected && personalAccount?.is_connected && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        Opcional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                    {workAccount?.is_connected && workAccount.email
                      ? workAccount.email
                      : "Google Workspace / Escola (Não conectada)"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  workAccount?.is_connected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                    : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {workAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Inativa
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
              <span>
                {workAccount?.is_connected && workAccount?.last_sync_at
                  ? `Último sync: ${format(parseISO(workAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}`
                  : "Sincronização inativa"}
              </span>

              {workAccount?.is_connected ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/api/google/auth?type=work"
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    Reconectar
                  </a>
                  <button
                    onClick={() => handleDisconnect("work")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Desconectar conta de trabalho"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/google/auth?type=work"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Vincular Trabalho
                </a>
              )}
            </div>
          </div>

          {/* Personal Account Card */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Conta Pessoal (Google)
                    </h4>
                    {!personalAccount?.is_connected && workAccount?.is_connected && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        Opcional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                    {personalAccount?.is_connected && personalAccount.email
                      ? personalAccount.email
                      : "Gmail Pessoal (Não conectada)"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  personalAccount?.is_connected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                    : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {personalAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Conectada
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Inativa
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
              <span>
                {personalAccount?.is_connected && personalAccount?.last_sync_at
                  ? `Último sync: ${format(parseISO(personalAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}`
                  : "Sincronização inativa"}
              </span>

              {personalAccount?.is_connected ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/api/google/auth?type=personal"
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    Reconectar
                  </a>
                  <button
                    onClick={() => handleDisconnect("personal")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Desconectar conta pessoal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/google/auth?type=personal"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Vincular Pessoal
                </a>
              )}
            </div>
          </div>

          {/* Microsoft To Do Card (com suporte a Samsung Reminder) */}
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#0c0d13] border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Microsoft To Do
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      M365 & Samsung
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    {samsungAccount?.is_connected && samsungAccount.email
                      ? samsungAccount.email
                      : "Tarefas do Microsoft To Do, Outlook e Galaxy"}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  samsungAccount?.is_connected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                    : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {samsungAccount?.is_connected ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" /> Inativo
                  </>
                )}
              </span>
            </div>

            {/* Step-by-step instructions accordion */}
            <div className="rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 p-2.5 text-xs text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setShowSamsungGuide((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-sky-700 dark:text-sky-400"
              >
                <span>Como sincronizar suas tarefas com o Microsoft To Do e celulares Galaxy</span>
                {showSamsungGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showSamsungGuide && (
                <div className="mt-2 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-zinc-800/80 pt-2">
                  <p>
                    1. Clique no botão abaixo para conectar sua conta <strong>Microsoft</strong> (Outlook, Hotmail ou corporativa) ao MontLife.
                  </p>
                  <p>
                    2. Suas listas e tarefas do <strong>Microsoft To Do</strong> serão sincronizadas em tempo real.
                  </p>
                  <p>
                    3. <strong>Samsung Galaxy:</strong> No celular, abra o app <strong>Lembretes</strong> &gt; ⚙️ Configurações &gt; ative <em>&quot;Sincronizar com o Microsoft To Do&quot;</em> para que os lembretes do smartphone venham automaticamente para cá!
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80">
              <span>
                {samsungAccount?.is_connected && samsungAccount?.last_sync_at
                  ? `Último sync: ${format(parseISO(samsungAccount.last_sync_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}`
                  : "Aguardando vínculo"}
              </span>

              {samsungAccount?.is_connected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncSamsung}
                    disabled={isSyncingSamsung}
                    className="px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-medium hover:bg-sky-100 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingSamsung ? "animate-spin" : ""}`} />
                    Sincronizar
                  </button>
                  <button
                    onClick={() => handleDisconnect("samsung")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Desconectar Microsoft To Do"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <a
                  href="/api/microsoft/auth"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Vincular Microsoft To Do
                </a>
              )}
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Sync CTA */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || (!workAccount?.is_connected && !personalAccount?.is_connected)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Google Tasks & Agenda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
