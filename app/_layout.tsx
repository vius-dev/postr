import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { realtimeCoordinator } from '@/realtime/RealtimeCoordinator';
import { RealtimeProvider } from '@/realtime/RealtimeContext';
import { useAuthStore } from '@/state/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider } from '@/providers/AuthProvider';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { useLoadAssets } from '@/hooks/useLoadAssets';
import { initSystem, bindUserDatabase } from '@/lib/db/sqlite';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { registerBackgroundFetchAsync } from '@/lib/sync/BackgroundFetch';
import { ToastProvider } from '@/providers/ToastProvider';

function RootLayoutNav() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading, initialize, user } = useAuthStore();
  const isLoadingAssets = useLoadAssets();
  const segments = useSegments();
  const router = useRouter();

  // Phase 0/1: System Initialization & Auth Bootstrap
  // This happens once on app launch
  useEffect(() => {
    const boot = async () => {
      try {
        await initSystem(); // Ensure DB DDL is ready (Phase 0/1)
        await initialize(); // Check auth state
      } catch (e) {
        console.error('[Layout] Boot failed', e);
      }
    };
    boot();
  }, []);

  // Phase 2: User Initialization & Sync/Realtime
  // This happens only when we have a confirmed user
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const setupUser = async () => {
      try {
        console.log('[Layout] Setting up user environment for:', user.id);
        await bindUserDatabase(user.id); // Bind DB to user (Phase 2)

        // Initialize user-scoped systems
        // The order matters: DB Scope -> Sync Engine -> Realtime
        await SyncEngine.init();
        realtimeCoordinator.initialize();

        registerBackgroundFetchAsync().catch((e) =>
          console.warn('[Layout] Background fetch registration failed', e)
        );
      } catch (e) {
        console.error('[Layout] User setup failed', e);
      }
    };
    setupUser();

    return () => {
      console.log('[Layout] Tearing down user environment');
      realtimeCoordinator.shutdown();
      // SyncEngine cleanup should ideally happen here too
    };
  }, [isAuthenticated, user?.id]);

  // Phase 3: Auth Redirection
  useEffect(() => {
    if (isAuthLoading || isLoadingAssets) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/');
    }
  }, [isAuthenticated, segments, isAuthLoading, isLoadingAssets]);

  // Show loading screen while determining auth state or loading assets
  if (isAuthLoading || isLoadingAssets) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <AuthProvider>
      <RealtimeProvider>
        <SafeAreaProvider>
          <ToastProvider>
            {!isAuthenticated ? (
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: theme.background,
                  },
                  headerTintColor: theme.textPrimary,
                }}
              >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack>
            ) : (
              <ResponsiveLayout>
                <Stack
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: theme.background,
                    },
                    headerTintColor: theme.textPrimary,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(profile)" options={{ headerShown: false }} />
                  <Stack.Screen name="(settings)" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)/new-message" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)/new-dm" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)/create-group" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)/create-channel" options={{ headerShown: false }} />
                  <Stack.Screen name="(modals)/poll" options={{ headerShown: false, presentation: 'modal' }} />
                  <Stack.Screen name="(modals)/quote" options={{ headerShown: false, presentation: 'modal' }} />
                  <Stack.Screen name="conversation/[id]/index" options={{ headerShown: false }} />
                  <Stack.Screen name="conversation/[id]/info" options={{ headerShown: false }} />
                  <Stack.Screen name="explore/settings" options={{ headerShown: false }} />
                  <Stack.Screen name="notifications/settings" options={{ headerShown: false }} />
                  <Stack.Screen name="messages/settings" options={{ headerShown: false }} />
                  <Stack.Screen name="(feed)/post" options={{ title: 'Post' }} />
                  <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="lists/index" options={{ headerShown: false }} />
                  <Stack.Screen name="lists/[id]/index" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(modals)/create-list"
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen
                    name="(compose)/compose"
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                </Stack>
              </ResponsiveLayout>
            )}
          </ToastProvider>
        </SafeAreaProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
