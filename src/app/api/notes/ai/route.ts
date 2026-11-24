import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  extractTasksFromNoteWithAI,
  organizeNoteWithAI,
} from "@/services/geminiService";

const noteAiRateLimits = new Map<string, number[]>();

function checkNoteAiRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = noteAiRateLimits.get(userId) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= 25) return false;
  valid.push(now);
  noteAiRateLimits.set(userId, valid);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para usar os recursos de IA." },
        { status: 401 }
      );
    }

    if (!checkNoteAiRateLimit(userId)) {
      return NextResponse.json(
        { success: false, error: "Limite de requisições por minuto atingido. Aguarde instantes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const action = body.action;
    const title = typeof body.title === "string" ? body.title : "";
    const content = typeof body.content === "string" ? body.content : "";
    const checklist = Array.isArray(body.checklist) ? body.checklist : [];
    const category = body.category;
    const accountType = body.account_type;

    if (!title.trim() && !content.trim() && checklist.length === 0) {
      return NextResponse.json(
        { success: false, error: "A anotação está vazia. Escreva algo antes de usar a IA." },
        { status: 400 }
      );
    }

    if (action === "extract_tasks") {
      const result = await extractTasksFromNoteWithAI({
        title,
        content,
        checklist,
        category,
        accountType,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "organize") {
      const result = await organizeNoteWithAI({
        title,
        content,
        checklist,
        category,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: "Ação de IA inválida para anotações." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/notes/ai error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao processar anotação com IA." },
      { status: 500 }
    );
  }
}

