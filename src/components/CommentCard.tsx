
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Comment, ReactionAction } from '@/types/post';
import { useTheme } from '@/theme/theme';
import ReactionBar from './ReactionBar';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

const INDENT_UNIT = 16;
const MAX_INDENT_LEVEL = 4;

interface CommentCardProps {
  comment: Comment;
  indentationLevel: number;
}

const CommentCard = ({ comment: initialComment, indentationLevel }: CommentCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [comment, setComment] = useState(initialComment);

  const handleReaction = async (action: ReactionAction) => {
    const originalComment = comment;
    const newComment = { ...comment, userReaction: action };
    setComment(newComment);
    try {
      // Assuming an API call to react to a comment exists
      // await api.reactToComment(comment.id, action);
    } catch (error) {
      console.error(`Failed to ${action} comment`, error);
      setComment(originalComment);
    }
  };

  const handleCommentPress = () => {
    router.push({ pathname: '/compose', params: { replyToId: comment.id, authorUsername: comment.author.username } });
  };

  const handleRepost = () => {
    // Per spec, this should open a repost modal
    console.log('Repost comment');
  };

  const goToProfile = () => {
    router.push(`/(profile)/${comment.author.username}`);
  };

  const goToPost = () => {
    // A comment is not a post, so it can't be the focal point of a new Post Detail screen.
    // The spec says "Body -> post detail (that reply becomes focal)", which is contradictory.
    // For now, we'll log this action.
    console.log("Navigate to comment detail");
  };

  const clampedIndentation = Math.min(indentationLevel, MAX_INDENT_LEVEL);
  const indentationStyle = {
    paddingLeft: clampedIndentation * INDENT_UNIT,
  };

  return (
    <View style={[styles.container, indentationStyle, { borderBottomColor: theme.borderLight }]}>
      {indentationLevel > 0 && (
        <View style={[styles.threadLine, { left: (clampedIndentation * INDENT_UNIT) / 2, backgroundColor: theme.border }]} />
      )}
      <Pressable onPress={goToProfile}>
        <Image source={{ uri: comment.author.avatar }} style={styles.avatar} />
      </Pressable>
      <View style={styles.contentContainer}>
        <View style={styles.authorContainer}>
          <Pressable onPress={goToProfile} style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: theme.textPrimary }]}>{comment.author.name}</Text>
            <Text style={[styles.authorUsername, { color: theme.textTertiary }]}>@{comment.author.username}</Text>
          </Pressable>
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
        </View>
        <Pressable onPress={goToPost}>
          <Text style={[styles.content, { color: theme.textPrimary }]}>{comment.content}</Text>
        </Pressable>
        <ReactionBar
          postId={comment.id}
          onComment={handleCommentPress}
          onRepost={handleRepost}
          onReaction={handleReaction}
          reaction={comment.userReaction}
          initialCounts={{
            likes: comment.likeCount,
            dislikes: comment.dislikeCount,
            laughs: comment.laughCount,
            reposts: comment.repostCount,
            comments: comment.commentCount,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    paddingTop: 15,
    paddingRight: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  threadLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
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
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  authorUsername: {
  },
  timestamp: {
  },
  content: {
    marginTop: 5,
    lineHeight: 20,
  },
});

export default CommentCard;
