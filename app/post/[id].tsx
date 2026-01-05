
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import PollResultsChart from '@/components/PollResultsChart';
import { Post, Comment } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { eventEmitter } from '@/lib/EventEmitter';

interface CommentWithDepth extends Comment {
  depth: number;
}

type ListItem = (Post & { itemType: 'focal' | 'parent' }) | (CommentWithDepth & { itemType: 'reply' });

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [listData, setListData] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && typeof id === 'string') {
      setIsLoading(true);
      api.getPostWithLineage(id).then((res: { post: Post, parents: Post[] } | null) => {
        if (res) {
          const parents = res.parents.map((p: Post) => ({ ...p, itemType: 'parent' as const }));
          const focalPost: ListItem = { ...res.post, itemType: 'focal' };

          // Replies are now potentially nested in post.comments if populated by API
          // For now, api.getPostWithLineage returns post.comments
          const replies = ((res.post as any).comments || []).map((comment: Comment) => ({
            ...comment,
            depth: 0,
            itemType: 'reply' as const,
          }));
          setListData([...parents, focalPost, ...replies]);
        }
        setIsLoading(false);
      });
    }

    const handlePostDeleted = (deletedPostId: string) => {
      if (deletedPostId === id) {
        router.back();
      } else {
        setListData(prev => prev.filter(item => item.id !== deletedPostId));
      }
    };

    const handlePostUpdated = () => {
      // Reload the post to get the latest state (e.g. votes, replies)
      api.getPostWithLineage(id as string).then((res: { post: Post, parents: Post[] } | null) => {
        if (res) {
          const parents = res.parents.map((p: Post) => ({ ...p, itemType: 'parent' as const }));
          const focalPost: ListItem = { ...res.post, itemType: 'focal' };
          const replies = ((res.post as any).comments || []).map((comment: Comment) => ({
            ...comment,
            depth: 0,
            itemType: 'reply' as const,
          }));
          setListData([...parents, focalPost, ...replies]);
        }
      });
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    eventEmitter.on('feedUpdated', handlePostUpdated);

    // Subscribe to real-time comments (direct replies only)
    const subscription = api.subscribeToPostComments(id as string, (newComment) => {
      // Realtime subscription only receives direct replies to this post (due to API filter)
      const newReply: ListItem = { ...newComment, depth: 0, itemType: 'reply' };
      setListData(prev => {
        const focalIndex = prev.findIndex(item => item.itemType === 'focal');
        if (focalIndex === -1) return prev; // Should not happen

        // Avoid duplicates if we already have it (e.g. from optimistic update if we added one)
        if (prev.some(p => p.id === newReply.id)) return prev;

        const nextListData = [...prev];
        nextListData.splice(focalIndex + 1, 0, newReply);
        return nextListData;
      });
    });

    return () => {
      eventEmitter.off('postDeleted', handlePostDeleted);
      eventEmitter.off('feedUpdated', handlePostUpdated);
      subscription.unsubscribe();
    };
  }, [id, router]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.itemType) {
      case 'parent':
        return (
          <View>
            <PostCard post={item} />
            <View style={[styles.threadLine, { backgroundColor: theme.border }]} />
          </View>
        );
      case 'focal':
        return (
          <View style={{ backgroundColor: theme.card }}>
            <PostCard post={item} isFocal />
            {item.poll && <PollResultsChart poll={item.poll} />}
          </View>
        );
      case 'reply':
        const isFirstReply = listData.findIndex(i => i.itemType === 'reply') === listData.indexOf(item);
        return (
          <View>
            {isFirstReply && (
              <View style={[styles.repliesHeader, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.repliesHeaderText, { color: theme.textSecondary }]}>Replies</Text>
              </View>
            )}
            <CommentCard comment={item} indentationLevel={item.depth} />
          </View>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (listData.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>Post not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => `${item.itemType}-${item.id}`}
        style={[styles.container, { backgroundColor: theme.background }]}
        ListFooterComponent={() => (
          listData.length === 1 ? <Text style={[styles.noRepliesText, { color: theme.textTertiary }]}>No replies yet</Text> : null
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  threadLine: {
    position: 'absolute',
    left: 39, // Center of avatar (15 padding + 24 radius)
    top: 55, // Bottom of avatar
    bottom: 0,
    width: 2,
    zIndex: -1,
  },
  repliesHeader: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  repliesHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noRepliesText: {
    textAlign: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PostDetailScreen;
