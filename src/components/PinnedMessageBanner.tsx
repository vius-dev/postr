
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/message';

interface PinnedMessageBannerProps {
  pinnedPost: Message;
  onPress: () => void;
}

const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({ pinnedPost, onPress }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.pinnedBanner, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Ionicons name="pin" size={16} color={theme.primary} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.pinnedLabel, { color: theme.textTertiary }]}>Pinned Message</Text>
        <Text style={[styles.pinnedText, { color: theme.textPrimary }]} numberOfLines={1}>
          {pinnedPost.text}
        </Text>
      </View>
      <TouchableOpacity onPress={onPress}>
        <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  pinnedText: {
    fontSize: 14,
  },
});

export default PinnedMessageBanner;
