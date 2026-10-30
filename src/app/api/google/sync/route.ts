import { NextResponse } from "next/server";
import { getConnectedAccounts, getTasksFromDb, saveTaskToDb, saveConnectedAccount } from "@/services/taskService";
import { getOAuth2Client } from "@/services/googleService";
import { google } from "googleapis";
import { Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";

export async function POST() {
  try {
    const accounts = await getConnectedAccounts();
    const tasks = await getTasksFromDb();
    let importedCount = 0;

    for (const acc of accounts) {
      if (acc.is_connected && acc.refresh_token) {
        try {
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials({
            access_token: acc.access_token,
            refresh_token: acc.refresh_token,
          });

          const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });
          const res = await tasksApi.tasks.list({
            tasklist: acc.default_tasklist_id || "@default",
            showCompleted: true,
            showHidden: true,
          });

          const items = res.data.items || [];
          for (const item of items) {
            if (!item.id || !item.title) continue;

            const existing = tasks.find((t) => t.google_task_id === item.id);
            if (!existing) {
              const cleanTitle = stripGoogleTaskPrefix(item.title);
              const newTask: Task = {
                id: `gt-imported-${item.id}`,
                raw_input: cleanTitle,
                title: cleanTitle,
                description: item.notes || "",
                account_type: acc.id,
                category: acc.id === "work" ? "Suporte TI" : "Finanças & Pessoal",
                tags: ["google-tasks-sync"],
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
                learning_resources: {
                  youtube_videos: [],
                  search_queries: [],
                },
                met_original_sla: item.status === "completed" ? true : null,
              };
              await saveTaskToDb(newTask);
              importedCount++;
            }
          }
        } catch (syncErr) {
          console.warn(`Sync failed for account ${acc.id}:`, syncErr);
        }
      }

      // Update sync timestamp
      await saveConnectedAccount({
        ...acc,
        last_sync_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída com sucesso.",
      imported_count: importedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("POST /api/google/sync error:", error);
    return NextResponse.json(
      { success: false, error: "Erro durante sincronização" },
      { status: 500 }
    );
  }
}

