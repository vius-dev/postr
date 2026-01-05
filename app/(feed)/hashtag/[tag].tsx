import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import FeedList from '@/components/FeedList';
import { eventEmitter } from '@/lib/EventEmitter';

export default function HashtagFeedScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    if (!tag) return;
    try {
      setLoading(true);
      const data = await api.getPostsByHashtag(tag);
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch hashtag posts', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!tag) return;
    setRefreshing(true);
    try {
      const data = await api.getPostsByHashtag(tag);
      setPosts(data);
    } catch (error) {
      console.error('Failed to refresh hashtag posts', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const handleFeedUpdate = () => {
      onRefresh();
    };

    const handlePostDeleted = (deletedPostId: string) => {
      setPosts(currentPosts => currentPosts.filter(p => p.id !== deletedPostId));
    };

    eventEmitter.on('feedUpdated', handleFeedUpdate);
    eventEmitter.on('postDeleted', handlePostDeleted);

    return () => {
      eventEmitter.off('feedUpdated', handleFeedUpdate);
      eventEmitter.off('postDeleted', handlePostDeleted);
    };
  }, [tag]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: `#${tag}`,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTintColor: theme.textPrimary,
          headerStyle: {
            backgroundColor: theme.background,
          },
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FeedList
          posts={posts}
          onRefresh={onRefresh}
          onLoadMore={() => { }} // TODO: Implement pagination
          refreshing={refreshing}
        />
      )}
    </View>
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
