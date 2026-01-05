
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { wipeUserData } from '@/lib/db/sqlite';
import { realtimeCoordinator } from '@/realtime/RealtimeCoordinator';

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

export const useAuthStore = create<AuthState>((set, get) => ({
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
    try {
      // 1. Stop active systems
      realtimeCoordinator.shutdown();
      // SyncEngine.cancel(); // TODO: Implement cancel in SyncEngine refactor

      // 2. Wipe local data
      const { user } = get();
      if (user?.id) {
        try {
          await wipeUserData(user.id);
        } catch (e) {
          console.error('[Auth] Failed to wipe user data during logout', e);
        }
      }
    } catch (e) {
      console.error('[Auth] Teardown failed', e);
    }

    // 3. Sign out remotely
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

/**
 * Standardized helper to check if a user ID belongs to the currently authenticated user.
 */
export const isSelf = (userId: string): boolean => {
  const currentUser = useAuthStore.getState().user;
  return !!currentUser && currentUser.id === userId;
};


supabase.auth.onAuthStateChange((_event: any, session: any) => {
  useAuthStore.getState().setSession(session);
});
