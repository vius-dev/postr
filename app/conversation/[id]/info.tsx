
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import { Ionicons } from '@expo/vector-icons';

type InfoTab = 'Info' | 'Members' | 'Media' | 'Settings';

export default function InfoScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const { id: conversationId } = useLocalSearchParams();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<InfoTab>('Info');

    useEffect(() => {
        if (typeof conversationId === 'string') {
            loadInfo(conversationId);
        }
    }, [conversationId]);

    const loadInfo = async (id: string) => {
        setLoading(true);
        try {
            const data = await api.getConversation(id);
            if (data) setConversation(data);
        } catch (error) {
            console.error('Error loading info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !conversation) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={{ color: theme.textPrimary }}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isChannel = conversation.type === 'CHANNEL';
    const tabs: InfoTab[] = ['Info', 'Members', 'Media', 'Settings'];

    const renderInfoTab = () => (
        <ScrollView style={styles.tabContent}>
            <View style={styles.infoSection}>
                <View style={[styles.avatarContainer, { backgroundColor: theme.surface }]}>
                    <Ionicons
                        name={isChannel ? 'megaphone-outline' : 'people-outline'}
                        size={60}
                        color={theme.textSecondary}
                    />
                </View>
                <Text style={[styles.name, { color: theme.textPrimary }]}>{conversation.name}</Text>
                <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
                    {isChannel ? 'Broadcast Channel' : 'Group Chat'} • {conversation.participants.length} members
                </Text>
            </View>

            {conversation.description && (
                <View style={[styles.descriptionSection, { borderTopColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Description</Text>
                    <Text style={[styles.description, { color: theme.textPrimary }]}>{conversation.description}</Text>
                </View>
            )}

            <View style={[styles.metaSection, { borderTopColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Link</Text>
                <TouchableOpacity style={styles.linkContainer}>
                    <Text style={[styles.linkText, { color: theme.primary }]}>postr.app/{conversation.id}</Text>
                    <Ionicons name="copy-outline" size={16} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderMembersTab = () => (
        <View style={styles.tabContent}>
            <FlatList
                data={conversation.participants}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 15 }}
                renderItem={({ item }) => (
                    <View style={styles.memberItem}>
                        <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                        <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: theme.textPrimary }]}>{item.name}</Text>
                            <Text style={[styles.memberUsername, { color: theme.textTertiary }]}>@{item.username}</Text>
                        </View>
                        {conversation.ownerId === item.id && (
                            <View style={[styles.adminBadgeContainer, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.adminBadgeText, { color: theme.primary }]}>Admin</Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );

    const renderMediaTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.mediaGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={[styles.mediaPlaceholder, { backgroundColor: theme.surface }]}>
                    <Ionicons name="images-outline" size={30} color={theme.textTertiary} />
                </View>
            ))}
        </ScrollView>
    );

    const renderSettingsTab = () => (
        <ScrollView style={styles.tabContent}>
            <TouchableOpacity style={[styles.actionItem, { borderTopColor: theme.surface }]}>
                <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
                <Text style={[styles.actionText, { color: theme.textPrimary }]}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, { borderTopColor: theme.surface }]}>
                <Ionicons name="share-outline" size={24} color={theme.textPrimary} />
                <Text style={[styles.actionText, { color: theme.textPrimary }]}>Invite Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, { borderTopColor: theme.surface }]}>
                <Ionicons name="shield-checkmark-outline" size={24} color={theme.textPrimary} />
                <Text style={[styles.actionText, { color: theme.textPrimary }]}>Admin Permissions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionItem, { borderTopColor: theme.surface }]}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.actionText, { color: '#FF3B30' }]}>
                    {isChannel ? 'Leave Channel' : 'Leave Group'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.surface }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                    {isChannel ? 'Channel Info' : 'Group Info'}
                </Text>
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: theme.surface }]}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                            styles.tabItem,
                            activeTab === tab && { borderBottomColor: theme.primary }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? theme.primary : theme.textTertiary }
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'Info' && renderInfoTab()}
            {activeTab === 'Members' && renderMembersTab()}
            {activeTab === 'Media' && renderMediaTab()}
            {activeTab === 'Settings' && renderSettingsTab()}
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
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
    },
    descriptionSection: {
        padding: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    metaSection: {
        padding: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        lineHeight: 22,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    linkText: {
        fontSize: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
    },
    memberUsername: {
        fontSize: 14,
    },
    adminBadgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    adminBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 2,
    },
    mediaPlaceholder: {
        width: '33.33%',
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: 'transparent', // Space between items
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionText: {
        fontSize: 17,
        marginLeft: 15,
    },
});
