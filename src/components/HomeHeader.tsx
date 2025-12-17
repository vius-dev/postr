import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function HomeHeader() {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image source={{ uri: user?.avatar }} style={styles.avatar} />
      <Ionicons name="logo-twitter" size={28} color={theme.primary} />
      <View style={{ width: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
