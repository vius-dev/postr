import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import FeedList from '@/components/FeedList';
import FAB from '@/components/FAB';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import HomeHeader from '@/components/HomeHeader';
import { eventEmitter } from '@/lib/EventEmitter';
import { useResponsive } from '@/hooks/useResponsive';

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { theme } = useTheme();

  const fetchPosts = async (refresh = false) => {
    if (loading && !refresh) return;
    setLoading(true);

    const newCursor = refresh ? undefined : cursor;
    const res = await api.fetchFeed(newCursor);

    if (res.posts) {
      setPosts(prevPosts => refresh ? res.posts : [...prevPosts, ...res.posts]);
      setCursor(res.nextCursor);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(true); // Initial fetch

    const handlePostDeleted = (deletedPostId: string) => {
      setPosts(currentPosts => currentPosts.filter(p => p.id !== deletedPostId));
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    return () => eventEmitter.off('postDeleted', handlePostDeleted);
  }, []);

  const handleRefresh = () => {
    fetchPosts(true);
  };

  const handleLoadMore = () => {
    if (cursor) {
      fetchPosts();
    }
  };

  const { isDesktop, isTablet, isWeb } = useResponsive();

  const Container = isWeb ? View : SafeAreaView;

  return (
    <Container style={[styles.container, { backgroundColor: theme.background }]}>
      <HomeHeader />
      {loading && posts.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FeedList
          posts={posts}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          refreshing={loading}
        />
      )}
      <FAB />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
