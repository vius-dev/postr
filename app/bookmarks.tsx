
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import FeedList from '@/components/FeedList';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { Stack } from 'expo-router';
import { usePostNavigation } from '@/hooks/usePostNavigation';

export default function BookmarksScreen() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();
    const { isWeb } = useResponsive();
    const postNavigation = usePostNavigation();

    useEffect(() => {
        const fetchBookmarks = async () => {
            try {
                const res = await api.getBookmarks();
                setPosts(res);
            } catch (error) {
                console.error('Failed to fetch bookmarks:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookmarks();
    }, []);

    const Container = isWeb ? View : SafeAreaView;

    return (
        <Container style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Bookmarks', headerShown: true }} />
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FeedList
                    posts={posts}
                    onRefresh={() => { }} // Not implemented for bookmarks in mock usually
                    onLoadMore={() => { }}
                    refreshing={false}
                    {...postNavigation}
                />
            )}
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
