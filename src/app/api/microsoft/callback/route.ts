import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCode, fetchMicrosoftTodoTasks } from "@/services/microsoftService";
import { saveConnectedAccount, saveTaskToDb } from "@/services/taskService";
import { getAppBaseUrl } from "@/lib/urlUtils";
import { Task } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const baseUrl = getAppBaseUrl(req);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?microsoft_error=no_code`);
  }

  try {
    const tokenData = await exchangeMicrosoftCode(code, baseUrl);
    if (!tokenData || !tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/?microsoft_error=token_failed`);
    }

    // Save connected account as "samsung"
    await saveConnectedAccount({
      id: "samsung",
      email: tokenData.email || "samsung-reminder@microsoft.com",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      last_sync_at: new Date().toISOString(),
      is_connected: true,
    });

    // Auto sync tasks immediately
    const rawTasks = await fetchMicrosoftTodoTasks(tokenData.access_token);
    for (const item of rawTasks) {
      const isCompleted = item.status === "completed";
      const dueDate = item.dueDateTime?.dateTime || new Date(Date.now() + 86400000).toISOString();

      const newTask: Task = {
        id: `samsung-${item.id}`,
        raw_input: item.title,
        title: item.title,
        description: item.body?.content || `Lembrete sincronizado do Samsung Reminder / Microsoft To Do (Lista: ${item.listName})`,
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
    }

    return NextResponse.redirect(`${baseUrl}/?microsoft_success=true&imported=${rawTasks.length}`);
  } catch (err) {
    console.error("Microsoft callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?microsoft_error=unknown`);
  }
}

