import * as admin from "firebase-admin";

export function getFirebaseAdmin() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey || clientEmail.includes("xxx")) {
    return null;
  }

  // Handle escaped newlines
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    return null;
  }
}

export function getFirestoreDb() {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return admin.firestore(app);
}

