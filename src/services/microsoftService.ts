import { Task } from "@/types";

export interface RawMicrosoftTodoItem {
  id: string;
  title: string;
  body?: { content?: string };
  status: "notStarted" | "inProgress" | "completed";
  createdDateTime: string;
  dueDateTime?: { dateTime: string; timeZone: string };
  completedDateTime?: { dateTime: string };
  listName: string;
}

export function getMicrosoftAuthUrl(baseUrl: string): string | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  const redirectUri = `${baseUrl}/api/microsoft/callback`;
  const scopes = encodeURIComponent("offline_access Tasks.Read Tasks.ReadWrite User.Read");

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_mode=query&scope=${scopes}&state=samsung_reminder`;
}

export async function exchangeMicrosoftCode(
  code: string,
  baseUrl: string
): Promise<{ access_token?: string; refresh_token?: string; email?: string } | null> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const redirectUri = `${baseUrl}/api/microsoft/callback`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error("Microsoft token exchange error:", await res.text());
    return null;
  }

  const data = await res.json();

  // Get user profile email
  let email = "samsung-reminder@microsoft.com";
  try {
    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.mail || userData.userPrincipalName || email;
    }
  } catch (err) {
    console.warn("Failed to get Microsoft user profile:", err);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    email,
  };
}

export async function fetchMicrosoftTodoTasks(
  accessToken: string
): Promise<RawMicrosoftTodoItem[]> {
  const allTasks: RawMicrosoftTodoItem[] = [];

  try {
    // 1. Get all task lists
    const listsRes = await fetch("https://graph.microsoft.com/v1.0/me/todo/lists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listsRes.ok) return [];

    const listsData = await listsRes.json();
    const lists: Array<{ id: string; displayName: string }> = listsData.value || [];

    for (const list of lists) {
      const tasksRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks?$top=100`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!tasksRes.ok) continue;

      const tasksData = await tasksRes.json();
      const items: any[] = tasksData.value || [];

      for (const item of items) {
        allTasks.push({
          id: item.id,
          title: item.title,
          body: item.body,
          status: item.status,
          createdDateTime: item.createdDateTime,
          dueDateTime: item.dueDateTime,
          completedDateTime: item.completedDateTime,
          listName: list.displayName,
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch Microsoft To Do / Samsung Reminder tasks:", err);
  }

  return allTasks;
}
