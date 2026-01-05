
import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { Modal, View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SideDrawer } from '@/components/navigation/SideDrawer';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const showMobileTabs = !isWeb || (!isDesktop && !isTablet);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false, // Let each screen handle its own header
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            display: showMobileTabs ? 'flex' : 'none',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="mail" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu" color={color} size={size} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setDrawerOpen(true);
            },
          }}
        />
      </Tabs>

      {/* Side Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
          <View style={[styles.drawerContainer, { backgroundColor: theme.background }]}>
            <SideDrawer onClose={() => setDrawerOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 320,
  },
});
