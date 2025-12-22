
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';

interface ProfileBioProps {
  user: User;
}

export default function ProfileBio({ user }: ProfileBioProps) {
  const { theme } = useTheme();
  const hasLocation = user.location && user.location.trim() !== '';
  const hasWebsite = user.website && user.website.trim() !== '';

  const handleWebsitePress = () => {
    if (user.website) {
      let url = user.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {user.bio ? <Text style={[styles.bio, { color: theme.textPrimary }]}>{user.bio}</Text> : null}
      <View style={styles.infoRow}>
        {hasLocation && (
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{user.location}</Text>
          </View>
        )}
        {hasWebsite && (
          <View style={styles.infoItem}>
            <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.websiteText, { color: theme.link }]} onPress={handleWebsitePress}>
              {user.website}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  bio: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 5,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 5,
  },
  websiteText: {
    fontSize: 14,
    marginLeft: 5,
  },
});
