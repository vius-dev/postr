
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { SidebarItem } from './SidebarItem';
import { useAuthStore } from '@/state/auth';
import { useRouter } from 'expo-router';
import { eventEmitter } from '@/lib/EventEmitter';
import { Image } from 'react-native';

interface MobileSidebarProps {
    onClose: () => void;
}

export const MobileSidebar = ({ onClose }: MobileSidebarProps) => {
    const { theme } = useTheme();
    const { user, setUser } = useAuthStore();
    const router = useRouter();

    React.useEffect(() => {
        const handleProfileUpdate = (payload: { userId: string, name: string, avatar: string | null }) => {
            if (user && user.id === payload.userId) {
                // Update local store state if needed, or just let the event trigger a re-render if we use local state
                // Actually useAuthStore user is from Supabase, so we might need to update it manually 
                // for the session or just rely on a local state for the name/avatar display if we want to be clean.
                // For now, let's keep it simple.
            }
        };

        eventEmitter.on('profileUpdated', handleProfileUpdate);
        return () => eventEmitter.off('profileUpdated', handleProfileUpdate);
    }, [user]);

    const username = user?.user_metadata?.username || user?.username || 'devteam';
    const name = user?.user_metadata?.name || user?.name || 'User';
    const avatar = user?.user_metadata?.avatar || user?.avatar;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={32} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>
            <View style={styles.menuContainer}>
                <SidebarItem label="Home" icon="home" href="/" />
                <SidebarItem label="Explore" icon="search" href="/explore" />
                <SidebarItem label="Notifications" icon="notifications" href="/notifications" />
                <SidebarItem label="Messages" icon="mail" href="/messages" />
                <SidebarItem label="Shop" icon="cart" href="/shop" />
                <SidebarItem label="Bookmarks" icon="bookmark" href="/bookmarks" />
                <TouchableOpacity style={styles.userContainer} onPress={() => { onClose(); router.push(`/(profile)/${username}`); }}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                            <Ionicons name="person" size={20} color={theme.textTertiary} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.usernameHandle, { color: theme.textTertiary }]} numberOfLines={1}>@{username}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '80%',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 10,
    },
    closeButton: {
        padding: 10,
    },
    menuContainer: {
        paddingHorizontal: 10,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        marginTop: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    usernameHandle: {
        fontSize: 14,
    },
});
