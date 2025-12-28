
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import { useAuth } from '@/providers/AuthProvider';
import ExploreSearchBar from '@/components/ExploreSearchBar';

export default function NewDirectMessageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      api.getFollowing(currentUser.id).then(setUsers);
    }
  }, [currentUser?.id]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleSelectUser = async (user: User) => {
    try {
      // api.createConversation handles both finding existing or creating new
      const conversation = await api.createConversation(user.id);
      router.replace(`/conversation/${conversation.id}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>New DM</Text>
        {/* A button to confirm selection, for now we navigate on press */}
      </View>

      <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
        <ExploreSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search people"
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userRow, { borderBottomColor: theme.borderLight }]}
            onPress={() => handleSelectUser(item)}
          >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View>
              <Text style={[styles.name, { color: theme.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.username, { color: theme.textTertiary }]}>@{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: theme.textSecondary }}>No users found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  title: {
    marginLeft: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 15,
  },
});
