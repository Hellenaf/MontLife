import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMasterUserProfile } from "@/services/taskService";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // Enrich with database profile
    const masterProfile = await getMasterUserProfile(sessionUser.userId);

    const user = {
      userId: sessionUser.userId,
      email: masterProfile?.primary_email || sessionUser.email,
      name: masterProfile?.name || sessionUser.name,
      picture: masterProfile?.picture || sessionUser.picture,
      role: masterProfile?.role || sessionUser.role || "member",
      linked_emails: masterProfile?.linked_emails || [sessionUser.email],
      createdAt: masterProfile?.created_at || sessionUser.createdAt,
    };

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao obter sessão do usuário" },
      { status: 500 }
    );
  }
}
