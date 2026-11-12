import { google } from "googleapis";
import { AccountType, Task, YouTubeVideo, WebArticleResource, LearningResources } from "@/types";
import { formatGoogleTaskTitle } from "@/lib/sla";

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string = "ask", prompt: string = "select_account consent") {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt,
    state,
  });
}

export interface RawGoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: string; // 'completed' | 'needsAction'
  updated?: string;
  completed?: string;
  due?: string;
  taskListId: string;
  taskListName: string;
}

/**
 * Fetches all Google Tasks across ALL user's tasklists with full pagination (from 2024 to today).
 */
export async function fetchAllGoogleTasksFromAccount(tokens: {
  access_token?: string;
  refresh_token?: string;
}): Promise<RawGoogleTaskItem[]> {
  if (!tokens?.refresh_token && !tokens?.access_token) {
    return [];
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });

  // 1. Fetch all user's task lists
  let taskLists: { id: string; title: string }[] = [];
  try {
    const listsRes = await tasksApi.tasklists.list({ maxResults: 100 });
    if (listsRes.data.items && listsRes.data.items.length > 0) {
      taskLists = listsRes.data.items.map((l) => ({
        id: l.id || "@default",
        title: l.title || "Principal",
      }));
    }
  } catch (err) {
    console.warn("Could not list all tasklists, falling back to @default:", err);
  }

  if (taskLists.length === 0) {
    taskLists = [{ id: "@default", title: "Principal" }];
  }

  const allItems: RawGoogleTaskItem[] = [];
  const seenIds = new Set<string>();

  // 2. Paginate through each list (from 2024 to present)
  for (const list of taskLists) {
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 50; // supports up to 5,000 tasks per list

    do {
      try {
        const res: any = await tasksApi.tasks.list({
          tasklist: list.id,
          showCompleted: true,
          showHidden: true,
          showDeleted: false,
          maxResults: 100,
          pageToken,
        });

        const items = res.data.items || [];
        for (const item of items) {
          if (!item.id || !item.title) continue;
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          allItems.push({
            id: item.id,
            title: item.title,
            notes: item.notes || "",
            status: item.status || "needsAction",
            updated: item.updated || undefined,
            completed: item.completed || undefined,
            due: item.due || undefined,
            taskListId: list.id,
            taskListName: list.title,
          });
        }

        pageToken = res.data.nextPageToken || undefined;
        pageCount++;
      } catch (pageErr) {
        console.warn(`Error fetching tasks page for list ${list.id}:`, pageErr);
        break;
      }
    } while (pageToken && pageCount < MAX_PAGES);
  }

  return allItems;
}

export interface RawGoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO string
  end?: string;
  status: string;
  htmlLink?: string;
  location?: string;
}

/**
 * Fetches Google Calendar events from the user's primary calendar.
 */
export async function fetchAllGoogleCalendarEvents(tokens: {
  access_token?: string;
  refresh_token?: string;
}): Promise<RawGoogleCalendarEvent[]> {
  if (!tokens?.refresh_token && !tokens?.access_token) {
    return [];
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

    // Window: 2 months in the past to 6 months in the future
    const past = new Date();
    past.setMonth(past.getMonth() - 2);
    const future = new Date();
    future.setMonth(future.getMonth() + 6);

    const res = await calendarApi.events.list({
      calendarId: "primary",
      timeMin: past.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const items = res.data.items || [];
    const events: RawGoogleCalendarEvent[] = [];

    for (const item of items) {
      if (!item.id || !item.summary) continue;
      const start = item.start?.dateTime || item.start?.date;
      if (!start) continue;

      events.push({
        id: item.id,
        summary: item.summary,
        description: item.description || "",
        start,
        end: (item.end?.dateTime || item.end?.date) ?? undefined,
        status: item.status || "confirmed",
        htmlLink: item.htmlLink || undefined,
        location: item.location || undefined,
      });
    }

    return events;
  } catch (err) {
    console.warn("Failed to fetch Google Calendar events:", err);
    return [];
  }
}

/**
 * Searches YouTube Data API v3 for relevant tutorials and study resources.
 */
export async function fetchYouTubeResources(queries: string[]): Promise<LearningResources> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  const videos: YouTubeVideo[] = [];

  if (apiKey && apiKey !== "sua_api_key_do_google_cloud" && apiKey.length > 10) {
    try {
      const youtube = google.youtube({ version: "v3", auth: apiKey });

      for (const q of queries.slice(0, 2)) {
        if (!q.trim()) continue;
        const res = await youtube.search.list({
          part: ["snippet"],
          q,
          type: ["video"],
          maxResults: 1,
          relevanceLanguage: "pt",
        });

        const item = res.data.items?.[0];
        if (item && item.id?.videoId && item.snippet) {
          videos.push({
            title: item.snippet.title || q,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail:
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url ||
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
            channel: item.snippet.channelTitle || "YouTube",
          });
        }
      }
    } catch (err) {
      console.warn("YouTube API call failed or quota exceeded:", err);
    }
  }

  // Curated fallbacks if needed
  if (videos.length === 0) {
    for (const q of queries.slice(0, 2)) {
      if (!q.trim()) continue;
      videos.push({
        title: `Tutorial & Guia: ${q}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
        channel: "YouTube",
      });
    }
  }

  // Curated technical articles and reference sites
  const articles: WebArticleResource[] = [];
  for (const q of queries.slice(0, 3)) {
    if (!q.trim()) continue;
    articles.push({
      title: `Artigos & Documentações Técnicas: ${q}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q + " artigo tutorial documentacao")}`,
      source: "Artigos & Web",
      snippet: `Compilado de documentações oficiais, posts de engenharia e artigos técnicos focados em ${q}.`,
    });
    articles.push({
      title: `Soluções & Casos no Stack Overflow: ${q}`,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
      source: "Stack Overflow",
      snippet: `Discussões técnicas, soluções de erros e casos práticos validados pela comunidade sobre ${q}.`,
    });
    articles.push({
      title: `Guias Práticos da Comunidade (Dev.to / Medium): ${q}`,
      url: `https://dev.to/search?q=${encodeURIComponent(q)}`,
      source: "Dev.to / Artigos",
      snippet: `Artigos práticos, tutoriais de ponta a ponta e melhores práticas sobre ${q}.`,
    });
  }

  return {
    youtube_videos: videos,
    articles,
    search_queries: queries.filter((q) => q.trim().length > 0),
  };
}

/**
 * Syncs a MontLife task to Google Tasks
 */
export async function syncTaskToGoogle(
  task: Task,
  tokens?: { access_token?: string; refresh_token?: string }
): Promise<string | null> {
  if (!tokens?.refresh_token && !tokens?.access_token) {
    return task.google_task_id || null;
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });

    const titleWithPrefix = formatGoogleTaskTitle(task.title, task.status);
    const notes = `${task.description}\n\n[MontLife | ${task.category} | Prioridade: ${task.priority}]`;

    if (task.status === "CANCELED") {
      if (task.google_task_id) {
        await tasksApi.tasks.delete({
          tasklist: "@default",
          task: task.google_task_id,
        });
      }
      return null;
    }

    if (task.google_task_id) {
      const updated = await tasksApi.tasks.patch({
        tasklist: "@default",
        task: task.google_task_id,
        requestBody: {
          title: titleWithPrefix,
          notes,
          status: task.status === "COMPLETED" ? "completed" : "needsAction",
          due: task.current_due_date,
        },
      });
      return updated.data.id || task.google_task_id;
    } else {
      const created = await tasksApi.tasks.insert({
        tasklist: "@default",
        requestBody: {
          title: titleWithPrefix,
          notes,
          status: task.status === "COMPLETED" ? "completed" : "needsAction",
          due: task.current_due_date,
        },
      });
      return created.data.id || null;
    }
  } catch (err) {
    console.error("Failed to sync with Google Tasks API:", err);
    return task.google_task_id;
  }
}

/**
 * Unidirectional sync: pushes a MontLife task/event TO Google Calendar
 * Does NOT pull external Google Calendar events into MontLife.
 */
export async function syncTaskToGoogleCalendar(
  task: Task,
  tokens?: { access_token?: string; refresh_token?: string }
): Promise<string | null> {
  if (!tokens?.refresh_token && !tokens?.access_token) {
    return task.google_calendar_event_id || null;
  }

  const startRef = task.scheduled_start || task.current_due_date;
  if (!startRef) {
    return task.google_calendar_event_id || null;
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });

    const startDate = new Date(startRef);
    if (isNaN(startDate.getTime())) return null;

    const explicitEnd = task.scheduled_end ? new Date(task.scheduled_end) : null;
    const endDate =
      explicitEnd && !isNaN(explicitEnd.getTime()) && explicitEnd.getTime() > startDate.getTime()
        ? explicitEnd
        : new Date(startDate.getTime() + 60 * 60 * 1000);

    const remindersConfig =
      task.reminder_enabled === false
        ? { useDefault: false, overrides: [] }
        : task.reminder_enabled === true
        ? {
            useDefault: false,
            overrides: [
              {
                method: "popup",
                minutes:
                  typeof task.reminder_minutes_before === "number" &&
                  task.reminder_minutes_before >= 0
                    ? Math.min(40320, Math.round(task.reminder_minutes_before))
                    : 30,
              },
            ],
          }
        : undefined;

    const eventResource: Record<string, any> = {
      summary: `[MontLife] ${task.title}`,
      description: `${task.description || ""}\n\nCategoria: ${task.category}\nPrioridade: ${task.priority}\nStatus: ${task.status}`,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      ...(remindersConfig ? { reminders: remindersConfig } : {}),
    };

    if (task.status === "CANCELED") {
      if (task.google_calendar_event_id) {
        await calendarApi.events.delete({
          calendarId: "primary",
          eventId: task.google_calendar_event_id,
        }).catch(() => { });
      }
      return null;
    }

    if (task.google_calendar_event_id) {
      const res = await calendarApi.events.patch({
        calendarId: "primary",
        eventId: task.google_calendar_event_id,
        requestBody: eventResource,
      });
      return res.data.id || task.google_calendar_event_id;
    } else {
      const res = await calendarApi.events.insert({
        calendarId: "primary",
        requestBody: eventResource,
      });
      return res.data.id || null;
    }
  } catch (err) {
    console.error("Failed to push task to Google Calendar:", err);
    return task.google_calendar_event_id || null;
  }
}
