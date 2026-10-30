import { NextRequest, NextResponse } from "next/server";
import { getTasksFromDb, saveTaskToDb } from "@/services/taskService";
import { syncTaskToGoogle } from "@/services/googleService";
import { calculateSlaDueDate } from "@/lib/sla";
import { Task } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("account_type");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const query = searchParams.get("q")?.toLowerCase();

    let tasks = await getTasksFromDb();

    if (accountType && accountType !== "all") {
      tasks = tasks.filter((t) => t.account_type === accountType);
    }

    if (status && status !== "ALL") {
      tasks = tasks.filter((t) => t.status === status);
    }

    if (priority && priority !== "ALL") {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    if (query) {
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error: unknown) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao buscar tarefas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const priority = body.priority || "P3";
    const dueDate = body.due_date || calculateSlaDueDate(priority);

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      raw_input: body.raw_input || body.title,
      title: body.title,
      description: body.description || "",
      account_type: body.account_type || "work",
      category: body.category || "Suporte TI",
      tags: body.tags || [],
      priority,
      status: body.status || "TODO",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      original_due_date: dueDate,
      current_due_date: dueDate,
      extension_count: 0,
      deadline_extensions: [],
      resolution_notes: null,
      cancel_reason: null,
      google_task_id: null,
      google_calendar_event_id: null,
      learning_resources: body.learning_resources || {
        youtube_videos: [],
        search_queries: [],
      },
      met_original_sla: null,
    };

    // Sync with Google Tasks if configured
    const gTaskId = await syncTaskToGoogle(newTask);
    if (gTaskId) {
      newTask.google_task_id = gTaskId;
    }

    const saved = await saveTaskToDb(newTask);
    return NextResponse.json({ success: true, task: saved }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao criar tarefa" },
      { status: 500 }
    );
  }
}

