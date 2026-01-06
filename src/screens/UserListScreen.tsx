import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { UserRow } from '@/components/user/UserRow';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '@/components/EmptyState';

interface UserListScreenProps {
    title: string;
    fetchUsers: () => Promise<User[]>;
    emptyTitle: string;
    description?: string;
    emptyIcon?: keyof typeof Ionicons.glyphMap;
    onUserAction?: (userId: string) => Promise<void>;
    actionLabel?: string;
    actionDestructive?: boolean;
}

export default function UserListScreen({
    title,
    fetchUsers,
    emptyTitle,
    description,
    emptyIcon = 'people-outline',
    onUserAction,
    actionLabel,
    actionDestructive
}: UserListScreenProps) {
    const { theme } = useTheme();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: string) => {
        if (onUserAction) {
            await onUserAction(userId);
            // Optionally refresh or update local state
            // For followers/following, we might just keep the user in the list but update their relationship
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <UserRow
                            user={item}
                            actionLabel={actionLabel || ''}
                            onAction={() => handleAction(item.id)}
                            actionDestructive={actionDestructive}
                        />
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            title={emptyTitle}
                            description={description}
                            icon={emptyIcon}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
