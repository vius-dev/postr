
import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ProfileScreen() {
    const { username } = useLocalSearchParams();

  // This is a placeholder. In a real app, you would fetch the user's profile based on the username.

  return (
    <View>
      <Text>Profile of {username}</Text>
    </View>
  );
}
