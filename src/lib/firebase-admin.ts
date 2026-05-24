import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App | undefined;

function initAdminApp(): App | undefined {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (privateKey?.startsWith('"') && privateKey?.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  if (!projectId || !clientEmail || !privateKey || privateKey.includes("YOUR_KEY")) {
    console.warn("Firebase Admin SDK tidak dikonfigurasi. API routes yang memerlukan admin akan error.");
    return undefined;
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase Admin:", error);
    return undefined;
  }
}

app = initAdminApp();

export const adminDb = app ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>);
export const adminAuth = app ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>);
export { app };
