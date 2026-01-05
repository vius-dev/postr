
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
import { isSelf } from '@/state/auth';
import { PostPipeline } from '@/domain/post/post.pipeline';


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
          // Load cached posts with Reactions
          const postsQuery = `
            SELECT
              p.*,
              u.username, u.display_name, u.avatar_url, u.verified as is_verified,
              r.reaction_type as my_reaction,
              qp.id as inner_quoted_post_id, qp.content as quoted_content, qp.type as quoted_type,
              qp.created_at as quoted_created_at, qp.updated_at as quoted_updated_at,
              qp.media_json as quoted_media_json, qp.poll_json as quoted_poll_json, qp.like_count as quoted_like_count,
              qp.reply_count as quoted_reply_count, qp.repost_count as quoted_repost_count,
              qu.id as quoted_author_id, qu.username as quoted_author_username,
              qu.display_name as quoted_author_name, qu.avatar_url as quoted_author_avatar,
              qu.verified as quoted_author_verified,
              rp.id as inner_reposted_post_id, rp.content as reposted_content, rp.type as reposted_type,
              rp.created_at as reposted_created_at, rp.updated_at as reposted_updated_at,
              rp.media_json as reposted_media_json, rp.poll_json as reposted_poll_json, rp.like_count as reposted_like_count,
              rp.reply_count as reposted_reply_count, rp.repost_count as reposted_repost_count,
              ru.id as reposted_author_id, ru.username as reposted_author_username,
              ru.display_name as reposted_author_name, ru.avatar_url as reposted_author_avatar,
              ru.verified as reposted_author_verified,
              pv.choice_index as user_vote_index
            FROM feed_items f
            JOIN posts p ON f.post_id = p.id
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
            LEFT JOIN poll_votes pv ON p.id = pv.post_id AND pv.user_id = ?
            LEFT JOIN posts qp ON p.quoted_post_id = qp.id AND qp.deleted = 0
            LEFT JOIN users qu ON qp.owner_id = qu.id
            LEFT JOIN posts rp ON p.reposted_post_id = rp.id AND rp.deleted = 0
            LEFT JOIN users ru ON rp.owner_id = ru.id
            WHERE f.feed_type = ?
            ORDER BY f.rank_score DESC
          `;
          const rows = await db.getAllAsync(postsQuery, [currentUser?.id || '', currentUser?.id || '', `profile:${localUser.id}`]) as any[];

          const ctx = {
            viewerId: currentUser?.id || null,
            now: new Date().toISOString()
          };

          const mappedPosts: Post[] = rows.map((row: any) =>
            PostPipeline.map(PostPipeline.adapt(row), ctx)
          );
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
        console.error('[UserProfile] Failed to load profile locally:', e);
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

    const handleFeedUpdate = () => {
      loadUser(true); // Silent update from SQLite
    };

    eventEmitter.on('profileUpdated', handleUpdate);
    eventEmitter.on('feedUpdated', handleFeedUpdate);

    loadUser(false); // Initial load (not silent)

    return () => {
      eventEmitter.off('profileUpdated', handleUpdate);
      eventEmitter.off('feedUpdated', handleFeedUpdate);
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
            (relationship || isSelf(user.id)) && (
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
        isOwner={isSelf(user?.id || '')}
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
      onPress={() => router.push(`/ (profile) / ${item.username}`)}
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
