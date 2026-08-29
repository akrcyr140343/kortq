import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app during hot-reload / on the client instead of re-initializing.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Firestore's default WebChannel transport is silently blocked by many mobile
 * networks, cellular carriers, and corporate/VPN proxies — which makes
 * onSnapshot() hang forever with no error (exactly the "stuck loading" we saw
 * on iPad + phone but not on the PC). Auto-detecting long-polling lets the SDK
 * fall back to plain HTTP long-polling when WebChannel can't connect.
 *
 * initializeFirestore() must run once per app instance; on hot-reload the app
 * is reused and re-initializing throws, so we fall back to getFirestore().
 */
function createDb(): Firestore {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}

export const db: Firestore = createDb();
export { app };
