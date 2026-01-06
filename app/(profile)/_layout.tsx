import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="[username]/index" options={{ title: 'Profile' }} />
      <Stack.Screen name="[username]/followers" options={{ title: 'Followers' }} />
      <Stack.Screen name="[username]/following" options={{ title: 'Following' }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
    </Stack>
  );
}
