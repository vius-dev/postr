
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
      api.fetchPostWithLineage(id).then((res: { post: Post, parents: Post[] } | undefined) => {
        if (res) {
          const parents = res.parents.map((p: Post) => ({ ...p, itemType: 'parent' as const }));
          const focalPost: ListItem = { ...res.post, itemType: 'focal' };

          // Only show direct replies (non-recursive) to hide deeper threads 
          const replies = (res.post.comments || []).map(comment => ({
            ...comment,
            depth: 0,
            itemType: 'reply' as const,
          }));
          setListData([...parents, focalPost, ...replies]);
        }
        setIsLoading(false);
      });
    }

    const handleNewComment = ({ parentId, comment }: { parentId: string, comment: Comment }) => {
      // If the new comment is a reply to the focal post or one of its visible children
      // For simplicity in the mock, we refresh the lineage if the parentId matches the focal post
      // or if it's a child of the focal post.
      if (id && (parentId === id || listData.some(item => item.id === parentId))) {
        // Optimistically add it if it's a direct reply to focal post
        if (parentId === id) {
          const newReply: ListItem = { ...comment, depth: 0, itemType: 'reply' };
          setListData(prev => {
            const focalIndex = prev.findIndex(item => item.itemType === 'focal');
            const nextListData = [...prev];
            nextListData.splice(focalIndex + 1, 0, newReply);
            return nextListData;
          });
        } else {
          // If it's a nested reply, it's harder to place optimistically without more logic, 
          // but we can at least refresh or append. For now, let's refresh.
          api.fetchPostWithLineage(id as string).then((res: { post: Post, parents: Post[] } | undefined) => {
            if (res) {
              const parents = res.parents.map((p: Post) => ({ ...p, itemType: 'parent' as const }));
              const focalPost: ListItem = { ...res.post, itemType: 'focal' };
              const replies = (res.post.comments || []).map((c: Comment) => ({
                ...c,
                depth: 0,
                itemType: 'reply' as const,
              }));
              setListData([...parents, focalPost, ...replies]);
            }
          });
        }
      }
    };

    const handlePostDeleted = (deletedPostId: string) => {
      if (deletedPostId === id) {
        // router.back() might be called multiple times if we're not careful, 
        // but here it's fine since the component will unmount.
        router.back();
      } else {
        setListData(prev => prev.filter(item => item.id !== deletedPostId));
      }
    };

    eventEmitter.on('newComment', handleNewComment);
    eventEmitter.on('postDeleted', handlePostDeleted);
    return () => {
      eventEmitter.off('newComment', handleNewComment);
      eventEmitter.off('postDeleted', handlePostDeleted);
    };
  }, [id, listData.length, router]); // listData.length to ensure we have the current state in the listener closure

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
