import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useAuthStore } from '@/state/auth';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

export default function AccountSettings() {
    const { theme } = useTheme();
    const user = useAuthStore(state => state.user);
    const router = useRouter();

    const handleDataArchive = () => {
        Alert.alert(
            "Request Archive",
            "We will email you a link to download your data when it's ready. This may take up to 24 hours.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Request",
                    onPress: async () => {
                        try {
                            await api.requestDataArchive();
                            Alert.alert("Request Received", "We'll notify you when it's ready.");
                        } catch (e) {
                            Alert.alert("Error", "Failed to request archive.");
                        }
                    }
                }
            ]
        );
    };

    const InfoRow = ({ label, value, onPress, showArrow = false }: { label: string, value: string, onPress?: () => void, showArrow?: boolean }) => (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.borderLight }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View>
                <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
                <Text style={[styles.value, { color: theme.textSecondary, marginTop: 2 }]}>{value}</Text>
            </View>
            {(showArrow || onPress) && <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Account' }} />
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Login and Security</Text>
                    <InfoRow label="Username" value={`@${user?.user_metadata?.username || user?.username || 'user'}`} />
                    <InfoRow label="Email" value={user?.email || 'email@example.com'} />
                    <InfoRow
                        label="Phone"
                        value={user?.phone || 'Not set'}
                        onPress={() => router.push('/(settings)/phone')}
                    />
                    <InfoRow
                        label="Password"
                        value="Change your password"
                        onPress={() => router.push('/(settings)/password')}
                    />
                </View>

                <View style={[styles.section, { marginTop: 30 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data and Permissions</Text>
                    <InfoRow
                        label="Country"
                        value={user?.country || "Select your country"}
                        onPress={() => router.push('/(settings)/country')}
                    />
                    <InfoRow
                        label="Your Twitter Data"
                        value="Download an archive of your data"
                        onPress={handleDataArchive}
                    />
                    <InfoRow
                        label="Apps and sessions"
                        value="Track sessions"
                        onPress={() => router.push('/(settings)/sessions')}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.deleteButton, { borderTopColor: theme.borderLight, borderBottomColor: theme.borderLight }]}
                    onPress={() => Alert.alert('Deactivate', 'This is a mock action.')}
                >
                    <Text style={styles.deleteText}>Deactivate your account</Text>
                </TouchableOpacity>
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
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    value: {
        fontSize: 15,
    },
    deleteButton: {
        marginTop: 40,
        padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    deleteText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '500',
    }
});
