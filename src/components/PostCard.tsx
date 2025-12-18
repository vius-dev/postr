
import React, { useState, useMemo } from 'react';
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

interface PostCardProps {
  post: Post;
  isFocal?: boolean;
}

export default function PostCard({ post, isFocal = false }: PostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { counts, setCounts } = useRealtime();

  const [reaction, setReaction] = useState(post.userReaction);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [isRepostModalVisible, setRepostModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);

  const currentCounts = useMemo(() => counts[post.id] || {
    likes: post.likeCount,
    dislikes: post.dislikeCount,
    laughs: post.laughCount,
    reposts: post.repostCount,
  }, [counts, post.id, post.likeCount, post.dislikeCount, post.laughCount, post.repostCount]);

  const handleComment = () => {
    router.push({ pathname: '/(compose)/reply', params: { replyToId: post.id, authorUsername: post.author.username } });
  };

  const handleReaction = async (action: ReactionAction) => {
    const prevReaction = reaction;
    const nextReaction = prevReaction === action ? 'NONE' : action;

    setReaction(nextReaction);

    let deltas: { [key: string]: number } = { likes: 0, dislikes: 0, laughs: 0 };
    if (prevReaction !== 'NONE') deltas[prevReaction.toLowerCase() + 's'] = -1;
    if (nextReaction !== 'NONE') deltas[nextReaction.toLowerCase() + 's'] = 1;
    
    setCounts(post.id, { ...currentCounts, ...Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, currentCounts[k as keyof typeof currentCounts] + v])) });

    try {
      await api.react(post.id, nextReaction);
    } catch (error) {
      setReaction(prevReaction);
      setCounts(post.id, currentCounts);
    }
  };

  const handleRepost = async () => {
    const nextReposted = !isReposted;
    setIsReposted(nextReposted);
    setCounts(post.id, { ...currentCounts, reposts: currentCounts.reposts + (nextReposted ? 1 : -1) });
    setRepostModalVisible(false);

    try {
      await api.repost(post.id);
    } catch (error) {
      setIsReposted(!nextReposted);
      setCounts(post.id, currentCounts);
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
      <Pressable style={styles.container} onPress={goToPost} disabled={isFocal}>
        <Pressable onPress={goToProfile}>
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
        </Pressable>
        
        <View style={styles.mainContent}>
          {post.repostedBy && (
            <View style={styles.repostContainer}>
              <Ionicons name="repeat" size={14} color={theme.textTertiary} />
              <Text style={[styles.repostText, { color: theme.textTertiary }]}>{post.repostedBy.name} reposted</Text>
            </View>
          )}

          <Card.Header>
            <View style={styles.authorContainer}>
              <View style={styles.authorInfo}>
                <Text style={[styles.authorName, { color: theme.textPrimary }]}>{post.author.name}</Text>
                <Text style={[styles.authorUsername, { color: theme.textTertiary }]}>@{post.author.username}</Text>
                <Text style={[styles.timestamp, { color: theme.textTertiary }]}>· {timeAgo(post.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </Card.Header>

          <Card.Content>
            <ParsedText
              style={[styles.content, { color: theme.textPrimary }]}
              parse={[
                { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
                { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
              ]}
            >
              {post.content}
            </ParsedText>
            {post.poll && <PollView poll={post.poll} />}
            {post.quotedPost && <QuotedPost post={post.quotedPost} />}
          </Card.Content>

          <Card.Actions>
            <ReactionBar
              postId={post.id}
              onComment={handleComment}
              onRepost={() => setRepostModalVisible(true)}
              onReaction={handleReaction}
              reaction={reaction}
              isReposted={isReposted}
              initialCounts={{
                ...currentCounts,
                comments: post.commentCount,
              }}
            />
          </Card.Actions>
        </View>
      </Pressable>

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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    flexShrink: 1, // Allow text to wrap if needed
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  authorUsername: {
    marginLeft: 5,
    fontSize: 15,
  },
  timestamp: {
    marginLeft: 5,
    fontSize: 15,
  },
  moreButton: {
    padding: 2, // Easier to tap
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  mention: {
    fontWeight: 'bold',
  },
  hashtag: {
    fontWeight: 'normal',
  },
});
