import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Stack } from 'expo-router';
import { api } from '@/lib/api';
import { Session } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';

export default function SessionsScreen() {
    const { theme } = useTheme();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (sessionId: string) => {
        Alert.alert(
            "Revoke Session",
            "Are you sure you want to log out of this device?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Revoke",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.revokeSession(sessionId);
                            // Refresh list and remove locally for immediate feedback
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                        } catch (e) {
                            Alert.alert("Error", "Failed to revoke session.");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Session }) => (
        <View style={[styles.sessionItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
                <View style={styles.headerRow}>
                    <Ionicons
                        name={item.device.toLowerCase().includes('iphone') ? 'phone-portrait-outline' : item.device.toLowerCase().includes('mac') ? 'laptop-outline' : 'tablet-portrait-outline'}
                        size={20}
                        color={theme.textPrimary}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.device, { color: theme.textPrimary }]}>{item.device}</Text>
                </View>
                <Text style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text>
                <Text style={[styles.lastActive, { color: theme.textTertiary }]}>Last active: {item.last_active}</Text>
            </View>
            {item.is_current ? (
                <View style={styles.badgeContainer}>
                    <Text style={[styles.current, { color: theme.primary }]}>Current</Text>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={() => handleRevoke(item.id)}
                    style={[styles.revokeButton, { backgroundColor: theme.surfaceHover }]}
                >
                    <Text style={[styles.revokeText, { color: theme.error }]}>Revoke</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Apps and Sessions' }} />
            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={sessions}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="apps-outline" size={40} color={theme.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No active sessions found.</Text>
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
    sessionItem: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    device: {
        fontSize: 16,
        fontWeight: '600',
    },
    location: {
        fontSize: 14,
        marginVertical: 2,
    },
    lastActive: {
        fontSize: 12,
    },
    current: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(29, 161, 242, 0.1)',
    },
    revokeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    revokeText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
