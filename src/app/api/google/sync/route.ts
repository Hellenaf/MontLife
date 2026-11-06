import { NextRequest, NextResponse } from "next/server";
import {
  getConnectedAccounts,
  getTasksFromDb,
  saveTaskToDb,
  saveConnectedAccount,
  consolidateHellenWorkspace,
  isHellenUser,
  HELLEN_MASTER_ID,
} from "@/services/taskService";
import { fetchAllGoogleTasksFromAccount } from "@/services/googleService";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { getSessionUser } from "@/lib/session";
import { Task } from "@/types";

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
    const targetUserId = userId;

    let consolidatedCount = 0;

    if (isHellen) {
      const result = await consolidateHellenWorkspace(targetUserId);
      consolidatedCount = result.migrated_tasks_count;
    }

    const accounts = await getConnectedAccounts(targetUserId);
    const tasks = await getTasksFromDb(targetUserId);

    // Ingest any remaining tasks from connected accounts if Google Tasks tokens exist
    for (const acc of accounts) {
      if (acc.is_connected && (acc.refresh_token || acc.access_token)) {
        try {
          const items = await fetchAllGoogleTasksFromAccount({
            access_token: acc.access_token,
            refresh_token: acc.refresh_token,
          });

          for (const item of items) {
            if (!item.id || !item.title) continue;
            const existing = tasks.find((t) => t.google_task_id === item.id || t.id === `gt-imported-${item.id}`);
            if (!existing) {
              const isWork = (acc.email || "").includes("notredame") || (acc.label || "").toLowerCase().includes("trab");
              const isCompleted = item.status === "completed";
              const taskDate = item.updated || item.completed || item.due || new Date().toISOString();
              const dueDate = item.due || taskDate;

              const newTask: Task = {
                id: `gt-imported-${item.id}`,
                owner_uid: targetUserId,
                user_id: targetUserId,
                account_email: acc.email || (isWork ? "haferreira@notredamecampinas.net.br" : "hellenalvesferreira.s2@gmail.com"),
                account_type: isWork ? "Trabalho" : "Pessoal",
                raw_input: item.title,
                title: stripGoogleTaskPrefix(item.title),
                description: item.notes || "",
                item_type: "task",
                category: isWork ? "Suporte TI" : "Geral",
                tags: [item.taskListName || "Google Tasks"],
                priority: "P3",
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
                learning_resources: { youtube_videos: [], search_queries: [] },
                met_original_sla: isCompleted ? true : null,
              };

              await saveTaskToDb(newTask, targetUserId);
              consolidatedCount++;
            }
          }
        } catch (syncErr) {
          console.warn(`Sync Google Tasks for ${acc.email} skipped or failed:`, syncErr);
        }
      }
    }

    // Update last_sync_at for all connected accounts
    const nowIso = new Date().toISOString();
    for (const acc of accounts) {
      if (acc.is_connected) {
        await saveConnectedAccount(
          {
            ...acc,
            last_sync_at: nowIso,
          },
          targetUserId
        );
      }
    }

    const finalTasks = await getTasksFromDb(targetUserId);

    return NextResponse.json({
      success: true,
      message: "Demandas consolidadas com sucesso no armazenamento nativo MontLife.",
      imported_count: consolidatedCount,
      total_tasks_count: finalTasks.length,
      timestamp: nowIso,
    });
  } catch (error: unknown) {
    console.error("POST /api/google/sync error:", error);
    return NextResponse.json(
      { success: false, error: "Erro durante a consolidação de demandas" },
      { status: 500 }
    );
  }
}
