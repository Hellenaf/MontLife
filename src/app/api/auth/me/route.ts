import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ success: false, error: "Falha ao obter sessão do usuário" }, { status: 500 });
  }
}

