import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';

export default function PasswordSettings() {
    const { theme } = useTheme();
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await api.updatePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Your password has been updated', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Change Password' }} />
            <View style={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Current Password</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.primary }]}
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholderTextColor={theme.textTertiary}
                        onFocus={(e) => e.target.setNativeProps({ style: { borderBottomColor: theme.primary } })}
                        onBlur={(e) => e.target.setNativeProps({ style: { borderBottomColor: theme.border } })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary, borderBottomColor: theme.border }]}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 25,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        fontSize: 17,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    button: {
        marginTop: 20,
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
