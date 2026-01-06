import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import { UserRow } from '@/components/user/UserRow';
import { Ionicons } from '@expo/vector-icons';

export default function MutedUsersScreen() {
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
            const data = await api.getMutedUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnmute = async (userId: string) => {
        await api.unmuteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Muted Users</Text>
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
                            actionLabel="Unmute"
                            onAction={() => handleUnmute(item.id)}
                            actionDestructive
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                You haven't muted anyone.
                            </Text>
                        </View>
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
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
});
