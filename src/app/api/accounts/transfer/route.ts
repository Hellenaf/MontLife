import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  migrateAndUnlinkAccount,
  HELLEN_MASTER_ID,
  isHellenUser,
} from "@/services/taskService";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const body = await req.json();
    const { emailToUnlink, targetEmail } = body;

    if (!emailToUnlink) {
      return NextResponse.json(
        { success: false, error: "E-mail a ser desvinculado não informado." },
        { status: 400 }
      );
    }

    const masterUid = session?.userId || (isHellenUser(session?.email) ? HELLEN_MASTER_ID : null);

    if (!masterUid) {
      return NextResponse.json(
        { success: false, error: "Sessão não identificada. Por favor, autentique-se novamente." },
        { status: 401 }
      );
    }

    const result = await migrateAndUnlinkAccount(masterUid, emailToUnlink, targetEmail);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/accounts/transfer error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Falha ao transferir demandas e desvincular conta." },
      { status: 500 }
    );
  }
}
