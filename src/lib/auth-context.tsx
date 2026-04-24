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
      // Allow testing by injecting a mock user in DEV mode if no one is logged in
      if (!firebaseUser && import.meta.env.DEV) {
        const mockUid = 'mock-admin-user';
        const mockUser = {
          uid: mockUid,
          email: 'mock-admin@example.com',
          displayName: 'Mock Admin User',
          photoURL: ''
        } as User;

        setUser(mockUser);
        setProfile({
          id: mockUid,
          email: mockUser.email,
          name: mockUser.displayName,
          image: mockUser.photoURL,
          coins: 1000,
          role: 'ADMIN',
          status: 'ACTIVE',
          stats: { wins: 0, losses: 0, pushes: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setChain({
          id: mockUid + '_current',
          userId: mockUid,
          active: true,
          chain: 0,
          wins: 0,
          losses: 0,
          best: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Very important: don't subscribe to firestore for the mock user
        // otherwise it will crash with permission errors if no actual credentials are provided
        setLoading(false);
      } else {
        setUser(firebaseUser);

        if (!firebaseUser) {
          setProfile(null);
          setChain(null);
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.uid === 'mock-admin-user') return;

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
