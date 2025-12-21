
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [comment, setComment] = useState('');

  // Placeholder for post data
  const post = {
    id: id,
    author: { name: 'Author Name', avatar: '...' },
    content: `This is the content of post ${id}.`,
    createdAt: new Date().toISOString(),
  };

  // Placeholder for comments
  const comments = [
    { id: '1', author: { name: 'Commenter 1' }, content: 'This is the first comment.' },
    { id: '2', author: { name: 'Commenter 2' }, content: 'This is another comment.' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={styles.scrollContainer}>
          {/* Original Post */}
          <View style={[styles.postContainer, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[styles.author, { color: theme.textPrimary }]}>{post.author.name}</Text>
            <Text style={[styles.content, { color: theme.textPrimary }]}>{post.content}</Text>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={[styles.commentsHeader, { color: theme.textPrimary }]}>Comments</Text>
            {comments.map(c => (
              <View key={c.id} style={[styles.commentContainer, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.commentAuthor, { color: theme.textPrimary }]}>{c.author.name}</Text>
                <Text style={{ color: theme.textSecondary }}>{c.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={[styles.commentInputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput
            style={[styles.commentInput, { borderColor: theme.borderHeavy, color: theme.textPrimary }]}
            placeholder="Write a comment..."
            placeholderTextColor={theme.textTertiary}
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.primary }]}>
            <Text style={[styles.sendButtonText, { color: theme.textInverse }]}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flex: 1,
  },
  postContainer: {
    padding: 15,
  },
  author: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  content: {
    fontSize: 16,
  },
  commentsSection: {
    padding: 15,
  },
  commentsHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  commentContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  commentAuthor: {
    fontWeight: 'bold',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    fontWeight: 'bold',
  },
});
