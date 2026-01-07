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
import debounce from 'lodash/debounce';
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
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAvailability = debounce(async (val: string) => {
      if (val.toLowerCase() === currentUsername.toLowerCase()) {
        setIsAvailable(null);
        return;
      }
      if (val.length < MIN_USERNAME_LENGTH) {
        setIsAvailable(null);
        return;
      }
      if (!USERNAME_REGEX.test(val)) {
        setIsAvailable(null);
        return;
      }

      setIsCheckingAvailability(true);
      try {
        const available = await api.checkUsernameAvailability(val);
        setIsAvailable(available);
        if (!available) {
          setError('This username is already taken.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Availability check failed', err);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500);

    if (username !== currentUsername) {
      checkAvailability(username);
    } else {
      setIsAvailable(null);
      setError(null);
    }

    return () => checkAvailability.cancel();
  }, [username, currentUsername]);

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

    if (isAvailable === false) {
      setError('This username is already taken.');
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
    !isCheckingAvailability &&
    username.trim().length >= MIN_USERNAME_LENGTH &&
    username.toLowerCase() !== currentUsername.toLowerCase() &&
    isAvailable === true;

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
        <View style={styles.statusContainer}>
          {isCheckingAvailability && (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
          {!isCheckingAvailability && isAvailable !== null && (
            <Text
              style={[
                styles.availabilityText,
                { color: isAvailable ? theme.success : theme.error },
              ]}
            >
              {isAvailable ? 'Username available' : 'Username taken'}
            </Text>
          )}
        </View>
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
  statusContainer: {
    height: 24,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
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
