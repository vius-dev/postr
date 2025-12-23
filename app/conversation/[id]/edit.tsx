
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function EditConversationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModified, setIsModified] = useState(false);

  const loadConversationDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getConversation(id);
      if (data) {
        setConversation(data.conversation);
        setName(data.conversation.name || '');
        setDescription(data.conversation.description || '');
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof conversationId === 'string') {
      loadConversationDetails(conversationId);
    }
  }, [conversationId, loadConversationDetails]);

  useEffect(() => {
    if (conversation) {
      const hasChanged = name !== conversation.name || description !== conversation.description;
      setIsModified(hasChanged);
    }
  }, [name, description, conversation]);

  const handleSave = async () => {
    if (!isModified || !conversation || typeof conversationId !== 'string') return;

    try {
      await api.updateConversation(conversationId, { name, description });
      Alert.alert('Success', 'Channel details have been updated.');
      router.back();
    } catch (error) {
      console.error('Error updating conversation:', error);
      Alert.alert('Error', 'Failed to update channel details.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Channel</Text>
        <TouchableOpacity onPress={handleSave} disabled={!isModified} style={styles.saveButton}>
          <Text style={[styles.saveButtonText, { color: isModified ? theme.primary : theme.textTertiary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.surface }]}
          value={name}
          onChangeText={setName}
          placeholder="Channel Name"
          placeholderTextColor={theme.textSecondary}
        />
        <TextInput
          style={[styles.input, { color: theme.textPrimary, borderColor: theme.surface, marginTop: 15, height: 100 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={theme.textSecondary}
          multiline
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
});
