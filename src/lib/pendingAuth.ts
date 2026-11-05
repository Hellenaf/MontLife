import { getFirestoreDb } from "@/lib/firebaseAdmin";

export interface PendingAuth {
  userId?: string;
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  updated_at: string;
}

let inMemoryPendingAuth: PendingAuth | null = null;

export async function savePendingAuth(data: PendingAuth): Promise<void> {
  inMemoryPendingAuth = data;
  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("pending_auth").doc("current").set(data);
    } catch (err) {
      console.warn("Failed to write pending_auth to Firestore:", err);
    }
  }
}

export async function getPendingAuth(): Promise<PendingAuth | null> {
  const db = getFirestoreDb();
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
  return inMemoryPendingAuth;
}

export async function clearPendingAuth(): Promise<void> {
  inMemoryPendingAuth = null;
  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("pending_auth").doc("current").delete();
    } catch (err) {
      console.warn("Failed to delete pending_auth from Firestore:", err);
    }
  }
}
