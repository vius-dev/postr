import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';

import { useTheme } from '@/theme/theme';

export type ProfileTab = 'Posts' | 'Replies' | 'Media' | 'Dis/Likes' | 'Following' | 'Followers' | 'Bookmark';

interface ProfileTabsProps {
  selectedTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
  isOwner?: boolean;
}

const tabs: ProfileTab[] = ['Posts', 'Replies', 'Media', 'Dis/Likes', 'Bookmark'];

export default function ProfileTabs({ selectedTab, onSelectTab, isOwner }: ProfileTabsProps) {
  const { theme } = useTheme();

  const activeTabs = tabs;

  return (
    <View style={[styles.outerContainer, { borderBottomColor: theme.borderLight }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {activeTabs.map(tab => (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderBottomWidth: 1,
  },
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
