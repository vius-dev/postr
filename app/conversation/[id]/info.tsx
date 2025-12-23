
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Clipboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Conversation } from '@/types/message';
import { User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brandColors } from '@/theme/colors';

export default function ConversationInfoScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [inviteLink, setInviteLink] = useState('');

  const currentUserId = api.getUserId();

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

  const handleInviteLink = async () => {
    if (typeof conversationId !== 'string') return;
    try {
      const link = await api.getInviteLink(conversationId);
      setInviteLink(link);
      Clipboard.setString(link);
      Alert.alert('Invite Link Copied', link);
    } catch (error) {
      console.error('Error getting invite link:', error);
    }
  };

  const handleEditChannel = () => {
    router.push(`/conversation/${conversationId}/edit`);
  };

  const handleDeleteChannel = () => {
    if (typeof conversationId !== 'string') return;
    Alert.alert(
      'Delete Channel',
      'Are you sure you want to delete this channel? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await api.deleteConversation(conversationId);
              router.push('/(tabs)/messages');
            } catch (error) {
              console.error('Error deleting channel:', error);
            }
          }
        }
      ]
    );
  };

  const handleManageAdmins = () => {
    router.push(`/conversation/${conversationId}/manage-admins`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Conversation not found.</Text>
      </SafeAreaView>
    );
  }

  const isOwner = conversation.ownerId === currentUserId;
  const isAdmin = conversation.adminIds?.includes(currentUserId) ?? false;

  const renderMemberItem = (user: User, role?: 'Owner' | 'Admin') => (
    <View key={user.id} style={styles.memberItem}>
      <Text style={{ color: theme.textPrimary }}>{user.name}</Text>
      {role && <Text style={{ color: theme.textSecondary }}>{role}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {conversation.type === 'CHANNEL' ? 'Channel Info' : 'Group Info'}
        </Text>
      </View>

      <ScrollView>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Members</Text>
          {conversation.participants.map(p => renderMemberItem(p, conversation.ownerId === p.id ? 'Owner' : (conversation.adminIds?.includes(p.id) ? 'Admin' : undefined)))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Settings</Text>
          <View style={styles.settingItem}>
            <Text style={{ color: theme.textPrimary }}>Notifications</Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setIsNotificationsEnabled}
            />
          </View>
        </View>

        {(isOwner || isAdmin) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Manage</Text>
            <TouchableOpacity style={styles.manageItem} onPress={handleInviteLink}>
              <Text style={{ color: theme.primary }}>Invite Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manageItem} onPress={handleEditChannel}>
              <Text style={{ color: theme.primary }}>Edit Channel</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={styles.manageItem} onPress={handleManageAdmins}>
                <Text style={{ color: theme.primary }}>Manage Admins</Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={styles.manageItem} onPress={handleDeleteChannel}>
                <Text style={{ color: theme.primary }}>Delete Channel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  manageItem: {
    paddingVertical: 12,
  }
});
