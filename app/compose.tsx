
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

const MAX_CHARACTERS = 280;

export default function ComposeScreen() {
  const [text, setText] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (text.length === 0) return;

    try {
      await api.createPost({ content: text });
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  const charactersRemaining = MAX_CHARACTERS - text.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={30} color="#1DA1F2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.postButton} onPress={handleSubmit} disabled={text.length === 0}>
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          maxLength={MAX_CHARACTERS}
        />
        <Text style={styles.characterCount}>{charactersRemaining}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputContainer: {
    flex: 1,
    padding: 15,
  },
  input: {
    flex: 1,
    fontSize: 18,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    color: '#888',
  },
});
