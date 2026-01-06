
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Message, Conversation } from '@/types/message';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/user';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

interface MessageBubbleProps {
  message: Message;
  conversation: Conversation;
  isMe: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  conversation,
  isMe,
  onReaction,
  onPinMessage,
}) => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const renderTextWithMentions = (text: string, color: string) => {
    const parts = text.split(/(@\w+)/g);
    return (
      <Text style={{ fontSize: 16, color }}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return <Text key={i} style={{ color: theme.primary, fontWeight: 'bold' }}>{part}</Text>;
          }
          return part;
        })}
      </Text>
    );
  };

  const isChannel = conversation.type === 'CHANNEL';
  const isItemAdmin = conversation.adminIds?.includes(message.senderId) || conversation.ownerId === message.senderId;
  const isItemOwner = conversation.ownerId === message.senderId;
  const isSystem = message.type === 'SYSTEM';

  if (isSystem) {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={[styles.systemMessageText, { color: theme.textTertiary }]}>
          {message.text}
        </Text>
      </View>
    );
  }

  if (isChannel) {
    return (
      <View style={styles.channelMessageContainer}>
        <View style={styles.channelMessageContent}>
          <View style={styles.channelHeader}>
            <Text style={[styles.channelSenderName, { color: theme.textPrimary }]}>
              {conversation.name}
              {isItemAdmin && (
                <Text style={[styles.adminBadge, { color: theme.primary }]}> • {isItemOwner ? 'Owner' : 'Admin'}</Text>
              )}
            </Text>
            <Text style={[styles.channelTime, { color: theme.textTertiary }]}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {renderTextWithMentions(message.text, theme.textPrimary)}
          <View style={styles.reactionsRow}>
            {message.reactions && Object.entries(message.reactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReaction(message.id, emoji)}
                style={[styles.reactionBadge, { backgroundColor: theme.surface }]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{count}</Text>
              </TouchableOpacity>
            ))}
            {isItemAdmin && (
              <TouchableOpacity
                onPress={() => onReaction(message.id, '👍')}
                style={[styles.reactionBadge, { backgroundColor: theme.surface, opacity: 0.6 }]}
              >
                <Ionicons name="add" size={14} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  const senderName = isMe ? 'Me' : (conversation.participants.find(p => p.id === message.senderId)?.name || 'User');
  const recipientName = isMe ? (conversation.type === 'DM' ? (conversation.participants.find(p => p.id !== currentUserId)?.name || 'User') : conversation.name) : 'Me';

  return (
    <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
      <TouchableOpacity
        onLongPress={() => onPinMessage(message.id)}
        delayLongPress={500}
        style={[
          styles.messageContainer,
          isMe
            ? [styles.myMessage, { backgroundColor: theme.primary }]
            : [styles.theirMessage, { backgroundColor: theme.surface }]
        ]}
      >
        <Text style={[styles.senderName, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary, fontSize: 11, marginBottom: 4 }]}>
          {senderName} {isMe ? '->' : '<-'} {recipientName}
        </Text>
        {renderTextWithMentions(message.text, isMe ? 'white' : theme.textPrimary)}
        {message.media && message.media.length > 0 && (
          <Image
            source={{ uri: message.media[0].url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        )}
        {message.reactions && (
          <View style={[styles.reactionsRow, { marginTop: 4 }]}>
            {Object.entries(message.reactions).map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReaction(message.id, emoji)}
                style={[styles.reactionBadge, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : theme.background, paddingVertical: 2 }]}
              >
                <Text style={[styles.reactionEmoji, { fontSize: 10 }]}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: isMe ? 'white' : theme.textSecondary, fontSize: 10 }]}>{count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 13,
    marginBottom: 2,
    fontWeight: '600',
  },
  adminBadge: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  channelMessageContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  channelMessageContent: {
    width: '100%',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  channelSenderName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  channelTime: {
    fontSize: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  systemMessageText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MessageBubble;
