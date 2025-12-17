
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRealtime } from '@/realtime/RealtimeContext';
import GrinTearsIcon from '@/components/icons/GrinTearsIcon';
import { useTheme } from '@/theme/theme';

type ReactionAction = 'LIKE' | 'DISLIKE' | 'LAUGH' | 'NONE';

interface ReactionBarProps {
  postId: string;
  onComment: () => void;
  onRepost: () => void;
  onReaction: (action: 'LIKE' | 'DISLIKE' | 'LAUGH') => void;
  reaction: ReactionAction;
  initialCounts: {
    likes: number;
    dislikes: number;
    laughs: number;
    reposts: number;
    comments: number;
  };
}

export default function ReactionBar({ postId, onComment, onRepost, onReaction, reaction, initialCounts }: ReactionBarProps) {
  const { likeCounts, setLikeCount } = useRealtime();
  const { theme } = useTheme();

  useEffect(() => {
    if (initialCounts.likes !== undefined) {
      setLikeCount(postId, initialCounts.likes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCounts.likes, postId]);

  const likeCount = likeCounts[postId] ?? initialCounts.likes;
  const iconColor = theme.textTertiary;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onComment} style={styles.button}>
        <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
        <Text style={[styles.count, { color: iconColor }]}>{initialCounts.comments}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRepost} style={styles.button}>
        <Ionicons name="repeat-outline" size={20} color={iconColor} />
        <Text style={[styles.count, { color: iconColor }]}>{initialCounts.reposts}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onReaction('LIKE')} style={styles.button}>
        <Ionicons name={reaction === 'LIKE' ? 'heart' : 'heart-outline'} size={20} color={reaction === 'LIKE' ? theme.like : iconColor} />
        <Text style={[styles.count, { color: iconColor }]}>{likeCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onReaction('DISLIKE')} style={styles.button}>
        <FontAwesome5 name="heart-broken" size={17} color={reaction === 'DISLIKE' ? theme.primary : iconColor} />
        <Text style={[styles.count, { color: iconColor }]}>{initialCounts.dislikes}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onReaction('LAUGH')} style={styles.button}>
        <GrinTearsIcon size={17} active={reaction === 'LAUGH'} />
        <Text style={[styles.count, { color: iconColor }]}>{initialCounts.laughs}</Text>
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
