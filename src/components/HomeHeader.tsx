import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/theme';
import { brandColors } from '@/theme/colors';

const HomeHeader = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Home</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.primary[700],
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeHeader;
