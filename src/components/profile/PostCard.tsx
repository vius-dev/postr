
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Post, ReactionAction } from '@/types/post';
import ReactionBar from '../ReactionBar';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post: initialPost }: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const router = useRouter();

  const handleReaction = async (action: ReactionAction) => {
    const originalPost = post;
    const newPost = { ...post, userReaction: action };
    setPost(newPost);
    try {
      await api.react(post.id, action);
    } catch (error) {
      console.error(`Failed to ${action} post`, error);
      setPost(originalPost);
    }
  };

  const handleComment = () => {
    console.log('Navigate to comments');
  };

  const handleRepost = () => {
    console.log('Repost post');
  };

  const goToProfile = () => {
    router.push(`/profile/${post.author.id}`);
  };

  const goToPost = () => {
    router.push(`/post/${post.id}`);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={goToProfile}>
        <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={goToProfile}>
            <View style={styles.nameGroup}>
              <Text style={styles.displayName}>{post.author.name}</Text>
              <Text style={styles.username}>@{post.author.username}</Text>
            </View>
          </Pressable>
          <Pressable onPress={goToPost}>
            <Text style={styles.timestamp}>· {post.createdAt}</Text>
          </Pressable>
        </View>
        <Pressable onPress={goToPost}>
          <Text style={styles.text}>{post.content}</Text>
          {post.media && post.media.length > 0 && (
            <Image source={{ uri: post.media[0].url }} style={styles.media} />
          )}
        </Pressable>
        <ReactionBar
          postId={post.id}
          onComment={handleComment}
          onRepost={handleRepost}
          onReaction={handleReaction}
          reaction={post.userReaction}
          initialCounts={{
            likes: post.likeCount,
            dislikes: post.dislikeCount,
            laughs: post.laughCount,
            reposts: post.repostCount,
            comments: post.commentCount,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameGroup: {
    flexDirection: 'row',
    marginRight: 5,
  },
  displayName: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  username: {
    color: '#657786',
    marginRight: 5,
  },
  timestamp: {
    color: '#657786',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  media: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
});
