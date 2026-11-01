import { NextRequest, NextResponse } from "next/server";
import { getPendingAuth, clearPendingAuth } from "@/lib/pendingAuth";
import { saveConnectedAccount, getTasksFromDb, saveTaskToDb, deleteTaskFromDb } from "@/services/taskService";
import { fetchAllGoogleTasksFromAccount, fetchYouTubeResources } from "@/services/googleService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { AccountType, Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";

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

    // 2. Auto-sync real Google Tasks across all lists and with full history pagination
    let importedCount = 0;
    if (refresh_token || access_token) {
      try {
        const items = await fetchAllGoogleTasksFromAccount({
          access_token: access_token || undefined,
          refresh_token: refresh_token || undefined,
        });

        const currentTasks = await getTasksFromDb();

        // Purge any legacy dummy seed tasks
        for (const t of currentTasks) {
          if (t.id.startsWith("seed-task-")) {
            await deleteTaskFromDb(t.id);
          }
        }

        for (const item of items) {
          if (!item.id || !item.title) continue;

          const existing = currentTasks.find((t) => t.google_task_id === item.id);
          if (!existing) {
            const cleanTitle = stripGoogleTaskPrefix(item.title);
            const aiData = await categorizeTaskWithAI(cleanTitle, item.notes, type);
            const yt = await fetchYouTubeResources(aiData.learning_queries);

            const isCompleted = item.status === "completed";
            const taskDate = item.updated || item.completed || item.due || new Date().toISOString();
            const dueDate = item.due || taskDate;

            const newTask: Task = {
              id: `gt-imported-${item.id}`,
              raw_input: cleanTitle,
              title: cleanTitle,
              description: item.notes || "",
              account_type: type,
              item_type: aiData.item_type || "task",
              category: aiData.category,
              tags: aiData.tags.length > 0 ? aiData.tags : [item.taskListName || "Google Tasks"],
              priority: aiData.priority || "P3",
              status: isCompleted ? "COMPLETED" : "TODO",
              created_at: taskDate,
              started_at: null,
              completed_at: isCompleted ? (item.completed || taskDate) : null,
              original_due_date: dueDate,
              current_due_date: dueDate,
              extension_count: 0,
              deadline_extensions: [],
              resolution_notes: null,
              cancel_reason: null,
              google_task_id: item.id,
              google_calendar_event_id: null,
              learning_resources: yt,
              met_original_sla: isCompleted ? true : null,
            };

            await saveTaskToDb(newTask);
            importedCount++;
          }
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
