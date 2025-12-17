
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert } from 'react-native';
import { User } from '@/types/user';
import { api } from '@/lib/api';

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await api.fetchAllUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        Alert.alert('Error', 'Could not fetch users.');
      }
    };
    fetchUsers();
  }, []);

  const handleToggle = async (userId: string, field: keyof User, value: boolean) => {
    try {
      await api.updateUser(userId, { [field]: value });
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, [field]: value } : user
        )
      );
    } catch (error) {
      Alert.alert('Error', `Could not update user ${userId}.`);
    }
  };

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
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
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
  userContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
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
});
