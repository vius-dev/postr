import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Conversation } from '@/types/message';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';

interface ConversationItemProps {
    conversation: Conversation;
    isUnread?: boolean;
    isMuted?: boolean;
    lastMessage?: string;
    onPress?: () => void;
    onLongPress?: () => void;
}

export default function ConversationItem({
    conversation,
    isUnread,
    isMuted,
    lastMessage,
    onPress,
    onLongPress
}: ConversationItemProps) {
    const { theme } = useTheme();
    const router = useRouter();
    const { user: currentUser } = useAuth();

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const renderAvatar = () => {
        if (conversation.type === 'DM') {
            const otherUser = conversation.participants.find(p => p.id !== currentUser?.id) || conversation.participants[0];
            return <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />;
        } else {
            let iconName: keyof typeof Ionicons.glyphMap;
            if (conversation.type === 'GROUP') {
                iconName = 'people-outline';
            } else { // CHANNEL
                iconName = 'megaphone-outline';
            }
            return (
                <View style={[styles.avatar, { backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name={iconName} size={28} color={theme.textSecondary} />
                </View>
            );
        }
    }

    const getName = () => {
        if (conversation.type === 'DM') {
            const otherUser = conversation.participants.find(p => p.id !== currentUser?.id) || conversation.participants[0];
            return (
                <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                    {otherUser.name}
                    <Text style={[styles.handle, { color: theme.textTertiary }]}> @{otherUser.username}</Text>
                </Text>
            );
        }
        return <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>{conversation.name}</Text>;
    }

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.background }]}
            onPress={onPress ?? (() => router.push(`/conversation/${conversation.id}`))}
            onLongPress={onLongPress}
            delayLongPress={500}
        >
            {renderAvatar()}
            <View style={styles.content}>
                <View style={styles.header}>
                    {getName()}
                    {conversation.lastMessage && (
                        <Text style={[styles.time, { color: theme.textTertiary }]}>
                            · {formatTime(conversation.lastMessage.createdAt)}
                        </Text>
                    )}
                </View>
                <View style={styles.messageRow}>
                    <Text
                        style={[
                            styles.lastMessage,
                            { color: theme.textSecondary },
                            isUnread && { fontWeight: 'bold', color: theme.textPrimary }
                        ]}
                        numberOfLines={1}
                    >
                        {lastMessage ?? 'No messages yet'}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                        {isUnread && (
                            <View style={[styles.badge, { backgroundColor: theme.primary, marginBottom: 4 }]} />
                        )}
                        {isMuted && (
                            <Ionicons name="notifications-off-outline" size={16} color={theme.textTertiary} />
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 15,
        flexShrink: 1,
    },
    handle: {
        fontWeight: 'normal',
    },
    time: {
        fontSize: 14,
        marginLeft: 4,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: 15,
        flex: 1,
        marginRight: 10,
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
});
