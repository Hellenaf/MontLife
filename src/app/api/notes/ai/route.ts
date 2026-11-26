import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  batchOrganizeNotesWithAI,
  extractTasksFromNoteWithAI,
  organizeNoteWithAI,
} from "@/services/geminiService";
import { NoteOrganizeMode } from "@/types";

const noteAiRateLimits = new Map<string, number[]>();

const VALID_MODES: NoteOrganizeMode[] = [
  "auto",
  "topics",
  "summary",
  "demand_scope",
  "checklist",
  "polish",
];

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

    if (action === "batch_organize") {
      const notesList = Array.isArray(body.notes) ? body.notes : [];
      if (notesList.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nenhuma anotação disponível para organizar em lote." },
          { status: 400 }
        );
      }
      const result = await batchOrganizeNotesWithAI(notesList);
      return NextResponse.json({ success: true, ...result });
    }

    const title = typeof body.title === "string" ? body.title : "";
    const content = typeof body.content === "string" ? body.content : "";
    const checklist = Array.isArray(body.checklist) ? body.checklist : [];
    const category = body.category;
    const accountType = body.account_type;
    const mode: NoteOrganizeMode = VALID_MODES.includes(body.mode) ? body.mode : "auto";

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
        mode,
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

