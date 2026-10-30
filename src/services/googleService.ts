import { google } from "googleapis";
import { AccountType, Task, YouTubeVideo, LearningResources } from "@/types";
import { formatGoogleTaskTitle } from "@/lib/sla";

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(accountType: AccountType) {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: accountType,
  });
}

/**
 * Searches YouTube Data API v3 for relevant tutorials and study resources.
 */
export async function fetchYouTubeResources(queries: string[]): Promise<LearningResources> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const videos: YouTubeVideo[] = [];

  if (apiKey && apiKey !== "sua_api_key_do_google_cloud") {
    try {
      const youtube = google.youtube({ version: "v3", auth: apiKey });

      for (const q of queries.slice(0, 2)) {
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
      console.warn("YouTube API call failed or quota exceeded. Using curated fallback:", err);
    }
  }

  // Fallback if no API key or no results returned
  if (videos.length === 0) {
    for (const q of queries.slice(0, 2)) {
      videos.push({
        title: `Guia & Melhores Práticas: ${q}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
        channel: "Mont Ops Wiki Curada",
      });
    }
  }

  return {
    youtube_videos: videos,
    search_queries: queries,
  };
}

/**
 * Syncs a Mont Ops task to Google Tasks
 */
export async function syncTaskToGoogle(
  task: Task,
  tokens?: { access_token?: string; refresh_token?: string }
): Promise<string | null> {
  if (!tokens?.refresh_token && !tokens?.access_token) {
    // Return simulated Google Task ID for UI testing
    return task.google_task_id || `gt-sim-${Date.now()}`;
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });

    const titleWithPrefix = formatGoogleTaskTitle(task.title, task.status);
    const notes = `${task.description}\n\n[Mont Ops | ${task.category} | Prioridade: ${task.priority}]`;

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

