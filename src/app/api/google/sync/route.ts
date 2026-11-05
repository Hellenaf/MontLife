import { NextRequest, NextResponse } from "next/server";
import {
  getConnectedAccounts,
  getTasksFromDb,
  saveTaskToDb,
  saveConnectedAccount,
  deleteTaskFromDb,
} from "@/services/taskService";
import {
  fetchAllGoogleTasksFromAccount,
  fetchYouTubeResources,
  syncTaskToGoogleCalendar,
} from "@/services/googleService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { Task, AccountType } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const userId = session?.userId;

    const accounts = await getConnectedAccounts(userId);
    const tasks = await getTasksFromDb(userId);
    let importedCount = 0;
    let updatedCount = 0;
    let purgedGcalCount = 0;

    // 1. Cleanup rule: Remove any legacy imported calendar events (gcal-*)
    for (const t of tasks) {
      if (t.id.startsWith("gcal-") && !t.raw_input.startsWith("[MontLife]")) {
        await deleteTaskFromDb(t.id, userId);
        purgedGcalCount++;
      }
    }

    for (const acc of accounts) {
      if (acc.is_connected && (acc.refresh_token || acc.access_token) && (acc.id === "work" || acc.id === "personal")) {
        const accountType: AccountType = acc.id;
        try {
          // Fetch Google Tasks items (task management only)
          const items = await fetchAllGoogleTasksFromAccount({
            access_token: acc.access_token,
            refresh_token: acc.refresh_token,
          });

          for (const item of items) {
            if (!item.id || !item.title) continue;

            const existing = tasks.find((t) => t.google_task_id === item.id);
            const cleanTitle = stripGoogleTaskPrefix(item.title);

            if (!existing) {
              const aiData = await categorizeTaskWithAI(cleanTitle, item.notes, accountType);
              const yt = await fetchYouTubeResources(aiData.learning_queries);

              const isCompleted = item.status === "completed";
              const taskDate = item.updated || item.completed || item.due || new Date().toISOString();
              const dueDate = item.due || taskDate;

              const newTask: Task = {
                id: `gt-imported-${item.id}`,
                user_id: userId,
                raw_input: cleanTitle,
                title: cleanTitle,
                description: item.notes || "",
                account_type: accountType,
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

              await saveTaskToDb(newTask, userId);
              importedCount++;
            } else {
              const isGeneric =
                existing.category === "Suporte TI" ||
                existing.category === "Finanças & Pessoal" ||
                (existing.tags && existing.tags.length === 1 && existing.tags[0].includes("google-task"));

              const isCompleted = item.status === "completed";
              let hasChanged = false;

              if (isGeneric) {
                const aiData = await categorizeTaskWithAI(cleanTitle, item.notes || existing.description, accountType);
                existing.category = aiData.category;
                existing.tags = aiData.tags;
                if (!existing.learning_resources?.youtube_videos?.length) {
                  existing.learning_resources = await fetchYouTubeResources(aiData.learning_queries);
                }
                hasChanged = true;
              }

              if (isCompleted && existing.status !== "COMPLETED") {
                existing.status = "COMPLETED";
                existing.completed_at = item.completed || item.updated || new Date().toISOString();
                existing.met_original_sla = true;
                hasChanged = true;
              } else if (!isCompleted && existing.status === "COMPLETED") {
                existing.status = "TODO";
                existing.completed_at = null;
                hasChanged = true;
              }

              if (hasChanged) {
                await saveTaskToDb(existing, userId);
                updatedCount++;
              }
            }
          }

          // 2. Outbound-only sync: Push MontLife tasks with due dates TO Google Calendar
          const montLifeTasksToPush = tasks.filter(
            (t) => t.account_type === accountType && t.current_due_date && t.status !== "COMPLETED" && t.status !== "CANCELED"
          );
          for (const task of montLifeTasksToPush.slice(0, 10)) {
            try {
              const calEventId = await syncTaskToGoogleCalendar(task, {
                access_token: acc.access_token,
                refresh_token: acc.refresh_token,
              });
              if (calEventId && calEventId !== task.google_calendar_event_id) {
                task.google_calendar_event_id = calEventId;
                await saveTaskToDb(task, userId);
              }
            } catch (err) {
              console.warn("Failed pushing task to calendar:", err);
            }
          }
        } catch (syncErr) {
          console.warn(`Sync failed for account ${acc.id}:`, syncErr);
        }
      }

      await saveConnectedAccount(
        {
          ...acc,
          last_sync_at: new Date().toISOString(),
        },
        userId
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída com sucesso.",
      imported_count: importedCount,
      updated_count: updatedCount,
      purged_gcal_count: purgedGcalCount,
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
