
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
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: any;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export default function FeedList({
  posts,
  onRefresh,
  onLoadMore,
  refreshing,
  emptyTitle = 'No posts yet',
  emptyDescription = 'When people you follow post, they\'ll show up here.',
  emptyIcon = 'newspaper-outline',
  emptyActionLabel,
  onEmptyAction,
}: FeedListProps) {
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
      ListEmptyComponent={
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={true}
      windowSize={5}
      maxToRenderPerBatch={5}
      initialNumToRender={5}
    />
  );
}

