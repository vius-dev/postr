import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useAuthStore } from '@/state/auth';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AccountSettings() {
    const { theme } = useTheme();
    const { user } = useAuthStore();
    const router = useRouter();

    const InfoRow = ({ label, value }: { label: string, value: string }) => (
        <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
            <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Account' }} />
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Login and Security</Text>
                    <InfoRow label="Username" value={`@${user?.user_metadata?.username || 'user'}`} />
                    <InfoRow label="Email" value={user?.email || 'email@example.com'} />
                    <InfoRow label="Phone" value={user?.phone || 'Not set'} />
                    <TouchableOpacity
                        style={[styles.row, { borderBottomColor: theme.borderLight }]}
                        onPress={() => router.push('/(settings)/password')}
                    >
                        <Text style={[styles.label, { color: theme.textPrimary }]}>Password</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.value, { color: theme.textSecondary, marginRight: 5 }]}>Change</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { marginTop: 30 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data and Permissions</Text>
                    <InfoRow label="Country" value="United States" />
                    <InfoRow label="Your Twitter Data" value="Download an archive of your data" />
                    <InfoRow label="Apps and sessions" value="Track sessions" />
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
