
import React from 'react';
import { FlatList, RefreshControl, ActivityIndicator, View, StyleSheet } from 'react-native';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import { Post } from '@/types/post';

interface FeedListProps {
  posts: Post[];
  onRefresh: () => void;
  onLoadMore: () => void;
  refreshing: boolean;
}

export default function FeedList({ posts, onRefresh, onLoadMore, refreshing }: FeedListProps) {
  const renderFooter = () => {
    if (!refreshing) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  };

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item) => item.id}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListFooterComponent={renderFooter}
    />
  );
}

