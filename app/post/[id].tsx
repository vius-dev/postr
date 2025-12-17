
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import { Post, Comment } from '@/types/post';
import { useTheme } from '@/theme/theme';

interface CommentWithDepth extends Comment {
  depth: number;
}

type ListItem = (Post & { itemType: 'focal' | 'parent' }) | (CommentWithDepth & { itemType: 'reply' });

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [listData, setListData] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const flattenReplies = (comments: Comment[], depth = 0): CommentWithDepth[] => {
    let flattened: CommentWithDepth[] = [];
    for (const comment of comments) {
      flattened.push({ ...comment, depth });
      if (comment.replies) {
        flattened = flattened.concat(flattenReplies(comment.replies, depth + 1));
      }
    }
    return flattened;
  };

  useEffect(() => {
    if (id && typeof id === 'string') {
      setIsLoading(true);
      api.fetchPost(id).then(fetchedPost => {
        if (fetchedPost) {
          const focalPost: ListItem = { ...fetchedPost, itemType: 'focal' };
          const replies = flattenReplies(fetchedPost.comments || []).map(comment => ({
            ...comment,
            itemType: 'reply' as const,
          }));
          setListData([focalPost, ...replies]);
        }
        setIsLoading(false);
      });
    }
  }, [id]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.itemType) {
      case 'focal':
        return (
          <View style={{ backgroundColor: theme.card }}>
            <PostCard post={item} isFocal />
          </View>
        );
      case 'reply':
        return <CommentCard comment={item} indentationLevel={item.depth} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (listData.length === 0) {
    return <Text>Post not found.</Text>;
  }

  return (
    <FlatList
      data={listData}
      renderItem={renderItem}
      keyExtractor={item => `${item.itemType}-${item.id}`}
      style={[styles.container, { backgroundColor: theme.background }]}
      ListFooterComponent={() => (
        listData.length === 1 ? <Text style={[styles.noRepliesText, { color: theme.textTertiary }]}>No replies yet</Text> : null
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noRepliesText: {
    textAlign: 'center',
    padding: 20,
  },
});

export default PostDetailScreen;
