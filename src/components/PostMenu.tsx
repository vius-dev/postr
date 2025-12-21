import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import ReportModal from './modals/ReportModal';
import { ReportType } from '@/types/reports';
import { useTheme } from '@/theme/theme';
import { useAuthStore } from '@/state/auth';

interface PostMenuProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

export default function PostMenu({ visible, onClose, post }: PostMenuProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (visible) {
      const checkStatus = async () => {
        const bookmarked = await api.isBookmarked(post.id);
        const rel = await api.fetchUserRelationship(post.author.id);
        setIsBookmarked(bookmarked);
        setIsFollowing(rel.type === 'FOLLOWING');
        setIsMuted(rel.type === 'MUTED');
        setIsBlocked(rel.type === 'BLOCKED');
      };
      checkStatus();
    }
  }, [visible, post.id, post.author.id]);

  const handleBookmark = async () => {
    try {
      const status = await api.toggleBookmark(post.id);
      setIsBookmarked(status);
      Alert.alert(status ? 'Added to Bookmarks' : 'Removed from Bookmarks');
    } catch (error) {
      Alert.alert('Error', 'Could not update bookmark.');
    } finally {
      onClose();
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.author.name} (@${post.author.username}): ${post.content}\n\nShared from Postr`,
        url: `https://postr.dev/post/${post.id}`, // Mock URL
      });
    } catch (error) {
      console.error('Error sharing post', error);
    } finally {
      onClose();
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await api.unfollowUser(post.author.id);
        setIsFollowing(false);
        Alert.alert('Unfollowed', `You unfollowed @${post.author.username}`);
      } else {
        await api.followUser(post.author.id);
        setIsFollowing(true);
        Alert.alert('Followed', `You are now following @${post.author.username}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      onClose();
    }
  };

  const handleMute = async () => {
    try {
      if (isMuted) {
        await api.unmuteUser(post.author.id);
        setIsMuted(false);
        Alert.alert('User Unmuted', `@${post.author.username} has been unmuted.`);
      } else {
        await api.muteUser(post.author.id);
        setIsMuted(true);
        Alert.alert('User Muted', `@${post.author.username} has been muted.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      onClose();
    }
  };

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await api.unblockUser(post.author.id);
        setIsBlocked(false);
        Alert.alert('User Unblocked', `@${post.author.username} has been unblocked.`);
      } else {
        await api.blockUser(post.author.id);
        setIsBlocked(true);
        Alert.alert('User Blocked', `@${post.author.username} has been blocked.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      onClose();
    }
  };

  const openReportModal = () => {
    setReportModalVisible(true);
  };

  const handleReportSubmit = async (reportType: ReportType, reason?: string) => {
    try {
      await api.createReport('POST', post.id, reportType, '0', reason || '');
      Alert.alert('Post Reported', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Could not report post. Please try again.');
    } finally {
      setReportModalVisible(false);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePost(post.id);
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Could not delete post.');
            }
          }
        }
      ]
    );
  };

  const isAuthor = user?.id === post.author.id;

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.option} onPress={handleBookmark}>
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isBookmarked ? theme.primary : theme.textPrimary}
              />
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                {isBookmarked ? 'Remove from Bookmarks' : 'Bookmark'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={theme.textPrimary} />
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>Share Post</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleFollow}>
              <Ionicons
                name={isFollowing ? "person-remove-outline" : "person-add-outline"}
                size={22}
                color={theme.textPrimary}
              />
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                {isFollowing ? `Unfollow @${post.author.username}` : `Follow @${post.author.username}`}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.option} onPress={handleMute}>
              <Ionicons
                name={isMuted ? "volume-high-outline" : "volume-mute-outline"}
                size={22}
                color={theme.textPrimary}
              />
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                {isMuted ? `Unmute @${post.author.username}` : `Mute @${post.author.username}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={22} color={theme.error} />
              <Text style={[styles.optionText, { color: theme.error }]}>
                {isBlocked ? `Unblock @${post.author.username}` : `Block @${post.author.username}`}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.option} onPress={openReportModal}>
              <Ionicons name="flag-outline" size={22} color={theme.error} />
              <Text style={[styles.optionText, { color: theme.error }]}>Report Post</Text>
            </TouchableOpacity>

            {isAuthor && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TouchableOpacity style={styles.option} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={22} color={theme.error} />
                  <Text style={[styles.optionText, { color: theme.error }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
      <ReportModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingBottom: 40,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 17,
    marginLeft: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
