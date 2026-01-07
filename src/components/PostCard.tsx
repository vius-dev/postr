
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ReactionBar from '@/components/ReactionBar';
import RepostModal from '@/components/RepostModal';
import PollView from '@/components/PollView';
import QuotedPost from '@/components/QuotedPost';
import PostMenu from '@/components/PostMenu';
import ParsedText from 'react-native-parsed-text';
import { Post, ReactionAction } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { useRealtime } from '@/realtime/RealtimeContext';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import Card from '@/components/Card';
import { timeAgo } from '@/utils/time';
import MediaGrid from '@/components/MediaGrid';
import ImageViewer from '@/components/ImageViewer';

import { isAuthorityActive } from '@/utils/user';

export interface PostInteractionHandlers {
  onPressPost?: (post: Post) => void;
  onPressUser?: (username: string) => void;
  onPressCompose?: (replyToPost: Post) => void;
  onPressQuote?: (quotePost: Post) => void;
  onPressImage?: (post: Post, index: number) => void;
  onPressHashtag?: (hashtag: string) => void;
  onPressLink?: (url: string) => void;
}

interface PostCardProps extends PostInteractionHandlers {
  post: Post;
  isFocal?: boolean;
  showThreadLine?: boolean;
}

export default function PostCard({
  post,
  isFocal = false,
  showThreadLine = false,
  onPressPost,
  onPressUser,
  onPressCompose,
  onPressQuote,
  onPressHashtag,
  onPressLink
}: PostCardProps) {
  const { theme } = useTheme();

  const showAuthority = isAuthorityActive(post.author);

  const {
    counts,
    userReactions,
    userReposts,
    initializePost,
  } = useRealtime();

  const [isRepostModalVisible, setRepostModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    initializePost(post.id, {
      likes: post.stats.likes,
      dislikes: post.stats.dislikes,
      laughs: post.stats.laughs,
      reposts: post.stats.reposts,
      replies: post.stats.replies,
      userReaction: post.viewer.reaction,
      isReposted: post.viewer.isReposted,
      isBookmarked: post.viewer.isBookmarked,
    });
  }, [post.id, post.stats, post.viewer, initializePost]);

  const reaction = userReactions[post.id] !== undefined ? userReactions[post.id] : post.viewer.reaction;
  const isReposted = userReposts[post.id] !== undefined ? userReposts[post.id] : post.viewer.isReposted;

  const displayPost = (post.type === 'repost' && post.repostedPost) ? post.repostedPost : post;

  let finalDisplayPost = displayPost;
  let depth = 0;
  const MAX_DEPTH = 5;

  while (finalDisplayPost.type === 'repost' && finalDisplayPost.repostedPost && depth < MAX_DEPTH) {
    finalDisplayPost = finalDisplayPost.repostedPost;
    depth++;
  }

  const resolvedDisplayPost = finalDisplayPost;

  const registryCounts = counts[post.id];
  const currentCounts = {
    likes: registryCounts ? registryCounts.likes : post.stats.likes,
    dislikes: registryCounts ? registryCounts.dislikes : post.stats.dislikes,
    laughs: registryCounts ? registryCounts.laughs : post.stats.laughs,
    reposts: registryCounts ? registryCounts.reposts : post.stats.reposts,
    comments: registryCounts ? registryCounts.replies : post.stats.replies,
  };

  const handleComment = () => {
    onPressCompose?.(resolvedDisplayPost);
  };

  const handleReaction = async (action: ReactionAction) => {
    try {
      if (action === 'NONE') return;
      await SyncEngine.toggleReaction(resolvedDisplayPost.id, action as any);
    } catch (error) {
      console.error('Failed to react', error);
    }
  };

  const handleRepost = async () => {
    setRepostModalVisible(false);
    try {
      await SyncEngine.toggleReaction(resolvedDisplayPost.id, 'REPOST');
    } catch (error) {
      console.error('Failed to repost', error);
    }
  };

  const handleQuote = () => {
    setRepostModalVisible(false);
    onPressQuote?.(post);
  };

  const handleMentionPress = (mention: string) => {
    onPressUser?.(mention.substring(1));
  };

  const handleHashtagPress = (hashtag: string) => {
    onPressHashtag?.(hashtag);
  };

  const handleUrlPress = (url: string) => {
    const sanitizedUrl = url.startsWith('http') ? url : `https://${url}`;
    onPressLink ? onPressLink(sanitizedUrl) : null;
  };

  const goToProfile = () => onPressUser?.(post.author.username);
  const goToPost = () => !isFocal && onPressPost?.(post);

  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={goToProfile}>
            <Image
              source={{ uri: post.author.avatar }}
              style={[styles.avatar, { backgroundColor: theme.surface }]}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
          {showThreadLine && (
            <View style={[styles.threadLine, { backgroundColor: theme.borderLight }]} />
          )}
        </View>

        <View style={styles.mainContent}>
          {post.repostedBy && (
            <View style={styles.repostContainer}>
              <Ionicons name="repeat" size={14} color={theme.textTertiary} />
              <Text style={[styles.repostText, { color: theme.textTertiary }]}>{post.repostedBy.name} reposted</Text>
            </View>
          )}

          <Card.Header>
            <View style={styles.authorContainer}>
              {resolvedDisplayPost.author.username ? (
                <TouchableOpacity onPress={() => onPressUser?.(resolvedDisplayPost.author.username)} activeOpacity={0.7} style={styles.authorInfo}>
                  <Text style={[styles.authorName, { color: theme.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{resolvedDisplayPost.author.name}</Text>
                  {isAuthorityActive(resolvedDisplayPost.author) && (
                    <Image source={{ uri: resolvedDisplayPost.author.official_logo }} style={styles.officialLogo} contentFit="contain" />
                  )}
                  {resolvedDisplayPost.author.is_verified && !isAuthorityActive(resolvedDisplayPost.author) && (
                    <Ionicons name="checkmark-circle" size={14} color={theme.primary} style={styles.verifiedBadge} />
                  )}
                  <Text style={[styles.authorUsername, { color: theme.textTertiary }]} numberOfLines={1}>@{resolvedDisplayPost.author.username}</Text>
                  <Text style={[styles.timestamp, { color: theme.textTertiary }]} numberOfLines={1}>
                    · {timeAgo(post.type === 'repost' || post.type === 'quote' ? post.createdAt : resolvedDisplayPost.createdAt)}
                    {resolvedDisplayPost.meta.isEdited &&
                      resolvedDisplayPost.type !== 'poll' &&
                      post.type !== 'repost' && post.type !== 'quote' && ` · ${resolvedDisplayPost.meta.editedLabel}`}
                    {post.type === 'repost' && ' · Reposted'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>

            {resolvedDisplayPost.replyToUsername && !isFocal && (
              <View style={styles.replyingTo}>
                <Text style={[styles.replyingToText, { color: theme.textTertiary }]}>
                  Replying to <Text style={{ color: theme.primary }}>@{resolvedDisplayPost.replyToUsername}</Text>
                </Text>
              </View>
            )}
          </Card.Header>

          <Card.Content>
            <TouchableOpacity onPress={goToPost} disabled={isFocal} activeOpacity={0.9}>
              {resolvedDisplayPost.content ? (
                <ParsedText
                  style={[styles.content, { color: theme.textPrimary }]}
                  parse={[
                    { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
                    { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
                    { type: 'url', style: [styles.url, { color: theme.link }], onPress: handleUrlPress },
                  ]}
                >
                  {resolvedDisplayPost.content}
                </ParsedText>
              ) : null}
              {resolvedDisplayPost.media && resolvedDisplayPost.media.length > 0 && (
                <MediaGrid
                  media={resolvedDisplayPost.media}
                  onPress={(index) => {
                    setSelectedImageIndex(index);
                    setImageViewerVisible(true);
                  }}
                />
              )}
              {resolvedDisplayPost.poll && <PollView poll={resolvedDisplayPost.poll} postId={resolvedDisplayPost.id} />}
              {resolvedDisplayPost.quotedPost && <QuotedPost post={resolvedDisplayPost.quotedPost} />}
            </TouchableOpacity>
          </Card.Content>

          <Card.Actions>
            {isFocal ? (
              <View style={[styles.focalMetadata, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                <Text style={[styles.focalTime, { color: theme.textTertiary }]}>
                  {(() => {
                    const date = new Date(post.createdAt);
                    return !isNaN(date.getTime())
                      ? `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : '';
                  })()}
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
              postId={resolvedDisplayPost.id}
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

      {resolvedDisplayPost.media && (
        <ImageViewer
          visible={isImageViewerVisible}
          images={resolvedDisplayPost.media}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
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
    marginRight: 6,
  },
  mainContent: {
    flex: 1,
  },
  repostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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
    flex: 1,
    marginRight: 10,
  },
  officialLogo: {
    width: 14,
    height: 14,
    marginLeft: 2,
    marginRight: 2,
  },
  verifiedBadge: {
    marginLeft: 2,
    marginRight: 2,
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 4,
    flexShrink: 1,
  },
  authorUsername: {
    fontSize: 15,
    marginRight: 4,
    flexShrink: 0,
  },
  timestamp: {
    fontSize: 15,
    flexShrink: 0,
  },
  moreButton: {
    padding: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
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
  avatarSection: {
    alignItems: 'center',
    marginRight: 6,
  },
  threadLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    borderRadius: 1,
  },
  replyingTo: {
    marginTop: 1,
    marginBottom: 4,
  },
  replyingToText: {
    fontSize: 13,
  },
});
