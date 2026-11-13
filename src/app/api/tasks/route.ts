import { NextRequest, NextResponse } from "next/server";
import {
  getTasksFromDb,
  saveTaskToDb,
  isHellenUser,
  HELLEN_MASTER_ID,
} from "@/services/taskService";
import { calculateSlaDueDate } from "@/lib/sla";
import { getSessionUser } from "@/lib/session";
import { normalizeCategory } from "@/lib/categories";
import { Task } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para acessar suas demandas.", tasks: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("account_type");
    const accountEmail = searchParams.get("account_email");
    const itemType = searchParams.get("item_type");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const query = searchParams.get("q")?.toLowerCase();

    let tasks = await getTasksFromDb(userId);

    if (accountEmail && accountEmail !== "all") {
      tasks = tasks.filter((t) => t.account_email?.toLowerCase() === accountEmail.toLowerCase());
    } else if (accountType && accountType !== "all") {
      tasks = tasks.filter((t) => t.account_type === accountType);
    }

    if (itemType && itemType !== "all") {
      tasks = tasks.filter((t) => (t.item_type || "task") === itemType);
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
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login para criar demandas." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { success: false, error: "O título da demanda é obrigatório." },
        { status: 400 }
      );
    }

    const priority = body.priority || "P3";

    const rawScheduledStart =
      typeof body.scheduled_start === "string" && body.scheduled_start.trim()
        ? body.scheduled_start.trim()
        : null;
    const rawScheduledEnd =
      typeof body.scheduled_end === "string" && body.scheduled_end.trim()
        ? body.scheduled_end.trim()
        : null;

    const validScheduledStart =
      rawScheduledStart && !isNaN(new Date(rawScheduledStart).getTime())
        ? new Date(rawScheduledStart).toISOString()
        : null;

    const dueDate =
      (typeof body.due_date === "string" && body.due_date.trim()
        ? body.due_date.trim()
        : null) ||
      validScheduledStart ||
      calculateSlaDueDate(priority);

    let validScheduledEnd: string | null = null;
    if (rawScheduledEnd && !isNaN(new Date(rawScheduledEnd).getTime())) {
      const refStartMs = new Date(validScheduledStart || dueDate).getTime();
      const endMs = new Date(rawScheduledEnd).getTime();
      if (!isNaN(refStartMs) && endMs > refStartMs) {
        validScheduledEnd = new Date(endMs).toISOString();
      }
    }

    const reminderEnabled =
      typeof body.reminder_enabled === "boolean"
        ? body.reminder_enabled
        : Boolean(validScheduledEnd || body.item_type === "activity");

    const parsedReminderMinutes =
      typeof body.reminder_minutes_before === "number" &&
      !isNaN(body.reminder_minutes_before) &&
      body.reminder_minutes_before >= 0
        ? Math.min(43200, Math.round(body.reminder_minutes_before))
        : null;

    const reminderMinutesBefore = reminderEnabled
      ? parsedReminderMinutes ?? 30
      : parsedReminderMinutes;

    const rawAccType = String(body.account_type || "work").toLowerCase().trim();
    const isPersonal =
      rawAccType === "personal" ||
      rawAccType.includes("pess") ||
      rawAccType.includes("vida");

    const isHellen = isHellenUser(userId, session?.email);
    const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;
    const normalizedAccountType = isPersonal ? "Pessoal" : "Trabalho";

    const requestedEmail =
      typeof body.account_email === "string" && body.account_email.includes("@")
        ? body.account_email.toLowerCase().trim()
        : "";
    const resolvedEmail = isHellen
      ? requestedEmail && (requestedEmail.includes("hellen") || requestedEmail.includes("notredame"))
        ? requestedEmail
        : isPersonal
        ? "hellenalvesferreira.s2@gmail.com"
        : "haferreira@notredamecampinas.net.br"
      : requestedEmail || session?.email || "";

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      owner_uid: targetUserId,
      user_id: targetUserId,
      account_email: resolvedEmail,
      ...(typeof body.account_id === "string" && body.account_id
        ? { account_id: body.account_id }
        : {}),
      raw_input: (typeof body.raw_input === "string" && body.raw_input.trim()) || title,
      title,
      description: typeof body.description === "string" ? body.description : "",
      account_type: normalizedAccountType,
      transferred_to: isPersonal ? "personal" : "work",
      manually_assigned: true,
      item_type: body.item_type || "task",
      category: normalizeCategory(body.category || "Operações & Demandas"),
      tags: Array.isArray(body.tags) ? body.tags : [],
      priority,
      status: body.status || "TODO",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      original_due_date: dueDate,
      current_due_date: validScheduledStart || dueDate,
      scheduled_start: validScheduledStart,
      scheduled_end: validScheduledEnd,
      reminder_enabled: reminderEnabled,
      reminder_minutes_before: reminderMinutesBefore,
      meet_link: typeof body.meet_link === "string" && body.meet_link.trim() ? body.meet_link.trim() : null,
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
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      resolution_attachments: Array.isArray(body.resolution_attachments) ? body.resolution_attachments : [],
      validation_steps: Array.isArray(body.validation_steps) ? body.validation_steps : [],
    };

    // Save directly to native Cloud Firestore
    const saved = await saveTaskToDb(newTask, targetUserId);
    return NextResponse.json({ success: true, task: saved }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/tasks error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    const isTooLarge =
      errMsg.includes("exceeds the maximum allowed size") ||
      errMsg.includes("1048576") ||
      errMsg.toLowerCase().includes("maximum document size");
    return NextResponse.json(
      {
        success: false,
        error: isTooLarge
          ? "Os anexos ou dados da demanda ultrapassam o limite máximo (1 MB). Reduza o tamanho dos arquivos."
          : "Falha ao salvar demanda no banco de dados. Tente novamente.",
      },
      { status: isTooLarge ? 413 : 500 }
    );
  }
}
