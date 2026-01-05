
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
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
import { SyncEngine } from '@/lib/sync/SyncEngine';
import Card from '@/components/Card'; // Import the new Card component
import { timeAgo } from '@/utils/time'; // Import a time formatting utility
import MediaGrid from '@/components/MediaGrid';
import ImageViewer from '@/components/ImageViewer';

import { isAuthorityActive } from '@/utils/user';

interface PostCardProps {
  post: Post;
  isFocal?: boolean;
}

export default function PostCard({ post, isFocal = false }: PostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const showAuthority = isAuthorityActive(post.author);

  /*
  const {
    counts,
    userReactions,
    userReposts,
  } = useRealtime();
  */
  const [isRepostModalVisible, setRepostModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // For now, we rely on the Post object provided by the feed/API
  // Realtime updates should ideally update the Post object in state/context
  const reaction = post.viewer.reaction;
  const isReposted = post.viewer.isReposted;

  // For reposts, the "displayPost" which contains the content, media, etc. is the original
  const displayPost = (post.type === 'repost' && post.repostedPost) ? post.repostedPost : post;



  // CRITICAL FIX: Recursively resolve repost chains
  // If we're displaying a repost, and that repost is itself a repost, follow the chain
  let finalDisplayPost = displayPost;
  let depth = 0;
  const MAX_DEPTH = 5; // Prevent infinite loops

  while (finalDisplayPost.type === 'repost' && finalDisplayPost.repostedPost && depth < MAX_DEPTH) {
    finalDisplayPost = finalDisplayPost.repostedPost;
    depth++;
  }

  // Use the final resolved post for display
  const resolvedDisplayPost = finalDisplayPost;

  const currentCounts = {
    likes: post.stats.likes,
    dislikes: post.stats.dislikes,
    laughs: post.stats.laughs,
    reposts: post.stats.reposts,
    comments: post.stats.replies, // replies is used for comments
  };

  const handleComment = () => {
    router.push({ pathname: '/(compose)/compose', params: { replyToId: post.id, authorUsername: post.author.username } });
  };

  const handleReaction = async (action: ReactionAction) => {
    try {
      await SyncEngine.toggleReaction(post.id, action as 'LIKE' | 'REPOST');
    } catch (error) {
      console.error('Failed to react', error);
    }
  };

  const handleRepost = async () => {
    setRepostModalVisible(false);
    try {
      await SyncEngine.toggleReaction(post.id, 'REPOST');
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
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
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
              {resolvedDisplayPost.author.username ? (
                <TouchableOpacity onPress={() => router.push(`/(profile)/${resolvedDisplayPost.author.username}`)} activeOpacity={0.7} style={styles.authorInfo}>
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
          </Card.Header>

          <Card.Content>
            <TouchableOpacity onPress={() => !isFocal && router.push(`/post/${resolvedDisplayPost.id}`)} disabled={isFocal} activeOpacity={0.9}>
              {resolvedDisplayPost.content ? (
                <ParsedText
                  style={[styles.content, { color: theme.textPrimary }]}
                  parse={[
                    { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
                    { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
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
    flex: 1, // Allow taking available space
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
    flexShrink: 1, // Shrink first
  },
  authorUsername: {
    fontSize: 15,
    marginRight: 4,
    flexShrink: 0, // Do not shrink
  },
  timestamp: {
    fontSize: 15,
    flexShrink: 0, // Do not shrink
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
