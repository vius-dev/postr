import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedList from '@/components/FeedList';
import FAB from '@/components/FAB';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import HomeHeader from '@/components/HomeHeader';
import { eventEmitter } from '@/lib/EventEmitter';
import { useResponsive } from '@/hooks/useResponsive';
import { getDb } from '@/lib/db/sqlite';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { api } from '@/lib/api';

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const loadPosts = useCallback(async () => {
    try {
      const db = await getDb();
      const user = await api.getCurrentUser(); // Need current user for reactions
      const currentUserId = user?.id;

      const rows = await db.getAllAsync(`
        SELECT 
          p.*, 
          u.username, u.display_name, u.avatar_url, u.verified as is_verified,
          r.reaction_type as my_reaction
        FROM feed_items f
        JOIN posts p ON f.post_id = p.id
        JOIN users u ON p.author_id = u.id
        LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
        WHERE f.feed_type = 'home'
        ORDER BY f.rank_score DESC
        LIMIT 50
      `, [currentUserId || '']);

      const mappedPosts: Post[] = rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        author: {
          id: row.author_id,
          username: row.username,
          name: row.display_name,
          avatar: row.avatar_url,
          is_verified: !!row.is_verified,
          is_suspended: false,
          is_shadow_banned: false,
          is_limited: false,
        },
        media: row.media_json ? JSON.parse(row.media_json) : [],
        likeCount: row.like_count || 0,
        commentCount: row.reply_count || 0,
        repostCount: row.repost_count || 0,
        dislikeCount: 0,
        laughCount: 0,
        userReaction: row.my_reaction || 'NONE',
        isBookmarked: false, // implementation pending
      }));

      setPosts(mappedPosts);
    } catch (e) {
      console.error('Failed to load posts from DB', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();

    const handleFeedUpdate = () => {
      loadPosts();
    };

    const handlePostDeleted = (deletedPostId: string) => {
      // Optimistic delete from UI
      setPosts(currentPosts => currentPosts.filter(p => p.id !== deletedPostId));
      // We should also delete from DB here or let SyncEngine handle it, 
      // but for immediate feedback we assume UI update is enough until next reload.
    };

    eventEmitter.on('feedUpdated', handleFeedUpdate);
    eventEmitter.on('postDeleted', handlePostDeleted);

    return () => {
      eventEmitter.off('feedUpdated', handleFeedUpdate);
      eventEmitter.off('postDeleted', handlePostDeleted);
    };
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await SyncEngine.startSync();
    // feedUpdated event will trigger reload, but we also reload after await just in case
    loadPosts();
  };

  const handleLoadMore = () => {
    // Pagination todo: implement offset based on current posts length
  };

  const { isWeb } = useResponsive();
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
          refreshing={refreshing}
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
