
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
        setMessages(prevMessages => [event.message, ...prevMessages]);
      }
    };

    eventEmitter.on('newMessage', handleNewMessage);
    return () => {
      eventEmitter.off('newMessage', handleNewMessage);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (newMessage.trim().length === 0 || typeof conversationId !== 'string') return;

    try {
      const sentMessage = await api.sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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
            <View>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
            </View>
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

            {/* Messages List */}
            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageContainer,
                        item.senderId === currentUser.id 
                            ? [styles.myMessage, { backgroundColor: theme.primary }] 
                            : [styles.theirMessage, { backgroundColor: theme.surface }]
                    ]}>
                        <Text style={{ 
                            fontSize: 16,
                            color: item.senderId === currentUser.id ? 'white' : theme.textPrimary 
                        }}>
                            {item.text}
                        </Text>
                    </View>
                )}
                style={styles.messageList}
                contentContainerStyle={{ paddingVertical: 10 }}
                inverted
            />

            {/* Composer */}
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
});
