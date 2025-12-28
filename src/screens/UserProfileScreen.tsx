
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileBio from '@/components/profile/ProfileBio';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActionRow, { ViewerRelationship } from '@/components/profile/ProfileActionRow';
import ProfileTabs, { ProfileTab } from '@/components/profile/ProfileTabs';
import PostCard from '@/components/PostCard';
import { eventEmitter } from '@/lib/EventEmitter';
import { getDb } from '@/lib/db/sqlite';
import { SyncEngine } from '@/lib/sync/SyncEngine';


export default function UserProfileScreen() {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [relationship, setRelationship] = useState<ViewerRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('Posts');
  const [replies, setReplies] = useState<Post[]>([]);
  const [media, setMedia] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const { theme } = useTheme();
  const router = useRouter();
  const { username: paramUsername } = useLocalSearchParams();

  useEffect(() => {
    const loadUser = async (silent = false) => {
      if (!silent) setLoading(true);
      const usernameToFetch = (paramUsername as string) || currentUser?.id;
      if (!usernameToFetch) return;

      try {
        const db = await getDb();

        // 1. Try Local Load
        const localUser: any = await db.getFirstAsync(
          'SELECT * FROM users WHERE id = ? OR username = ?',
          [usernameToFetch, usernameToFetch]
        );

        if (localUser) {
          const mappedUser: User = {
            id: localUser.id,
            username: localUser.username,
            name: localUser.display_name,
            avatar: localUser.avatar_url,
            headerImage: localUser.header_url,
            is_verified: !!localUser.verified,
            is_active: true,
            is_limited: false,
            is_shadow_banned: false,
            is_suspended: false,
            is_muted: false,
          };
          setUser(mappedUser);

          // Load cached posts with Reactions
          const rows = await db.getAllAsync(`
            SELECT
              p.*,
              u.username, u.display_name, u.avatar_url, u.verified as is_verified,
              r.reaction_type as my_reaction
            FROM feed_items f
            JOIN posts p ON f.post_id = p.id
            JOIN users u ON p.author_id = u.id
            LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
            WHERE f.feed_type = ?
            ORDER BY f.rank_score DESC
          `, [currentUser?.id || '', `profile:${localUser.id}`]) as any[];

          const mappedPosts: Post[] = rows.map((row: any) => ({
            id: row.id,
            content: row.content,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
            author: {
              id: row.author_id,
              username: row.username,
              name: row.display_name,
              avatar: row.avatar_url,
              is_verified: !!row.is_verified,
              is_suspended: false,
              is_shadow_banned: false,
              is_limited: false,
            },
            media: row.media_json ? JSON.parse(row.media_json) : [],
            likeCount: row.like_count || 0,
            commentCount: row.reply_count || 0,
            repostCount: row.repost_count || 0,
            dislikeCount: 0,
            laughCount: 0,
            userReaction: row.my_reaction || 'NONE',
            isBookmarked: false,
          }));
          setPosts(mappedPosts);
          if (!silent) setLoading(false);
        } else {
          // If we don't have local user, we MUST rely on sync and loading indicator
          // But if this was a silent update, we shouldn't be here (unless data vanished)
        }

        // 2. Trigger Background Sync (Fire and forget)
        // Only trigger sync if NOT silent (initial load) OR if specifically requested?
        // Actually, handleUpdate calls this. We might want to skip triggering ANOTHER sync if we just updated from one.
        // But for now, let's keep it simple: initial load triggers sync. Update load doesn't need to trigger sync.
        if (!silent) {
          SyncEngine.syncProfile(usernameToFetch).catch(console.error);
        }

      } catch (e) {
        console.error('Failed to load profile locally', e);
      } finally {
        if (!user && loading && !silent) setLoading(false);
      }
    };

    // Listen for updates
    const handleUpdate = async (updatedUserId: string) => {
      const usernameToFetch = (paramUsername as string) || currentUser?.id;
      if (!usernameToFetch) return;

      // Check relevance via DB (avoids stale state)
      const db = await getDb();
      const relevant = await db.getFirstAsync(
        'SELECT id FROM users WHERE id = ? AND (id = ? OR username = ?)',
        [updatedUserId, usernameToFetch, usernameToFetch]
      );

      if (relevant) {
        loadUser(true); // Silent update!
      }
    };

    eventEmitter.on('profileUpdated', handleUpdate);

    loadUser(false); // Initial load (not silent)

    return () => {
      eventEmitter.off('profileUpdated', handleUpdate);
    };
  }, [paramUsername, currentUser?.id]); // Added currentUser.id dependency for reaction join

  useEffect(() => {
    const fetchTabData = async () => {
      if (!user) return;

      if (selectedTab === 'Following' && following.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getFollowing(user.id);
          setFollowing(data);
        } catch (error) {
          console.error("Failed to fetch following", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Followers' && followers.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getFollowers(user.id);
          setFollowers(data);
        } catch (error) {
          console.error("Failed to fetch followers", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Replies' && replies.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getProfileReplies(user.id);
          setReplies(data);
        } catch (error) {
          console.error("Failed to fetch replies", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Media' && media.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getProfileMedia(user.id);
          setMedia(data);
        } catch (error) {
          console.error("Failed to fetch media", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Dis/Likes' && reactions.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getProfileLikes(user.id);
          setReactions(data);
        } catch (error) {
          console.error("Failed to fetch reactions", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Bookmark' && bookmarks.length === 0) {
        setIsListLoading(true);
        try {
          const data = await api.getBookmarks();
          setBookmarks(data);
        } catch (error) {
          console.error("Failed to fetch bookmarks", error);
        } finally {
          setIsListLoading(false);
        }
      } else if (selectedTab === 'Posts') {
        // Always refresh posts if we come back to this tab and it might have changed?
        // Or just let it be. For now, we've pre-fetched them on user load.
      }
    };
    fetchTabData();
  }, [selectedTab, user]);

  useEffect(() => {
    const handlePostDeleted = (deletedPostId: string) => {
      const filter = (p: Post) => p.id !== deletedPostId;
      setPosts(prev => prev.filter(filter));
      setReplies(prev => prev.filter(filter));
      setMedia(prev => prev.filter(filter));
      setReactions(prev => prev.filter(filter));
      setBookmarks(prev => prev.filter(filter));
    };

    eventEmitter.on('postDeleted', handlePostDeleted);
    return () => eventEmitter.off('postDeleted', handlePostDeleted);
  }, []);

  const handleFollow = async () => {
    if (!user || isFollowingLoading) return;
    setIsFollowingLoading(true);
    try {
      await api.toggleFollow(user.id);
      const newRel = await api.getUserRelationship(user.id);
      setRelationship(newRel);

      // Refresh following list
      if (currentUser) {
        const updatedFollowing = await api.getFollowing(currentUser.id);
        setFollowing(updatedFollowing);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to follow user';

      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit exceeded')) {
        Alert.alert(
          'Rate Limit Reached',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to follow user. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
        console.error("Failed to follow user", error);
      }
    } finally {
      setIsFollowingLoading(false);
    }
  };


  const handleUnfollow = async () => {
    if (!user || isFollowingLoading) return;
    setIsFollowingLoading(true);
    try {
      await api.toggleFollow(user.id);
      const newRel = await api.getUserRelationship(user.id);
      setRelationship(newRel);

      // Refresh following list
      if (currentUser) {
        const updatedFollowing = await api.getFollowing(currentUser.id);
        setFollowing(updatedFollowing);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unfollow user';

      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit exceeded')) {
        Alert.alert(
          'Rate Limit Reached',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to unfollow user. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
        console.error("Failed to unfollow user", error);
      }
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const ListHeader = (
    <View>
      {user && (
        <ProfileHeader
          user={user}
          action={
            (relationship || (user.id === currentUser?.id)) && (
              <ProfileActionRow
                relationship={relationship || { type: 'SELF', targetUserId: user.id }}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onEditProfile={() => router.push('/edit')}
                onSettings={() => router.push('/(settings)/settings')}
                isLoading={isFollowingLoading}
                style={{ paddingHorizontal: 0 }}
              />
            )
          }
        />
      )}
      {user && <ProfileBio user={user} />}
      {user && <ProfileStats
        postCount={posts.length}
        followingCount={following.length}
        followerCount={followers.length}
        activeTab={selectedTab}
        onPostsPress={() => setSelectedTab('Posts')}
        onFollowingPress={() => setSelectedTab('Following')}
        onFollowersPress={() => setSelectedTab('Followers')}
      />}
      <ProfileTabs
        selectedTab={selectedTab}
        isOwner={user?.id === currentUser?.id}
        onSelectTab={(tab) => {
          if (tab === 'Shop') {
            router.push('/(tabs)/shop');
          } else {
            setSelectedTab(tab);
          }
        }}
      />
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Text style={styles.centered}>User not found.</Text>;
  }

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: theme.borderLight }]}
      onPress={() => router.push(`/(profile)/${item.username}`)}
    >
      <Image source={{ uri: item.avatar }} style={styles.listAvatar} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.userHandle, { color: theme.textTertiary }]}>@{item.username}</Text>
        {item.bio && <Text style={[styles.userBio, { color: theme.textSecondary }]} numberOfLines={1}>{item.bio}</Text>}
      </View>
    </TouchableOpacity>
  );

  const getListData = () => {
    switch (selectedTab) {
      case 'Following': return following;
      case 'Followers': return followers;
      case 'Replies': return replies;
      case 'Media': return media;
      case 'Dis/Likes': return reactions;
      case 'Bookmark': return bookmarks;
      case 'Posts': return posts;
      case 'Shop': return [{ id: 'shop-placeholder', type: 'placeholder' }];
      default: return [];
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (selectedTab === 'Following' || selectedTab === 'Followers') {
      return renderUserItem({ item });
    }
    if (selectedTab === 'Shop') {
      return (
        <View style={styles.shopPlaceholder}>
          <Ionicons name="cart-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Shop coming soon!</Text>
        </View>
      );
    }
    return <PostCard post={item} />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={getListData()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={{ backgroundColor: theme.background }}
        ListFooterComponent={
          isListLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
          ) : (
            <View style={{ height: 50 }} />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 14,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 14,
  },
  shopPlaceholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 18,
    textAlign: 'center',
  },
});
