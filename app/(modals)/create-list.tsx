import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { eventEmitter } from '@/lib/EventEmitter';

export default function CreateListModal() {
    const { theme } = useTheme();
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please give your list a name.');
            return;
        }

        setIsCreating(true);
        try {
            await api.createList({
                name: name.trim(),
                description: description.trim(),
                isPrivate
            });
            eventEmitter.emit('listUpdated'); // Notify lists screen to refresh
            router.back();
        } catch (error) {
            console.error('Failed to create list', error);
            Alert.alert('Error', 'Failed to create list. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Text style={{ color: theme.textPrimary, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>New List</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={!name.trim() || isCreating}
                    style={[styles.createButton, { opacity: !name.trim() || isCreating ? 0.5 : 1 }]}
                >
                    {isCreating ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                        <Text style={[styles.createButtonText, { color: theme.primary }]}>Create</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                {/* Banner/Image placeholder can go here later */}
                <View style={[styles.bannerPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="images-outline" size={32} color={theme.primary} />
                </View>

                <View style={[styles.inputGroup, { borderBottomColor: theme.borderLight }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="Name your list"
                        placeholderTextColor={theme.textTertiary}
                        value={name}
                        onChangeText={setName}
                        maxLength={25}
                    />
                </View>

                <View style={[styles.inputGroup, { borderBottomColor: theme.borderLight }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="Description"
                        placeholderTextColor={theme.textTertiary}
                        value={description}
                        onChangeText={setDescription}
                        maxLength={100}
                        multiline
                    />
                </View>

                <View style={[styles.privacyGroup, { borderBottomColor: theme.borderLight }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.privacyLabel, { color: theme.textPrimary }]}>Make Private</Text>
                        <Text style={[styles.privacySubtext, { color: theme.textTertiary }]}>
                            Only you can see this list.
                        </Text>
                    </View>
                    <Switch
                        value={isPrivate}
                        onValueChange={setIsPrivate}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor={'#fff'}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    createButton: {
        padding: 8,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    form: {
        padding: 16,
    },
    bannerPlaceholder: {
        height: 100,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingBottom: 8,
    },
    label: {
        fontSize: 13,
        marginBottom: 4,
    },
    input: {
        fontSize: 17,
        paddingVertical: 4,
        fontWeight: '500',
    },
    privacyGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    privacyLabel: {
        fontSize: 17,
        fontWeight: '500',
    },
    privacySubtext: {
        fontSize: 14,
        marginTop: 2,
    },
});
