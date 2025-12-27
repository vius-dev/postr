
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: any | null;
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading
  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false });
  },
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      set({
        session,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));


supabase.auth.onAuthStateChange((_event: any, session: any) => {
  useAuthStore.getState().setSession(session);
});
