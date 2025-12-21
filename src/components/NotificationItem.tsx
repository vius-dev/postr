
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Notification } from '@/types/notification';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { brandColors } from '@/theme/colors';

interface NotificationItemProps {
    notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
    const { theme } = useTheme();
    const router = useRouter();

    const renderIcon = () => {
        switch (notification.type) {
            case 'REACTION':
                return <Ionicons name="heart" size={24} color={brandColors.red[500]} />;
            case 'REPOST':
                return <MaterialCommunityIcons name="repeat" size={24} color={theme.primary} />;
            case 'FOLLOW':
                return <Ionicons name="person-add" size={24} color={theme.primary} />;
            case 'REPLY':
                return <Ionicons name="chatbubble" size={22} color={theme.textTertiary} />;
            case 'QUOTE':
                return <MaterialCommunityIcons name="format-quote-open" size={24} color={theme.primary} />;
            default:
                return null;
        }
    };

    const renderContent = () => {
        switch (notification.type) {
            case 'MENTION':
            case 'REPLY':
                return (
                    <View style={styles.mentionContainer}>
                        <View style={styles.mentionHeader}>
                            <TouchableOpacity onPress={() => router.push(`/(profile)/${notification.actor.username}`)}>
                                <Image source={{ uri: notification.actor.avatar }} style={styles.avatarSmall} />
                            </TouchableOpacity>
                            <View style={styles.mentionTextContainer}>
                                <Text style={[styles.actorName, { color: theme.textPrimary }]}>
                                    {notification.actor.name}
                                    <Text style={[styles.username, { color: theme.textTertiary }]}> @{notification.actor.username}</Text>
                                </Text>
                                <Text style={[styles.contentText, { color: theme.textSecondary }]}>
                                    {notification.type === 'MENTION' ? 'Mentioned you' : 'Replied to your post'}
                                </Text>
                            </View>
                        </View>
                        {notification.postSnippet && (
                            <Text style={[styles.snippet, { color: theme.textTertiary }]} numberOfLines={2}>
                                {notification.postSnippet}
                            </Text>
                        )}
                    </View>
                );
            default:
                return (
                    <View style={styles.genericContainer}>
                        <View style={styles.iconContainer}>{renderIcon()}</View>
                        <View style={styles.bodyContainer}>
                            <TouchableOpacity onPress={() => router.push(`/(profile)/${notification.actor.username}`)}>
                                <Image source={{ uri: notification.actor.avatar }} style={styles.avatarSmall} />
                            </TouchableOpacity>
                            <Text style={[styles.actorName, { color: theme.textPrimary }]}>
                                {notification.actor.name}
                                <Text style={[styles.actionText, { color: theme.textPrimary }]}>
                                    {notification.type === 'REACTION' && ' liked your post'}
                                    {notification.type === 'REPOST' && ' reposted your post'}
                                    {notification.type === 'FOLLOW' && ' followed you'}
                                    {notification.type === 'QUOTE' && ' quoted your post'}
                                </Text>
                            </Text>
                            {notification.postSnippet && (
                                <Text style={[styles.snippet, { color: theme.textTertiary }]} numberOfLines={2}>
                                    {notification.postSnippet}
                                </Text>
                            )}
                        </View>
                    </View>
                );
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { borderBottomColor: theme.border, backgroundColor: theme.background },
                !notification.isRead && { backgroundColor: theme.surface }
            ]}
            onPress={() => notification.postId && router.push(`/post/${notification.postId}`)}
        >
            {renderContent()}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    mentionContainer: {
        flex: 1,
    },
    mentionHeader: {
        flexDirection: 'row',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 4,
    },
    mentionTextContainer: {
        flex: 1,
    },
    actorName: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    username: {
        fontWeight: 'normal',
    },
    contentText: {
        fontSize: 15,
        marginTop: 2,
    },
    snippet: {
        fontSize: 15,
        marginTop: 4,
        marginLeft: 40,
    },
    genericContainer: {
        flexDirection: 'row',
    },
    iconContainer: {
        width: 40,
        alignItems: 'center',
        paddingTop: 4,
    },
    bodyContainer: {
        flex: 1,
    },
    actionText: {
        fontWeight: 'normal',
    },
});
