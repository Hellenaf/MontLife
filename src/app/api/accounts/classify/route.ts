import { NextRequest, NextResponse } from "next/server";
import { getPendingAuth, clearPendingAuth } from "@/lib/pendingAuth";
import {
  saveConnectedAccount,
  linkEmailToMasterUser,
  consolidateHellenWorkspace,
  isHellenEmail,
  isHellenUser,
} from "@/services/taskService";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLabel = (body.label || body.type || "Geral").trim();
    const color = body.color || "indigo";
    const ticketId = body.ticket || body.ticketId;

    const session = await getSessionUser(req);
    const pendingData = await getPendingAuth(ticketId);

    const email = (
      body.email ||
      pendingData?.email ||
      session?.email ||
      ""
    ).toLowerCase().trim();

    const userId = session?.userId || pendingData?.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Sessão não identificada. Por favor, autentique-se novamente.",
        },
        { status: 401 }
      );
    }

    const access_token = pendingData?.access_token || body.access_token || undefined;
    const refresh_token = pendingData?.refresh_token || body.refresh_token || undefined;
    const expiry_date = pendingData?.expiry_date || body.expiry_date || undefined;

    const accountId =
      body.account_id ||
      pendingData?.accountId ||
      (email ? `acc_${email.replace(/[^a-z0-9_-]/g, "_")}` : `acc_${Date.now()}`);

    // 1. Save classified account to users/{userId}/accounts
    const saved = await saveConnectedAccount(
      {
        id: accountId,
        user_id: userId,
        email: email || `${rawLabel.toLowerCase()}@gmail.com`,
        label: rawLabel,
        color,
        access_token,
        refresh_token,
        expiry_date,
        default_tasklist_id: "@default",
        last_sync_at: new Date().toISOString(),
        is_connected: Boolean(access_token || refresh_token || email),
      },
      userId
    );

    // Ensure email is linked to master profile
    if (email) {
      await linkEmailToMasterUser(userId, email);
    }

    // Clear pending ticket
    if (ticketId) {
      await clearPendingAuth(ticketId);
    }

    // If Hellen, trigger background consolidation
    if (isHellenUser(userId) || isHellenEmail(email)) {
      consolidateHellenWorkspace(userId).catch((err) =>
        console.warn("Background consolidation on classify failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Espaço "${rawLabel}" ativado com sucesso. Armazenamento 100% nativo no MontLife.`,
      account: saved,
      imported_count: 0,
    });
  } catch (error: unknown) {
    console.error("POST /api/accounts/classify error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao categorizar a conta." },
      { status: 500 }
    );
  }
}
