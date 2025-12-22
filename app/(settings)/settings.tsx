
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/state/auth';

interface SettingsItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress: () => void;
    destructive?: boolean;
}

const SettingsItem = ({ icon, title, subtitle, onPress, destructive }: SettingsItemProps) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.item, { borderBottomColor: theme.borderLight }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.itemIcon}>
                <Ionicons
                    name={icon}
                    size={24}
                    color={destructive ? '#FF3B30' : theme.textPrimary}
                />
            </View>
            <View style={styles.itemContent}>
                <Text style={[
                    styles.itemTitle,
                    { color: destructive ? '#FF3B30' : theme.textPrimary }
                ]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.itemSubtitle, { color: theme.textTertiary }]}>
                        {subtitle}
                    </Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </TouchableOpacity>
    );
};

const SettingsScreen = () => {
    const { theme } = useTheme();
    const router = useRouter();
    const logout = useAuthStore(state => state.logout);

    const handleLogout = () => {
        Alert.alert(
            'Log out',
            'Are you sure you want to log out of Postr?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    }
                },
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
                    <SettingsItem
                        icon="person-outline"
                        title="Your account"
                        subtitle="See information about your account, download an archive of your data, or learn about your account deactivation options"
                        onPress={() => router.push('/(settings)/account')}
                    />
                    <SettingsItem
                        icon="key-outline"
                        title="Change your password"
                        subtitle="Change your password at any time"
                        onPress={() => router.push('/(settings)/password')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Privacy & Safety</Text>
                    <SettingsItem
                        icon="shield-checkmark-outline"
                        title="Security and account access"
                        subtitle="Manage your account's security and keep track of your account's usage"
                        onPress={() => router.push('/(settings)/privacy')}
                    />
                    <SettingsItem
                        icon="eye-off-outline"
                        title="Privacy and safety"
                        subtitle="Manage what information you see and share on Postr"
                        onPress={() => router.push('/(settings)/privacy')}
                    />
                    <SettingsItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Select the kinds of notifications you get about your activities, interests, and recommendations"
                        onPress={() => router.push('/(settings)/notifications')}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Display & Accessibility</Text>
                    <SettingsItem
                        icon="color-palette-outline"
                        title="Accessibility, display and languages"
                        subtitle="Manage how Postr content is displayed to you"
                        onPress={() => router.push('/(settings)/display')}
                    />
                </View>

                <View style={styles.section}>
                    <SettingsItem
                        icon="log-out-outline"
                        title="Log out"
                        onPress={handleLogout}
                        destructive
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginTop: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        paddingHorizontal: 16,
        marginBottom: 8,
        fontFamily: 'System',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemIcon: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemSubtitle: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
});

export default SettingsScreen;
