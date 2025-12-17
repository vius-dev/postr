
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { User } from '@/types/user';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileBio from '@/components/profile/ProfileBio';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActionRow, { ViewerRelationship } from '@/components/profile/ProfileActionRow';
import ProfileTabs, { ProfileTab } from '@/components/profile/ProfileTabs';
import PostCard from '@/components/PostCard';

const currentUserId = '0';

const mockPosts: Post[] = [
  {
    id: '1',
    content: 'This is the first post!',
    createdAt: '1h',
    author: {
      id: '0',
      name: 'Current User',
      username: 'currentuser',
      avatar: 'https://i.pravatar.cc/150?u=0',
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
      name: 'Current User',
      username: 'currentuser',
      avatar: 'https://i.pravatar.cc/150?u=0',
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
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('Posts');
  const { theme } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const fetchedUser = await api.fetchUser('currentuser');
        if (fetchedUser) {
          setUser(fetchedUser);
          setPosts(mockPosts);
          setRelationship({ type: fetchedUser.id === currentUserId ? 'SELF' : 'NOT_FOLLOWING' });
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleFollow = async () => {
    if (!user) return;
    setIsFollowingLoading(true);
    const originalRelationship = relationship;
    setRelationship({ type: 'FOLLOWING' });
    try {
      await api.followUser(user.id);
    } catch (error) {
      console.error("Failed to follow user", error);
      setRelationship(originalRelationship);
    }
    setIsFollowingLoading(false);
  };

  const handleUnfollow = async () => {
    if (!user) return;
    setIsFollowingLoading(true);
    const originalRelationship = relationship;
    setRelationship({ type: 'NOT_FOLLOWING' });
    try {
      await api.unfollowUser(user.id);
    } catch (error) {
      console.error("Failed to unfollow user", error);
      setRelationship(originalRelationship);
    }
    setIsFollowingLoading(false);
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
                onEditProfile={() => console.log('Edit Profile')}
                isLoading={isFollowingLoading}
                style={{ paddingHorizontal: 0 }} // Remove default horizontal padding if any
              />
            )
          }
        />
      )}
      {user && <ProfileBio user={user} />}
      {user && <ProfileStats
        postCount={123}
        followingCount={456}
        followerCount={789}
        onFollowingPress={() => console.log('Following list')}
        onFollowersPress={() => console.log('Followers list')}
      />}
      <ProfileTabs selectedTab={selectedTab} onSelectTab={setSelectedTab} />
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={{ backgroundColor: theme.background }}
        ListFooterComponent={<View style={{ height: 50 }} />}
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
});
