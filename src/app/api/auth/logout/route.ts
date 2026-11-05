import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
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
