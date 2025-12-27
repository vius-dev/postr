
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsSettings } from '@/state/communicationSettings';

export default function NotificationsSettingsScreen() {
    const { theme, isDarkMode } = useTheme();
    const router = useRouter();
    const {
        qualityFilter,
        mentionsOnly,
        mutedWords,
        setQualityFilter,
        setMentionsOnly,
        addMutedWord,
        removeMutedWord
    } = useNotificationsSettings();

    const [newWord, setNewWord] = useState('');

    const handleAddWord = () => {
        if (newWord.trim()) {
            addMutedWord(newWord.trim());
            setNewWord('');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Notifications settings</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Filters</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Quality filter</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                Filter lower-quality content from your notifications, for example, duplicate posts or content that appears to be automated.
                            </Text>
                        </View>
                        <Switch
                            value={qualityFilter}
                            onValueChange={setQualityFilter}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={qualityFilter ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Only from people you follow</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                When this is on, you'll only receive notifications from people you follow.
                            </Text>
                        </View>
                        <Switch
                            value={mentionsOnly}
                            onValueChange={setMentionsOnly}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={mentionsOnly ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.surface }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Muted words</Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                        When you mute a word, you won't see it in your notifications or timeline.
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                            placeholder="Enter word to mute..."
                            placeholderTextColor={theme.textTertiary}
                            value={newWord}
                            onChangeText={setNewWord}
                            onSubmitEditing={handleAddWord}
                        />
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.primary }]}
                            onPress={handleAddWord}
                        >
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.wordsList}>
                        {mutedWords.map(word => (
                            <View key={word} style={[styles.wordChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                <Text style={[styles.wordText, { color: theme.textPrimary }]}>{word}</Text>
                                <TouchableOpacity onPress={() => removeMutedWord(word)}>
                                    <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        ))}
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
    sectionSubtitle: {
        fontSize: 14,
        paddingHorizontal: 15,
        marginBottom: 15,
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
    divider: {
        height: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderRadius: 22,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    addButton: {
        paddingHorizontal: 20,
        borderRadius: 22,
        justifyContent: 'center',
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    wordsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
    },
    wordChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    wordText: {
        fontSize: 14,
        marginRight: 8,
    },
});
