"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Briefcase,
  User,
  GraduationCap,
  Rocket,
  Bookmark,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
  Sparkles,
  PlusCircle,
  Edit2,
  Check,
  Loader2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [accountToUnlink, setAccountToUnlink] = useState<ConnectedAccount | null>(null);
  const [targetTransferEmail, setTargetTransferEmail] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  if (!isOpen) return null;

  // Deduplicate accounts by email to ensure each account is listed only once
  const connectedAccounts = useMemo(() => {
    const seen = new Set<string>();
    return accounts.filter((a) => {
      if (!a.is_connected || !a.email) return false;
      const key = a.email.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [accounts]);
  const totalConnected = connectedAccounts.length;

  // Master email is hellenalvesferreira.s2@gmail.com or the first personal/primary account
  const masterAccount =
    connectedAccounts.find((a) => a.email.toLowerCase().includes("hellenalvesferreira")) ||
    connectedAccounts.find((a) => (a.label || "").toLowerCase().includes("pessoal")) ||
    connectedAccounts[0];
  const masterEmail = masterAccount?.email || "hellenalvesferreira.s2@gmail.com";

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
          "Demandas consolidadas com sucesso no armazenamento nativo MontLife!"
        );
        await onRefreshAccounts();
      } else {
        setSyncFeedback("Erro ao consolidar. Verifique se as contas estão ativas.");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Falha de conexão com a API.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInitiateDisconnect = (acc: ConnectedAccount) => {
    if (acc.email.toLowerCase() === masterEmail.toLowerCase()) {
      alert("A Conta Mestre principal não pode ser desvinculada, pois ela é a âncora de segurança de todo o seu banco de dados.");
      return;
    }
    setAccountToUnlink(acc);
    setTargetTransferEmail(masterEmail);
  };

  const handleConfirmSafeUnlink = async () => {
    if (!accountToUnlink) return;
    setIsTransferring(true);
    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailToUnlink: accountToUnlink.email,
          targetEmail: targetTransferEmail || masterEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback(data.message || `Demandas transferidas com sucesso e conta ${accountToUnlink.email} desvinculada com segurança.`);
        setAccountToUnlink(null);
        await onRefreshAccounts();
      } else {
        alert(data.error || "Erro ao transferir dados e desvincular conta.");
      }
    } catch (err) {
      console.error("Safe unlink error:", err);
      alert("Falha de comunicação com o servidor ao transferir demandas.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleStartEdit = (acc: ConnectedAccount) => {
    setEditingAccountId(acc.id);
    setEditingLabel(acc.label || "");
  };

  const handleSaveLabel = async (acc: ConnectedAccount) => {
    if (!editingLabel.trim()) return;
    setIsSavingLabel(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...acc,
          label: editingLabel.trim(),
        }),
      });
      if (res.ok) {
        await onRefreshAccounts();
        setEditingAccountId(null);
      }
    } catch (err) {
      console.error("Save label error:", err);
    } finally {
      setIsSavingLabel(false);
    }
  };

  const handleLinkNewAccount = () => {
    window.location.href = "/api/google/auth?action=link";
  };

  const getAccountIcon = (label?: string) => {
    const l = (label || "").toLowerCase();
    if (l.includes("trab") || l.includes("work") || l.includes("empresa")) {
      return <Briefcase className="w-4 h-4 text-blue-500" />;
    }
    if (l.includes("estud") || l.includes("faculd") || l.includes("curso")) {
      return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    }
    if (l.includes("proj")) {
      return <Rocket className="w-4 h-4 text-amber-500" />;
    }
    if (l.includes("pess") || l.includes("vida")) {
      return <User className="w-4 h-4 text-purple-500" />;
    }
    return <Bookmark className="w-4 h-4 text-indigo-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#141326] border border-slate-200 dark:border-[#282647] shadow-2xl overflow-hidden transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#100f1f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Contas Google Vinculadas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perfil Mestre com suporte a múltiplas contas ilimitadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Profile Info Banner */}
        <div className="px-6 pt-4 shrink-0">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-slate-900/40 border border-purple-500/20 text-xs text-slate-300 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Vínculo Unificado (Perfil Mestre)
              </span>
              <p className="text-[11px] text-slate-300/80 leading-relaxed">
                Todas as contas listadas abaixo respondem a um único perfil. Você pode fazer login com qualquer um dos e-mails vinculados e acessar todos os seus espaços simultaneamente.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {syncFeedback && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-purple-500 hover:text-purple-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Accounts List */}
        <div className="p-6 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Contas Ativas ({totalConnected})
            </span>

            <button
              type="button"
              onClick={handleLinkNewAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Vincular Outra Conta Google</span>
            </button>
          </div>

          {connectedAccounts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Nenhuma conta Google conectada no momento
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vincule suas contas do Google para sincronizar automaticamente tarefas e compromissos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLinkNewAccount}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Vincular Minha Primeira Conta</span>
              </button>
            </div>
          ) : (
            connectedAccounts.map((acc) => {
              const isEditing = editingAccountId === acc.id;

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#18172e] border border-slate-200 dark:border-white/5 space-y-3 transition-all hover:border-purple-300 dark:hover:border-purple-500/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        {getAccountIcon(acc.label)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              placeholder="Nome do rótulo..."
                              className="h-7 px-2 text-xs font-bold rounded-lg bg-white dark:bg-[#121122] border border-purple-500 text-slate-900 dark:text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveLabel(acc)}
                              disabled={isSavingLabel}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAccountId(null)}
                              className="p-1 rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                              {acc.label || "Geral"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(acc)}
                              className="p-1 text-slate-400 hover:text-purple-500 rounded transition-colors"
                              title="Renomear rótulo desta conta"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span>Conectada</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleInitiateDisconnect(acc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Desconectar esta conta com segurança"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-white/5">
                    <span>
                      {acc.last_sync_at
                        ? `Última consolidação: ${format(parseISO(acc.last_sync_at), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}`
                        : "Consolidação pendente"}
                    </span>
                    <span className="font-mono text-[10px]">Armazenamento Nativo MontLife</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#100f1f] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing || connectedAccounts.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Consolidando..." : "Consolidar e Atualizar Demandas"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Safe Unlink Confirmation Modal (Zero Data Loss Safeguard) */}
        {accountToUnlink && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#151426] border border-amber-500/30 dark:border-amber-500/40 rounded-2xl shadow-2xl p-5 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Desvincular Conta com Segurança
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Salvaguarda ativa: Zero perda de dados
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Você está prestes a desvincular o e-mail:
                    <br />
                    <strong className="text-slate-900 dark:text-white font-mono">{accountToUnlink.email}</strong>{" "}
                    ({accountToUnlink.label}).
                  </p>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Para garantir que nenhuma demanda ou histórico seja perdido caso você perca o acesso a este e-mail corporativo, todas as tarefas associadas serão transferidas automaticamente para a conta de destino:
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transferir todas as demandas para:
                </label>
                <select
                  value={targetTransferEmail}
                  onChange={(e) => setTargetTransferEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#1a1830] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={masterEmail}>
                    {masterEmail} (Conta Mestre / Pessoal)
                  </option>
                  {connectedAccounts
                    .filter(
                      (a) =>
                        a.email.toLowerCase() !== accountToUnlink.email.toLowerCase() &&
                        a.email.toLowerCase() !== masterEmail.toLowerCase()
                    )
                    .map((a) => (
                      <option key={a.id} value={a.email}>
                        {a.email} ({a.label || "Secundária"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setAccountToUnlink(null)}
                  disabled={isTransferring}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSafeUnlink}
                  disabled={isTransferring}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transferindo Demandas...</span>
                    </>
                  ) : (
                    <>
                      <span>Transferir Dados e Desvincular</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
