/**
 * MontLife Offline Queue Manager
 * Persists pending mutations in localStorage when the user is disconnected,
 * and automatically replays them to the server when network connectivity is restored.
 */

export type OfflineActionType =
  | "CREATE_TASK"
  | "UPDATE_STATUS"
  | "UPDATE_FIELDS"
  | "EXTEND_DEADLINE"
  | "DELETE_TASK";

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = "montlife_offline_queue_v1";

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Could not read offline queue:", err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to save offline queue:", err);
  }
}

export function enqueueOfflineAction(type: OfflineActionType, payload: any): OfflineQueueItem {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(newItem);
  saveOfflineQueue(queue);
  return newItem;
}

export function removeOfflineQueueItem(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {}
}

/**
 * Replays all queued actions to the server sequentially when online.
 * Returns the number of successfully synced actions.
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      let success = false;

      if (item.type === "CREATE_TASK") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        const data = await res.json();
        success = res.ok && data.success;
      } else if (item.type === "UPDATE_STATUS") {
        const res = await fetch(`/api/tasks/${item.payload.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_status",
            status: item.payload.status,
            resolution_notes: item.payload.resolution_notes,
            cancel_reason: item.payload.cancel_reason,
            resolution_attachments: item.payload.resolution_attachments,
          }),
        });
        const data = await res.json();
        success = res.ok && data.success;
      } else if (item.type === "UPDATE_FIELDS") {
        const res = await fetch(`/api/tasks/${item.payload.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_fields",
            fields: item.payload.fields,
          }),
        });
        const data = await res.json();
        success = res.ok && data.success;
      } else if (item.type === "EXTEND_DEADLINE") {
        const res = await fetch(`/api/tasks/${item.payload.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "extend_deadline",
            new_due_date: item.payload.new_due_date,
            reason: item.payload.reason,
          }),
        });
        const data = await res.json();
        success = res.ok && data.success;
      } else if (item.type === "DELETE_TASK") {
        const res = await fetch(`/api/tasks/${item.payload.taskId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        success = res.ok && data.success;
      }

      if (success) {
        synced++;
      } else {
        item.retries += 1;
        if (item.retries < 5) {
          remaining.push(item);
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.warn("Failed to sync offline item:", item, err);
      item.retries += 1;
      if (item.retries < 5) {
        remaining.push(item);
      } else {
        failed++;
      }
    }
  }

  saveOfflineQueue(remaining);
  return { synced, failed };
}

