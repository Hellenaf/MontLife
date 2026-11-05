import { NextRequest, NextResponse } from "next/server";
import { getConnectedAccounts, saveConnectedAccount } from "@/services/taskService";
import { getSessionUser, clearSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (userId) {
      const accounts = await getConnectedAccounts(userId);
      for (const acc of accounts) {
        if (acc.is_connected) {
          await saveConnectedAccount(
            {
              ...acc,
              access_token: undefined,
              refresh_token: undefined,
              is_connected: false,
            },
            userId
          );
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso.",
    });

    clearSessionCookie(response);
    response.cookies.delete("token");

    return response;
  } catch (error: unknown) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ success: false, error: "Falha ao deslogar" }, { status: 500 });
  }
}
