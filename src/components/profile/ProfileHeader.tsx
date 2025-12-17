
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { User } from '@/types/user';
import { useTheme } from '@/theme/theme';

interface ProfileHeaderProps {
  user: User;
  action?: React.ReactNode;
}

export default function ProfileHeader({ user, action }: ProfileHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.background }]}>
      <Image source={{ uri: user.headerImage }} style={styles.headerImage} />
      <Image source={{ uri: user.avatar }} style={[styles.avatar, { borderColor: theme.background }]} />
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text style={[styles.displayName, { color: theme.textPrimary }]}>{user.name}</Text>
          <Text style={[styles.username, { color: theme.textSecondary }]}>@{user.username}</Text>
        </View>
        <View style={styles.actionContainer}>
          {action}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  headerImage: {
    width: '100%',
    height: 150,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    marginTop: -40,
    marginLeft: 15,
  },
  userInfo: {
    paddingHorizontal: 15,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top of text/button
    paddingBottom: 15,
  },
  userDetails: {
    flex: 1,
    marginRight: 10,
  },
  actionContainer: {
    // Optional styling for the action button container
    marginTop: 0,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
  },
});
