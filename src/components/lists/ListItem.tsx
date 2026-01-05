import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { List } from '@/types/list';
import { useTheme } from '@/theme/theme';

interface ListItemProps {
    list: List;
    onPress: () => void;
    showOwner?: boolean;
}

export const ListItem = ({ list, onPress, showOwner = true }: ListItemProps) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: theme.borderLight }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                <Ionicons name="list" size={24} color={theme.textSecondary} />
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                        {list.name}
                    </Text>
                    {list.isPrivate && (
                        <Ionicons name="lock-closed" size={14} color={theme.textTertiary} style={styles.lockIcon} />
                    )}
                </View>

                {showOwner && (
                    <View style={styles.metaRow}>
                        <Image source={{ uri: list.owner.avatar }} style={styles.avatar} />
                        <Text style={[styles.ownerName, { color: theme.textSecondary }]}>
                            @{list.owner.username}
                        </Text>
                        <Text style={[styles.metaDot, { color: theme.textTertiary }]}>·</Text>
                        <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
                            {list.memberCount} members
                        </Text>
                    </View>
                )}

                {!showOwner && (
                    <Text style={[styles.memberCount, { color: theme.textSecondary, marginTop: 4 }]}>
                        {list.memberCount} members · {list.subscriberCount} subscribers
                    </Text>
                )}
            </View>

            {list.isSubscribed && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 6,
    },
    lockIcon: {
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 6,
    },
    ownerName: {
        fontSize: 14,
    },
    metaDot: {
        fontSize: 14,
        marginHorizontal: 4,
    },
    memberCount: {
        fontSize: 14,
    },
});
