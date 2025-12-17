
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Comment } from '@/types/post';

import { useTheme } from '@/theme/theme';

interface CommentCardProps {
  comment: Comment;
}

const CommentCard = ({ comment }: CommentCardProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.card }]}>
      <Image source={{ uri: comment.author.avatar }} style={styles.avatar} />
      <View style={styles.contentContainer}>
        <View style={styles.authorContainer}>
          <Text style={[styles.authorName, { color: theme.textPrimary }]}>{comment.author.name}</Text>
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.content, { color: theme.textPrimary }]}>{comment.content}</Text>
        {comment.replies && comment.replies.length > 0 && (
          <View style={[styles.repliesContainer, { borderLeftColor: theme.border }]}>
            {comment.replies.map(reply => (
              <CommentCard key={reply.id} comment={reply} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
  },
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authorName: {
    fontWeight: 'bold',
  },
  timestamp: {
  },
  content: {
    marginTop: 5,
  },
  repliesContainer: {
    marginTop: 10,
    marginLeft: 10,
    borderLeftWidth: 1,
    paddingLeft: 10,
  },
});

export default CommentCard;
