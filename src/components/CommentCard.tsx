import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, TouchableOpacity } from 'react-native';
import { Comment, ReactionAction } from '@/types/post';
import { useTheme } from '@/theme/theme';
import ReactionBar from './ReactionBar';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import { timeAgo } from '@/utils/time';
import MediaGrid from './MediaGrid';
import { useRealtime } from '@/realtime/RealtimeContext';
import ParsedText from 'react-native-parsed-text';
import { Linking } from 'react-native';

const INDENT_UNIT = 16;
const MAX_INDENT_LEVEL = 4;

interface CommentCardProps {
  comment: Comment;
  indentationLevel: number;
}

const CommentCard = ({ comment: initialComment, indentationLevel }: CommentCardProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    counts,
    userReactions,
    userReposts,
    initializePost,
    toggleReaction,
    toggleRepost
  } = useRealtime();

  // Initialize comment state in context
  useEffect(() => {
    initializePost(initialComment.id, {
      likes: initialComment.stats.likes,
      dislikes: initialComment.stats.dislikes,
      laughs: initialComment.stats.laughs,
      reposts: initialComment.stats.reposts,
      replies: initialComment.stats.replies,
      userReaction: initialComment.viewer.reaction,
      isReposted: initialComment.viewer.isReposted,
      isBookmarked: initialComment.viewer.isBookmarked,
    });
  }, [initialComment.id]);

  const reaction = userReactions[initialComment.id] || initialComment.viewer.reaction;
  const isReposted = userReposts[initialComment.id] ?? initialComment.viewer.isReposted;
  const currentCounts = counts[initialComment.id] || {
    likes: initialComment.stats.likes,
    dislikes: initialComment.stats.dislikes,
    laughs: initialComment.stats.laughs,
    reposts: initialComment.stats.reposts,
    replies: initialComment.stats.replies,
  };

  const handleReaction = async (action: ReactionAction) => {
    try {
      await toggleReaction(initialComment.id, action);
    } catch (error) {
      console.error(`Failed to ${action} comment`, error);
    }
  };

  const handleCommentPress = () => {
    router.push({ pathname: '/(compose)/compose', params: { replyToId: initialComment.id, authorUsername: initialComment.author.username } });
  };

  const handleRepost = async () => {
    try {
      await toggleRepost(initialComment.id);
    } catch (error) {
      console.error('Failed to repost comment', error);
    }
  };

  const goToProfile = () => {
    router.push(`/(profile)/${initialComment.author.username}`);
  };

  const handleMentionPress = (mention: string) => {
    router.push(`/(profile)/${mention.substring(1)}`);
  };

  const handleHashtagPress = (hashtag: string) => {
    router.push(`/explore?q=${encodeURIComponent(hashtag)}`);
  };

  const handleUrlPress = (url: string) => {
    const sanitizedUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(sanitizedUrl).catch(err => console.error("Failed to open URL:", err));
  };


  const clampedIndentation = Math.min(indentationLevel, MAX_INDENT_LEVEL);
  const basePadding = 15;
  const indentationStyle = {
    paddingLeft: basePadding + (clampedIndentation * INDENT_UNIT),
  };

  const goToPost = () => {
    router.push(`/post/${initialComment.id}`);
  };

  return (
    <View style={[styles.container, indentationStyle, { borderBottomColor: theme.borderLight }]}>
      {indentationLevel > 1 && (
        <View style={[styles.threadLine, { left: basePadding + (clampedIndentation * INDENT_UNIT) + 20, backgroundColor: theme.border }]} />
      )}
      <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
        <Image source={{ uri: initialComment.author.avatar }} style={styles.avatar} />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        {initialComment.author.username ? (
          <View style={styles.authorContainer}>
            <TouchableOpacity onPress={goToProfile} activeOpacity={0.7} style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.textPrimary }]}>{initialComment.author.name}</Text>
              <Text style={[styles.authorUsername, { color: theme.textTertiary }]}>@{initialComment.author.username}</Text>
            </TouchableOpacity>
            <Text style={[styles.timestamp, { color: theme.textTertiary }]}>· {timeAgo(initialComment.createdAt)}</Text>
          </View>
        ) : null}
        {initialComment.replyToUsername && indentationLevel === 0 && (
          <View style={styles.replyingTo}>
            <Text style={[styles.replyingToText, { color: theme.textTertiary }]}>
              Replying to <Text style={{ color: theme.link }}>@{initialComment.replyToUsername}</Text>
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={goToPost} activeOpacity={0.9}>
          <ParsedText
            style={[styles.content, { color: theme.textPrimary }]}
            parse={[
              { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
              { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
              { type: 'url', style: [styles.url, { color: theme.link }], onPress: handleUrlPress },
            ]}
          >
            {initialComment.content}
          </ParsedText>
        </TouchableOpacity>
        {initialComment.media && initialComment.media.length > 0 && (
          <MediaGrid media={initialComment.media} onPress={goToPost} />
        )}
        <ReactionBar
          postId={initialComment.id}
          onComment={handleCommentPress}
          onRepost={handleRepost}
          onReaction={handleReaction}
          reaction={reaction}
          isReposted={isReposted}
          initialCounts={{
            likes: currentCounts.likes,
            dislikes: currentCounts.dislikes,
            laughs: currentCounts.laughs,
            reposts: currentCounts.reposts,
            comments: currentCounts.replies
          }}
        />
        {currentCounts.replies > 0 && (
          <TouchableOpacity onPress={goToPost} style={styles.viewRepliesContainer}>
            <Text style={[styles.viewRepliesText, { color: theme.link }]}>
              View {currentCounts.replies} {currentCounts.replies === 1 ? 'reply' : 'replies'}
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
    marginRight: 6,
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
  replyingTo: {
    marginTop: 4,
    marginBottom: 2,
  },
  replyingToText: {
    fontSize: 13,
  },
  mention: {
    fontWeight: 'bold',
  },
  hashtag: {
    fontWeight: 'normal',
  },
  url: {
    textDecorationLine: 'underline',
  },
});

export default CommentCard;
