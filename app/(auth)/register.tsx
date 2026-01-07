import { Text, View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import debounce from 'lodash/debounce';
import { showError, showSuccess } from '@/utils/toast';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const checkAvailability = useCallback(
    debounce(async (val: string) => {
      if (val.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }
      setIsCheckingUsername(true);
      try {
        const available = await api.checkUsernameAvailability(val);
        setIsUsernameAvailable(available);
      } catch (err) {
        console.error('Username check failed', err);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (username.length >= 3) {
      checkAvailability(username);
    } else {
      setIsUsernameAvailable(null);
    }
  }, [username, checkAvailability]);

  const handleRegister = async () => {
    if (!email || !password || !name || !username || isRegistering || isCheckingUsername) {
      showError('Please fill in all fields', 'Missing Information');
      return;
    }

    if (username.length < 3) {
      showError('Your username needs to be at least 3 characters long.');
      return;
    }

    if (isUsernameAvailable === false) {
      showError('Sorry, that username is already claimed. Try something unique!');
      return;
    }

    if (password !== confirmPassword) {
      showError('Double check your passwords—they don\'t quite match yet.');
      return;
    }

    setIsRegistering(true);
    try {
      await api.register(email, password, username, name);
      showSuccess('Almost there! Please check your inbox and confirm your email first.');
      router.back();
    } catch (error: any) {
      showError(error);
    } finally {
      setIsRegistering(false);
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
            Join Vius Now
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.borderLight
              }]}
              placeholderTextColor={theme.textTertiary}
              onChangeText={setName}
              value={name}
              placeholder="Display Name"
            />
            <View>
              <TextInput
                style={[styles.input, {
                  color: theme.textPrimary,
                  backgroundColor: theme.background,
                  borderColor: isUsernameAvailable === false ? theme.error : theme.borderLight
                }]}
                placeholderTextColor={theme.textTertiary}
                onChangeText={setUsername}
                value={username}
                placeholder="Username"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.usernameStatus}>
                {isCheckingUsername && (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
                {username.length >= 3 && !isCheckingUsername && isUsernameAvailable !== null && (
                  <Text style={[
                    styles.availabilityText,
                    { color: isUsernameAvailable ? theme.success : theme.error }
                  ]}>
                    {isUsernameAvailable ? 'Username available' : 'Username taken'}
                  </Text>
                )}
              </View>
            </View>
            <TextInput
              style={[styles.input, {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.borderLight
              }]}
              placeholderTextColor={theme.textTertiary}
              onChangeText={setEmail}
              value={email}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
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
            <TextInput
              style={[styles.input, {
                color: theme.textPrimary,
                backgroundColor: theme.background,
                borderColor: theme.borderLight
              }]}
              placeholderTextColor={theme.textTertiary}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              placeholder="Confirm Password"
              secureTextEntry
            />

            <TouchableOpacity
              onPress={handleRegister}
              style={[styles.registerButton, { backgroundColor: theme.primary, opacity: isRegistering ? 0.7 : 1 }]}
              disabled={isRegistering}
            >
              <Text style={[styles.registerButtonText, { color: theme.textInverse }]}>
                {isRegistering ? 'Signing up...' : 'Sign up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Have an account already? Log in</Text>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 25, // Pill shape
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  usernameStatus: {
    position: 'absolute',
    right: 20,
    top: 15,
    height: 20,
    justifyContent: 'center',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    height: 50,
    borderRadius: 25, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
