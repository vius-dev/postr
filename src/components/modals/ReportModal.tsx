import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Pressable, ScrollView } from 'react-native';
import { ReportType } from '@/types/reports';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';

const reportTypes: { type: ReportType, label: string, icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'SPAM', label: 'Spam', icon: 'mail-unread-outline' },
  { type: 'HARASSMENT', label: 'Harassment', icon: 'hand-left-outline' },
  { type: 'HATE', label: 'Hate Speech', icon: 'megaphone-outline' },
  { type: 'MISINFORMATION', label: 'Misinformation', icon: 'information-circle-outline' },
  { type: 'VIOLENCE', label: 'Violence', icon: 'flame-outline' },
  { type: 'SELF_HARM', label: 'Self-harm', icon: 'heart-dislike-outline' },
  { type: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reportType: ReportType, reason?: string) => void;
}

export default function ReportModal({ visible, onClose, onSubmit }: ReportModalProps) {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [otherReason, setOtherReason] = useState('');

  const handleSubmit = () => {
    if (selectedType) {
      if (selectedType === 'OTHER') {
        if (otherReason.trim() === '') return;
        onSubmit(selectedType, otherReason);
      } else {
        onSubmit(selectedType);
      }
      // Reset state for next time
      setSelectedType(null);
      setOtherReason('');
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setOtherReason('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        onPress={handleClose}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Report Post</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Help us understand what's happening.</Text>
          </View>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {reportTypes.map(({ type, label, icon }) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  { borderColor: theme.border },
                  selectedType === type && { backgroundColor: theme.surface, borderColor: theme.primary }
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={selectedType === type ? theme.primary : theme.textPrimary}
                  style={styles.optionIcon}
                />
                <Text style={[
                  styles.optionText,
                  { color: theme.textPrimary },
                  selectedType === type && { color: theme.primary, fontWeight: 'bold' }
                ]}>
                  {label}
                </Text>
                {selectedType === type && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}

            {selectedType === 'OTHER' && (
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder="Briefly describe the issue..."
                placeholderTextColor={theme.textTertiary}
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
                numberOfLines={3}
              />
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.error },
                !selectedType && { opacity: 0.5 }
              ]}
              onPress={handleSubmit}
              disabled={!selectedType}
            >
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    paddingBottom: 40,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  optionsScroll: {
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionIcon: {
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  submitButton: {
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
