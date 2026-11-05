import { NextRequest, NextResponse } from "next/server";
import {
  getConnectedAccounts,
  saveConnectedAccount,
  deleteConnectedAccount,
} from "@/services/taskService";
import { getSessionUser } from "@/lib/session";
import { ConnectedAccount } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    const accounts = await getConnectedAccounts(userId);
    return NextResponse.json({ success: true, accounts });
  } catch (error: unknown) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao buscar contas conectadas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    const body = (await req.json()) as ConnectedAccount;

    const updated = await saveConnectedAccount(
      {
        ...body,
        last_sync_at: body.last_sync_at || new Date().toISOString(),
      },
      userId
    );

    return NextResponse.json({ success: true, account: updated });
  } catch (error: unknown) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao atualizar conta" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da conta não informado" },
        { status: 400 }
      );
    }

    await deleteConnectedAccount(id, userId);
    return NextResponse.json({ success: true, message: "Conta desconectada com sucesso" });
  } catch (error: unknown) {
    console.error("DELETE /api/accounts error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao excluir conta" },
      { status: 500 }
    );
  }
}
