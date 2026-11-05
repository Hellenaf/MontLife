import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/services/googleService";
import { savePendingAuth } from "@/lib/pendingAuth";
import { saveConnectedAccount, getTasksFromDb, saveTaskToDb, deleteTaskFromDb } from "@/services/taskService";
import { AccountType, Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { getAppBaseUrl } from "@/lib/urlUtils";
import { setSessionCookie, UserSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "ask";
  const baseUrl = getAppBaseUrl(req);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?oauth_error=no_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user details from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || `${state}@gmail.com`;
    const rawId = userInfo.data.id || email.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const userId = `usr_${rawId}`;

    const session: UserSession = {
      userId,
      email,
      name: userInfo.data.name || email.split("@")[0],
      picture: userInfo.data.picture || undefined,
      role: "member",
      createdAt: new Date().toISOString(),
    };

    // 1. If state is "ask", store pending and redirect to classify modal
    if (state === "ask") {
      await savePendingAuth({
        userId,
        email,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        expiry_date: tokens.expiry_date || null,
        updated_at: new Date().toISOString(),
      });

      const res = NextResponse.redirect(
        `${baseUrl}/?prompt_classify=true&email=${encodeURIComponent(email)}`
      );
      setSessionCookie(res, session);
      return res;
    }

    // 2. Otherwise (explicitly "work" or "personal" from second account link)
    const accountType: AccountType = state === "personal" ? "personal" : "work";
    await saveConnectedAccount(
      {
        id: accountType,
        email,
        access_token: tokens.access_token || undefined,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
        default_tasklist_id: "@default",
        last_sync_at: new Date().toISOString(),
        is_connected: true,
      },
      userId
    );

    // Auto-sync real Google Tasks into this user's isolated workspace
    try {
      const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });
      const res = await tasksApi.tasks.list({
        tasklist: "@default",
        showCompleted: true,
        showHidden: true,
      });

      const items = res.data.items || [];
      const currentTasks = await getTasksFromDb(userId);

      // Clean up legacy seed tasks
      for (const t of currentTasks) {
        if (t.id.startsWith("seed-task-")) {
          await deleteTaskFromDb(t.id, userId);
        }
      }

      for (const item of items) {
        if (!item.id || !item.title) continue;
        const cleanTitle = stripGoogleTaskPrefix(item.title);
        const newTask: Task = {
          id: `gt-imported-${item.id}`,
          user_id: userId,
          raw_input: cleanTitle,
          title: cleanTitle,
          description: item.notes || "",
          account_type: accountType,
          item_type: "task",
          category: accountType === "work" ? "Suporte TI" : "Finanças & Pessoal",
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
          learning_resources: {
            youtube_videos: [],
            search_queries: [],
          },
          met_original_sla: item.status === "completed" ? true : null,
        };
        await saveTaskToDb(newTask, userId);
      }
    } catch (syncErr) {
      console.warn("Initial sync after OAuth callback failed:", syncErr);
    }

    const redirectRes = NextResponse.redirect(`${baseUrl}/?oauth_success=${accountType}`);
    setSessionCookie(redirectRes, session);
    return redirectRes;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?oauth_error=token_exchange_failed`);
  }
}
