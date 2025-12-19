
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/types/message';
import { User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { eventEmitter } from '@/lib/EventEmitter';

export default function ConversationScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  const currentUser: User = {
    id: '0', name: 'Current User', username: 'currentuser',
    avatar: '',
    is_active: false,
    is_limited: false,
    is_shadow_banned: false,
    is_suspended: false,
    is_muted: false
  }; // Mock current user

  const loadConversationDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [convData, messagesData] = await Promise.all([
        api.getConversation(id),
        api.getMessages(id),
      ]);

      if (convData) {
        setConversation(convData);
        setMessages(messagesData.slice().reverse());
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof conversationId === 'string') {
      loadConversationDetails(conversationId);
    }
  }, [conversationId, loadConversationDetails]);

  useEffect(() => {
    const handleNewMessage = (event: { conversationId: string; message: Message }) => {
      if (event.conversationId === conversationId) {
        setMessages(prevMessages => {
          const index = prevMessages.findIndex(m => m.id === event.message.id);
          if (index !== -1) {
            const newMessages = [...prevMessages];
            newMessages[index] = event.message;
            return newMessages;
          }
          return [event.message, ...prevMessages];
        });

        // Refresh conversation details if it's a pinning event or similar
        if (event.message.type === 'SYSTEM' && event.message.text.includes('pinned')) {
          loadConversationDetails(conversationId as string);
        }
      }
    };

    eventEmitter.on('newMessage', handleNewMessage);
    return () => {
      eventEmitter.off('newMessage', handleNewMessage);
    };
  }, [conversationId, loadConversationDetails]);

  const handleSend = async () => {
    if (newMessage.trim().length === 0 || typeof conversationId !== 'string') return;

    try {
      const sentMessage = await api.sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (typeof conversationId !== 'string') return;
    try {
      await api.addReaction(conversationId, msgId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handlePinMessage = async (msgId: string) => {
    if (typeof conversationId !== 'string') return;
    try {
      await api.pinMessage(conversationId, msgId);
      loadConversationDetails(conversationId);
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

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

  const pinnedPost = conversation?.pinnedMessageId
    ? messages.find(m => m.id === conversation.pinnedMessageId)
    : null;

  const renderHeader = () => {
    if (!conversation) return null;

    const otherUser = conversation.participants.find(p => p.id !== currentUser.id);

    let title = '';
    let subtitle = '';

    if (conversation.type === 'DM') {
      title = otherUser?.name || 'Direct Message';
      subtitle = `@${otherUser?.username}` || '';
    } else {
      title = conversation.name || 'Group Chat';
      subtitle = `${conversation.participants.length} members`;
    }

    return (
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerContent}
          onPress={() => router.push(`/conversation/${conversationId}/info`)}
          disabled={conversation.type === 'DM'}
        >
          <View>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
          </View>
          {conversation.type !== 'DM' && (
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.textPrimary }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.textPrimary }}>Conversation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {renderHeader()}

        {/* Pinned Post Banner */}
        {pinnedPost && (
          <View style={[styles.pinnedBanner, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Ionicons name="pin" size={16} color={theme.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pinnedLabel, { color: theme.textTertiary }]}>Pinned Message</Text>
              <Text style={[styles.pinnedText, { color: theme.textPrimary }]} numberOfLines={1}>
                {pinnedPost.text}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {/* Scroll to message logic */ }}>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isMe = item.senderId === currentUser.id;
            const isChannel = conversation.type === 'CHANNEL';
            const isAdmin = conversation.ownerId === item.senderId;
            const isSystem = item.type === 'SYSTEM';

            if (isSystem) {
              return (
                <View style={styles.systemMessageContainer}>
                  <Text style={[styles.systemMessageText, { color: theme.textTertiary }]}>
                    {item.text}
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
                        {isAdmin && (
                          <Text style={[styles.adminBadge, { color: theme.primary }]}> • Admin</Text>
                        )}
                      </Text>
                      <Text style={[styles.channelTime, { color: theme.textTertiary }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {renderTextWithMentions(item.text, theme.textPrimary)}

                    {/* Reactions Row */}
                    <View style={styles.reactionsRow}>
                      {item.reactions && Object.entries(item.reactions).map(([emoji, count]) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => handleReaction(item.id, emoji)}
                          style={[styles.reactionBadge, { backgroundColor: theme.surface }]}
                        >
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{count}</Text>
                        </TouchableOpacity>
                      ))}
                      {isAdmin && (
                        <TouchableOpacity
                          onPress={() => handleReaction(item.id, '👍')}
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

            return (
              <TouchableOpacity
                onLongPress={() => handlePinMessage(item.id)}
                delayLongPress={500}
                style={[
                  styles.messageContainer,
                  isMe
                    ? [styles.myMessage, { backgroundColor: theme.primary }]
                    : [styles.theirMessage, { backgroundColor: theme.surface }]
                ]}
              >
                {!isMe && conversation.type === 'GROUP' && (
                  <Text style={[styles.senderName, { color: theme.textSecondary }]}>
                    {conversation.participants.find(p => p.id === item.senderId)?.name || 'User'}
                    {isAdmin && <Text style={{ color: theme.primary }}> • Admin</Text>}
                  </Text>
                )}
                {renderTextWithMentions(item.text, isMe ? 'white' : theme.textPrimary)}

                {item.reactions && (
                  <View style={[styles.reactionsRow, { marginTop: 4 }]}>
                    {Object.entries(item.reactions).map(([emoji, count]) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => handleReaction(item.id, emoji)}
                        style={[styles.reactionBadge, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : theme.background, paddingVertical: 2 }]}
                      >
                        <Text style={[styles.reactionEmoji, { fontSize: 10 }]}>{emoji}</Text>
                        <Text style={[styles.reactionCount, { color: isMe ? 'white' : theme.textSecondary, fontSize: 10 }]}>{count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          style={styles.messageList}
          contentContainerStyle={{ paddingVertical: 10, flexGrow: 1 }}
          inverted
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                {conversation.type === 'GROUP'
                  ? 'No one has posted yet'
                  : conversation.type === 'CHANNEL'
                    ? 'No announcements yet'
                    : 'No messages yet'}
              </Text>
            </View>
          }
        />

        {/* Composer */}
        {conversation.type !== 'CHANNEL' || conversation.ownerId === currentUser.id ? (
          <View style={[styles.composerContainer, { borderTopColor: theme.surface, backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.textTertiary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.readOnlyContainer, { borderTopColor: theme.surface }]}>
            <Text style={[styles.readOnlyText, { color: theme.textTertiary }]}>
              Only admins can post in this channel
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  composerContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    transform: [{ scaleY: -1 }], // Accounts for inverted FlatList
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
  channelText: {
    fontSize: 16,
    lineHeight: 22,
  },
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
    transform: [{ scaleY: -1 }],
  },
  systemMessageText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  readOnlyContainer: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readOnlyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleY: -1 }], // Accounts for inverted FlatList
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
