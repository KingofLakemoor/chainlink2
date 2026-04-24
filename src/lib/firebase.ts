import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;

export const initFirebase = async () => {
  let dynamicConfig: any = { ...firebaseConfig };
  try {
    const res = await fetch('/__/firebase/init.json');
    if (res.ok) {
      const initJson = await res.json();
      dynamicConfig = { ...dynamicConfig, ...initJson };
    }
  } catch (e) {
    console.warn('Could not fetch dynamic firebase init config, using local environment variables.');
  }

  const finalConfig = {
    ...dynamicConfig,
    apiKey: (dynamicConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '').trim()
  };

  app = initializeApp(finalConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
};

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    console.log('Mock login triggered (no valid API key in dev mode)');
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error('Login failed', error);
    throw error;
  }
};

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;

      // Check if user exists, if not create default profile
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName || 'Anonymous',
          image: user.photoURL || '',
          coins: 100, // starting coins
          role: 'USER', // Defaulting to USER for security
          status: 'ACTIVE',
          stats: { wins: 0, losses: 0, pushes: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Initialize an empty chain for them
        const chainRef = doc(db, 'chains', user.uid + '_current');
        await setDoc(chainRef, {
          userId: user.uid,
          active: true,
          chain: 0,
          wins: 0,
          losses: 0,
          best: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result', error);
    throw error;
  }
};

export const logout = () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    console.log('Mock logout triggered');
    window.dispatchEvent(new Event('mock-logout'));
    return;
  }
  return signOut(auth);
};
