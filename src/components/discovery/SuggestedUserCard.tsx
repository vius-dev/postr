import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { api } from '@/lib/api';

interface SuggestedUserCardProps {
    user: User;
    onFollow?: () => void;
}

export const SuggestedUserCard = ({ user, onFollow }: SuggestedUserCardProps) => {
    const { theme } = useTheme();
    const [isFollowing, setIsFollowing] = useState(false);

    const handleFollow = async () => {
        setIsFollowing(true);
        try {
            await api.followUser(user.id);
            if (onFollow) onFollow();
        } catch (e) {
            console.error(e);
            setIsFollowing(false);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <Image
                source={{ uri: user.avatar || 'https://via.placeholder.com/100' }}
                style={styles.avatar}
            />

            <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                {user.name}
            </Text>
            <Text style={[styles.username, { color: theme.textSecondary }]} numberOfLines={1}>
                @{user.username}
            </Text>

            <TouchableOpacity
                style={[styles.followButton, { backgroundColor: isFollowing ? theme.background : theme.primary }]}
                onPress={handleFollow}
                disabled={isFollowing}
            >
                <Text style={[styles.followText, { color: isFollowing ? theme.textPrimary : '#fff' }]}>
                    {isFollowing ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 140,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
    },
    name: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
        textAlign: 'center',
    },
    username: {
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    followButton: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
    },
    followText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
