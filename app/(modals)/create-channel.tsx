
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

export default function CreateChannelScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateChannel = async () => {
    if (channelName.trim() === '') {
      Alert.alert('Error', 'Channel name is required.');
      return;
    }

    setLoading(true);
    try {
      const newChannel = await api.createChannelConversation(channelName.trim(), description.trim());
      router.push(`/conversation/${newChannel.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Create Channel</Text>
          <TouchableOpacity
            onPress={handleCreateChannel}
            style={[
              styles.createButton,
              { backgroundColor: channelName.trim() ? theme.primary : theme.surface }
            ]}
            disabled={!channelName.trim() || loading}
          >
            <Text style={[
              styles.createButtonText,
              { color: channelName.trim() ? 'white' : theme.textTertiary }
            ]}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>CHANNEL NAME</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="e.g. Daily News"
              placeholderTextColor={theme.textTertiary}
              value={channelName}
              onChangeText={setChannelName}
              maxLength={50}
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 20 }]}>DESCRIPTION (OPTIONAL)</Text>
          <View style={[styles.inputContainer, styles.descriptionContainer, { backgroundColor: theme.surface }]}>
            <TextInput
              style={[styles.input, styles.descriptionInput, { color: theme.textPrimary }]}
              placeholder="What is this channel about?"
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>

          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            Channels are specialized broadcast-only conversations where only owners can post.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
  },
  descriptionContainer: {
    height: 120,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  descriptionInput: {
    width: '100%',
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
});
