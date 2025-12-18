
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/components/PostCard';
import { useTheme } from '@/theme/theme';

const ForYouFeed = () => {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialPosts();
  }, []);

  const loadInitialPosts = async () => {
    setLoading(true);
    try {
      const initialPosts = await api.getForYouFeed(); 
      setPosts(initialPosts);
    } catch (error) {
      console.error('Error loading for you feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const morePosts = await api.getForYouFeed(posts.length); 
      setPosts(prevPosts => [...prevPosts, ...morePosts]);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      onEndReached={loadMorePosts}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} /> : null}
      onRefresh={loadInitialPosts}
      refreshing={loading}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ForYouFeed;
