import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTasksFromDb, findSimilarCompletedTasks } from "@/services/taskService";
import { assistTaskWithAI } from "@/services/geminiService";

const assistRateLimits = new Map<string, number[]>();

function checkAssistRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = assistRateLimits.get(userId) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= 25) return false;
  valid.push(now);
  assistRateLimits.set(userId, valid);
  return true;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    if (!checkAssistRateLimit(userId)) {
      return NextResponse.json(
        { success: false, error: "Limite de requisições por minuto atingido. Aguarde instantes." },
        { status: 429 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const mode: "refine" | "action_plan" | "diagnose" =
      body.mode === "refine" || body.mode === "diagnose" ? body.mode : "action_plan";

    const tasks = await getTasksFromDb(userId);
    const task = tasks.find((t) => t.id === id);

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Demanda não encontrada" },
        { status: 404 }
      );
    }

    const similar = await findSimilarCompletedTasks(task.tags || [], task.title, userId);
    const assist = await assistTaskWithAI(task, similar, mode);

    return NextResponse.json({
      success: true,
      assist,
      similar_resolutions: similar,
    });
  } catch (error) {
    console.error("POST /api/tasks/[id]/ai-assist error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao executar assistente IA na demanda." },
      { status: 500 }
    );
  }
}

