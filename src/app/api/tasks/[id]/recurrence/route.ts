import { NextRequest, NextResponse } from "next/server";
import { registerExecutionRecurrence } from "@/services/taskService";
import { TaskStatus } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { notes, method, registered_by, reopen_status } = body;

    const updatedTask = await registerExecutionRecurrence(id, {
      notes,
      method,
      registeredBy: registered_by,
      reopenStatus: reopen_status as TaskStatus | undefined,
    });

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: "Nova ocorrência registrada com sucesso.",
    });
  } catch (error: unknown) {
    console.error("POST /api/tasks/[id]/recurrence error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao registrar ocorrência" },
      { status: 500 }
    );
  }
}

