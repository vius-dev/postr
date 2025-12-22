
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SidebarItem } from './SidebarItem';
import { useAuthStore } from '@/state/auth';
import { useRouter } from 'expo-router';

interface WebSidebarProps {
    compact?: boolean;
}

export const WebSidebar = ({ compact }: WebSidebarProps) => {
    const { theme, isDarkMode } = useTheme();
    const { user } = useAuthStore();
    const router = useRouter();

    const username = user?.user_metadata?.username || 'devteam';

    return (
        <View style={[styles.container, {
            // In a real app we'd use Expo BlurView, simulating "Glass" here with opacity locally or just clean card style
            backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
        }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Logo */}
                <TouchableOpacity
                    style={styles.logoContainer}
                    onPress={() => router.push('/')}
                >
                    <Image source={require('../../../assets/images/logo.png')} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                </TouchableOpacity>

                {/* Global Nav */}
                <SidebarItem label="Home" icon="home" href="/" compact={compact} />
                <SidebarItem label="Explore" icon="search" href="/explore" compact={compact} />
                <SidebarItem label="Notifications" icon="notifications" href="/notifications" compact={compact} />
                <SidebarItem label="Messages" icon="mail" href="/messages" compact={compact} />
                <SidebarItem label="Shop" icon="cart" href="/shop" compact={compact} />
                <SidebarItem label="Bookmarks" icon="bookmark" href="/bookmarks" compact={compact} />
                <SidebarItem label="Profile" icon="person" href={`/(profile)/${username}`} compact={compact} />

                {/* Post Button */}
                <TouchableOpacity
                    style={[
                        styles.postButton,
                        { backgroundColor: theme.primary },
                        compact && styles.postButtonCompact
                    ]}
                    onPress={() => router.push('/(compose)/compose')}
                >
                    {compact ? (
                        <Ionicons name="add" size={24} color={theme.textInverse} />
                    ) : (
                        <Text style={[styles.postButtonText, { color: theme.textInverse }]}>Post</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* User Mini Profile */}
            <TouchableOpacity style={styles.userContainer}>
                <View style={styles.userInfo}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                        <Ionicons name="person" size={20} color={theme.textTertiary} />
                    </View>
                    {!compact && (
                        <View style={styles.userText}>
                            <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
                                {user?.user_metadata?.name || 'Dev Team'}
                            </Text>
                            <Text style={[styles.userHandle, { color: theme.textTertiary }]} numberOfLines={1}>
                                @{username}
                            </Text>
                        </View>
                    )}
                </View>
                {!compact && <Ionicons name="ellipsis-horizontal" size={18} color={theme.textPrimary} />}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '92%', // Floating height
        width: '100%',
        paddingHorizontal: 15, // More padding
        justifyContent: 'space-between',
        paddingBottom: 25,
        borderRadius: 30, // Large radius for dock feel
        marginTop: 10,
    },
    scrollContent: {
        alignItems: 'center', // Center in the floating dock
        width: '100%',
    },
    logoContainer: {
        padding: 12,
        marginBottom: 10,
        marginTop: 5,
        borderRadius: 30,
    },
    postButton: {
        width: '90%',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        alignSelf: 'center',
    },
    postButtonCompact: {
        width: 50,
        height: 50,
        borderRadius: 25,
        paddingVertical: 0,
        justifyContent: 'center',
    },
    postButtonText: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 35,
        marginTop: 'auto',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userText: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    userHandle: {
        fontSize: 14,
    },
});
