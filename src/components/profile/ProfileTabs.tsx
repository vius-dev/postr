
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import { useTheme } from '@/theme/theme';

export type ProfileTab = 'Posts' | 'Replies' | 'Media' | 'Dis/Likes';

interface ProfileTabsProps {
  selectedTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
}

const tabs: ProfileTab[] = ['Posts', 'Replies', 'Media', 'Dis/Likes'];
const { width } = Dimensions.get('window');

export default function ProfileTabs({ selectedTab, onSelectTab }: ProfileTabsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.borderLight }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            selectedTab === tab ? { borderBottomColor: theme.primary, borderBottomWidth: 2 } : {}
          ]}
          onPress={() => onSelectTab(tab)}
        >
          <Text style={[
            styles.tabText,
            { color: selectedTab === tab ? theme.primary : theme.textTertiary }
          ]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
