import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { List } from '@/types/list';
import { ListItem } from '@/components/lists/ListItem';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { eventEmitter } from '@/lib/EventEmitter';

export default function ListsScreen() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const [lists, setLists] = useState<List[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLists = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getLists(user.id);
            setLists(data);
        } catch (error) {
            console.error('Failed to load lists:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLists();

        // Refresh on list creation/deletion
        const handleListUpdate = () => loadLists();
        eventEmitter.on('listUpdated', handleListUpdate); // We'll emit this event
        return () => eventEmitter.off('listUpdated', handleListUpdate);
    }, [user]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Lists</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>@{user?.username}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push('/(modals)/create-list')}
                >
                    <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Pinned Lists / All Lists */}
            {/* For MVP we just show "Your Lists" which implicitly includes any owned list. */}
            {/* In a full implementation we'd separate Pinned vs Owned vs Subscribed. */}

            <View style={[styles.sectionHeader, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Your Lists</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={lists}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ListItem
                            list={item}
                            onPress={() => router.push(`/lists/${item.id}`)}
                            showOwner={false} // Owned lists don't need owner info
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                You haven't created any lists yet.
                            </Text>
                            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                                Lists allow you to curate your own timeline of people you care about.
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
    },
    createButton: {
        padding: 4,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
