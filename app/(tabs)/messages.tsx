
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import ConversationItem from '@/components/ConversationItem';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

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

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase();
    if (conv.type === 'DM') {
      const otherUser = conv.participants.find(p => p.id !== '0') || conv.participants[0];
      return (
        otherUser.name.toLowerCase().includes(query) ||
        otherUser.username.toLowerCase().includes(query)
      );
    }
    return conv.name?.toLowerCase().includes(query);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search Messages"
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem conversation={item} />}
        refreshing={loading}
        onRefresh={loadConversations}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery ? 'No results found' : 'Send a message, get a message'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
              {searchQuery ? 'Try searching for something else.' : 'Direct Messages are private conversations between you and other people on Twitter.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={[styles.writeButton, { backgroundColor: theme.primary }]} onPress={() => router.push('/(modals)/new-message')}>
                <Text style={styles.writeButtonText}>Write a message</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Compose FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => router.push('/(modals)/new-message')}>
        <Ionicons name="mail-outline" size={24} color="white" />
      </TouchableOpacity>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
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
    color: 'white',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
