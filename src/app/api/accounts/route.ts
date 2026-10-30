import { NextRequest, NextResponse } from "next/server";
import { getConnectedAccounts, saveConnectedAccount } from "@/services/taskService";
import { ConnectedAccount } from "@/types";

export async function GET() {
  try {
    const accounts = await getConnectedAccounts();
    return NextResponse.json({ success: true, accounts });
  } catch (error: unknown) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ success: false, error: "Falha ao buscar contas conectadas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConnectedAccount;
    const updated = await saveConnectedAccount({
      ...body,
      last_sync_at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, account: updated });
  } catch (error: unknown) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ success: false, error: "Falha ao atualizar conta" }, { status: 500 });
  }
}

