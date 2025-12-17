
import { Tabs } from 'expo-router';

export default function AdminLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Users' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="content" options={{ title: 'Content' }} />
    </Tabs>
  );
}
