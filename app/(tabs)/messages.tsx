
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import ConversationItem from '@/components/ConversationItem';
import EmptyState from '@/components/EmptyState';
import ExploreSearchBar from '@/components/ExploreSearchBar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { useResponsive } from '@/hooks/useResponsive';
import { eventEmitter } from '@/lib/EventEmitter';
import { useMessagesSettings, useNotificationsSettings } from '@/state/communicationSettings';

type FilterType = 'All' | 'DMs' | 'Groups' | 'Channels' | 'Unread';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { showSidebar } = useResponsive();
  const router = useRouter();
  const { allowMessageRequests, filterLowQuality } = useMessagesSettings();
  const { mutedWords } = useNotificationsSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadConversations = useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const res = await api.getConversations({
        cursor: initial ? undefined : nextCursor,
        limit: 20
      });

      if (initial) {
        setConversations(res.conversations);
      } else {
        setConversations(prev => [...prev, ...res.conversations]);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextCursor, hasMore, loadingMore]);

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
      loadConversations(true);
    };

    const handleNewMessage = (payload: { conversationId: string, message: any }) => {
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === payload.conversationId);
        if (index > -1) {
          // Move existing conversation to top and update snippet
          const updated = [...prev];
          const conv = { ...updated[index] };
          conv.lastMessage = {
            id: payload.message.id,
            text: payload.message.text,
            createdAt: payload.message.createdAt,
            senderId: payload.message.senderId
          };
          conv.updatedAt = payload.message.createdAt;
          // Only increment unread if it's not already read (this is simplified, 
          // usually backend handles this but for instant UI we can increment)
          if (payload.message.senderId !== currentUser?.id) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }

          updated.splice(index, 1);
          updated.unshift(conv);
          return updated;
        } else {
          // If conversation not in list (might be on another page or brand new), 
          // reload the first page to be sure
          loadConversations(true);
          return prev;
        }
      });
    };

    eventEmitter.on('conversationRead', handleConversationRead);
    eventEmitter.on('newMessage', handleNewMessage);

    return () => {
      eventEmitter.off('conversationRead', handleConversationRead);
      eventEmitter.off('newMessage', handleNewMessage);
    };
  }, [loadConversations, currentUser?.id]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (filterLowQuality && conv.isLowQuality) {
        return false;
      }

      if (conv.type === 'DM' && !allowMessageRequests) {
        const otherParticipant = conv.participants.find(p => p.id !== currentUser?.id);
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
          const otherUser = conv.participants.find(p => p.id !== currentUser?.id) || conv.participants[0];
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
        refreshing={loading && conversations.length > 0}
        onRefresh={() => loadConversations(true)}
        onEndReached={() => loadConversations(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={searchQuery ? 'No results found' : 'Welcome to your inbox!'}
            description={searchQuery ? 'Try searching for something else.' : 'Direct Messages are private conversations between you and other people on Postr.'}
            icon={searchQuery ? 'search-outline' : 'mail-unread-outline'}
            actionLabel={!searchQuery ? 'Write a message' : undefined}
            onAction={!searchQuery ? () => router.push('/(modals)/new-message') : undefined}
          />
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
