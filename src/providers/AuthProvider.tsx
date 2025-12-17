
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
  const { session } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (session) {
        setLoading(true);
        const res = await api.fetchUser(session.user.id);
        if (res) {
          setUser(res);
        }
        setLoading(false);
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
