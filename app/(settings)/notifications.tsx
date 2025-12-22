import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Stack } from 'expo-router';
import { api, NotificationSettings as NotificationSettingsType } from '@/lib/api';

export default function NotificationSettings() {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getNotificationSettings();
            setSettings(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof NotificationSettingsType, value: boolean) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        try {
            await api.updateNotificationSettings({ [key]: value });
        } catch (e) {
            setSettings(settings); // Revert
            console.error('Failed to update setting');
        }
    };

    const ToggleRow = ({ label, value, onValueChange, description }: { label: string, value: boolean, onValueChange: (v: boolean) => void, description?: string }) => (
        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
                {description && <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: theme.border, true: theme.primary }}
            />
        </View>
    );

    if (loading || !settings) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Notifications' }} />
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Filters</Text>
                    <ToggleRow
                        label="Quality filter"
                        value={settings.qualityFilter}
                        onValueChange={(v) => updateSetting('qualityFilter', v)}
                        description="Filter lower-quality content from your notifications. This won't affect notifications from people you follow."
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Push Notifications</Text>
                    <ToggleRow label="Mentions" value={settings.pushMentions} onValueChange={(v) => updateSetting('pushMentions', v)} />
                    <ToggleRow label="Replies" value={settings.pushReplies} onValueChange={(v) => updateSetting('pushReplies', v)} />
                    <ToggleRow label="Likes" value={settings.pushLikes} onValueChange={(v) => updateSetting('pushLikes', v)} />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Email Notifications</Text>
                    <ToggleRow
                        label="Email digest"
                        value={settings.emailDigest}
                        onValueChange={(v) => updateSetting('emailDigest', v)}
                        description="Receive periodic updates about top posts and stories."
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
    },
});
