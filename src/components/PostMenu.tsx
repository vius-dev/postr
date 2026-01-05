import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import { useAuthStore, isSelf } from '@/state/auth';
import { useTheme } from '@/theme/theme';
import { eventEmitter } from '@/lib/EventEmitter';
import ReportModal from '@/components/modals/ReportModal';
import { ReportType } from '@/types/reports';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { getDb } from '@/lib/db/sqlite';

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
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      const checkStatus = async () => {
        // Load bookmark status from local DB
        const db = await getDb();
        const bookmark = await db.getFirstAsync(
          'SELECT * FROM bookmarks WHERE post_id = ?',
          [post.id]
        );
        setIsBookmarked(!!bookmark);

        const rel = await api.getUserRelationship(post.author.id);
        setIsFollowing(rel.type === 'FOLLOWING');
        setIsMuted(rel.type === 'MUTED');
        setIsBlocked(rel.type === 'BLOCKED');
      };
      checkStatus();
    }
  }, [visible, post.id, post.author.id]);

  const handleBookmark = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await SyncEngine.toggleBookmark(post.id);
      setIsBookmarked(!isBookmarked);
      Alert.alert(!isBookmarked ? 'Added to Bookmarks' : 'Removed from Bookmarks');
    } catch (error) {
      Alert.alert('Error', 'Could not update bookmark.');
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.author.name} (@${post.author.username}): ${post.content}\n\nShared from Postr`,
        url: `https://postr.app/post/${post.id}`, // Production-ready URL placeholder
      });
    } catch (error) {
      console.error('Error sharing post', error);
    } finally {
      onClose();
    }
  };

  const handleFollow = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const isNowFollowing = await api.toggleFollow(post.author.id);
      setIsFollowing(isNowFollowing);
      if (isNowFollowing) {
        Alert.alert('Followed', `You are now following @${post.author.username}`);
      } else {
        Alert.alert('Unfollowed', `You unfollowed @${post.author.username}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleMute = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
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
      setIsProcessing(false);
      onClose();
    }
  };

  const handleBlock = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
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
      setIsProcessing(false);
      onClose();
    }
  };

  const openReportModal = () => {
    setReportModalVisible(true);
  };

  const handleReportSubmit = async (reportType: ReportType, reason?: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (!user) return;
      await api.createReport('POST', post.id, reportType, user.id, reason || '');
      Alert.alert('Post Reported', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Could not report post. Please try again.');
    } finally {
      setIsProcessing(false);
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
              eventEmitter.emit('postDeleted', post.id);
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Could not delete post.');
            }
          }
        }
      ]
    );
  };

  const isAuthor = isSelf(post.author.id);

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

            {!isAuthor && (
              <>
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
              </>
            )}

            {isAuthor && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Edit Post Option (only within 15 mins) */}
                {(() => {
                  const EDIT_WINDOW = 15 * 60 * 1000;
                  const canEdit = post.type !== 'poll' && (Date.now() - new Date(post.createdAt).getTime()) < EDIT_WINDOW;

                  if (canEdit) {
                    return (
                      <TouchableOpacity
                        style={styles.option}
                        onPress={() => {
                          onClose();
                          // Navigate to compose in edit mode
                          // We need to cast the route params to 'any' to avoid deep type warnings 
                          // as 'mode' might not be in the stricter types yet
                          const router = require('expo-router').router;
                          router.push({
                            pathname: '/(compose)/compose',
                            params: {
                              postId: post.id,
                              mode: 'edit',
                              authorUsername: post.author.username // Pass for context if needed
                            }
                          });
                        }}
                      >
                        <Ionicons name="create-outline" size={22} color={theme.textPrimary} />
                        <Text style={[styles.optionText, { color: theme.textPrimary }]}>Edit Post</Text>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })()}

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
