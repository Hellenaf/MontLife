import { NextResponse } from "next/server";
import { getConnectedAccounts, getTasksFromDb, saveTaskToDb, saveConnectedAccount } from "@/services/taskService";
import { fetchAllGoogleTasksFromAccount, fetchYouTubeResources } from "@/services/googleService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";

export async function POST() {
  try {
    const accounts = await getConnectedAccounts();
    const tasks = await getTasksFromDb();
    let importedCount = 0;
    let updatedCount = 0;

    for (const acc of accounts) {
      if (acc.is_connected && (acc.refresh_token || acc.access_token)) {
        try {
          // Fetch ALL tasks across ALL tasklists with full pagination (from 2024 to today)
          const items = await fetchAllGoogleTasksFromAccount({
            access_token: acc.access_token,
            refresh_token: acc.refresh_token,
          });

          for (const item of items) {
            if (!item.id || !item.title) continue;

            const existing = tasks.find((t) => t.google_task_id === item.id);
            const cleanTitle = stripGoogleTaskPrefix(item.title);

            if (!existing) {
              // Categorize autonomously with AI
              const aiData = await categorizeTaskWithAI(cleanTitle, item.notes, acc.id);
              const yt = await fetchYouTubeResources(aiData.learning_queries);

              const isCompleted = item.status === "completed";
              const taskDate = item.updated || item.completed || item.due || new Date().toISOString();
              const dueDate = item.due || taskDate;

              const newTask: Task = {
                id: `gt-imported-${item.id}`,
                raw_input: cleanTitle,
                title: cleanTitle,
                description: item.notes || "",
                account_type: acc.id,
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
            } else {
              // If already exists but has old generic category ("Suporte TI", "Finanças & Pessoal", or tag "google-tasks"), upgrade it with AI!
              const isGeneric =
                existing.category === "Suporte TI" ||
                existing.category === "Finanças & Pessoal" ||
                (existing.tags && existing.tags.length === 1 && existing.tags[0].includes("google-task"));

              const isCompleted = item.status === "completed";
              let hasChanged = false;

              if (isGeneric) {
                const aiData = await categorizeTaskWithAI(cleanTitle, item.notes || existing.description, acc.id);
                existing.category = aiData.category;
                existing.tags = aiData.tags;
                if (!existing.learning_resources?.youtube_videos?.length) {
                  existing.learning_resources = await fetchYouTubeResources(aiData.learning_queries);
                }
                hasChanged = true;
              }

              // Update completion status if changed in Google Tasks
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
                await saveTaskToDb(existing);
                updatedCount++;
              }
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
      updated_count: updatedCount,
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
