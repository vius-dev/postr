import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { useRouter } from 'expo-router';

interface UserRowProps {
    user: User;
    actionLabel: string;
    onAction: () => Promise<void>;
    actionDestructive?: boolean;
}

export const UserRow = ({ user, actionLabel, onAction, actionDestructive }: UserRowProps) => {
    const { theme } = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleAction = async () => {
        setLoading(true);
        try {
            await onAction();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: theme.borderLight }]}
            onPress={() => router.push(`/(profile)/${user.username}`)}
        >
            <Image source={{ uri: user.avatar || 'https://via.placeholder.com/50' }} style={styles.avatar} />

            <View style={styles.content}>
                <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>{user.name}</Text>
                <Text style={[styles.username, { color: theme.textSecondary }]} numberOfLines={1}>@{user.username}</Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { borderColor: actionDestructive ? theme.error : theme.border }
                ]}
                onPress={handleAction}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={actionDestructive ? theme.error : theme.textPrimary} />
                ) : (
                    <Text style={[
                        styles.actionText,
                        { color: actionDestructive ? theme.error : theme.textPrimary }
                    ]}>
                        {actionLabel}
                    </Text>
                )}
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    username: {
        fontSize: 14,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
    },
    actionText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
});
