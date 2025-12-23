import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMessagesSettings } from '@/state/communicationSettings';

export default function MessagesSettingsScreen() {
    const { theme, isDarkMode } = useTheme();
    const router = useRouter();
    const {
        allowMessageRequests,
        filterLowQuality,
        showReadReceipts,
        setAllowMessageRequests,
        setFilterLowQuality,
        setShowReadReceipts
    } = useMessagesSettings();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Messages settings</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Direct Messages</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Allow message requests from everyone</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                Only people you follow will be able to message you if this is off.
                            </Text>
                        </View>
                        <Switch
                            value={allowMessageRequests}
                            onValueChange={setAllowMessageRequests}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={allowMessageRequests ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Filter low-quality messages</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                Hide message requests that may contain spam or other low-quality content.
                            </Text>
                        </View>
                        <Switch
                            value={filterLowQuality}
                            onValueChange={setFilterLowQuality}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={filterLowQuality ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Show read receipts</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                When this is on, people in a conversation will know when you\'ve seen their messages.
                            </Text>
                        </View>
                        <Switch
                            value={showReadReceipts}
                            onValueChange={setShowReadReceipts}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={showReadReceipts ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingVertical: 15,
    },
    sectionTitle: {
        fontSize: 21,
        fontWeight: 'bold',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
    },
    settingInfo: {
        flex: 1,
        paddingRight: 15,
    },
    settingLabel: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '500',
    },
    settingDescription: {
        fontSize: 14,
        lineHeight: 18,
    },
});