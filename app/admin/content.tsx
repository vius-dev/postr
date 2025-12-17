
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Post, Comment } from '@/types/post';
import { fetchAllPosts, deletePost, deleteComment } from './api';

const CommentItem = ({ item, onCommentDelete }: { item: Comment, onCommentDelete: (commentId: string) => void }) => (
  <View style={styles.commentContainer}>
    <Text>{item.author.name}: "{item.content}"</Text>
    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => onCommentDelete(item.id)}>
        <Text style={styles.buttonText}>Delete Comment</Text>
    </TouchableOpacity>
  </View>
);

const PostItem = ({ item, onPostDelete, onCommentDelete }: { item: Post, onPostDelete: (postId: string) => void, onCommentDelete: (commentId: string) => void }) => (
  <View style={styles.postContainer}>
    <Text style={styles.postAuthor}>{item.author.name} (@{item.author.username})</Text>
    <Text style={styles.postContent}>"{item.content}"</Text>
    <FlatList
      data={item.comments || []}
      renderItem={({ item: comment }) => <CommentItem item={comment} onCommentDelete={onCommentDelete} />}
      keyExtractor={comment => comment.id}
    />
    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => onPostDelete(item.id)}>
        <Text style={styles.buttonText}>Delete Post</Text>
    </TouchableOpacity>
  </View>
);

export default function ContentScreen() {
  const [posts, setPosts] = useState<Post[]>([]);

  const loadContent = async () => {
    try {
      const fetchedPosts = await fetchAllPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch content.');
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const handlePostDelete = async (postId: string) => {
    await deletePost(postId);
    loadContent();
  };

  const handleCommentDelete = async (commentId: string) => {
    await deleteComment(commentId);
    loadContent();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostItem item={item} onPostDelete={handlePostDelete} onCommentDelete={handleCommentDelete} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 10 },
  postContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10 },
  commentContainer: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5, marginVertical: 5, marginLeft: 20 },
  postAuthor: { fontWeight: 'bold', fontSize: 16 },
  postContent: { fontSize: 14, marginVertical: 5 },
  button: { padding: 8, borderRadius: 5, marginTop: 10 },
  deleteButton: { backgroundColor: '#dc3545' },
  buttonText: { color: 'white', textAlign: 'center' },
});
