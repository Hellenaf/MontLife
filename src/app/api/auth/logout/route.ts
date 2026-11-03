import { NextResponse } from "next/server";
import { getConnectedAccounts, saveConnectedAccount } from "@/services/taskService";

export async function POST() {
  try {
    const accounts = await getConnectedAccounts();

    // Reset tokens for current accounts so user is logged out
    for (const acc of accounts) {
      if (acc.is_connected) {
        await saveConnectedAccount({
          ...acc,
          access_token: undefined,
          refresh_token: undefined,
          is_connected: false,
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso.",
    });

    // Clear session cookies
    response.cookies.delete("montlife_session");
    response.cookies.delete("token");

    return response;
  } catch (error: unknown) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ success: false, error: "Falha ao deslogar" }, { status: 500 });
  }
}

