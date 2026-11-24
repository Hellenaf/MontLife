import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTasksFromDb } from "@/services/taskService";
import { getNotesFromDb } from "@/services/noteService";
import { generateDailyBriefingWithAI } from "@/services/geminiService";

async function handleBriefing(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const [tasks, notes] = await Promise.all([
      getTasksFromDb(userId),
      getNotesFromDb(userId),
    ]);

    const pinnedNotesCount = notes.filter((n) => Boolean(n.pinned) && !n.archived).length;
    const briefing = await generateDailyBriefingWithAI(tasks, pinnedNotesCount);

    return NextResponse.json({ success: true, briefing });
  } catch (error) {
    console.error("/api/ai/briefing error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao gerar briefing diário com IA." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleBriefing(req);
}

export async function POST(req: NextRequest) {
  return handleBriefing(req);
}

