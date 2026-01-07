
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
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
import EmptyState from '@/components/EmptyState';
import { useExploreSettings } from '@/state/exploreSettings';
import { eventEmitter } from '@/lib/EventEmitter';
import { WhoToFollow } from '@/components/discovery/WhoToFollow';
import { usePostNavigation } from '@/hooks/usePostNavigation';

export default function ExploreScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const postNavigation = usePostNavigation();
  const { showLocationContent, personalizeTrends, explorationLocation } = useExploreSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ posts: Post[], users: User[] }>({ posts: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [trends, setTrends] = useState<{ hashtag: string, count: number }[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [visibleTrendsCount, setVisibleTrendsCount] = useState(5);
  const [searchTab, setSearchTab] = useState<'Latest' | 'People' | 'Media'>('Latest');

  React.useEffect(() => {
    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const trendingData = await api.getTrending(20);

        if (trendingData) {
          setTrends(trendingData);
        } else {
          setTrends([]);
        }
      } catch (error) {
        console.error('Error fetching trends:', error);
        setTrends([]);
      } finally {
        setLoadingTrends(false);
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

  const handleShowMore = () => {
    setVisibleTrendsCount(prev => prev + 5);
  };

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
    const hasPosts = searchResults.posts.length > 0;
    const hasUsers = searchResults.users.length > 0;
    const mediaPosts = searchResults.posts.filter(p => (p.media?.length ?? 0) > 0);
    const hasMedia = mediaPosts.length > 0;

    const isEmpty = searchTab === 'Latest' ? !hasPosts : (searchTab === 'People' ? !hasUsers : !hasMedia);

    if (isEmpty) {
      return (
        <EmptyState
          title={`No ${searchTab.toLowerCase()} for "${searchQuery}"`}
          description={`Try searching for something else.`}
          icon="search-outline"
        />
      );
    }

    return (
      <ScrollView style={styles.resultsScroll} stickyHeaderIndices={[0]}>
        <View style={{ backgroundColor: theme.background }}>
          <View style={[styles.tabsRow, { borderBottomColor: theme.borderLight }]}>
            {['Latest', 'People', 'Media'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  searchTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
                ]}
                onPress={() => setSearchTab(tab as any)}
              >
                <Text style={[
                  styles.tabText,
                  { color: searchTab === tab ? theme.textPrimary : theme.textTertiary },
                  searchTab === tab && { fontWeight: 'bold' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {searchTab === 'People' && hasUsers && (
          <View style={styles.section}>
            {searchResults.users.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.userItem}
                onPress={() => router.push(`/(profile)/${user.username}`)}
              >
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>{user.name}</Text>
                  <Text style={[styles.userHandle, { color: theme.textTertiary }]} numberOfLines={1}>@{user.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {searchTab === 'Latest' && hasPosts && (
          <View style={styles.section}>
            {searchResults.posts.map(post => (
              <PostCard key={post.id} post={post} {...postNavigation} />
            ))}
          </View>
        )}
        {searchTab === 'Media' && hasMedia && (
          <View style={styles.section}>
            {mediaPosts.map(post => (
              <PostCard key={post.id} post={post} {...postNavigation} />
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
          placeholder="Search Vius"
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
          {...postNavigation}
          header={
            <>
              <WhoToFollow />
              <View style={styles.trendsSection}>
                <Text style={[styles.trendsTitle, { color: theme.textPrimary }]}>
                  {personalizeTrends ? 'Trends for you' : `Trending in ${showLocationContent ? 'Your Location' : explorationLocation}`}
                </Text>
                {loadingTrends ? (
                  <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
                ) : trends.length === 0 ? (
                  <View style={{ padding: 15 }}>
                    <Text style={{ color: theme.textTertiary }}>No trends available right now</Text>
                  </View>
                ) : (
                  <>
                    {trends.slice(0, visibleTrendsCount).map((item, index) => (
                      <View key={item.hashtag}>
                        {renderTrendItem({ item, index })}
                      </View>
                    ))}
                    {visibleTrendsCount < trends.length && (
                      <TouchableOpacity style={styles.showMoreTrends} onPress={handleShowMore}>
                        <Text style={{ color: theme.primary, fontSize: 15 }}>Show more</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
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
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
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
