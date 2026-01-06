
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/theme/theme';

type ActionSheetOption = {
  id: string;
  label: string;
  destructive?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: ActionSheetOption) => void;
  options: ActionSheetOption[];
};

export default function ActionSheet({
  visible,
  onClose,
  onSelect,
  options,
}: ActionSheetProps) {
  const { theme } = useTheme();

  const handleSelect = (option: ActionSheetOption) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: theme.card }]}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    index < options.length - 1 && {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  onPress={() => handleSelect(option)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: option.destructive ? theme.error : theme.primary }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.option,
                  styles.cancelOption,
                  { borderTopColor: theme.border },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[
                    styles.cancelOptionText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    margin: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  option: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
  },
  cancelOption: {
    borderTopWidth: 8,
    marginTop: -1,
  },
  cancelOptionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
