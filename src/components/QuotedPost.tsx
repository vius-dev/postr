
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import MediaGrid from './MediaGrid';
import PollView from '@/components/PollView';
import { timeAgo } from '@/utils/time';

interface QuotedPostProps {
  post: Post;
}

const QuotedPost = ({ post }: QuotedPostProps) => {
  const { theme } = useTheme();
  const router = useRouter();

  const goToProfile = () => {
    router.push(`/(profile)/${post.author.username}`);
  };

  const goToPost = () => {
    router.push(`/post/${post.id}`);
  };


  return (
    <Pressable onPress={goToPost}>
      <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.card }]}>
        {post.author.username && !isNaN(new Date(post.createdAt).getTime()) ? (
          <View style={styles.header}>
            <Pressable onPress={goToProfile} style={styles.authorContainer}>
              <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
              <Text style={[styles.author, { color: theme.textPrimary }]} numberOfLines={1}>{post.author.name}</Text>
              <Text style={[styles.username, { color: theme.textTertiary }]} numberOfLines={1}>@{post.author.username}</Text>
              <Text style={[styles.timestamp, { color: theme.textTertiary }]}>· {timeAgo(post.createdAt)}</Text>
            </Pressable>
          </View>
        ) : null}
        {post.content ? (
          <Text style={{ color: theme.textPrimary, marginBottom: post.media?.length ? 8 : 0 }}>{post.content}</Text>
        ) : null}
        {post.media && post.media.length > 0 && (
          <MediaGrid media={post.media} onPress={goToPost} />
        )}
        {post.poll && (
          <View style={{ marginTop: 8 }}>
            <PollView poll={post.poll} postId={post.id} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  author: {
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  username: {
    marginRight: 4,
    fontSize: 14,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 14,
  },
});

export default QuotedPost;
