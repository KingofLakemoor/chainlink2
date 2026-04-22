import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// In Cloud Run, applicationDefault() will pick up the compute identity.
// For local preview, if the user hasn't set GOOGLE_APPLICATION_CREDENTIALS, it might fail,
// but we will try.
if (!getApps().length) {
  try {
    initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized with default credentials");
  } catch (e) {
    console.error("Failed to initialize Firebase Admin with default credentials", e);
    // Fallback if needed, though without secrets it can't be admin local
  }
}

export const adminDb = getApps().length ? getFirestore(undefined, firebaseConfig.firestoreDatabaseId) : null;
export const adminAuth = getApps().length ? getAuth() : null;
