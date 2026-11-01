import { NextRequest, NextResponse } from "next/server";
import { getPendingAuth, clearPendingAuth } from "@/lib/pendingAuth";
import { saveConnectedAccount, getTasksFromDb, saveTaskToDb, deleteTaskFromDb } from "@/services/taskService";
import { getOAuth2Client } from "@/services/googleService";
import { AccountType, Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type: AccountType = body.type === "personal" ? "personal" : "work";

    const pendingData = await getPendingAuth();

    if (!pendingData) {
      return NextResponse.json(
        { success: false, error: "Nenhuma autenticação pendente encontrada. Faça o login novamente." },
        { status: 400 }
      );
    }

    const { email, access_token, refresh_token, expiry_date } = pendingData;

    // 1. Save classified account to connected_accounts collection
    const saved = await saveConnectedAccount({
      id: type,
      email: email || `${type}@gmail.com`,
      access_token: access_token || undefined,
      refresh_token: refresh_token || undefined,
      expiry_date: expiry_date || undefined,
      default_tasklist_id: "@default",
      last_sync_at: new Date().toISOString(),
      is_connected: true,
    });

    // Clean pending doc
    await clearPendingAuth();

    // 2. Auto-sync real Google Tasks immediately
    let importedCount = 0;
    if (refresh_token || access_token) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          access_token: access_token || undefined,
          refresh_token: refresh_token || undefined,
        });

        const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });
        const res = await tasksApi.tasks.list({
          tasklist: "@default",
          showCompleted: true,
          showHidden: true,
        });

        const items = res.data.items || [];
        const currentTasks = await getTasksFromDb();

        // Purge dummy seed tasks now that user has linked their real account
        for (const t of currentTasks) {
          if (t.id.startsWith("seed-task-")) {
            await deleteTaskFromDb(t.id);
          }
        }

        for (const item of items) {
          if (!item.id || !item.title) continue;
          const cleanTitle = stripGoogleTaskPrefix(item.title);
          const newTask: Task = {
            id: `gt-imported-${item.id}`,
            raw_input: cleanTitle,
            title: cleanTitle,
            description: item.notes || "",
            account_type: type,
            item_type: "task",
            category: type === "work" ? "Suporte TI" : "Finanças & Pessoal",
            tags: ["google-tasks"],
            priority: "P3",
            status: item.status === "completed" ? "COMPLETED" : "TODO",
            created_at: item.updated || new Date().toISOString(),
            started_at: null,
            completed_at: item.completed || null,
            original_due_date: item.due || new Date(Date.now() + 86400000).toISOString(),
            current_due_date: item.due || new Date(Date.now() + 86400000).toISOString(),
            extension_count: 0,
            deadline_extensions: [],
            resolution_notes: null,
            cancel_reason: null,
            google_task_id: item.id,
            google_calendar_event_id: null,
            learning_resources: { youtube_videos: [], search_queries: [] },
            met_original_sla: item.status === "completed" ? true : null,
          };
          await saveTaskToDb(newTask);
          importedCount++;
        }
      } catch (syncErr) {
        console.warn("Auto-sync tasks in classify failed:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      type,
      email,
      imported_count: importedCount,
      account: saved,
    });
  } catch (error: unknown) {
    console.error("POST /api/accounts/classify error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao classificar conta." },
      { status: 500 }
    );
  }
}
