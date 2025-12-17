
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { UserProfile } from "@/types/user";
import { Post } from "@/types/post";
import { Ionicons } from '@expo/vector-icons';

const ProfileHeader = ({ profile, isOwnProfile }: { profile: UserProfile, isOwnProfile: boolean }) => {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.headerContainer}>
      <Image source={{ uri: profile.headerImage || undefined }} style={styles.headerImage} />
      <View style={styles.profileDetailsContainer}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: profile.avatar || undefined }} style={[styles.avatar, { borderColor: theme.background }]} />
          {isOwnProfile && (
            <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(profile)/edit')}>
              <Text style={[styles.editButtonText, { color: theme.textPrimary }]}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.name, { color: theme.textPrimary }]}>{profile.name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={[styles.bio, { color: theme.textPrimary }]}>{profile.bio}</Text>
        <View style={styles.infoRow}>
          {profile.location && <Ionicons name="location-outline" size={16} color={theme.textTertiary} />}
          {profile.location && <Text style={styles.infoText}>{profile.location}</Text>}
          {profile.website && <Ionicons name="link-outline" size={16} color={theme.textTertiary} />}
          {profile.website && <Text style={[styles.infoText, { color: theme.link }]}>{profile.website}</Text>}
        </View>
      </View>
    </View>
  );
};


const UserProfileScreen = () => {
  const { username } = useLocalSearchParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await api.getProfileByUsername(username as string);
        setProfile(userProfile);
        const userPosts = await api.getPostsByUser(userProfile.id);
        setPosts(userPosts);
      } catch (error) {
        console.error('Failed to fetch profile or posts', error);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (!profile) {
    return <View><Text>Loading...</Text></View>;
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
            <Text>{item.content}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id.toString()}
      ListHeaderComponent={<ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />}
    />
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    // Styles for the header container
  },
  headerImage: {
    width: '100%',
    height: 120,
  },
  profileDetailsContainer: {
    padding: 15,
  },
  avatarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  editButtonText: {
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  username: {
    fontSize: 16,
    color: 'gray',
  },
  bio: {
    marginTop: 10,
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 5,
    marginRight: 15,
    fontSize: 16,
    color: 'gray',
  },
});

export default UserProfileScreen;
