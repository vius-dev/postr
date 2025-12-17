
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';

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
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: theme.border }]}
            onPress={onRepost}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Repost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={onQuote}>
            <Text style={[styles.optionText, { color: theme.text }]}>Quote</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
