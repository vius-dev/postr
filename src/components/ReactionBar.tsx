
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRealtime } from '@/realtime/RealtimeContext';
import GrinTearsIcon from '@/components/icons/GrinTearsIcon';
import { useTheme } from '@/theme/theme';

type ReactionAction = 'LIKE' | 'DISLIKE' | 'LAUGH' | 'NONE';

interface ReactionBarProps {
  postId: string;
  onComment: () => void;
  onRepost: () => void;
  onReaction: (action: ReactionAction) => void;
  reaction: ReactionAction;
  initialCounts: {
    likes: number;
    dislikes: number;
    laughs: number;
    reposts: number;
    comments: number;
  };
  isReposted?: boolean;
  hideCounts?: boolean;
}

export default function ReactionBar({
  postId,
  onComment,
  onRepost,
  onReaction,
  reaction,
  initialCounts,
  isReposted,
  hideCounts = false
}: ReactionBarProps) {
  const { counts } = useRealtime();
  const { theme } = useTheme();
  const [isLocked, setIsLocked] = useState(false);

  const currentCounts = counts[postId] || {
    likes: initialCounts.likes,
    dislikes: initialCounts.dislikes,
    laughs: initialCounts.laughs,
    reposts: initialCounts.reposts,
    comments: initialCounts.comments,
  };

  const iconColor = theme.textTertiary;
  const repostColor = isReposted ? theme.primary : iconColor;

  const handleInteraction = async (action: 'COMMENT' | 'REPOST' | ReactionAction, callback: () => void) => {
    if (isLocked) return;
    setIsLocked(true);
    try {
      await callback();
      if (action !== 'COMMENT') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      // Small timeout to prevent super-rapid fire spamming
      setTimeout(() => setIsLocked(false), 300);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => handleInteraction('COMMENT', onComment)} style={styles.button}>
        <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
        {!hideCounts && <Text style={[styles.count, { color: iconColor }]}>{currentCounts.comments}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleInteraction('REPOST', onRepost)} style={styles.button}>
        <Ionicons name={isReposted ? "repeat" : "repeat-outline"} size={20} color={repostColor} />
        {!hideCounts && <Text style={[styles.count, { color: repostColor }]}>{currentCounts.reposts}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleInteraction('LIKE', () => onReaction('LIKE'))} style={styles.button}>
        <Ionicons name={reaction === 'LIKE' ? 'heart' : 'heart-outline'} size={20} color={reaction === 'LIKE' ? theme.like : iconColor} />
        {!hideCounts && <Text style={[styles.count, { color: iconColor }]}>{currentCounts.likes}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleInteraction('DISLIKE', () => onReaction('DISLIKE'))} style={styles.button}>
        <FontAwesome5 name="heart-broken" size={17} color={reaction === 'DISLIKE' ? theme.primary : iconColor} />
        {!hideCounts && <Text style={[styles.count, { color: iconColor }]}>{currentCounts.dislikes}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleInteraction('LAUGH', () => onReaction('LAUGH'))} style={styles.button}>
        <GrinTearsIcon size={17} active={reaction === 'LAUGH'} />
        {!hideCounts && <Text style={[styles.count, { color: iconColor }]}>{currentCounts.laughs}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    marginLeft: 5,
  },
});
