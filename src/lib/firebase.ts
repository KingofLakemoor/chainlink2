import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const config = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || ''
};

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
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
  } catch (error) {
    console.error('Login failed', error);
    throw error;
  }
};

export const logout = () => signOut(auth);
