import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { User } from '@/types/user';
import { Post, Comment } from '@/types/post';
import { Report } from '@/types/reports';
import { getUserById, getPostsByAuthorId, getCommentsByAuthorId, getReportsByReporterId, deletePost, deleteComment } from '../api';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from '@/components/MediaGrid';

const UserDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'Posts' | 'Comments' | 'Reports'>('Posts');

  const loadUserData = async () => {
    if (typeof id !== 'string') return;
    try {
      setLoading(true);
      const [userData, postsData, commentsData, reportsData] = await Promise.all([
        getUserById(id),
        getPostsByAuthorId(id),
        getCommentsByAuthorId(id),
        getReportsByReporterId(id),
      ]);
      setUser(userData);
      setPosts(postsData);
      setComments(commentsData);
      setReports(reportsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [id]);

  const handleDeletePost = async (postId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deletePost(postId);
          loadUserData();
        }
      }
    ]);
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteComment(commentId);
          loadUserData();
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>User not found.</Text>
      </View>
    );
  }

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.contentCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={() => handleDeletePost(item.id)}>
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.contentText, { color: theme.textPrimary }]}>{item.content}</Text>
      {item.media && item.media.length > 0 && (
        <View style={styles.mediaPreview}>
          <MediaGrid media={item.media} />
        </View>
      )}
      <View style={styles.statsRow}>
        <StatItem icon="heart-outline" count={item.likeCount} theme={theme} />
        <StatItem icon="chatbubble-outline" count={item.commentCount} theme={theme} />
        <StatItem icon="repeat-outline" count={item.repostCount} theme={theme} />
      </View>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.contentCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.contentText, { color: theme.textPrimary }]}>{item.content}</Text>
      <View style={styles.statsRow}>
        <StatItem icon="heart-outline" count={item.likeCount} theme={theme} />
      </View>
    </View>
  );

  const renderReport = ({ item }: { item: Report }) => (
    <View style={[styles.contentCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.reportBadge}>
        <Text style={[styles.reportTypeText, { color: theme.primary }]}>{item.reportType}</Text>
      </View>
      <Text style={[styles.contentText, { color: theme.textPrimary, marginTop: 8 }]}>{item.reason || 'No reason provided.'}</Text>
      <Text style={[styles.dateText, { color: theme.textTertiary, marginTop: 8 }]}>Reported on: {new Date(item.createdAt).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
          <View>
            <Text style={[styles.userName, { color: theme.textPrimary }]}>{user.name}</Text>
            <Text style={[styles.userHandle, { color: theme.textTertiary }]}>@{user.username}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsBar, { borderBottomColor: theme.borderLight }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{posts.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{comments.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Comments</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{reports.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Reports</Text>
        </View>
      </View>

      <View style={styles.segmentControl}>
        {(['Posts', 'Comments', 'Reports'] as const).map((seg) => (
          <TouchableOpacity
            key={seg}
            onPress={() => setActiveSegment(seg)}
            style={[
              styles.segmentItem,
              activeSegment === seg && { borderBottomColor: theme.primary }
            ]}
          >
            <Text style={[
              styles.segmentText,
              { color: activeSegment === seg ? theme.primary : theme.textSecondary }
            ]}>
              {seg}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList<any>
        data={activeSegment === 'Posts' ? posts : activeSegment === 'Comments' ? comments : reports}
        renderItem={activeSegment === 'Posts' ? renderPost : activeSegment === 'Comments' ? renderComment : renderReport as any}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No {activeSegment.toLowerCase()} to show.</Text>
          </View>
        }
      />
    </View>
  );
};

const StatItem = ({ icon, count, theme }: { icon: any, count: number, theme: any }) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={14} color={theme.textTertiary} />
    <Text style={[styles.statItemCount, { color: theme.textTertiary }]}>{count}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 14,
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    height: 50,
  },
  segmentItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 20,
  },
  contentCard: {
    padding: 15,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mediaPreview: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statItemCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  reportBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#007bff15',
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});

export default UserDetailScreen;
