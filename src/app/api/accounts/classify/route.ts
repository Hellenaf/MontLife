import { NextRequest, NextResponse } from "next/server";
import { getPendingAuth, clearPendingAuth } from "@/lib/pendingAuth";
import {
  saveConnectedAccount,
  getTasksFromDb,
  saveTaskToDb,
  linkEmailToMasterUser,
} from "@/services/taskService";
import {
  fetchAllGoogleTasksFromAccount,
  fetchYouTubeResources,
} from "@/services/googleService";
import { categorizeTaskWithAI } from "@/services/geminiService";
import { Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLabel = (body.label || body.type || "Geral").trim();
    const color = body.color || "indigo";
    const ticketId = body.ticket || body.ticketId;

    const session = await getSessionUser(req);
    const pendingData = await getPendingAuth(ticketId);

    const email = (
      body.email ||
      pendingData?.email ||
      session?.email ||
      ""
    ).toLowerCase().trim();

    const userId = session?.userId || pendingData?.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Sessão não identificada. Por favor, autentique-se novamente.",
        },
        { status: 401 }
      );
    }

    const access_token = pendingData?.access_token || body.access_token || undefined;
    const refresh_token = pendingData?.refresh_token || body.refresh_token || undefined;
    const expiry_date = pendingData?.expiry_date || body.expiry_date || undefined;

    const accountId =
      body.account_id ||
      pendingData?.accountId ||
      (email ? `acc_${email.replace(/[^a-z0-9_-]/g, "_")}` : `acc_${Date.now()}`);

    // 1. Save classified account to users/{userId}/accounts
    const saved = await saveConnectedAccount(
      {
        id: accountId,
        user_id: userId,
        email: email || `${rawLabel.toLowerCase()}@gmail.com`,
        label: rawLabel,
        color,
        access_token,
        refresh_token,
        expiry_date,
        default_tasklist_id: "@default",
        last_sync_at: new Date().toISOString(),
        is_connected: Boolean(access_token || refresh_token),
      },
      userId
    );

    // Ensure email is linked to master profile
    if (email) {
      await linkEmailToMasterUser(userId, email);
    }

    // Clear pending ticket
    if (ticketId) {
      await clearPendingAuth(ticketId);
    }

    // 2. Automatically sync Google Tasks into MontLife for this account
    let importedCount = 0;
    if (access_token || refresh_token) {
      try {
        const items = await fetchAllGoogleTasksFromAccount({
          access_token,
          refresh_token,
        });

        const currentTasks = await getTasksFromDb(userId);

        for (const item of items) {
          if (!item.id || !item.title) continue;

          const existing = currentTasks.find((t) => t.google_task_id === item.id);
          if (!existing) {
            const cleanTitle = stripGoogleTaskPrefix(item.title);
            const aiData = await categorizeTaskWithAI(cleanTitle, item.notes, rawLabel);
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
              account_type: rawLabel,
              item_type: aiData.item_type || "task",
              category: aiData.category,
              tags: aiData.tags.length > 0 ? aiData.tags : [item.taskListName || "Google Tasks"],
              priority: aiData.priority || "P3",
              status: isCompleted ? "COMPLETED" : "TODO",
              created_at: taskDate,
              started_at: null,
              completed_at: isCompleted ? item.completed || taskDate : null,
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
          }
        }
      } catch (syncErr) {
        console.warn("Initial sync after classification failed:", syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Conta categorizada como "${rawLabel}" com sucesso.`,
      account: saved,
      imported_count: importedCount,
    });
  } catch (error: unknown) {
    console.error("POST /api/accounts/classify error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao categorizar a conta." },
      { status: 500 }
    );
  }
}
