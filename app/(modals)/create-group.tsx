
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import ExploreSearchBar from '@/components/ExploreSearchBar';
import { useAuth } from '@/providers/AuthProvider';

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      // In a real app, you'd fetch following or contacts.
      const allUsers = await api.getFollowing(currentUser?.id);
      setUsers(allUsers.filter(u => u.id !== currentUser?.id));
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prevSelected =>
      prevSelected.includes(userId)
        ? prevSelected.filter(id => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (groupName.trim() === '' || selectedUsers.length === 0) {
      return;
    }
    try {
      const newConversation = await api.createGroupConversation(groupName.trim(), selectedUsers);
      router.push(`/conversation/${newConversation.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: theme.surface }]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: theme.textTertiary }}>@{item.username}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? theme.primary : theme.textTertiary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create Group</Text>
        <TouchableOpacity
          onPress={handleCreateGroup}
          style={[
            styles.createButton,
            { backgroundColor: (groupName.trim() && selectedUsers.length > 0) ? theme.primary : theme.surface }
          ]}
          disabled={!groupName.trim() || selectedUsers.length === 0}
        >
          <Text style={[
            styles.createButtonText,
            { color: (groupName.trim() && selectedUsers.length > 0) ? 'white' : theme.textTertiary }
          ]}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <View style={[styles.groupNameContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="people-outline" size={20} color={theme.textTertiary} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: theme.textPrimary }]}
            placeholder="Group Name"
            placeholderTextColor={theme.textTertiary}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>
      </View>

      <View style={{ paddingVertical: 10 }}>
        <ExploreSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search people to add"
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        extraData={selectedUsers}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.textTertiary }}>No users found</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontWeight: 'bold',
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 44,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
