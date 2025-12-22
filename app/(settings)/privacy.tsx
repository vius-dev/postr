import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Stack } from 'expo-router';
import { api, PrivacySettings as PrivacySettingsType } from '@/lib/api';

export default function PrivacySettings() {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<PrivacySettingsType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getPrivacySettings();
            setSettings(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof PrivacySettingsType, value: boolean) => {
        if (!settings) return;
        // Optimistic update
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        try {
            await api.updatePrivacySettings({ [key]: value });
        } catch (e) {
            // Revert on failure
            setSettings(settings); // Revert to old state
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
            <Stack.Screen options={{ title: 'Privacy and Safety' }} />
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Audience and Tagging</Text>
                    <ToggleRow
                        label="Protect your posts"
                        value={settings.protectPosts}
                        onValueChange={(v) => updateSetting('protectPosts', v)}
                        description="Only show your posts to people who follow you. If selected, you will need to approve each new follower."
                    />
                    <ToggleRow
                        label="Photo tagging"
                        value={settings.photoTagging}
                        onValueChange={(v) => updateSetting('photoTagging', v)}
                        description="Allow anyone to tag you in photos."
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Direct Messages</Text>
                    <ToggleRow
                        label="Read receipts"
                        value={settings.readReceipts}
                        onValueChange={(v) => updateSetting('readReceipts', v)}
                        description="When enabled, people you're messaging with will know when you've seen their messages."
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Discoverability and Contacts</Text>
                    <ToggleRow
                        label="Let others find you by your email"
                        value={settings.discoveryEmail}
                        onValueChange={(v) => updateSetting('discoveryEmail', v)}
                    />
                    <ToggleRow
                        label="Let others find you by your phone"
                        value={settings.discoveryPhone}
                        onValueChange={(v) => updateSetting('discoveryPhone', v)}
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
