
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { User } from '@/types/user';

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    // In a real app, you'd fetch a list of users you can add to a group.
    // For this example, we'll use the mock users from the api.
    const fetchUsers = async () => {
        const allUsers = await api.getFollowing('0'); // just a way to get some users
        setUsers(allUsers.filter(u => u.id !== '0')); // Exclude current user
    };
    fetchUsers();
  }, []);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prevSelected =>
      prevSelected.includes(userId)
        ? prevSelected.filter(id => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (groupName.trim() === '' || selectedUsers.length === 0) {
      // Basic validation
      return;
    }
    // This function does not exist yet. I will create it in the next step.
    // const newConversation = await api.createGroupConversation(groupName, selectedUsers);
    // router.replace(`/conversation/${newConversation.id}`);
    console.log("Creating group with name:", groupName, "and users:", selectedUsers)
    router.back();
  };

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <TouchableOpacity style={styles.userRow} onPress={() => toggleUserSelection(item.id)}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
            <Text style={{color: theme.textPrimary}}>{item.name}</Text>
            <Text style={{color: theme.textTertiary}}>@{item.username}</Text>
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>New Group</Text>
        <TouchableOpacity onPress={handleCreateGroup} style={[styles.createButton, {backgroundColor: theme.primary}]}>
            <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary }]}
          placeholder="Group Name"
          placeholderTextColor={theme.textTertiary}
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        extraData={selectedUsers}
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
        color: 'white',
        fontWeight: 'bold',
    },
    inputContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    input: {
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        fontSize: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2f3336',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    userInfo: {
        flex: 1,
    },
});
