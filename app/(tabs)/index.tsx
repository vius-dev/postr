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
import { PostPipeline } from '@/domain/post/post.pipeline';

// Manual mapping functions removed in favor of domain pipeline


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
          r.reaction_type as my_reaction,
          qp.id as inner_quoted_post_id, qp.content as quoted_content, qp.type as quoted_type,
          qp.created_at as quoted_created_at, qp.updated_at as quoted_updated_at,
          qp.media_json as quoted_media_json, qp.poll_json as quoted_poll_json, qp.like_count as quoted_like_count,
          qp.reply_count as quoted_reply_count, qp.repost_count as quoted_repost_count,
          qu.id as quoted_author_id, qu.username as quoted_author_username,
          qu.display_name as quoted_author_name, qu.avatar_url as quoted_author_avatar,
          qu.verified as quoted_author_verified,
          rp.id as inner_reposted_post_id, rp.content as reposted_content, rp.type as reposted_type,
          rp.created_at as reposted_created_at, rp.updated_at as reposted_updated_at,
          rp.media_json as reposted_media_json, rp.poll_json as reposted_poll_json, rp.like_count as reposted_like_count,
          rp.reply_count as reposted_reply_count, rp.repost_count as reposted_repost_count,
          ru.id as reposted_author_id, ru.username as reposted_author_username,
          ru.display_name as reposted_author_name, ru.avatar_url as reposted_author_avatar,
          ru.verified as reposted_author_verified,
          pv.choice_index as user_vote_index
        FROM feed_items f
        JOIN posts p ON f.post_id = p.id
        JOIN users u ON p.owner_id = u.id
        LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
        LEFT JOIN poll_votes pv ON p.id = pv.post_id AND pv.user_id = ?
        LEFT JOIN posts qp ON p.quoted_post_id = qp.id AND qp.deleted = 0
        LEFT JOIN users qu ON qp.owner_id = qu.id
        LEFT JOIN posts rp ON p.reposted_post_id = rp.id AND rp.deleted = 0
        LEFT JOIN users ru ON rp.owner_id = ru.id
        WHERE f.feed_type = 'home'
        ORDER BY f.rank_score DESC
        LIMIT 50
      `, [currentUserId || '', currentUserId || '']);

      // Debug: Log the first row to see what data we're getting
      if (rows.length > 0) {
        console.log('[FeedScreen] Sample row:', JSON.stringify(rows[0], null, 2));
      }

      const ctx = {
        viewerId: currentUserId || null,
        now: new Date().toISOString()
      };

      const mappedPosts: Post[] = rows.map((row: any) =>
        PostPipeline.map(PostPipeline.adapt(row), ctx)
      );

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
