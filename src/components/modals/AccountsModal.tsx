"use client";

import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from "react";
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
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { ConnectedAccount } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ConnectedAccount[];
  onRefreshAccounts: () => Promise<void>;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class AccountsModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Erro inesperado ao carregar contas",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AccountsModal ErrorBoundary captured exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#141326] border border-rose-500/30 dark:border-rose-500/40 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Contas Google Vinculadas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Houve uma instabilidade momentânea ao renderizar as contas vinculadas. Seus dados continuam 100% seguros.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatSafeSyncDate(dateVal?: unknown): string {
  if (!dateVal) return "Consolidação pendente";
  try {
    let d: Date | null = null;
    if (typeof dateVal === "object" && dateVal !== null) {
      const obj = dateVal as Record<string, unknown>;
      if (typeof obj._seconds === "number") {
        d = new Date(obj._seconds * 1000);
      } else if (typeof obj.seconds === "number") {
        d = new Date(obj.seconds * 1000);
      } else if (typeof (obj as { toDate?: () => Date }).toDate === "function") {
        d = (obj as { toDate: () => Date }).toDate();
      }
    } else if (typeof dateVal === "number") {
      d = new Date(dateVal);
    } else if (typeof dateVal === "string") {
      const parsed = new Date(dateVal);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      } else if (dateVal.trim().length > 0) {
        return `Última consolidação: ${dateVal.replace(/^Última consolidação:\s*/i, "").trim()}`;
      }
    }
    if (d && !isNaN(d.getTime())) {
      return `Última consolidação: ${format(d, "dd/MM HH:mm", { locale: ptBR })}`;
    }
  } catch (err) {
    console.warn("formatSafeSyncDate parsing exception:", err);
  }
  return "Consolidação pendente";
}

function AccountsModalContent({
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

  // Deduplicate and sanitize accounts by email to ensure each account is listed cleanly
  const connectedAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    const seen = new Set<string>();
    return list.filter((a): a is ConnectedAccount => {
      if (!a || typeof a !== "object") return false;
      const email = typeof a.email === "string" ? a.email.trim() : "";
      if (!email) return false;
      const isConnected = Boolean(a.is_connected || a.access_token || a.refresh_token);
      if (!isConnected) return false;
      const key = email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [accounts]);

  const totalConnected = connectedAccounts.length;

  // Master email is the first personal/primary account or the first connected account
  const masterAccount =
    connectedAccounts.find((a) => typeof a.email === "string" && a.email.toLowerCase().includes("hellenalvesferreira")) ||
    connectedAccounts.find((a) => typeof a.label === "string" && a.label.toLowerCase().includes("pessoal")) ||
    connectedAccounts[0];
  const masterEmail = (typeof masterAccount?.email === "string" && masterAccount.email.trim())
    ? masterAccount.email.trim()
    : (connectedAccounts[0]?.email || "usuario@montlife.com");

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
    const accEmail = typeof acc.email === "string" ? acc.email.trim().toLowerCase() : "";
    if (accEmail && accEmail === masterEmail.toLowerCase()) {
      alert("A Conta Mestre principal não pode ser desvinculada, pois ela é a âncora de segurança de todo o seu banco de dados.");
      return;
    }
    setAccountToUnlink(acc);
    setTargetTransferEmail(masterEmail);
  };

  const handleConfirmSafeUnlink = async () => {
    if (!accountToUnlink || !accountToUnlink.email) return;
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
    setEditingAccountId(acc.id || acc.email);
    setEditingLabel(typeof acc.label === "string" ? acc.label : "");
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

  const getAccountIcon = (label?: unknown) => {
    const l = typeof label === "string" ? label.toLowerCase() : "";
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

  if (!isOpen) return null;

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
            connectedAccounts.map((acc, idx) => {
              const accountKey = acc.id || acc.email || `acc_${idx}`;
              const isEditing = editingAccountId === accountKey;
              const displayLabel = typeof acc.label === "string" && acc.label.trim().length > 0
                ? acc.label.trim()
                : "Geral";
              const displayEmail = typeof acc.email === "string" ? acc.email : String(acc.email || "");

              return (
                <div
                  key={accountKey}
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
                              {displayLabel}
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
                          {displayEmail}
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
                      {formatSafeSyncDate(acc.last_sync_at)}
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
                    <strong className="text-slate-900 dark:text-white font-mono">{String(accountToUnlink.email)}</strong>{" "}
                    ({typeof accountToUnlink.label === "string" ? accountToUnlink.label : "Geral"}).
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
                    .filter((a) => {
                      if (!a.email) return false;
                      const aEmail = a.email.toLowerCase().trim();
                      const unlinkingEmail = (accountToUnlink?.email || "").toLowerCase().trim();
                      const mEmail = masterEmail.toLowerCase().trim();
                      return aEmail !== unlinkingEmail && aEmail !== mEmail;
                    })
                    .map((a, idx) => (
                      <option key={a.id || a.email || `opt_${idx}`} value={a.email}>
                        {a.email} ({typeof a.label === "string" ? a.label : "Secundária"})
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

export function AccountsModal(props: AccountsModalProps) {
  if (!props.isOpen) return null;
  return (
    <AccountsModalErrorBoundary onClose={props.onClose}>
      <AccountsModalContent {...props} />
    </AccountsModalErrorBoundary>
  );
}
