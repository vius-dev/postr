
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/theme';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthStore } from '@/state/auth';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

export default function PhoneScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const setSession = useAuthStore(state => state.setSession);

  const currentPhone = user?.phone ?? '';
  const [phone, setPhone] = useState(currentPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    const normalized = phone.trim();

    if (normalized === currentPhone) {
      router.back();
      return;
    }

    try {
      await api.updateProfile({ phone: normalized });

      if (user && session) {
        const updatedUser = { ...user, phone: normalized };
        setSession({ ...session, user: updatedUser });
      }

      showSuccess('Your phone number has been updated!');
      router.back();
    } catch (e: any) {
      setError(e?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSave = !isLoading && phone.trim().length > 0 && phone.trim() !== currentPhone;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ title: 'Phone Number' }} />
      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
        Update your phone number. This can be used for account recovery and discoverability.
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
          placeholder="Enter your phone number"
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
    </KeyboardAvoidingView>
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
