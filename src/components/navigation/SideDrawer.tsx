import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthStore } from '@/state/auth';

interface SideDrawerProps {
    onClose: () => void;
}

export const SideDrawer = ({ onClose }: SideDrawerProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { logout } = useAuthStore();
    const router = useRouter();

    const navigate = (path: string) => {
        onClose();
        router.push(path as any);
    };

    const handleLogout = async () => {
        onClose();
        await logout();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <TouchableOpacity
                    style={styles.profileSection}
                    onPress={() => navigate(`/(profile)/${user?.username || user?.id}`)}
                >
                    <Image
                        source={{ uri: user?.avatar || 'https://via.placeholder.com/80' }}
                        style={styles.avatar}
                    />
                    <Text style={[styles.displayName, { color: theme.textPrimary }]}>
                        {user?.name || 'User'}
                    </Text>
                    <Text style={[styles.username, { color: theme.textSecondary }]}>
                        @{user?.username || 'username'}
                    </Text>
                </TouchableOpacity>

                {/* Navigation Items */}
                <View style={styles.navSection}>
                    <DrawerItem
                        icon="person-outline"
                        label="Profile"
                        onPress={() => navigate(`/(profile)/${user?.username || user?.id}`)}
                    />
                    <DrawerItem
                        icon="bookmark-outline"
                        label="Bookmarks"
                        onPress={() => navigate('/bookmarks')}
                    />
                    <DrawerItem
                        icon="list-outline"
                        label="Lists"
                        onPress={() => navigate('/lists')}
                    />
                    <DrawerItem
                        icon="settings-outline"
                        label="Settings"
                        onPress={() => navigate('/(settings)/settings')}
                    />
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Secondary Actions */}
                <View style={styles.navSection}>
                    <DrawerItem
                        icon="help-circle-outline"
                        label="Help Center"
                        onPress={() => {
                            // TODO: Implement Help Center
                            onClose();
                        }}
                    />
                    <DrawerItem
                        icon="log-out-outline"
                        label="Log Out"
                        onPress={handleLogout}
                        destructive
                    />
                </View>
            </ScrollView>
        </View>
    );
};

interface DrawerItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    destructive?: boolean;
}

const DrawerItem = ({ icon, label, onPress, destructive }: DrawerItemProps) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={styles.drawerItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons
                name={icon}
                size={24}
                color={destructive ? theme.error : theme.textPrimary}
            />
            <Text
                style={[
                    styles.drawerItemText,
                    { color: destructive ? theme.error : theme.textPrimary }
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    profileSection: {
        padding: 20,
        paddingTop: 24,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 12,
    },
    displayName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    username: {
        fontSize: 15,
    },
    navSection: {
        paddingVertical: 8,
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 16,
    },
    drawerItemText: {
        fontSize: 17,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 8,
    },
});
