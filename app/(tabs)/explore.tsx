
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '@/components/PostCard';
import { Post } from '@/types/post';
import { User } from '@/types/user';
import { useRouter } from 'expo-router';
import ForYouFeed from '@/components/ForYouFeed'; // Import the new component

export default function ExploreScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ posts: Post[], users: User[] }>({ posts: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      const results = await api.search(query);
      setSearchResults(results);
    } else {
      setIsSearching(false);
    }
  };

  const renderSearchResult = () => {
    if (searchResults.users.length === 0 && searchResults.posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results for "{searchQuery}"</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.resultsScroll}>
        {searchResults.users.length > 0 && (
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>People</Text>
            {searchResults.users.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.userItem}
                onPress={() => router.push(`/(profile)/${user.username}`)}
              >
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <View>
                  <Text style={[styles.userName, { color: theme.textPrimary }]}>{user.name}</Text>
                  <Text style={[styles.userHandle, { color: theme.textTertiary }]}>@{user.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {searchResults.posts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, paddingBottom: 10 }]}>Latest</Text>
            {searchResults.posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search Twitter"
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.settingsIcon}>
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {isSearching ? (
        renderSearchResult()
      ) : (
        <ForYouFeed />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd', // Added a light border
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40, // Increased height for better touchability
    borderRadius: 20, // Make it more rounded
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  settingsIcon: {
    marginLeft: 15,
  },
  resultsScroll: {
    flex: 1,
  },
  section: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 20, // Larger section title
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  userHandle: {
    fontSize: 15,
    color: 'gray',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 17,
  },
});
