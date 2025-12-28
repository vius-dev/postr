
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/theme';
import PollView from '@/components/PollView';

const MAX_CHARACTERS = 280;

export default function QuoteScreen() {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  React.useEffect(() => {
    const loadPost = async () => {
      if (id && typeof id === 'string') {
        try {
          const data = await api.getPost(id);
          setPost(data);
        } catch (error) {
          console.error('[Quote] Failed to fetch post:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadPost();
  }, [id]);

  const handleSubmit = async () => {
    if (text.length === 0) return;

    try {
      await api.quote(id as string, text);
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  const charactersRemaining = MAX_CHARACTERS - text.length;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={30} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postButton, { backgroundColor: theme.primary }, text.length === 0 && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={text.length === 0}
        >
          <Text style={styles.postButtonText}>Quote</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          maxLength={MAX_CHARACTERS}
        />
        <Text style={[styles.characterCount, { color: theme.textTertiary }]}>{charactersRemaining}</Text>
      </View>

      {/* Quoted Post Preview */}
      <View style={[styles.quotedPostContainer, { borderColor: theme.border }]}>
        <View style={styles.quotedHeader}>
          <Text style={[styles.quotedPostAuthor, { color: theme.textPrimary }]}>{post.author.name}</Text>
          <Text style={[styles.quotedHandle, { color: theme.textTertiary }]}>@{post.author.username}</Text>
        </View>
        <Text style={{ color: theme.textSecondary }}>{post.content}</Text>

        {post.poll && (
          <View style={{ marginTop: 8 }}>
            <PollView poll={post.poll} postId={post.id} />
          </View>
        )}
      </View>

    </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  inputContainer: {
    padding: 15,
  },
  input: {
    fontSize: 18,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    textAlign: 'right',
  },
  quotedPostContainer: {
    margin: 15,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  quotedPostAuthor: {
    fontWeight: 'bold',
  },
  quotedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  quotedHandle: {
    fontSize: 14,
  },
  pollPreview: {
    marginTop: 8,
    gap: 4,
  },
  pollPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollIndicator: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
  },
  pollChoiceText: {
    fontSize: 13,
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
