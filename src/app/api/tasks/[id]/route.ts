import { NextRequest, NextResponse } from "next/server";
import {
  getTasksFromDb,
  updateTaskStatus,
  extendTaskDeadline,
  saveTaskToDb,
  deleteTaskFromDb,
} from "@/services/taskService";
import { syncTaskToGoogle } from "@/services/googleService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tasks = await getTasksFromDb();
    const task = tasks.find((t) => t.id === id);

    if (!task) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: unknown) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const action = body.action;

    let updatedTask = null;

    if (action === "update_status") {
      updatedTask = await updateTaskStatus(
        id,
        body.status,
        body.resolution_notes,
        body.cancel_reason
      );
    } else if (action === "extend_deadline") {
      updatedTask = await extendTaskDeadline(
        id,
        body.new_due_date,
        body.reason
      );
    } else {
      const tasks = await getTasksFromDb();
      const existing = tasks.find((t) => t.id === id);
      if (existing) {
        const merged = { ...existing, ...body };
        updatedTask = await saveTaskToDb(merged);
      }
    }

    if (!updatedTask) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    // Mirror updates to Google Tasks
    await syncTaskToGoogle(updatedTask);

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: unknown) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar tarefa" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteTaskFromDb(id);
    return NextResponse.json({ success: true, message: "Tarefa excluída" });
  } catch (error: unknown) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Erro ao excluir tarefa" }, { status: 500 });
  }
}

