
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { showError } from '@/utils/toast';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import { User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';

export default function ManageAdminsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams();

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConversationDetails = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getConversation(id);
      if (data) {
        setConversation(data.conversation);
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof conversationId === 'string') {
      loadConversationDetails(conversationId);
    }
  }, [conversationId, loadConversationDetails]);

  const handleAdminToggle = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (typeof conversationId !== 'string') return;

    const action = isCurrentlyAdmin ? 'demote' : 'promote';
    const apiCall = isCurrentlyAdmin ? api.demoteFromAdmin : api.promoteToAdmin;

    try {
      await apiCall(conversationId, userId);
      // Refresh conversation details
      loadConversationDetails(conversationId);
    } catch (error) {
      console.error(`Error ${action}ing admin:`, error);
      showError(`We couldn't ${action} that admin right now. Please try again.`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!conversation || conversation.ownerId !== currentUserId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>You do not have permission to manage admins for this channel.</Text>
      </SafeAreaView>
    );
  }

  const renderMemberItem = (user: User) => {
    const isOwner = user.id === conversation.ownerId;
    const isAdmin = conversation.adminIds?.includes(user.id) ?? false;

    return (
      <View key={user.id} style={styles.memberItem}>
        <Text style={{ color: theme.textPrimary }}>{user.name}</Text>
        {isOwner ? (
          <Text style={{ color: theme.textSecondary }}>Owner</Text>
        ) : (
          <Switch
            value={isAdmin}
            onValueChange={() => handleAdminToggle(user.id, isAdmin)}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Manage Admins</Text>
      </View>

      <ScrollView>
        <View style={styles.section}>
          {conversation.participants.map(renderMemberItem)}
        </View>
      </ScrollView>
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
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
});
