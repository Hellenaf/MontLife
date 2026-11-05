import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/services/googleService";
import { savePendingAuth } from "@/lib/pendingAuth";
import {
  findMasterUserByEmail,
  createOrUpdateMasterUser,
  linkEmailToMasterUser,
  getConnectedAccounts,
  saveConnectedAccount,
  getTasksFromDb,
  saveTaskToDb,
} from "@/services/taskService";
import { Task } from "@/types";
import { stripGoogleTaskPrefix } from "@/lib/sla";
import { getAppBaseUrl } from "@/lib/urlUtils";
import { setSessionCookie, getSessionUser, UserSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "login";
  const baseUrl = getAppBaseUrl(req);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?oauth_error=no_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 1. Retrieve user details from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = (userInfo.data.email || "").toLowerCase().trim();
    const name = userInfo.data.name || email.split("@")[0] || "Usuário MontLife";
    const picture = userInfo.data.picture || "";
    const rawGoogleId = userInfo.data.id || email.replace(/[^a-z0-9_-]/g, "_");

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/?oauth_error=missing_email`);
    }

    // 2. Cross-Account Master Profile Recognition
    const activeSession = await getSessionUser(req);
    let masterUserId: string;

    if (activeSession?.userId) {
      // User is ALREADY authenticated and linking another Google account to their Master Profile
      masterUserId = activeSession.userId;
      await linkEmailToMasterUser(masterUserId, email);
    } else {
      // User is logging in from scratch: check if any Master Profile contains this email
      const existingMaster = await findMasterUserByEmail(email);

      if (existingMaster) {
        masterUserId = existingMaster.id;
        await createOrUpdateMasterUser({
          id: masterUserId,
          primary_email: existingMaster.primary_email,
          linked_emails: [...(existingMaster.linked_emails || []), email],
          name: existingMaster.name || name,
          picture: existingMaster.picture || picture,
        });
      } else {
        // Brand new Master Profile
        masterUserId = `usr_${rawGoogleId}`;
        await createOrUpdateMasterUser({
          id: masterUserId,
          primary_email: email,
          linked_emails: [email],
          name,
          picture,
        });
      }
    }

    // Prepare unified session object
    const session: UserSession = {
      userId: masterUserId,
      email,
      name,
      picture,
      role: "member",
      createdAt: new Date().toISOString(),
    };

    // 3. Check if this specific email is already classified under this Master Profile
    const existingAccounts = await getConnectedAccounts(masterUserId);
    const matchedAccount = existingAccounts.find(
      (a) => a.email.toLowerCase() === email && a.label
    );

    const accountId =
      matchedAccount?.id || `acc_${email.replace(/[^a-z0-9_-]/g, "_")}`;

    // If account was already classified in the past (e.g. existing user logging in)
    if (matchedAccount && matchedAccount.label) {
      await saveConnectedAccount(
        {
          ...matchedAccount,
          email,
          access_token: tokens.access_token || matchedAccount.access_token,
          refresh_token: tokens.refresh_token || matchedAccount.refresh_token,
          expiry_date: tokens.expiry_date || matchedAccount.expiry_date,
          default_tasklist_id: matchedAccount.default_tasklist_id || "@default",
          last_sync_at: new Date().toISOString(),
          is_connected: true,
        },
        masterUserId
      );

      // Perform background task sync for this account
      try {
        const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });
        const res = await tasksApi.tasks.list({
          tasklist: "@default",
          showCompleted: true,
          showHidden: true,
        });

        const items = res.data.items || [];
        const currentTasks = await getTasksFromDb(masterUserId);

        for (const item of items) {
          if (!item.id || !item.title) continue;
          const cleanTitle = stripGoogleTaskPrefix(item.title);
          const existing = currentTasks.find((t) => t.google_task_id === item.id);

          if (!existing) {
            const isCompleted = item.status === "completed";
            const taskDate = item.updated || item.completed || item.due || new Date().toISOString();
            const dueDate = item.due || taskDate;

            const newTask: Task = {
              id: `gt-imported-${item.id}`,
              user_id: masterUserId,
              raw_input: cleanTitle,
              title: cleanTitle,
              description: item.notes || "",
              account_type: matchedAccount.label,
              item_type: "task",
              category: "Geral",
              tags: ["google-tasks"],
              priority: "P3",
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
              learning_resources: {
                youtube_videos: [],
                search_queries: [],
              },
              met_original_sla: isCompleted ? true : null,
            };
            await saveTaskToDb(newTask, masterUserId);
          }
        }
      } catch (syncErr) {
        console.warn("Auto-sync on login failed:", syncErr);
      }

      const redirectRes = NextResponse.redirect(
        `${baseUrl}/?login_success=true&email=${encodeURIComponent(email)}`
      );
      setSessionCookie(redirectRes, session);
      return redirectRes;
    }

    // 4. If account is NEW or has no label: Save pending auth and prompt categorization modal
    const ticketId = await savePendingAuth({
      userId: masterUserId,
      email,
      accountId,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      updated_at: new Date().toISOString(),
    });

    const redirectRes = NextResponse.redirect(
      `${baseUrl}/?prompt_classify=true&email=${encodeURIComponent(email)}&ticket=${ticketId}&acc_id=${encodeURIComponent(accountId)}`
    );
    setSessionCookie(redirectRes, session);
    return redirectRes;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?oauth_error=token_exchange_failed`);
  }
}
