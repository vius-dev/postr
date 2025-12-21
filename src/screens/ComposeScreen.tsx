
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '../theme/theme';

export default function ComposeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { quotePostId } = params;
  const [text, setText] = useState('');
  const charCount = text.length;

  const handlePost = async () => {
    if (charCount > 280) {
      // TODO: Add user-facing error
      return;
    }

    if (quotePostId) {
      await api.quote(quotePostId as string, text);
    } else {
      await api.createPost({ content: text });
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.inner, { backgroundColor: theme.background }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={quotePostId ? 'Add a comment' : "What's happening?"}
          style={[styles.input, { color: theme.textPrimary }]}
          multiline
        />
        <View style={styles.footer}>
          <Text style={[styles.charCount, { color: charCount > 280 ? 'red' : theme.textSecondary }]}>
            {charCount} / 280
          </Text>
          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: theme.primary }]}
            onPress={handlePost}
            disabled={charCount === 0 || charCount > 280}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  charCount: {
    fontSize: 16,
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
