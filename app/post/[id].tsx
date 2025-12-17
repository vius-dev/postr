
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import { Post } from '@/types/post';

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      api.fetchPost(id).then(fetchedPost => {
        if (fetchedPost) {
          setPost(fetchedPost);
        }
      });
    }
  }, [id]);

  if (!post) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <PostCard post={post} />
      <View style={styles.commentsContainer}>
        <Text style={styles.commentsTitle}>Comments</Text>
        {post.comments && post.comments.map(comment => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commentsContainer: {
    padding: 15,
  },
  commentsTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
});

export default PostDetailScreen;
