import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { brandColors } from '@/theme/colors';

const HomeHeader = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const handleAvatarPress = () => {
    if (user) {
      router.push(`/(profile)/${user.username}`);
    }
  };

  return (
    <View style={[
      styles.header,
      {
        backgroundColor: theme.background + 'EE', // Semi-transparent
        borderBottomColor: theme.border
      }
    ]}>
      {/* Spacer to keep title centered if needed, or just let it flow */}
      <View style={styles.leftContainer} />

      <Text style={[styles.headerTitle, { color: brandColors.primary[500] }]}>Timeline</Text>

      <View style={styles.rightContainer}>
        {user && (
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
            <Image
              source={{ uri: user.avatar }}
              style={[styles.avatar, { backgroundColor: theme.surface }]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    height: 52,
  },
  leftContainer: {
    width: 32, // Match avatar width for centering
  },
  rightContainer: {
    width: 32,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default HomeHeader;
