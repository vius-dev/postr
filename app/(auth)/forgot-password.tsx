import { Text, View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const { theme } = useTheme();

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://your-app-url/reset-password',
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Password reset link sent to your email!');
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Ionicons name="logo-twitter" size={32} color={theme.primary} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Find your Twitter account
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your email, phone number, or username to change your password.
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.borderLight
              }]}
              placeholderTextColor={theme.textTertiary}
              onChangeText={setEmail}
              value={email}
              placeholder="Email, phone number, or username"
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={handlePasswordReset}
              style={[styles.resetButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.resetButtonText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  resetButton: {
    height: 50,
    borderRadius: 25, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
