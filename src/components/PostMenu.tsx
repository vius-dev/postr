
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/types/post';
import { api } from '@/lib/api';
import ReportModal from './modals/ReportModal';
import { ReportType } from '@/types/reports';

interface PostMenuProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

export default function PostMenu({ visible, onClose, post }: PostMenuProps) {
  const [isReportModalVisible, setReportModalVisible] = useState(false);

  const handleBookmark = () => {
    console.log(`Bookmarking post ${post.id}`);
    onClose();
  };

  const handleShare = () => {
    console.log(`Sharing post ${post.id}`);
    onClose();
  };

  const handleFollow = () => {
    console.log(`Following author ${post.author.name}`);
    onClose();
  };

  const handleMute = async () => {
    try {
      await api.muteUser(post.author.id);
      Alert.alert('User Muted', `@${post.author.username} has been muted.`)
    } catch (error) {
      Alert.alert('Error', 'Could not mute user. Please try again.');
    } finally {
      onClose();
    }
  };

  const handleBlock = async () => {
    try {
      await api.blockUser(post.author.id);
      Alert.alert('User Blocked', `@${post.author.username} has been blocked.`)
    } catch (error) {
      Alert.alert('Error', 'Could not block user. Please try again.');
    } finally {
      onClose();
    }
  };

  const openReportModal = () => {
    setReportModalVisible(true);
  };

  const handleReportSubmit = async (reportType: ReportType, reason?: string) => {
    try {
      await api.createReport('POST', post.id, reportType, '0', reason);
      Alert.alert('Post Reported', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Could not report post. Please try again.');
    } finally {
      setReportModalVisible(false);
      onClose();
    }
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={styles.container}>
            <TouchableOpacity style={styles.option} onPress={handleBookmark}>
              <Ionicons name="bookmark-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Bookmark</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleFollow}>
              <Ionicons name="person-add-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Follow {post.author.name}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.option} onPress={handleMute}>
              <Ionicons name="volume-mute-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Mute @{post.author.username}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={24} color="#d9534f" />
              <Text style={[styles.optionText, styles.destructiveText]}>Block @{post.author.username}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.option} onPress={openReportModal}>
              <Ionicons name="flag-outline" size={24} color="#f0ad4e" />
              <Text style={[styles.optionText, styles.warningText]}>Report Post</Text>
            </TouchableOpacity>
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
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 18,
    marginLeft: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  destructiveText: {
    color: '#d9534f',
  },
  warningText: {
    color: '#f0ad4e',
  },
});
