import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, Alert, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { User } from '@/types/user';
import { fetchAllUsers, updateUser } from './api';
import { Link } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';

type UserFilter = 'All' | 'Active' | 'Limited' | 'Shadow Banned' | 'Suspended' | 'Muted';

export default function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<UserFilter>('All');
  const { theme } = useTheme();

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
      loadUsers();
    } catch (error) {
      Alert.alert('Error', `Could not update user.`);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply search
    if (searchTerm) {
      result = result.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (activeFilter !== 'All') {
      result = result.filter(user => {
        switch (activeFilter) {
          case 'Active': return user.is_active;
          case 'Limited': return user.is_limited;
          case 'Shadow Banned': return user.is_shadow_banned;
          case 'Suspended': return user.is_suspended;
          case 'Muted': return user.is_muted;
          default: return true;
        }
      });
    }

    return result;
  }, [users, searchTerm, activeFilter]);

  const FilterChip = ({ label }: { label: UserFilter }) => (
    <TouchableOpacity
      onPress={() => setActiveFilter(label)}
      style={[
        styles.chip,
        { backgroundColor: activeFilter === label ? theme.primary : theme.borderLight }
      ]}
    >
      <Text style={[
        styles.chipText,
        { color: activeFilter === label ? 'white' : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.userHandle, { color: theme.textTertiary }]}>@{item.username}</Text>
        </View>
        <Link href={`/admin/user/${item.id}`} asChild>
          <TouchableOpacity style={[styles.detailsIconButton, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.togglesContainer}>
        <View style={styles.toggleGroup}>
          <ToggleRow label="Active" value={item.is_active} onValueChange={v => handleToggle(item.id, 'is_active', v)} theme={theme} />
          <ToggleRow label="Limited" value={item.is_limited} onValueChange={v => handleToggle(item.id, 'is_limited', v)} theme={theme} />
          <ToggleRow label="Shadow Ban" value={item.is_shadow_banned} onValueChange={v => handleToggle(item.id, 'is_shadow_banned', v)} theme={theme} />
        </View>
        <View style={styles.toggleGroup}>
          <ToggleRow label="Suspended" value={item.is_suspended} onValueChange={v => handleToggle(item.id, 'is_suspended', v)} theme={theme} />
          <ToggleRow label="Muted" value={item.is_muted} onValueChange={v => handleToggle(item.id, 'is_muted', v)} theme={theme} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchBar, { color: theme.textPrimary, backgroundColor: theme.borderLight }]}
          placeholder="Search users..."
          placeholderTextColor={theme.textTertiary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {(['All', 'Active', 'Limited', 'Shadow Banned', 'Suspended', 'Muted'] as UserFilter[]).map(f => (
            <FilterChip key={f} label={f} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No users found match the criteria.</Text>
          </View>
        }
      />
    </View>
  );
}

const ToggleRow = ({ label, value, onValueChange, theme }: { label: string, value: boolean, onValueChange: (v: boolean) => void, theme: any }) => (
  <View style={styles.toggleRow}>
    <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.borderLight, true: theme.primary + '80' }}
      thumbColor={value ? theme.primary : '#f4f3f4'}
      ios_backgroundColor={theme.borderLight}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    borderRadius: 25,
    overflow: 'hidden',
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    height: 45,
    paddingLeft: 45,
    fontSize: 16,
    borderRadius: 25,
  },
  chipsScroll: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  userCard: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
  },
  detailsIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleGroup: {
    flex: 0.48,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
  },
});
