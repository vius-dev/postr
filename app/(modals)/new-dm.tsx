
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { User } from '@/types/user';

export default function NewDirectMessageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  useState(() => {
    api.getFollowing('0').then(setUsers);
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleSelectUser = (user: User) => {
    // Check if a conversation already exists
    api.getConversations().then(conversations => {
        const existing = conversations.find(c => c.participants.some(p => p.id === user.id));
        if (existing) {
            router.push(`/conversation/${existing.id}`);
        } else {
            // Create a new conversation (mock)
            const newConversationId = `conv-${Date.now()}`;
            router.push(`/conversation/${newConversationId}`);
        }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>New Message</Text>
        {/* A button to confirm selection, for now we navigate on press */}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search people"
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <TouchableOpacity style={styles.userRow} onPress={() => handleSelectUser(item)}>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginHorizontal: 15
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
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
