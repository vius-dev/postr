import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { api } from '@/lib/api';
import { SuggestedUserCard } from './SuggestedUserCard';

export const WhoToFollow = () => {
    const { theme } = useTheme();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const results = await api.getSuggestedUsers();
                setUsers(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadSuggestions();
    }, []);

    if (loading) return null;
    if (users.length === 0) return null;

    return (
        <View style={[styles.container, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Who to follow</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {users.map(user => (
                    <SuggestedUserCard key={user.id} user={user} />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 16,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
});
