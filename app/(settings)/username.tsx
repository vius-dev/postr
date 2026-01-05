import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme/theme';
import { useAuthStore } from '@/state/auth';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

const MIN_USERNAME_LENGTH = 4;
const MAX_USERNAME_LENGTH = 15;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export default function UsernameScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const setSession = useAuthStore(state => state.setSession);

  const currentUsername = user?.user_metadata?.username ?? '';
  const [username, setUsername] = useState(currentUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLocalUser = async () => {
      if (user?.id) {
        try {
          const { getDb } = require('@/lib/db/sqlite');
          const db = await getDb();
          const localUser: any = await db.getFirstAsync(
            'SELECT username FROM users WHERE id = ?',
            [user.id]
          );
          if (localUser && localUser.username) {
            setUsername(localUser.username);
          } else if (currentUsername) {
            setUsername(currentUsername);
          }
        } catch (e) {
          console.warn('Failed to load local username', e);
          if (currentUsername) setUsername(currentUsername);
        }
      }
    };
    loadLocalUser();
  }, [user?.id, currentUsername]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    const normalized = username.trim();

    // 1. No change
    if (normalized.toLowerCase() === currentUsername.toLowerCase()) {
      setIsLoading(false);
      router.back();
      return;
    }

    // 2. Validation
    if (normalized.length < MIN_USERNAME_LENGTH) {
      setError(`Username must be at least ${MIN_USERNAME_LENGTH} characters.`);
      setIsLoading(false);
      return;
    }

    if (normalized.length > MAX_USERNAME_LENGTH) {
      setError(`Username cannot exceed ${MAX_USERNAME_LENGTH} characters.`);
      setIsLoading(false);
      return;
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setError('Username can only contain letters, numbers, and underscores.');
      setIsLoading(false);
      return;
    }

    try {
      // 3. Single atomic update (DB enforces uniqueness)
      await api.updateProfile({ username: normalized });

      // 4. Update local auth state
      if (user && session) {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            username: normalized,
          },
        };

        setSession({
          ...session,
          user: updatedUser,
        });
      }

      Alert.alert('Success', 'Your username has been updated.');
      router.back();
    } catch (e: any) {
      /**
       * Postgres unique violation = 23505
       * Supabase may surface this as:
       * - e.code
       * - e.error?.code
       */
      const code = e?.code || e?.error?.code;

      if (code === '23505') {
        setError('This username is already taken.');
      } else {
        setError(e?.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSave =
    !isLoading &&
    username.trim().length > 0 &&
    username.toLowerCase() !== currentUsername.toLowerCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
        Your current username is @{currentUsername}. You can change it below.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Choose a new username"
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              backgroundColor: theme.surface,
              borderColor: error ? theme.error : theme.border,
            },
          ]}
        />
        {error && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={[
          styles.saveButton,
          {
            backgroundColor: canSave ? theme.primary : theme.surface,
            opacity: canSave ? 1 : 0.5,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.textInverse} />
        ) : (
          <Text
            style={[
              styles.saveButtonText,
              {
                color: canSave
                  ? theme.textInverse
                  : theme.textTertiary,
              },
            ]}
          >
            Save
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  infoText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 14,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
