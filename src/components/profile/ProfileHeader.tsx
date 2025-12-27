import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/user';
import { useTheme } from '@/theme/theme';
import { isAuthorityActive, getVerificationLabel } from '@/utils/user';

interface ProfileHeaderProps {
  user: User;
  action?: React.ReactNode;
}

export default function ProfileHeader({ user, action }: ProfileHeaderProps) {
  const { theme } = useTheme();
  const showAuthority = isAuthorityActive(user);

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight, backgroundColor: theme.background }]}>
      <Image source={{ uri: user.headerImage }} style={styles.headerImage} />
      <Image source={{ uri: user.avatar }} style={[styles.avatar, { borderColor: theme.background }]} contentFit="cover" />
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: theme.textPrimary }]}>{user.name}</Text>
            {showAuthority && (
              <Image
                source={{ uri: user.official_logo }}
                style={styles.officialLogo}
                contentFit="contain"
              />
            )}
            {user.is_verified && !showAuthority && (
              <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={styles.verifiedBadge} />
            )}
          </View>
          <Text style={[styles.username, { color: theme.textSecondary }]}>@{user.username}</Text>
          {showAuthority && (
            <View style={styles.officialLabelContainer}>
              <Text style={[styles.officialLabel, { color: theme.textSecondary }]}>
                {getVerificationLabel(user.verification_type)}
              </Text>
            </View>
          )}
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
    alignItems: 'flex-start',
    paddingBottom: 15,
  },
  userDetails: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  officialLogo: {
    width: 20,
    height: 20,
    marginLeft: 4,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  officialLabelContainer: {
    marginTop: 4,
  },
  officialLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
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
