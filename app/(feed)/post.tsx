
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView style={styles.scrollContainer}>
          {/* Original Post */}
          <View style={styles.postContainer}>
            <Text style={styles.author}>{post.author.name}</Text>
            <Text style={styles.content}>{post.content}</Text>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>Comments</Text>
            {comments.map(c => (
              <View key={c.id} style={styles.commentContainer}>
                <Text style={styles.commentAuthor}>{c.author.name}</Text>
                <Text>{c.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flex: 1,
  },
  postContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    backgroundColor: '#f9f9f9',
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
    borderTopColor: '#eee',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
