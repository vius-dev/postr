import { Text, View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showError } from '@/utils/toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password || isLoggingIn) return;

    setIsLoggingIn(true);
    console.log('[LoginScreen] Attempting login for:', email);
    try {
      const { user, session } = await api.login(email, password);
      console.log('[LoginScreen] Login successful. User ID:', user.id);

      // Navigation will happen automatically via RootLayoutNav auth state listener
      console.log('[LoginScreen] Login successful, waiting for layout redirect...');
    } catch (error: any) {
      console.error('[LoginScreen] Login error:', error);
      showError(error);
    } finally {
      console.log('[LoginScreen] Login process finished (finally block).');
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            See local content right now and why it matters ...
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
              placeholder="Phone, email, or username"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.borderLight
              }]}
              placeholderTextColor={theme.textTertiary}
              onChangeText={setPassword}
              value={password}
              placeholder="Password"
              secureTextEntry
            />

            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.loginButton, { backgroundColor: theme.primary, opacity: isLoggingIn ? 0.7 : 1 }]}
              disabled={isLoggingIn}
            >
              <Text style={[styles.loginButtonText, { color: theme.textInverse }]}>
                {isLoggingIn ? 'Logging in...' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={[styles.linkText, { color: theme.textSecondary }]}>Forgot password?</Text>
              </TouchableOpacity>
              <Text style={[styles.divider, { color: theme.textTertiary }]}>•</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Sign up</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 40,
    textAlign: 'left',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 25, // Pill shape inputs
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    height: 50,
    borderRadius: 25, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
  },
  divider: {
    marginHorizontal: 10,
  },
});
