
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert, TextInput, TouchableOpacity } from 'react-native';
import { User } from '../../types/user';
import { fetchAllUsers, updateUser } from './api'; // Using the new admin API
import { Link } from 'expo-router';

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    try {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch users.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggle = async (userId: string, field: keyof User, value: boolean) => {
    try {
      await updateUser(userId, { [field]: value });
      // Refresh the list to show the updated status
      loadUsers();
    } catch (error) {
      Alert.alert('Error', `Could not update user ${userId}.`);
    }
  };

  const filteredUsers = useMemo(() => {
      if (!searchTerm) return users;
      return users.filter(user => 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [users, searchTerm]);

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.userContainer}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
      <View style={styles.toggles}>
        <View style={styles.toggleRow}>
          <Text>Active</Text>
          <Switch
            value={item.is_active}
            onValueChange={value => handleToggle(item.id, 'is_active', value)}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text>Limited</Text>
          <Switch
            value={item.is_limited}
            onValueChange={value => handleToggle(item.id, 'is_limited', value)}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text>Shadow Banned</Text>
          <Switch
            value={item.is_shadow_banned}
            onValueChange={value => handleToggle(item.id, 'is_shadow_banned', value)}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text>Suspended</Text>
          <Switch
            value={item.is_suspended}
            onValueChange={value => handleToggle(item.id, 'is_suspended', value)}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text>Muted</Text>
          <Switch
            value={item.is_muted}
            onValueChange={value => handleToggle(item.id, 'is_muted', value)}
          />
        </View>
      </View>
      <Link href={`/admin/user/${item.id}`} asChild>
          <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity>
      </Link>
    </View>
  );

  return (
    <View style={styles.container}>
        <TextInput 
            style={styles.searchBar}
            placeholder="Search by name or username..."
            value={searchTerm}
            onChangeText={setSearchTerm}
        />
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 10,
  },
  searchBar: {
      backgroundColor: 'white',
      padding: 15,
      margin: 10,
      borderRadius: 10,
      fontSize: 16,
  },
  userContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  userInfo: {
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 14,
    color: '#666',
  },
  toggles: {
    marginTop: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailsButton: {
      backgroundColor: '#007bff',
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
  },
  buttonText: {
      color: 'white',
      textAlign: 'center',
  }
});
