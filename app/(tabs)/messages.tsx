
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import ConversationItem from '@/components/ConversationItem';
import ExploreSearchBar from '@/components/ExploreSearchBar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CURRENT_USER_ID } from '@/lib/api';
import { useResponsive } from '@/hooks/useResponsive';
import { eventEmitter } from '@/lib/EventEmitter';
import { useMessagesSettings, useNotificationsSettings } from '@/state/communicationSettings';

type FilterType = 'All' | 'DMs' | 'Groups' | 'Channels' | 'Unread';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { showSidebar } = useResponsive();
  const router = useRouter();
  const { allowMessageRequests, filterLowQuality } = useMessagesSettings();
  const { mutedWords } = useNotificationsSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFollowing = useCallback(async () => {
    try {
      const following = await api.getFollowing();
      setFollowingIds(new Set(following.map(u => u.id)));
    } catch (error) {
      console.error('Error loading following:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadFollowing();

    const handleConversationRead = () => {
      loadConversations();
    };

    eventEmitter.on('conversationRead', handleConversationRead);

    return () => {
      eventEmitter.off('conversationRead', handleConversationRead);
    };
  }, [loadConversations, loadFollowing]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (filterLowQuality && conv.isLowQuality) {
        return false;
      }

      if (conv.type === 'DM' && !allowMessageRequests) {
        const otherParticipant = conv.participants.find(p => p.id !== CURRENT_USER_ID);
        if (otherParticipant && !followingIds.has(otherParticipant.id)) {
          return false;
        }
      }

      if (mutedWords.length > 0 && conv.lastMessage?.text) {
        const lastMsg = conv.lastMessage.text.toLowerCase();
        if (mutedWords.some(word => lastMsg.includes(word))) return false;
      }

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

      if (activeFilter === 'All') return true;
      if (activeFilter === 'Unread') return conv.unreadCount > 0;
      if (activeFilter === 'DMs') return conv.type === 'DM';
      if (activeFilter === 'Groups') return conv.type === 'GROUP';
      if (activeFilter === 'Channels') return conv.type === 'CHANNEL';

      return true;
    });
  }, [conversations, searchQuery, activeFilter, allowMessageRequests, mutedWords, filterLowQuality, followingIds]);

  const { pinned, dms, groups, channels } = useMemo(() => {
    const pinned = filteredConversations.filter(c => c.isPinned);
    const dms = filteredConversations.filter(c => c.type === 'DM' && !c.isPinned);
    const groups = filteredConversations.filter(c => c.type === 'GROUP' && !c.isPinned);
    const channels = filteredConversations.filter(c => c.type === 'CHANNEL' && !c.isPinned);

    return { pinned, dms, groups, channels };
  }, [filteredConversations]);

  const filters: FilterType[] = ['All', 'DMs', 'Groups', 'Channels', 'Unread'];

  const handlePin = async (convId: string) => {
    const conversation = conversations.find(c => c.id === convId);
    if (!conversation) return;

    try {
      await api.pinConversation(convId, !conversation.isPinned);
      loadConversations();
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  };

  const renderSection = (title: string, data: Conversation[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitleText, { color: theme.textTertiary }]}>{title}</Text>
        </View>
        {data.map(conv => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isUnread={conv.unreadCount > 0}
            isMuted={conv.isMuted}
            lastMessage={conv.lastMessage?.text}
            onLongPress={() => handlePin(conv.id)}
          />
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/messages/settings')}>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <ExploreSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search Messages"
        />
      </View>

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
        data={activeFilter === 'All' ? ['pinned', 'dms', 'groups', 'channels'] : ['filtered']}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          if (activeFilter !== 'All') {
            return <View>{renderSection('', filteredConversations)}</View>
          }
          if (item === 'pinned') return renderSection('Pinned', pinned);
          if (item === 'dms') return renderSection('Direct Messages', dms);
          if (item === 'groups') return renderSection('Groups', groups);
          if (item === 'channels') return renderSection('Channels', channels);
          return null;
        }}
        refreshing={loading}
        onRefresh={loadConversations}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery ? 'No results found' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
              {searchQuery ? 'Try searching for something else.' : 'Direct Messages are private conversations between you and other people on Vius.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={[styles.writeButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(modals)/new-message')}>
                <Text style={[styles.writeButtonText, { color: theme.textInverse }]}>Write a message</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

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
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
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
