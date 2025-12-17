
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { User } from '@/types/user';
import { Ionicons } from '@expo/vector-icons';

interface ProfileBioProps {
  user: User;
}

export default function ProfileBio({ user }: ProfileBioProps) {
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
      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      <View style={styles.infoRow}>
        {hasLocation && (
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{user.location}</Text>
          </View>
        )}
        {hasWebsite && (
          <View style={styles.infoItem}>
            <Ionicons name="link-outline" size={16} color="#666" />
            <Text style={styles.websiteText} onPress={handleWebsitePress}>
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
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  websiteText: {
    fontSize: 14,
    color: '#1B95E0', // Twitter's blue link color
    marginLeft: 5,
  },
});
