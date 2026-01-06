
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import EmptyState from '@/components/EmptyState';
import { Notification } from '@/types/notification';
import NotificationItem from '@/components/NotificationItem';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';

type Tab = 'ALL' | 'MENTIONS';

import { useNotificationsSettings } from '@/state/communicationSettings';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { qualityFilter, mentionsOnly, mutedWords, setQualityFilter, setMentionsOnly } = useNotificationsSettings();
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getNotificationSettings();
      setQualityFilter(settings.qualityFilter);
      setMentionsOnly(settings.mentionsOnly);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    // 1. Quality Filter (Hide reactions if filtering is aggressive)
    if (qualityFilter && n.type === 'REACTION') return false;

    // 2. Mentions Only Setting (Global filter)
    if (mentionsOnly && n.type !== 'MENTION' && n.type !== 'REPLY') return false;

    // 3. Muted Words Filter
    if (mutedWords.length > 0) {
      const content = (n.post?.content || n.postSnippet || '').toLowerCase();
      const hasMutedWord = mutedWords.some(word => content.includes(word));
      if (hasMutedWord) return false;
    }

    // 4. Tab Filter
    if (activeTab === 'MENTIONS') {
      return n.type === 'MENTION' || n.type === 'REPLY';
    }

    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Notifications</Text>
          <TouchableOpacity onPress={() => router.push('/notifications/settings')}>
            <Ionicons name="settings-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ALL' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabLabel, { color: activeTab === 'ALL' ? theme.textPrimary : theme.textTertiary }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'MENTIONS' && { borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab('MENTIONS')}
          >
            <Text style={[styles.tabLabel, { color: activeTab === 'MENTIONS' ? theme.textPrimary : theme.textTertiary }]}>Mentions</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        refreshing={loading}
        onRefresh={loadNotifications}
        ListEmptyComponent={
          <EmptyState
            title={activeTab === 'ALL' ? 'Nothing to see here.' : 'No mentions yet'}
            description={activeTab === 'ALL' ? 'When people interact with your posts, you\'ll find those notifications here.' : 'When someone mentions you, you’ll find it here.'}
            icon={activeTab === 'ALL' ? 'notifications-off-outline' : 'at-outline'}
          />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 50,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 45,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
