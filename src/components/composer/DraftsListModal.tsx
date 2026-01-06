import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '@/theme/theme';
import { DraftsService, Draft } from '@/lib/drafts';
import { Ionicons } from '@expo/vector-icons';

interface DraftsListModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (draft: Draft) => void;
    userId: string;
}

export default function DraftsListModal({ visible, onClose, onSelect, userId }: DraftsListModalProps) {
    const { theme } = useTheme();
    const [drafts, setDrafts] = useState<Draft[]>([]);

    useEffect(() => {
        if (visible && userId) {
            loadDrafts();
        }
    }, [visible, userId]);

    const loadDrafts = async () => {
        const data = await DraftsService.getDrafts(userId);
        setDrafts(data);
    };

    const handleDelete = async (id: string) => {
        await DraftsService.deleteDraft(id);
        loadDrafts();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>Drafts</Text>
                    <View style={{ width: 40 }} />
                </View>

                <FlatList
                    data={drafts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.draftItem, { borderBottomColor: theme.border }]}
                            onPress={() => onSelect(item)}
                        >
                            <View style={styles.draftContent}>
                                <Text style={[styles.draftText, { color: theme.textPrimary }]} numberOfLines={2}>
                                    {item.content || (item.media.length > 0 ? '[Media Only]' : '[Empty Draft]')}
                                </Text>
                                <Text style={[styles.draftTime, { color: theme.textTertiary }]}>
                                    {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                                <Ionicons name="trash-outline" size={20} color={theme.error} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.textSecondary }}>No drafts yet.</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </Modal>
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
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeButton: {
        width: 40,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    draftItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    draftContent: {
        flex: 1,
    },
    draftText: {
        fontSize: 16,
        marginBottom: 4,
    },
    draftTime: {
        fontSize: 12,
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
