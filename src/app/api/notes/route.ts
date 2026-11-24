import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNotesFromDb, saveNoteToDb } from "@/services/noteService";
import { Note, NoteCategory, NoteChecklistItem, NoteColor } from "@/types";

const VALID_CATEGORIES: NoteCategory[] = ["reuniao", "ideia", "checklist", "geral"];
const VALID_COLORS: NoteColor[] = ["default", "purple", "blue", "amber", "emerald", "rose"];

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para acessar suas anotações.", notes: [] },
        { status: 401 }
      );
    }

    const notes = await getNotesFromDb(userId);
    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar anotações." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para criar anotações." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const checklist: NoteChecklistItem[] = Array.isArray(body.checklist)
      ? body.checklist
          .filter((item: any) => item && typeof item.text === "string" && item.text.trim())
          .map((item: any, idx: number) => ({
            id:
              typeof item.id === "string" && item.id
                ? item.id
                : `chk-${Date.now()}-${idx}`,
            text: item.text.trim(),
            checked: Boolean(item.checked),
            linked_task_id:
              typeof item.linked_task_id === "string" ? item.linked_task_id : null,
          }))
      : [];

    if (!title && !content.trim() && checklist.length === 0) {
      return NextResponse.json(
        { success: false, error: "Informe título, conteúdo ou pelo menos um item na anotação." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const category: NoteCategory = VALID_CATEGORIES.includes(body.category)
      ? body.category
      : "geral";
    const color: NoteColor = VALID_COLORS.includes(body.color)
      ? body.color
      : "default";

    const newNote: Note = {
      id:
        typeof body.id === "string" && body.id.trim()
          ? body.id.trim()
          : `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title || "Sem título",
      content,
      category,
      account_type: typeof body.account_type === "string" && body.account_type ? body.account_type : "work",
      color,
      pinned: Boolean(body.pinned),
      archived: Boolean(body.archived),
      tags: Array.isArray(body.tags)
        ? body.tags.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
        : [],
      checklist,
      ai_summary: typeof body.ai_summary === "string" ? body.ai_summary : null,
      key_decisions: Array.isArray(body.key_decisions) ? body.key_decisions : [],
      converted_task_ids: Array.isArray(body.converted_task_ids) ? body.converted_task_ids : [],
      created_at:
        typeof body.created_at === "string" && body.created_at ? body.created_at : nowIso,
      updated_at: nowIso,
    };

    const saved = await saveNoteToDb(newNote, userId);
    return NextResponse.json({ success: true, note: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao salvar anotação." },
      { status: 500 }
    );
  }
}

