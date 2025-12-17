import { Text, View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
  const { theme } = useTheme();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Registration successful! Please check your email to confirm your account.');
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
            Create your account
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
              style={[styles.registerButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.registerButtonText}>Sign up</Text>
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
    textAlign: 'left',
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
    color: 'white',
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
