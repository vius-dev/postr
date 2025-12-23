
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '@/types/message';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

interface ConversationHeaderProps {
    conversation: Conversation | null;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({ conversation }) => {
    const { theme } = useTheme();
    const router = useRouter();
    const currentUserId = api.getUserId();

    if (!conversation) {
        return null;
    }

    const otherUser = conversation.participants.find(p => p.id !== currentUserId);
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
                onPress={() => router.push(`/conversation/${conversation.id}/info`)}
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

const styles = StyleSheet.create({
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
});

export default ConversationHeader;
