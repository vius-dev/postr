
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReactionBar from '@/components/ReactionBar';
import RepostModal from '@/components/RepostModal';
import PollView from '@/components/PollView';
import QuotedPost from '@/components/QuotedPost';
import PostMenu from '@/components/PostMenu';
import ParsedText from 'react-native-parsed-text';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const [reaction, setReaction] = useState(post.userReaction);
  const [isRepostModalVisible, setRepostModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const { theme } = useTheme();

  const handleComment = () => {
    router.push(`/post/${post.id}`);
  };

  const handleReaction = async (action: 'LIKE' | 'DISLIKE' | 'LAUGH') => {
    const currentReaction = reaction;
    const newReaction = currentReaction === action ? 'NONE' : action;
    setReaction(newReaction);
    try {
      await api.react(post.id, newReaction);
    } catch (error) {
      setReaction(currentReaction); // Revert on error
    }
  };

  const handleRepost = () => {
    api.repost(post.id);
    setRepostModalVisible(false);
  };

  const handleQuote = () => {
    router.push({ pathname: '/compose', params: { quotePostId: post.id } });
    setRepostModalVisible(false);
  };

  const handleMoreOptions = () => {
    setMenuVisible(true);
  };

  const handleMentionPress = (mention: string) => {
    console.log('Mention pressed: ', mention);
    // Navigate to user profile
    router.push(`/(profile)/${mention.substring(1)}`);
  };

  const handleHashtagPress = (hashtag: string) => {
    console.log('Hashtag pressed: ', hashtag);
    const tag = hashtag.substring(1);
    router.push(`/(feed)/hashtag/${tag}`);
  };

  const renderText = (content: string) => {
    return (
      <ParsedText
        style={[styles.content, { color: theme.textPrimary }]}
        parse={[
          { pattern: /@(\w+)/, style: [styles.mention, { color: theme.link }], onPress: handleMentionPress },
          { pattern: /#(\w+)/, style: [styles.hashtag, { color: theme.link }], onPress: handleHashtagPress },
        ]}
        childrenProps={{ allowFontScaling: false }}
      >
        {content}
      </ParsedText>
    );
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.card }]}>
      <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
      <View style={styles.contentContainer}>
        {post.repostedBy && (
          <View style={styles.repostContainer}>
            <Ionicons name="repeat" size={16} color={theme.textTertiary} />
            <Text style={[styles.repostText, { color: theme.textTertiary }]}>{post.repostedBy.name} reposted</Text>
          </View>
        )}
        <View style={styles.authorContainer}>
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: theme.textPrimary }]}>{post.author.name}</Text>
            <Text style={[styles.authorUsername, { color: theme.textTertiary }]}>@{post.author.username}</Text>
          </View>
          <View style={styles.metaContainer}>
            <Text style={[styles.timestamp, { color: theme.textTertiary }]}>{new Date(post.createdAt).toLocaleDateString()}</Text>
            <TouchableOpacity onPress={handleMoreOptions} style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
        {renderText(post.content)}
        {post.poll && <PollView poll={post.poll} />}
        {post.quotedPost && <QuotedPost post={post.quotedPost} />}
        <ReactionBar
          postId={post.id}
          onComment={handleComment}
          onRepost={() => setRepostModalVisible(true)}
          onReaction={handleReaction}
          reaction={reaction}
          initialCounts={{
            likes: post.likeCount,
            dislikes: post.dislikeCount,
            laughs: post.laughCount,
            reposts: post.repostCount,
            comments: post.commentCount,
          }}
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  contentContainer: {
    flex: 1,
  },
  repostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  repostText: {
    marginLeft: 5,
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
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
  },
  moreButton: {
    marginLeft: 10,
  },
  content: {
    marginTop: 5,
    lineHeight: 20
  },
  mention: {
  },
  hashtag: {
  },
});
