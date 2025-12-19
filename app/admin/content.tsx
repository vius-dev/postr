import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator, Image } from 'react-native';
import { Post, Comment } from '@/types/post';
import { fetchAllPosts, deletePost, deleteComment } from './api';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from '@/components/MediaGrid';

const CommentItem = ({ item, onCommentDelete, theme }: { item: Comment, onCommentDelete: (commentId: string) => void, theme: any }) => (
  <View style={[styles.commentCard, { backgroundColor: theme.borderLight + '30', borderColor: theme.borderLight }]}>
    <View style={styles.contentHeader}>
      <View style={styles.authorRow}>
        <Image source={{ uri: item.author.avatar || 'https://i.pravatar.cc/150' }} style={styles.smallAvatar} />
        <Text style={[styles.inlineAuthor, { color: theme.textSecondary }]}>{item.author.name} (@{item.author.username})</Text>
      </View>
      <TouchableOpacity style={styles.smallDeleteButton} onPress={() => onCommentDelete(item.id)}>
        <Ionicons name="trash-outline" size={16} color={theme.error} />
      </TouchableOpacity>
    </View>
    <Text style={[styles.contentText, { color: theme.textPrimary }]}>{item.content}</Text>
    {item.media && item.media.length > 0 && (
      <View style={styles.mediaPreview}>
        <MediaGrid media={item.media} />
      </View>
    )}
  </View>
);

const PostItem = ({ item, onPostDelete, onCommentDelete, theme }: { item: Post, onPostDelete: (postId: string) => void, onCommentDelete: (commentId: string) => void, theme: any }) => (
  <View style={[styles.postCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
    <View style={styles.contentHeader}>
      <View style={styles.authorRow}>
        <Image source={{ uri: item.author.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
        <View>
          <Text style={[styles.postAuthor, { color: theme.textPrimary }]}>{item.author.name}</Text>
          <Text style={[styles.postHandle, { color: theme.textTertiary }]}>@{item.author.username}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.deleteIconButton, { backgroundColor: theme.error + '15' }]} onPress={() => onPostDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    </View>

    <Text style={[styles.contentText, { color: theme.textPrimary, marginBottom: 10 }]}>{item.content}</Text>

    {item.media && item.media.length > 0 && (
      <View style={styles.mediaPreview}>
        <MediaGrid media={item.media} />
      </View>
    )}

    {item.comments && item.comments.length > 0 && (
      <View style={styles.commentsSection}>
        <View style={styles.sectionDivider}>
          <Text style={[styles.dividerText, { color: theme.textTertiary }]}>Comments</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.borderLight }]} />
        </View>
        {item.comments.map(comment => (
          <CommentItem key={comment.id} item={comment} onCommentDelete={onCommentDelete} theme={theme} />
        ))}
      </View>
    )}
  </View>
);

export default function ContentScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const loadContent = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await fetchAllPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const handlePostDelete = async (postId: string) => {
    Alert.alert('Confirm Delete', 'Delete this post and all its comments?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deletePost(postId);
          loadContent();
        }
      }
    ]);
  };

  const handleCommentDelete = async (commentId: string) => {
    Alert.alert('Confirm Delete', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteComment(commentId);
          loadContent();
        }
      }
    ]);
  };

  const filteredPosts = useMemo(() => {
    if (!searchTerm) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter(post =>
      post.content.toLowerCase().includes(term) ||
      post.author.name.toLowerCase().includes(term) ||
      post.author.username.toLowerCase().includes(term)
    );
  }, [posts, searchTerm]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchHeader}>
        <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchBar, { color: theme.textPrimary, backgroundColor: theme.borderLight }]}
          placeholder="Search content..."
          placeholderTextColor={theme.textTertiary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={({ item }) => <PostItem item={item} onPostDelete={handlePostDelete} onCommentDelete={handleCommentDelete} theme={theme} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No content found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  searchIcon: {
    position: 'absolute',
    left: 25,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    height: 45,
    paddingLeft: 45,
    borderRadius: 25,
    fontSize: 16,
  },
  list: { paddingHorizontal: 15, paddingBottom: 20 },
  postCard: { padding: 15, borderRadius: 15, marginBottom: 15, borderBottomWidth: 1 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  postAuthor: { fontWeight: 'bold', fontSize: 16 },
  postHandle: { fontSize: 13 },
  inlineAuthor: { fontSize: 13, fontWeight: '600' },
  contentText: { fontSize: 15, lineHeight: 22 },
  deleteIconButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  smallDeleteButton: { padding: 4 },
  mediaPreview: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  commentsSection: { marginTop: 15 },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dividerText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginRight: 10 },
  dividerLine: { flex: 1, height: 1 },
  commentCard: { padding: 10, borderRadius: 10, marginBottom: 8, marginLeft: 20, borderWidth: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 16 },
});
