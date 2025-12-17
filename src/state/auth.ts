
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
    console.log('Auth store setSession called with:', session);
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
    console.log('Auth store initialize called');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Initialize got session:', session);
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    });
  },
}));

console.log('Setting up onAuthStateChange listener');
supabase.auth.onAuthStateChange((_event: any, session: any) => {
  console.log('onAuthStateChange triggered:', { _event, session });
  useAuthStore.getState().setSession(session);
});
