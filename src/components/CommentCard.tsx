
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, TouchableOpacity } from 'react-native';
import { Comment, ReactionAction } from '@/types/post';
import { useTheme } from '@/theme/theme';
import ReactionBar from './ReactionBar';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { timeAgo } from '@/utils/time';
import MediaGrid from './MediaGrid';

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
    const prevReaction = comment.userReaction;
    const nextReaction = prevReaction === action ? 'NONE' : action;

    setComment(prev => ({ ...prev, userReaction: nextReaction }));

    try {
      await api.react(comment.id, nextReaction);
    } catch (error) {
      console.error(`Failed to ${action} comment`, error);
      setComment(prev => ({ ...prev, userReaction: prevReaction }));
    }
  };

  const handleCommentPress = () => {
    router.push({ pathname: '/(compose)/compose', params: { replyToId: comment.id, authorUsername: comment.author.username } });
  };

  const handleRepost = () => {
    // Per spec, this should open a repost modal
    console.log('Repost comment');
  };

  const goToProfile = () => {
    router.push(`/(profile)/${comment.author.username}`);
  };


  const clampedIndentation = Math.min(indentationLevel, MAX_INDENT_LEVEL);
  const indentationStyle = {
    paddingLeft: clampedIndentation * INDENT_UNIT,
  };

  const goToPost = () => {
    router.push(`/post/${comment.id}`);
  };

  return (
    <View style={[styles.container, indentationStyle, { borderBottomColor: theme.borderLight }]}>
      {indentationLevel > 1 && (
        <View style={[styles.threadLine, { left: clampedIndentation * INDENT_UNIT + 20, backgroundColor: theme.border }]} />
      )}
      <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
        <Image source={{ uri: comment.author.avatar }} style={styles.avatar} />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <View style={styles.authorContainer}>
          <TouchableOpacity onPress={goToProfile} activeOpacity={0.7} style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: theme.textPrimary }]}>{comment.author.name}</Text>
            <Text style={[styles.authorUsername, { color: theme.textTertiary }]}>@{comment.author.username}</Text>
          </TouchableOpacity>
          <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={goToPost} activeOpacity={0.9}>
          <Text style={[styles.content, { color: theme.textPrimary }]}>{comment.content}</Text>
        </TouchableOpacity>
        {comment.media && comment.media.length > 0 && (
          <MediaGrid media={comment.media} onPress={goToPost} />
        )}
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
        {comment.commentCount > 0 && (
          <TouchableOpacity onPress={goToPost} style={styles.viewRepliesContainer}>
            <Text style={[styles.viewRepliesText, { color: theme.link }]}>
              View {comment.commentCount} {comment.commentCount === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
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
  viewRepliesContainer: {
    marginTop: 8,
    paddingLeft: 0,
  },
  viewRepliesText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CommentCard;
