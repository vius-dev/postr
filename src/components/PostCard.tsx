
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReactionBar from '@/components/ReactionBar';
import RepostModal from '@/components/RepostModal';
import PollView from '@/components/PollView';
import QuotedPost from '@/components/QuotedPost';
import PostMenu from '@/components/PostMenu';
import ParsedText from 'react-native-parsed-text';
import { api } from '@/lib/api';
import { Post, ReactionAction } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { useRealtime } from '@/realtime/RealtimeContext';
import Card from '@/components/Card'; // Import the new Card component
import { timeAgo } from '@/utils/time'; // Import a time formatting utility
import MediaGrid from '@/components/MediaGrid';

interface PostCardProps {
  post: Post;
  isFocal?: boolean;
}

export default function PostCard({ post, isFocal = false }: PostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    counts,
    userReactions,
    userReposts,
    initializePost,
    toggleReaction,
    toggleRepost
  } = useRealtime();

  const [isRepostModalVisible, setRepostModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);

  // Initialize post state in context
  useEffect(() => {
    initializePost(post.id, {
      likes: post.likeCount,
      dislikes: post.dislikeCount,
      laughs: post.laughCount,
      reposts: post.repostCount,
      comments: post.commentCount,
      userReaction: post.userReaction,
      isReposted: post.isReposted || false,
      isBookmarked: post.isBookmarked || false,
    });
  }, [post.id]);

  const reaction = userReactions[post.id] || post.userReaction;
  const isReposted = userReposts[post.id] ?? post.isReposted;

  const currentCounts = counts[post.id] || {
    likes: post.likeCount,
    dislikes: post.dislikeCount,
    laughs: post.laughCount,
    reposts: post.repostCount,
    comments: post.commentCount,
  };

  const handleComment = () => {
    router.push({ pathname: '/(compose)/compose', params: { replyToId: post.id, authorUsername: post.author.username } });
  };

  const handleReaction = async (action: ReactionAction) => {
    try {
      await toggleReaction(post.id, action);
    } catch (error) {
      console.error('Failed to react', error);
    }
  };

  const handleRepost = async () => {
    setRepostModalVisible(false);
    try {
      await toggleRepost(post.id);
    } catch (error) {
      console.error('Failed to repost', error);
    }
  };

  const handleQuote = () => {
    router.push({ pathname: '/(compose)/compose', params: { quotePostId: post.id } });
    setRepostModalVisible(false);
  };

  const handleMentionPress = (mention: string) => router.push(`/(profile)/${mention.substring(1)}`);
  const handleHashtagPress = (hashtag: string) => router.push(`/(feed)/hashtag/${hashtag.substring(1)}`);
  const goToProfile = () => router.push(`/(profile)/${post.author.username}`);
  const goToPost = () => !isFocal && router.push(`/post/${post.id}`);


  return (
    <Card>
      <View style={styles.container}>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.mainContent}>
          {post.repostedBy && (
            <View style={styles.repostContainer}>
              <Ionicons name="repeat" size={14} color={theme.textTertiary} />
              <Text style={[styles.repostText, { color: theme.textTertiary }]}>{post.repostedBy.name} reposted</Text>
            </View>
          )}

          <Card.Header>
            <View style={styles.authorContainer}>
              <TouchableOpacity onPress={goToProfile} activeOpacity={0.7} style={styles.authorInfo}>
                <Text style={[styles.authorName, { color: theme.textPrimary }]} numberOfLines={1}>{post.author.name}</Text>
                <Text style={[styles.authorUsername, { color: theme.textTertiary }]} numberOfLines={1}>@{post.author.username}</Text>
                <Text style={[styles.timestamp, { color: theme.textTertiary }]}>· {timeAgo(post.createdAt)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </Card.Header>

          <Card.Content>
            <TouchableOpacity onPress={goToPost} disabled={isFocal} activeOpacity={0.9}>
              {post.content ? (
                <ParsedText
                  style={[styles.content, { color: theme.textPrimary }]}
                  parse={[
                    { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
                    { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
                  ]}
                >
                  {post.content}
                </ParsedText>
              ) : null}
              {post.media && post.media.length > 0 && (
                <MediaGrid media={post.media} onPress={goToPost} />
              )}
              {post.poll && <PollView poll={post.poll} postId={post.id} />}
              {post.quotedPost && <QuotedPost post={post.quotedPost} />}
            </TouchableOpacity>
          </Card.Content>

          <Card.Actions>
            {isFocal ? (
              <View style={[styles.focalMetadata, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                <Text style={[styles.focalTime, { color: theme.textTertiary }]}>
                  {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <View style={[styles.focalStats, { borderTopColor: theme.border }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{currentCounts.likes}</Text>
                    <Text style={[styles.statLabel, { color: theme.textTertiary }]}> Likes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{currentCounts.dislikes}</Text>
                    <Text style={[styles.statLabel, { color: theme.textTertiary }]}> Dislikes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{currentCounts.laughs}</Text>
                    <Text style={[styles.statLabel, { color: theme.textTertiary }]}> Laughs</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{currentCounts.reposts}</Text>
                    <Text style={[styles.statLabel, { color: theme.textTertiary }]}> Reposts</Text>
                  </View>
                </View>
              </View>
            ) : null}
            <ReactionBar
              postId={post.id}
              onComment={handleComment}
              onRepost={() => setRepostModalVisible(true)}
              onReaction={handleReaction}
              reaction={reaction}
              isReposted={isReposted}
              initialCounts={currentCounts}
              hideCounts={isFocal}
            />
          </Card.Actions>
        </View>
      </View>

      <RepostModal
        visible={isRepostModalVisible}
        onClose={() => setRepostModalVisible(false)}
        onRepost={handleRepost}
        onQuote={handleQuote}
      />
      <PostMenu
        visible={isMenuVisible}
        onClose={() => setMenuVisible(false)}
        post={post}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 20,
    marginRight: 12,
  },
  mainContent: {
    flex: 1,
  },
  repostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  repostText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 4,
  },
  authorUsername: {
    fontSize: 15,
    marginRight: 4,
  },
  timestamp: {
    fontSize: 15,
  },
  moreButton: {
    padding: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  mention: {
    fontWeight: 'bold',
  },
  hashtag: {
    fontWeight: 'normal',
  },
  focalMetadata: {
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  focalTime: {
    fontSize: 15,
    marginBottom: 12,
  },
  focalStats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flexDirection: 'row',
    marginRight: 12,
  },
  statNumber: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  statLabel: {
    fontSize: 15,
  },
});
