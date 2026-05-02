import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const initJson = await res.json();
        dynamicConfig = { ...dynamicConfig, ...initJson };
      }
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

const ensureUserProfile = async (user: User, username?: string) => {
  // Check if user exists, if not create default profile
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      name: user.displayName || 'Anonymous',
      username: username || 'User' + Math.floor(Math.random() * 1000000),
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
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    console.log('Mock login triggered (no valid API key in dev mode)');
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user);
    }
  } catch (error: any) {
    console.error('Email login failed', error);
    throw error;
  }
};

export const signupWithEmail = async (email: string, pass: string, username: string) => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    console.log('Mock login triggered (no valid API key in dev mode)');
    window.dispatchEvent(new CustomEvent('mock-login', { detail: { email, username } }));
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user, username);
    }
  } catch (error: any) {
    console.error('Email signup failed', error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    console.log('Mock login triggered (no valid API key in dev mode)');
    window.dispatchEvent(new Event('mock-login'));
    return;
  }
  try {
    const userCredential = await signInWithPopup(auth, provider);
    if (userCredential && userCredential.user) {
      await ensureUserProfile(userCredential.user);
    }
  } catch (error: any) {
    console.warn('Popup login failed, falling back to redirect', error);
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError: any) {
      console.error('Redirect login failed', redirectError);
      throw redirectError;
    }
  }
};

export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      await ensureUserProfile(user);
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
