
import { api } from '@/lib/api';
import { useAuthStore } from '@/state/auth';
import { User } from '@/types/user';
import React, { createContext, useContext, useEffect, useState } from 'react';


interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, user: initialUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    const fetchUser = async () => {
      if (session) {
        setLoading(true);
        try {
          const userId = session.user.id;

          // Auto-provision profile if needed (Simulate Supabase Trigger)
          await api.ensureProfileExists(session.user);

          // Fetch real user profile from Supabase
          const res = await api.fetchUser(userId);

          setUser(res || null);
        } catch (error) {
          console.error('[AuthProvider] Failed to hydrate user:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    fetchUser();
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
