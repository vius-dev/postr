
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
import ExploreSearchBar from '@/components/ExploreSearchBar';
import ForYouFeed from '@/components/ForYouFeed';
import { useExploreSettings } from '@/state/exploreSettings';
import { eventEmitter } from '@/lib/EventEmitter';

export default function ExploreScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { showLocationContent, personalizeTrends, explorationLocation } = useExploreSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ posts: Post[], users: User[] }>({ posts: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [trends, setTrends] = useState<{ hashtag: string, count: number }[]>([]);

  React.useEffect(() => {
    const fetchTrends = async () => {
      // In a real app, we'd pass these settings to the API
      const trendingData = await api.getTrends();

      // For personalizing, we might shuffle or filter if this was a real backend
      // Here we just simulate it by slightly changing the order or count
      if (!personalizeTrends) {
        setTrends(trendingData.slice().reverse()); // Just to show a difference
      } else {
        setTrends(trendingData);
      }
    };
    fetchTrends();

    const handlePostDeleted = (deletedPostId: string) => {
      setSearchResults(prev => ({
        ...prev,
        posts: prev.posts.filter(p => p.id !== deletedPostId)
      }));
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    return () => eventEmitter.off('postDeleted', handlePostDeleted);
  }, [personalizeTrends]);

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

  const renderTrendItem = ({ item, index }: { item: { hashtag: string, count: number }, index: number }) => (
    <TouchableOpacity
      style={[styles.trendItem, { borderBottomColor: theme.borderLight }]}
      onPress={() => handleSearch(item.hashtag)}
    >
      <View style={styles.trendInfo}>
        <Text style={[styles.trendCategory, { color: theme.textTertiary }]}>
          {index + 1} · {personalizeTrends ? 'Trending' : 'Worldwide'}
        </Text>
        <Text style={[styles.trendHashtag, { color: theme.textPrimary }]}>
          #{item.hashtag}
        </Text>
        <Text style={[styles.trendCount, { color: theme.textTertiary }]}>
          {item.count} posts
        </Text>
      </View>
      <TouchableOpacity style={styles.trendMore}>
        <Ionicons name="ellipsis-horizontal" size={16} color={theme.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
      <View style={[styles.searchHeader, { borderBottomColor: theme.border }]}>
        <ExploreSearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search Twitter"
          containerStyle={{ flex: 1 }}
        />
        <TouchableOpacity
          style={styles.settingsIcon}
          onPress={() => router.push('/explore/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {isSearching ? (
        renderSearchResult()
      ) : (
        <ForYouFeed
          header={
            <>
              <View style={styles.trendsSection}>
                <Text style={[styles.trendsTitle, { color: theme.textPrimary }]}>
                  {personalizeTrends ? 'Trends for you' : `Trending in ${showLocationContent ? 'Your Location' : explorationLocation}`}
                </Text>
                {trends.map((item, index) => (
                  <View key={item.hashtag}>
                    {renderTrendItem({ item, index })}
                  </View>
                ))}
                <TouchableOpacity style={styles.showMoreTrends}>
                  <Text style={{ color: theme.primary, fontSize: 15 }}>Show more</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.surface }]} />
              <View style={styles.feedSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, paddingVertical: 15 }]}>What's happening</Text>
              </View>
            </>
          }
        />
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
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 15,
  },
  trendsSection: {
    paddingVertical: 10,
  },
  trendsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  trendInfo: {
    flex: 1,
  },
  trendCategory: {
    fontSize: 13,
    marginBottom: 2,
  },
  trendHashtag: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trendCount: {
    fontSize: 13,
  },
  trendMore: {
    padding: 5,
  },
  showMoreTrends: {
    padding: 15,
  },
  divider: {
    height: 8,
  },
  feedSection: {
    paddingBottom: 20,
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
