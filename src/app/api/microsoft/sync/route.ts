import { NextRequest, NextResponse } from "next/server";
import { getConnectedAccounts, saveTaskToDb, saveConnectedAccount } from "@/services/taskService";
import { fetchMicrosoftTodoTasks } from "@/services/microsoftService";
import { Task } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const accounts = await getConnectedAccounts();
    const samsungAccount = accounts.find((a) => a.id === "samsung" || a.id === "microsoft");

    if (!samsungAccount || !samsungAccount.access_token) {
      return NextResponse.json({
        success: false,
        error: "Conta Samsung / Microsoft não vinculada.",
      }, { status: 400 });
    }

    const rawTasks = await fetchMicrosoftTodoTasks(samsungAccount.access_token);
    let importedCount = 0;

    for (const item of rawTasks) {
      const isCompleted = item.status === "completed";
      const dueDate = item.dueDateTime?.dateTime || new Date(Date.now() + 86400000).toISOString();

      const newTask: Task = {
        id: `samsung-${item.id}`,
        raw_input: item.title,
        title: item.title,
        description: item.body?.content || `Lembrete sincronizado do Samsung Reminder (Lista: ${item.listName})`,
        account_type: "personal",
        item_type: "reminder",
        category: "Lembretes Samsung",
        tags: ["samsung-reminder", "lembrete", item.listName.toLowerCase().replace(/\s+/g, "-")],
        priority: "P3",
        status: isCompleted ? "COMPLETED" : "TODO",
        created_at: item.createdDateTime || new Date().toISOString(),
        started_at: null,
        completed_at: item.completedDateTime?.dateTime || (isCompleted ? new Date().toISOString() : null),
        original_due_date: dueDate,
        current_due_date: dueDate,
        extension_count: 0,
        deadline_extensions: [],
        resolution_notes: null,
        cancel_reason: null,
        google_task_id: null,
        google_calendar_event_id: null,
        learning_resources: {
          youtube_videos: [],
          search_queries: [],
        },
        met_original_sla: isCompleted ? true : null,
      };

      await saveTaskToDb(newTask);
      importedCount++;
    }

    // Update last sync time
    await saveConnectedAccount({
      ...samsungAccount,
      last_sync_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      imported_count: importedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Samsung / Microsoft sync failed:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Falha na sincronização",
    }, { status: 500 });
  }
}

