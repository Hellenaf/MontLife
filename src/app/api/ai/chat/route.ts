import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTasksFromDb } from "@/services/taskService";
import { getNotesFromDb } from "@/services/noteService";
import { chatWithWorkspaceAI, WorkspaceChatMessage } from "@/services/geminiService";

const chatRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const list = (chatRateLimits.get(userId) || []).filter((t) => now - t < windowMs);
  if (list.length >= 30) return false;
  list.push(now);
  chatRateLimits.set(userId, list);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para usar o Assistente IA." },
        { status: 401 }
      );
    }

    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { success: false, error: "Muitas mensagens em pouco tempo. Aguarde instantes." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { success: false, error: "Digite uma pergunta ou comando." },
        { status: 400 }
      );
    }

    const history: WorkspaceChatMessage[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (m: unknown): m is WorkspaceChatMessage =>
              Boolean(
                m &&
                  typeof m === "object" &&
                  ((m as WorkspaceChatMessage).role === "user" ||
                    (m as WorkspaceChatMessage).role === "assistant") &&
                  typeof (m as WorkspaceChatMessage).content === "string"
              )
          )
          .slice(-10)
      : [];

    const style =
      body.style === "executivo" || body.style === "detalhado"
        ? body.style
        : "objetivo";
    const mode = body.mode === "wiki_guide" ? "wiki_guide" : "chat";

    const [tasks, notes] = await Promise.all([
      getTasksFromDb(userId),
      getNotesFromDb(userId),
    ]);

    const result = await chatWithWorkspaceAI({
      message,
      history,
      tasks,
      notes: notes
        .filter((n) => !n.archived)
        .map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          pinned: n.pinned,
          tags: n.tags,
        })),
      style,
      mode,
    });

    return NextResponse.json({
      success: true,
      reply: result.reply,
      referenced_task_ids: result.referenced_task_ids,
      ai_source: result.ai_source,
    });
  } catch (error) {
    console.error("POST /api/ai/chat error:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao consultar o Assistente IA." },
      { status: 500 }
    );
  }
}

