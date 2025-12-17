
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';

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
        <View style={styles.header}>
          <Pressable onPress={goToProfile} style={styles.authorContainer}>
            <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
            <Text style={[styles.author, { color: theme.textPrimary }]}>{post.author.name}</Text>
            <Text style={[styles.username, { color: theme.textTertiary }]}>@{post.author.username}</Text>
          </Pressable>
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{new Date(post.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={{ color: theme.textPrimary }}>{post.content}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  author: {
    fontWeight: 'bold',
    marginRight: 5,

  },
  username: {
    marginRight: 5,
  },
  timestamp: {
  },
});

export default QuotedPost;
