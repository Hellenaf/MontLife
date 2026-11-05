import { getFirestoreDb } from "@/lib/firebaseAdmin";

export interface PendingAuth {
  ticketId?: string;
  userId?: string;
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  accountId?: string;
  suggestedType?: string;
  updated_at: string;
}

const inMemoryPendingAuthMap = new Map<string, PendingAuth>();
let inMemoryLatestPendingAuth: PendingAuth | null = null;

export async function savePendingAuth(
  data: PendingAuth,
  ticketId?: string
): Promise<string> {
  const actualTicketId =
    ticketId ||
    data.ticketId ||
    `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  data.ticketId = actualTicketId;

  inMemoryPendingAuthMap.set(actualTicketId, data);
  inMemoryLatestPendingAuth = data;

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("pending_auth").doc(actualTicketId).set(data);
      // Also update "current" for backward compatibility
      await db.collection("pending_auth").doc("current").set(data);
    } catch (err) {
      console.warn("Failed to write pending_auth to Firestore:", err);
    }
  }

  return actualTicketId;
}

export async function getPendingAuth(
  ticketId?: string
): Promise<PendingAuth | null> {
  const db = getFirestoreDb();

  // If a specific ticketId is requested
  if (ticketId) {
    if (inMemoryPendingAuthMap.has(ticketId)) {
      return inMemoryPendingAuthMap.get(ticketId)!;
    }
    if (db) {
      try {
        const doc = await db.collection("pending_auth").doc(ticketId).get();
        if (doc.exists) {
          return doc.data() as PendingAuth;
        }
      } catch (err) {
        console.warn("Failed to read pending_auth by ticketId:", err);
      }
    }
  }

  // Fallback to latest in memory or "current" doc
  if (db) {
    try {
      const doc = await db.collection("pending_auth").doc("current").get();
      if (doc.exists) {
        return doc.data() as PendingAuth;
      }
    } catch (err) {
      console.warn("Failed to read pending_auth from Firestore:", err);
    }
  }

  return inMemoryLatestPendingAuth;
}

export async function clearPendingAuth(ticketId?: string): Promise<void> {
  if (ticketId) {
    inMemoryPendingAuthMap.delete(ticketId);
  }
  inMemoryLatestPendingAuth = null;

  const db = getFirestoreDb();
  if (db) {
    try {
      if (ticketId) {
        await db.collection("pending_auth").doc(ticketId).delete();
      }
      await db.collection("pending_auth").doc("current").delete();
    } catch (err) {
      console.warn("Failed to delete pending_auth from Firestore:", err);
    }
  }
}
