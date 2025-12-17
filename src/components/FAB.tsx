
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import ActionSheet from './ActionSheet';

type ActionSheetOption = {
  id: string;
  label: string;
};

export default function FAB() {
  const { theme } = useTheme();
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionSheetOption | null>(
    null
  );

  const options: ActionSheetOption[] = [
    { id: 'new_post', label: 'New Post' },
    { id: 'new_poll', label: 'New Poll' },
  ];

  // This effect runs after the sheet is closed
  useEffect(() => {
    if (!sheetVisible && selectedAction) {
      // Use a timeout to ensure the modal has fully animated out
      const timer = setTimeout(() => {
        if (selectedAction.id === 'new_post') {
          router.push('/compose' as any);
        } else if (selectedAction.id === 'new_poll') {
          router.push('/(modals)/poll' as any);
        }
        // Reset the action after it's been handled
        setSelectedAction(null);
      }, 50); // A small delay is sufficient

      return () => clearTimeout(timer);
    }
  }, [sheetVisible, selectedAction, router]);

  const handleSelect = (option: ActionSheetOption) => {
    // Set the selected action and close the sheet
    setSelectedAction(option);
    setSheetVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setSheetVisible(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      <ActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelect}
        options={options}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
