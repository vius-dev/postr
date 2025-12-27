
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/components/PostCard';
import { useTheme } from '@/theme/theme';
import { eventEmitter } from '@/lib/EventEmitter';

interface ForYouFeedProps {
  header?: React.ReactElement;
}

const ForYouFeed = ({ header }: ForYouFeedProps) => {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialPosts();

    const handlePostDeleted = (deletedPostId: string) => {
      setPosts(currentPosts => currentPosts.filter(p => p.id !== deletedPostId));
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    return () => eventEmitter.off('postDeleted', handlePostDeleted);
  }, []);

  const loadInitialPosts = async () => {
    setLoading(true);
    try {
      const res = await api.getForYouFeed();
      setPosts(res?.posts || []);
    } catch (error) {
      console.error('Error loading for you feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || loading || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const lastPost = posts[posts.length - 1];
      const res = await api.getForYouFeed({
        cursor: lastPost.createdAt
      });
      if (res?.posts) {
        setPosts(prevPosts => [...prevPosts, ...res.posts]);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      onEndReached={loadMorePosts}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={header}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
        ) : loading && posts.length === 0 ? (
          <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
        ) : null
      }
      onRefresh={loadInitialPosts}
      refreshing={loading && posts.length > 0}
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
