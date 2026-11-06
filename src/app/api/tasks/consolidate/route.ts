import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  consolidateHellenWorkspace,
  getTasksFromDb,
  HELLEN_MASTER_ID,
  isHellenUser,
} from "@/services/taskService";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Por favor, faça login." },
        { status: 401 }
      );
    }

    if (isHellenUser(userId)) {
      const consolidation = await consolidateHellenWorkspace(userId);
      const tasks = await getTasksFromDb(userId);

      return NextResponse.json({
        success: true,
        message: "Consolidação de perfil mestre e demandas realizada com sucesso.",
        master_id: consolidation.master_id,
        migrated_tasks_count: consolidation.migrated_tasks_count,
        total_tasks_count: consolidation.total_tasks_count,
        accounts: consolidation.accounts,
        tasks_count: tasks.length,
        tasks,
      });
    }

    const tasks = await getTasksFromDb(userId);
    return NextResponse.json({
      success: true,
      message: "Demandas recuperadas com sucesso.",
      master_id: userId,
      migrated_tasks_count: 0,
      total_tasks_count: tasks.length,
      accounts: [],
      tasks_count: tasks.length,
      tasks,
    });
  } catch (error: any) {
    console.error("GET /api/tasks/consolidate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro durante consolidação" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

