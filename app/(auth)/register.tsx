import { Text, View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleRegister = async () => {
    if (!email || !password || isRegistering) return;

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    setIsRegistering(true);
    try {
      // Derive name and username from email if not provided by separate fields 
      // (The current UI only has email/pass, so handle_new_user trigger will derive them)
      await api.register(email, password, '', '');
      alert('Registration successful! Please check your email to confirm your account.');
      router.back();
    } catch (error: any) {
      alert(error.message || 'Registration failed');
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
              onChangeText={setEmail}
              value={email}
              placeholder="Email"
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
