
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/types/message';
import MessageBubble from '@/components/MessageBubble';
import MessageInput from '@/components/MessageInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConversationHeader from '@/components/ConversationHeader';
import { eventEmitter } from '@/lib/EventEmitter';
import PinnedMessageBanner from '@/components/PinnedMessageBanner';
import { useAuth } from '@/providers/AuthProvider';

export default function ConversationScreen() {
    const { theme } = useTheme();
    const { id: conversationId } = useLocalSearchParams();
    const { user: currentUser } = useAuth();

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const loadConversation = useCallback(async () => {
        if (typeof conversationId !== 'string') return;

        setLoading(true);
        try {
            const data = await api.getConversation(conversationId);
            if (data) {
                setConversation(data.conversation);
                setMessages(data.messages.slice().reverse());
                if (data.conversation.unreadCount > 0) {
                    await api.markConversationAsRead(conversationId);
                }
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        loadConversation();

        const handleNewMessage = (event: { conversationId: string, message: Message }) => {
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
            }
        };

        const handleConversationUpdate = (event: { conversationId: string }) => {
            if (event.conversationId === conversationId) {
                loadConversation();
            }
        };

        eventEmitter.on('newMessage', handleNewMessage);
        eventEmitter.on('conversationUpdated', handleConversationUpdate);

        return () => {
            eventEmitter.off('newMessage', handleNewMessage);
            eventEmitter.off('conversationUpdated', handleConversationUpdate);
        };
    }, [loadConversation, conversationId]);

    const handleSendMessage = async (text: string) => {
        if (typeof conversationId !== 'string') return;

        try {
            const newMessage = await api.sendMessage(conversationId, text);
            setMessages(prev => [newMessage, ...prev]);
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
        } catch (error) {
            console.error('Error pinning message:', error);
        }
    };

    const pinnedPost = conversation?.pinnedMessageId
        ? messages.find(m => m.id === conversation.pinnedMessageId)
        : null;

    const scrollToPinnedMessage = () => {
        if (!conversation?.pinnedMessageId) return;
        const index = messages.findIndex(m => m.id === conversation.pinnedMessageId);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    if (!conversation) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.textPrimary }}>Conversation not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={90}
            >
                <ConversationHeader conversation={conversation} />
                {pinnedPost && <PinnedMessageBanner pinnedPost={pinnedPost} onPress={scrollToPinnedMessage} />}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            isMe={item.senderId === currentUser?.id}
                            conversation={conversation}
                            onReaction={handleReaction}
                            onPinMessage={handlePinMessage}
                        />
                    )}
                    inverted
                    contentContainerStyle={styles.listContainer}
                />
                <MessageInput onSend={handleSendMessage} conversation={conversation} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        paddingHorizontal: 10,
    },
});
