
import React, { useState, useEffect } from 'react';
import { View, Text as RNText, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/components/PostCard';
import { useTheme } from '@/theme/theme';
import { eventEmitter } from '@/lib/EventEmitter';
import { WhoToFollow } from './discovery/WhoToFollow';


import { PostInteractionHandlers } from './PostCard';

interface ForYouFeedProps extends PostInteractionHandlers {
  header?: React.ReactElement;
}

const ForYouFeed = ({ header, onPressPost, onPressUser, onPressCompose, onPressQuote, onPressHashtag, onPressLink }: ForYouFeedProps) => {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialPosts();

    const handlePostDeleted = (deletedPostId: string) => {
      setPosts(currentPosts => currentPosts.filter(p => p.id !== deletedPostId));
    };

    const handleFeedUpdate = () => {
      loadInitialPosts();
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    eventEmitter.on('feedUpdated', handleFeedUpdate);

    return () => {
      eventEmitter.off('postDeleted', handlePostDeleted);
      eventEmitter.off('feedUpdated', handleFeedUpdate);
    };
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
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onPressPost={onPressPost}
          onPressUser={onPressUser}
          onPressCompose={onPressCompose}
          onPressQuote={onPressQuote}
          onPressHashtag={onPressHashtag}
          onPressLink={onPressLink}
        />
      )}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      onEndReached={loadMorePosts}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={header}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
        ) : loading && posts.length === 0 ? (
          <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
        ) : !loading && posts.length === 0 ? (
          <View>
            <View style={styles.emptyContainer}>
              <RNText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Your feed is empty.
              </RNText>
              <RNText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Follow some people to see their posts here.
              </RNText>
            </View>
            <WhoToFollow />
          </View>
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
});

export default ForYouFeed;
