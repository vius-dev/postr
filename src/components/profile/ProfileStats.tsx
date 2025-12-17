
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProfileStatsProps {
  postCount: number;
  followingCount: number;
  followerCount: number;
  onFollowingPress: () => void;
  onFollowersPress: () => void;
}

export default function ProfileStats({
  postCount,
  followingCount,
  followerCount,
  onFollowingPress,
  onFollowersPress,
}: ProfileStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{postCount}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </View>
      <TouchableOpacity style={styles.stat} onPress={onFollowingPress}>
        <Text style={styles.statValue}>{followingCount}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stat} onPress={onFollowersPress}>
        <Text style={styles.statValue}>{followerCount}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E1E8ED',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});
