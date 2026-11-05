import { NextRequest, NextResponse } from "next/server";
import {
  getConnectedAccounts,
  getTasksFromDb,
  saveConnectedAccount,
  consolidateHellenWorkspace,
  isHellenUser,
  HELLEN_MASTER_ID,
} from "@/services/taskService";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    const isHellen = isHellenUser(userId) || isHellenUser(session?.email);

    let consolidatedCount = 0;

    if (isHellen) {
      const result = await consolidateHellenWorkspace(userId);
      consolidatedCount = result.migrated_tasks_count;
    }

    const accounts = await getConnectedAccounts(userId || (isHellen ? HELLEN_MASTER_ID : undefined));
    const tasks = await getTasksFromDb(userId || (isHellen ? HELLEN_MASTER_ID : undefined));

    // Update last_sync_at for all connected accounts
    const nowIso = new Date().toISOString();
    for (const acc of accounts) {
      if (acc.is_connected) {
        await saveConnectedAccount(
          {
            ...acc,
            last_sync_at: nowIso,
          },
          userId || (isHellen ? HELLEN_MASTER_ID : undefined)
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Demandas consolidadas com sucesso no armazenamento nativo MontLife.",
      imported_count: consolidatedCount,
      total_tasks_count: tasks.length,
      timestamp: nowIso,
    });
  } catch (error: unknown) {
    console.error("POST /api/google/sync error:", error);
    return NextResponse.json(
      { success: false, error: "Erro durante a consolidação de demandas" },
      { status: 500 }
    );
  }
}
