
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { realtimeCoordinator } from '@/realtime/RealtimeCoordinator';
import { RealtimeProvider } from '@/realtime/RealtimeContext';
import { useAuthStore } from '@/state/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider } from '@/providers/AuthProvider';


export default function AppLayout() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  // Initialize auth session on mount
  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    realtimeCoordinator.initialize();

    return () => {
      realtimeCoordinator.shutdown();
    };
  }, []);

  // Show loading screen while determining auth state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  /*
  // Redirect based on auth state - render only auth routes
  if (!isAuthenticated) {
    return (
      <RealtimeProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.background,
              },
              headerTintColor: theme.text,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </RealtimeProvider>
    );
  }
  */

  return (
    <AuthProvider>
      <RealtimeProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.background,
              },
              headerTintColor: theme.text,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(profile)" options={{ headerShown: false }} />
            <Stack.Screen name="(feed)/post" options={{ title: 'Post' }} />
            <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
            <Stack.Screen
              name="(compose)/compose"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
