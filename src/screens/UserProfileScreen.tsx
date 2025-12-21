
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileBio from '@/components/profile/ProfileBio';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActionRow, { ViewerRelationship } from '@/components/profile/ProfileActionRow';
import ProfileTabs, { ProfileTab } from '@/components/profile/ProfileTabs';
import PostCard from '@/components/PostCard';
import { eventEmitter } from '@/lib/EventEmitter';

const currentUserId = '0';

const mockPosts: Post[] = [
  {
    id: '1',
    content: 'This is the first post!',
    createdAt: '1h',
    author: {
      id: '0',
      name: 'Dev Team',
      username: 'devteam',
      avatar: 'https://i.pravatar.cc/150?u=devteam',
      is_suspended: false,
      is_shadow_banned: false,
      is_limited: false,
    },
    likeCount: 0,
    dislikeCount: 0,
    laughCount: 0,
    repostCount: 0,
    commentCount: 0,
    userReaction: 'NONE',
  },
  {
    id: '2',
    content: 'This is the second post, with an image!',
    media: [{ type: 'image', url: 'https://i.pravatar.cc/1000?u=a' }],
    createdAt: '2h',
    author: {
      id: '0',
      name: 'Dev Team',
      username: 'devteam',
      avatar: 'https://i.pravatar.cc/150?u=devteam',
      is_suspended: false,
      is_shadow_banned: false,
      is_limited: false,
    },
    likeCount: 0,
    dislikeCount: 0,
    laughCount: 0,
    repostCount: 0,
    commentCount: 0,
    userReaction: 'NONE',
  },
];

export default function UserProfileScreen() {
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
    const fetchUser = async () => {
      setLoading(true);
      try {
        const usernameToFetch = (paramUsername as string) || 'devteam';
        const fetchedUser = await api.fetchUser(usernameToFetch);
        if (fetchedUser) {
          setUser(fetchedUser);

          // Fetch initial posts
          const initialPosts = await api.getProfilePosts(fetchedUser.id);
          setPosts(initialPosts);

          const rel = await api.fetchUserRelationship(fetchedUser.id);
          setRelationship(rel);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [paramUsername]);

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
          const data = await api.getProfileReactions(user.id);
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
    if (!user) return;
    setIsFollowingLoading(true);
    try {
      await api.followUser(user.id);
      const newRel = await api.fetchUserRelationship(user.id);
      setRelationship(newRel);

      // Refresh following list to show the newly followed user
      const updatedFollowing = await api.getFollowing('0'); // Current user ID is '0'
      setFollowing(updatedFollowing);
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
    if (!user) return;
    setIsFollowingLoading(true);
    try {
      await api.unfollowUser(user.id);
      const newRel = await api.fetchUserRelationship(user.id);
      setRelationship(newRel);

      // Refresh following list to remove the unfollowed user
      const updatedFollowing = await api.getFollowing('0'); // Current user ID is '0'
      setFollowing(updatedFollowing);
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
            relationship && (
              <ProfileActionRow
                relationship={relationship}
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
        isOwner={user?.id === '0'}
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
