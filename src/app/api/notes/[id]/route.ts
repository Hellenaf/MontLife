import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getNotesFromDb, saveNoteToDb, deleteNoteFromDb } from "@/services/noteService";
import { Note, NoteCategory, NoteColor } from "@/types";

const VALID_CATEGORIES: NoteCategory[] = ["reuniao", "ideia", "checklist", "geral"];
const VALID_COLORS: NoteColor[] = ["default", "purple", "blue", "amber", "emerald", "rose"];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const notes = await getNotesFromDb(userId);
    const note = notes.find((n) => n.id === id);

    if (!note) {
      return NextResponse.json({ success: false, error: "Anotação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("GET /api/notes/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const notes = await getNotesFromDb(userId);
    const existing = notes.find((n) => n.id === id);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Anotação não encontrada" }, { status: 404 });
    }

    const merged: Note = {
      ...existing,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.content === "string" ? { content: body.content } : {}),
      ...(VALID_CATEGORIES.includes(body.category) ? { category: body.category } : {}),
      ...(typeof body.account_type === "string" ? { account_type: body.account_type } : {}),
      ...(VALID_COLORS.includes(body.color) ? { color: body.color } : {}),
      ...(typeof body.pinned === "boolean" ? { pinned: body.pinned } : {}),
      ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags } : {}),
      ...(Array.isArray(body.checklist) ? { checklist: body.checklist } : {}),
      ...(body.ai_summary !== undefined ? { ai_summary: body.ai_summary } : {}),
      ...(Array.isArray(body.key_decisions) ? { key_decisions: body.key_decisions } : {}),
      ...(Array.isArray(body.converted_task_ids)
        ? { converted_task_ids: body.converted_task_ids }
        : {}),
      updated_at: new Date().toISOString(),
    };

    const updated = await saveNoteToDb(merged, userId);
    return NextResponse.json({ success: true, note: updated });
  } catch (error) {
    console.error("PATCH /api/notes/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar anotação" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteNoteFromDb(id, userId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Anotação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notes/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir anotação" }, { status: 500 });
  }
}

