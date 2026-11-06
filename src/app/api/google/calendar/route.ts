import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getConnectedAccounts,
  getTasksFromDb,
  saveTaskToDb,
  isHellenUser,
  HELLEN_MASTER_ID,
} from "@/services/taskService";
import { fetchAllGoogleCalendarEvents, RawGoogleCalendarEvent } from "@/services/googleService";
import { GoogleCalendarEventItem, Task } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/google/calendar
 * Recupera os eventos agendados no Google Agenda (com foco prioritário na Agenda Pessoal).
 * Identifica se cada agendamento já foi convertido em uma demanda no MontLife.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Por favor, realize login." },
        { status: 401 }
      );
    }

    const isHellen = isHellenUser(userId) || isHellenUser(session?.email);
    const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;

    // 1. Carrega contas conectadas e demandas existentes do banco
    const [accounts, dbTasks] = await Promise.all([
      getConnectedAccounts(targetUserId),
      getTasksFromDb(targetUserId),
    ]);

    // 2. Localiza contas com tokens válidos (priorizando a conta Pessoal conforme solicitação)
    const personalAccount = accounts.find((a) => {
      const label = (a.label || "").toLowerCase();
      const email = (a.email || "").toLowerCase();
      return (
        label.includes("pess") ||
        email.includes("hellenalvesferreira") ||
        email.includes("gmail")
      );
    });

    const accountsToFetch = accounts.filter(
      (a) => a.is_connected && (a.refresh_token || a.access_token)
    );

    const allEvents: GoogleCalendarEventItem[] = [];
    const seenEventIds = new Set<string>();

    // 3. Busca eventos do Google Calendar para cada conta conectada
    for (const acc of accountsToFetch) {
      try {
        const rawEvents = await fetchAllGoogleCalendarEvents({
          access_token: acc.access_token,
          refresh_token: acc.refresh_token,
        });

        const isPersonal =
          (acc.label || "").toLowerCase().includes("pess") ||
          (acc.email || "").includes("gmail") ||
          (acc.email || "").includes("hellenalvesferreira");

        for (const ev of rawEvents) {
          if (!ev.id || !ev.summary || seenEventIds.has(ev.id)) continue;
          seenEventIds.add(ev.id);

          const isAllDay = !ev.start.includes("T");

          // Verifica se o evento já foi convertido em uma demanda MontLife
          const linkedTask = dbTasks.find(
            (t) =>
              t.google_calendar_event_id === ev.id ||
              (t.tags && t.tags.includes(`gcal-${ev.id}`)) ||
              t.id === `gcal-${ev.id}`
          );

          allEvents.push({
            id: ev.id,
            summary: ev.summary,
            description: ev.description || undefined,
            start: ev.start,
            end: ev.end,
            allDay: isAllDay,
            status: ev.status,
            htmlLink: ev.htmlLink,
            location: ev.location,
            accountEmail: acc.email,
            accountLabel: acc.label || (isPersonal ? "Pessoal" : "Trabalho"),
            isPersonal,
            linkedTaskId: linkedTask ? linkedTask.id : null,
          });
        }
      } catch (fetchErr) {
        console.warn(`Erro ao buscar eventos do Google Calendar para ${acc.email}:`, fetchErr);
      }
    }

    // Ordena cronologicamente
    allEvents.sort((a, b) => {
      const timeA = new Date(a.start).getTime();
      const timeB = new Date(b.start).getTime();
      return timeA - timeB;
    });

    return NextResponse.json({
      success: true,
      events: allEvents,
      personalAccountConnected: Boolean(personalAccount?.is_connected),
      personalAccountEmail: personalAccount?.email || null,
      totalEvents: allEvents.length,
    });
  } catch (error: unknown) {
    console.error("GET /api/google/calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao consultar eventos do Google Agenda" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/google/calendar
 * Transforma um agendamento do Google Agenda em uma Demanda / Atividade gerenciada no MontLife.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Por favor, faça login." },
        { status: 401 }
      );
    }

    const isHellen = isHellenUser(userId) || isHellenUser(session?.email);
    const targetUserId = isHellen ? HELLEN_MASTER_ID : userId;

    const body = await req.json();
    const {
      eventId,
      summary,
      description,
      start,
      location,
      accountType = "Pessoal",
      accountEmail,
    } = body;

    if (!eventId || !summary) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'eventId' e 'summary' são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Verifica se já existe uma demanda associada a este evento
    const dbTasks = await getTasksFromDb(targetUserId);
    const existing = dbTasks.find(
      (t) =>
        t.google_calendar_event_id === eventId ||
        (t.tags && t.tags.includes(`gcal-${eventId}`)) ||
        t.id === `gcal-${eventId}`
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        task: existing,
        message: "Este agendamento já estava registrado como demanda no MontLife.",
        alreadyExists: true,
      });
    }

    // 2. Prepara a data de agendamento ISO
    let dueDateIso = new Date().toISOString();
    if (start) {
      try {
        const parsed = new Date(start);
        if (!isNaN(parsed.getTime())) {
          dueDateIso = parsed.toISOString();
        }
      } catch {
        dueDateIso = start;
      }
    }

    const cleanAccountType =
      accountType === "Trabalho" || accountType === "work" ? "Trabalho" : "Pessoal";

    // 3. Cria a nova Demanda/Atividade
    const taskId = `gcal-${eventId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const newTask: Task = {
      id: taskId,
      owner_uid: targetUserId,
      user_id: targetUserId,
      account_email:
        accountEmail ||
        (cleanAccountType === "Pessoal"
          ? "hellenalvesferreira.s2@gmail.com"
          : "haferreira@notredamecampinas.net.br"),
      account_type: cleanAccountType,
      raw_input: summary,
      title: summary.trim(),
      description:
        (description && description.trim()) ||
        (location ? `Localização: ${location}` : "Compromisso sincronizado do Google Agenda Pessoal."),
      item_type: "activity",
      category: cleanAccountType === "Pessoal" ? "Agenda & Vida Pessoal" : "Compromissos",
      tags: ["Google Agenda", cleanAccountType, `gcal-${eventId}`],
      priority: "P3",
      status: "TODO",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      original_due_date: dueDateIso,
      current_due_date: dueDateIso,
      extension_count: 0,
      deadline_extensions: [],
      resolution_notes: null,
      cancel_reason: null,
      google_task_id: null,
      google_calendar_event_id: eventId,
      learning_resources: { youtube_videos: [], search_queries: [] },
      validation_steps: [
        {
          id: `step-${Date.now()}-1`,
          text: "Comparecer ou executar o compromisso agendado",
          completed: false,
        },
      ],
      met_original_sla: null,
    };

    await saveTaskToDb(newTask, targetUserId);

    return NextResponse.json({
      success: true,
      task: newTask,
      message: "Agendamento transformado em demanda com sucesso!",
    });
  } catch (error: unknown) {
    console.error("POST /api/google/calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao transformar agendamento em demanda" },
      { status: 500 }
    );
  }
}

