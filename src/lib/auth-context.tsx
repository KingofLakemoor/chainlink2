import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, handleAuthRedirect } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  chain: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, chain: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [chain, setChain] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process redirect result if coming back from Google login
    handleAuthRedirect().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setChain(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (document) => {
      if (document.exists()) {
        const data = document.data();

        const mergedProfile = { id: document.id, ...data };
        setProfile(mergedProfile);
      }
      setLoading(false);
    });

    // Listen to current chain
    const unsubChain = onSnapshot(doc(db, 'chains', user.uid + '_current'), (doc) => {
      if (doc.exists()) {
        setChain({ id: doc.id, ...doc.data() });
      }
    });

    return () => {
      unsubProfile();
      unsubChain();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, chain, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
