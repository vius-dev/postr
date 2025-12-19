import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Report } from '@/types/reports';
import { fetchAllReports, dismissReport, deletePost, getPostById } from './api';
import { Post } from '@/types/post';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import MediaGrid from '@/components/MediaGrid';

const ReportedPost = ({ postId }: { postId: string }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    getPostById(postId).then(p => {
      setPost(p);
      setLoading(false);
    });
  }, [postId]);

  if (loading) return <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 10 }} />;
  if (!post) return <Text style={[styles.emptyText, { color: theme.error, marginVertical: 10 }]}>Post not found or already deleted.</Text>;

  return (
    <View style={[styles.postContainer, { backgroundColor: theme.borderLight + '50', borderColor: theme.borderLight }]}>
      <View style={styles.postHeader}>
        <Ionicons name="document-text-outline" size={16} color={theme.textTertiary} />
        <Text style={[styles.postAuthor, { color: theme.textSecondary }]}>{post.author.name} · @{post.author.username}</Text>
      </View>
      <Text style={[styles.postContent, { color: theme.textPrimary }]}>{post.content}</Text>
      {post.media && post.media.length > 0 && (
        <View style={styles.mediaPreview}>
          <MediaGrid media={post.media} />
        </View>
      )}
    </View>
  )
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const loadReports = async () => {
    try {
      setLoading(true);
      const fetchedReports = await fetchAllReports();
      setReports(fetchedReports);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDismiss = async (reportId: string) => {
    try {
      await dismissReport(reportId);
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Could not dismiss the report.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert('Confirm Delete', 'Delete this reported post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deletePost(postId);
            loadReports();
          } catch (error) {
            Alert.alert('Error', 'Could not delete the post.');
          }
        }
      }
    ]);
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter(report =>
      report.reporterId.toLowerCase().includes(term) ||
      (report.reason && report.reason.toLowerCase().includes(term)) ||
      report.reportType.toLowerCase().includes(term)
    );
  }, [reports, searchTerm]);

  const renderItem = ({ item }: { item: Report }) => (
    <View style={[styles.reportCard, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]}>
      <View style={styles.reportHeader}>
        <View style={[styles.reportTypeBadge, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.reportTypeText, { color: theme.primary }]}>{item.reportType}</Text>
        </View>
        <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      <View style={styles.reporterInfo}>
        <Ionicons name="person-circle-outline" size={16} color={theme.textTertiary} />
        <Text style={[styles.reporterText, { color: theme.textSecondary }]}> Reported by: {item.reporterId}</Text>
      </View>

      {item.reason && (
        <View style={[styles.reasonBox, { borderLeftColor: theme.primary }]}>
          <Text style={[styles.reasonText, { color: theme.textPrimary }]}>{item.reason}</Text>
        </View>
      )}

      {item.entityType === 'POST' && <ReportedPost postId={item.entityId} />}

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.borderLight }]}
          onPress={() => handleDismiss(item.id)}
        >
          <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>Dismiss</Text>
        </TouchableOpacity>
        {item.entityType === 'POST' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
            onPress={() => handleDeletePost(item.entityId)}
          >
            <Text style={[styles.actionButtonText, { color: theme.error }]}>Delete Post</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchHeader}>
        <Ionicons name="search" size={20} color={theme.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchBar, { color: theme.textPrimary, backgroundColor: theme.borderLight }]}
          placeholder="Search reports..."
          placeholderTextColor={theme.textTertiary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flag-outline" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No reports found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  searchIcon: {
    position: 'absolute',
    left: 25,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    height: 45,
    paddingLeft: 45,
    borderRadius: 25,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  reportCard: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reporterText: {
    fontSize: 13,
  },
  reasonBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 15,
  },
  reasonText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  postContainer: {
    marginTop: 5,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthor: {
    fontSize: 12,
    marginLeft: 6,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaPreview: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
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
