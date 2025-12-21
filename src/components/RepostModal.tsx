
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/theme';

interface RepostModalProps {
  visible: boolean;
  onClose: () => void;
  onRepost: () => void;
  onQuote: () => void;
}

export default function RepostModal({
  visible,
  onClose,
  onRepost,
  onQuote,
}: RepostModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: theme.border }]}
            onPress={onRepost}
          >
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Repost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={onQuote}>
            <Text style={[styles.optionText, { color: theme.textPrimary }]}>Quote</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 16,
  },
  option: {
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 18,
  },
});
