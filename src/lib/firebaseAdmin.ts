import * as admin from "firebase-admin";

export function getFirebaseAdmin() {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    "montlife-8317b";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 1. Try explicit service account credentials (local or custom)
  if (clientEmail && privateKey && !clientEmail.includes("xxx")) {
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
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
      console.warn("Explicit service account cert failed, attempting Application Default Credentials:", error);
    }
  }

  // 2. Fallback to Google Cloud Application Default Credentials (ADC)
  // This automatically authenticates natively on Firebase App Hosting / Cloud Run without needing any private key!
  try {
    return admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    return null;
  }
}

export function getFirestoreDb() {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return admin.firestore(app);
}
