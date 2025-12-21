
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation, ConversationType } from '@/types/message';
import ConversationItem from '@/components/ConversationItem';
import ExploreSearchBar from '@/components/ExploreSearchBar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CURRENT_USER_ID } from '@/lib/api';
import { useResponsive } from '@/hooks/useResponsive';


type FilterType = 'All' | 'DMs' | 'Groups' | 'Channels' | 'Unread';

import { useMessagesSettings, useNotificationsSettings } from '@/state/communicationSettings';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { showSidebar } = useResponsive();
  const router = useRouter();
  const { allowMessageRequests } = useMessagesSettings();
  const { mutedWords } = useNotificationsSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConversations();
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    try {
      const following = await api.getFollowing();
      setFollowingIds(new Set(following.map(u => u.id)));
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // 1. Message Requests Logic
      if (conv.type === 'DM' && !allowMessageRequests) {
        const otherParticipant = conv.participants.find(p => p.id !== CURRENT_USER_ID);
        if (otherParticipant && !followingIds.has(otherParticipant.id)) {
          return false;
        }
      }

      // 2. Muted Words in Last Message
      if (mutedWords.length > 0 && conv.lastMessage?.text) {
        const lastMsg = conv.lastMessage.text.toLowerCase();
        if (mutedWords.some(word => lastMsg.includes(word))) return false;
      }

      // 3. Search logic
      const query = searchQuery.toLowerCase();
      let matchesSearch = true;
      if (query) {
        if (conv.type === 'DM') {
          const otherUser = conv.participants.find(p => p.id !== CURRENT_USER_ID) || conv.participants[0];
          matchesSearch = otherUser.name.toLowerCase().includes(query) ||
            otherUser.username.toLowerCase().includes(query);
        } else {
          matchesSearch = conv.name?.toLowerCase().includes(query) || false;
        }
      }

      if (!matchesSearch) return false;

      // Filter logic
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Unread') return conv.unreadCount > 0;
      if (activeFilter === 'DMs') return conv.type === 'DM';
      if (activeFilter === 'Groups') return conv.type === 'GROUP';
      if (activeFilter === 'Channels') return conv.type === 'CHANNEL';

      return true;
    });
  }, [conversations, searchQuery, activeFilter]);

  const { pinnedConversations, otherConversations } = useMemo(() => {
    // Only show pinned section if filter is 'All' or user is searching
    if (activeFilter !== 'All' && !searchQuery) {
      return { pinnedConversations: [], otherConversations: filteredConversations };
    }

    const pinned = filteredConversations.filter(c => c.isPinned);
    const others = filteredConversations.filter(c => !c.isPinned);
    return { pinnedConversations: pinned, otherConversations: others };
  }, [filteredConversations, activeFilter, searchQuery]);

  const filters: FilterType[] = ['All', 'DMs', 'Groups', 'Channels', 'Unread'];

  const handlePin = async (convId: string, pinned: boolean) => {
    try {
      await api.pinConversation(convId, pinned);
      loadConversations();
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/messages/settings')}>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <ExploreSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search Messages"
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                { backgroundColor: activeFilter === filter ? theme.primary : theme.surface }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === filter ? theme.textInverse : theme.textSecondary }
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={otherConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onLongPress={() => handlePin(item.id, !item.isPinned)}
          />
        )}
        refreshing={loading}
        onRefresh={loadConversations}
        ListHeaderComponent={
          pinnedConversations.length > 0 ? (
            <View style={styles.pinnedSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pin" size={14} color={theme.textTertiary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitleText, { color: theme.textTertiary }]}>PINNED MESSAGES</Text>
              </View>
              {pinnedConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  onLongPress={() => handlePin(conv.id, false)}
                />
              ))}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery ? 'No results found' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
              {searchQuery ? 'Try searching for something else.' : 'Direct Messages are private conversations between you and other people on Twitter.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={[styles.writeButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(modals)/new-message')}>
                <Text style={[styles.writeButtonText, { color: theme.textInverse }]}>Write a message</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Compose FAB */}
      {!showSidebar && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.textPrimary
            }
          ]}
          onPress={() => router.push('/(modals)/new-message')}
        >
          <Ionicons name="mail-outline" size={24} color={theme.textInverse} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  filtersContainer: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  filtersContent: {
    paddingHorizontal: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinnedSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.2,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 20,
  },
  writeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  writeButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
