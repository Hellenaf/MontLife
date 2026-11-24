import { getFirestoreDb } from "@/lib/firebaseAdmin";
import {
  sanitizeForFirestore,
  isHellenUser,
  HELLEN_MASTER_ID,
} from "@/services/taskService";
import { Note } from "@/types";

let memoryNotes: Note[] = [];

function resolveTargetUserId(userId: string): string {
  return isHellenUser(userId) ? HELLEN_MASTER_ID : userId;
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const pinnedDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinnedDiff !== 0) return pinnedDiff;
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    return dateB - dateA;
  });
}

function isLocalDevWithoutGcpCreds(err: unknown): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Could not load the default credentials") ||
    msg.includes("Unable to detect a Project Id")
  );
}

/**
 * Lists all notes belonging to the authenticated master user from Firestore,
 * avoiding composite index queries by sorting pinned & updated_at in memory.
 */
export async function getNotesFromDb(userId: string): Promise<Note[]> {
  if (!userId) return [];
  const targetUserId = resolveTargetUserId(userId);
  const db = getFirestoreDb();

  if (!db) {
    return sortNotes(
      memoryNotes.filter(
        (n) => n.owner_uid === targetUserId || n.user_id === targetUserId
      )
    );
  }

  try {
    const snap = await db
      .collection("notes")
      .where("owner_uid", "==", targetUserId)
      .get();

    const notes: Note[] = snap.docs.map((doc) => doc.data() as Note);

    // Merge into in-memory fallback cache for consistency
    const map = new Map<string, Note>();
    for (const n of memoryNotes) {
      if (n.owner_uid !== targetUserId && n.user_id !== targetUserId) {
        map.set(n.id, n);
      }
    }
    for (const n of notes) {
      map.set(n.id, n);
    }
    memoryNotes = Array.from(map.values());

    return sortNotes(notes);
  } catch (err) {
    if (isLocalDevWithoutGcpCreds(err)) {
      return sortNotes(
        memoryNotes.filter(
          (n) => n.owner_uid === targetUserId || n.user_id === targetUserId
        )
      );
    }
    console.error("Failed to fetch notes from Firestore:", err);
    return sortNotes(
      memoryNotes.filter(
        (n) => n.owner_uid === targetUserId || n.user_id === targetUserId
      )
    );
  }
}

/**
 * Persists a note document into Firestore and keeps the in-memory fallback synchronized.
 */
export async function saveNoteToDb(note: Note, userId: string): Promise<Note> {
  if (!userId) {
    throw new Error("Usuário não autenticado para salvar anotação.");
  }
  const targetUserId = resolveTargetUserId(userId);
  const cleanNote = sanitizeForFirestore<Note>({
    ...note,
    owner_uid: targetUserId,
    user_id: targetUserId,
  });

  const existingIdx = memoryNotes.findIndex((n) => n.id === cleanNote.id);
  if (existingIdx >= 0) {
    memoryNotes[existingIdx] = cleanNote;
  } else {
    memoryNotes = [cleanNote, ...memoryNotes];
  }

  const db = getFirestoreDb();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Banco de dados Firestore indisponível no momento.");
    }
    return cleanNote;
  }

  try {
    await db.collection("notes").doc(cleanNote.id).set(cleanNote, { merge: true });
    return cleanNote;
  } catch (err) {
    if (isLocalDevWithoutGcpCreds(err)) {
      return cleanNote;
    }
    console.error("Firestore write failed in saveNoteToDb:", err);
    throw err;
  }
}

/**
 * Deletes a note owned by the authenticated user from Firestore and memory cache.
 */
export async function deleteNoteFromDb(noteId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const targetUserId = resolveTargetUserId(userId);

  const memMatch = memoryNotes.find((n) => n.id === noteId);
  if (
    memMatch &&
    memMatch.owner_uid &&
    memMatch.owner_uid !== targetUserId &&
    memMatch.user_id !== targetUserId
  ) {
    return false;
  }
  memoryNotes = memoryNotes.filter((n) => n.id !== noteId);

  const db = getFirestoreDb();
  if (!db) return true;

  try {
    const docRef = db.collection("notes").doc(noteId);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data() as Note;
      if (
        data.owner_uid &&
        data.owner_uid !== targetUserId &&
        data.user_id !== targetUserId
      ) {
        console.warn(`Unauthorized delete attempt on note ${noteId} by user ${userId}`);
        return false;
      }
      await docRef.delete();
    }
    return true;
  } catch (err) {
    if (isLocalDevWithoutGcpCreds(err)) {
      return true;
    }
    console.warn("Firestore delete failed in deleteNoteFromDb:", err);
    return true;
  }
}

