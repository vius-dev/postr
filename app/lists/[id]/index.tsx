import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Post } from '@/types/post';
import { List } from '@/types/list';
import PostCard from '@/components/PostCard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';

export default function ListFeedScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();

    const [list, setList] = useState<List | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);

    // Load details + posts
    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const listData = await api.getList(id);
                setList(listData);

                if (listData) {
                    setLoadingPosts(true);
                    const feed = await api.getListFeed(id);
                    setPosts(feed.posts);
                }
            } catch (error) {
                console.error('Failed to load list feed:', error);
            } finally {
                setLoading(false);
                setLoadingPosts(false);
            }
        };

        fetchData();
    }, [id]);

    const handleSubscribe = async () => {
        if (!list) return;
        try {
            if (list.isSubscribed) {
                await api.unsubscribeFromList(list.id);
                setList(prev => prev ? { ...prev, isSubscribed: false, subscriberCount: (prev.subscriberCount || 1) - 1 } : null);
            } else {
                await api.subscribeToList(list.id);
                setList(prev => prev ? { ...prev, isSubscribed: true, subscriberCount: (prev.subscriberCount || 0) + 1 } : null);
            }
        } catch (error) {
            console.error('Failed to toggle subscription:', error);
        }
    };

    const isOwner = list?.owner.id === user?.id;

    if (loading && !list) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }

    if (!list) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.textSecondary }}>List not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header (Back + Title) */}
            <View style={[styles.navBar, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.navTitleContainer}>
                    <Text style={[styles.navTitle, { color: theme.textPrimary }]} numberOfLines={1}>{list.name}</Text>
                    <Text style={[styles.navSubtitle, { color: theme.textSecondary }]}>@{list.owner.username}</Text>
                </View>
                {isOwner ? (
                    <TouchableOpacity onPress={() => {/* TODO: Edit List */ }}>
                        <Ionicons name="settings-outline" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={/* TODO: Share */ () => { }}>
                        <Ionicons name="share-outline" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Hero Header (Details) */}
            <View style={[styles.hero, { borderBottomColor: theme.borderLight }]}>
                {/* Banner could go here */}
                <View style={styles.heroContent}>
                    <Text style={[styles.listName, { color: theme.textPrimary }]}>{list.name}</Text>
                    {list.description ? (
                        <Text style={[styles.description, { color: theme.textSecondary }]}>{list.description}</Text>
                    ) : null}

                    <View style={styles.statsRow}>
                        <Text style={[styles.stat, { color: theme.textSecondary }]}>
                            <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>{list.memberCount}</Text> members
                        </Text>
                        <Text style={[styles.stat, { color: theme.textSecondary }]}>
                            <Text style={{ fontWeight: 'bold', color: theme.textPrimary }}>{list.subscriberCount}</Text> subscribers
                        </Text>
                    </View>

                    <View style={styles.actionRow}>
                        {!isOwner && (
                            <TouchableOpacity
                                style={[
                                    styles.subscribeButton,
                                    { backgroundColor: list.isSubscribed ? 'transparent' : theme.textPrimary, borderColor: theme.textPrimary, borderWidth: 1 }
                                ]}
                                onPress={handleSubscribe}
                            >
                                <Text style={[
                                    styles.subscribeText,
                                    { color: list.isSubscribed ? theme.textPrimary : theme.background }
                                ]}>
                                    {list.isSubscribed ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {loadingPosts ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <PostCard post={item} />}
                    ListEmptyComponent={
                        <View style={styles.emptyFeed}>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>There are no posts in this list yet.</Text>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 20,
    },
    navTitleContainer: {
        flex: 1,
    },
    navTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    navSubtitle: {
        fontSize: 13,
    },
    hero: {
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    heroContent: {
        alignItems: 'center',
    },
    listName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        marginBottom: 12,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    stat: {
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    subscribeButton: {
        paddingHorizontal: 32,
        paddingVertical: 8,
        borderRadius: 20,
    },
    subscribeText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    emptyFeed: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
