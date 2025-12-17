
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { ReportType } from '@/types/reports';

const reportTypes: { type: ReportType, label: string }[] = [
  { type: 'SPAM', label: 'Spam' },
  { type: 'HARASSMENT', label: 'Harassment' },
  { type: 'HATE', label: 'Hate Speech' },
  { type: 'MISINFORMATION', label: 'Misinformation' },
  { type: 'VIOLENCE', label: 'Violence' },
  { type: 'SELF_HARM', label: 'Self-harm' },
  { type: 'OTHER', label: 'Other' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reportType: ReportType, reason?: string) => void;
}

export default function ReportModal({ visible, onClose, onSubmit }: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [otherReason, setOtherReason] = useState('');

  const handleSubmit = () => {
    if (selectedType) {
      if (selectedType === 'OTHER') {
        if (otherReason.trim() === '') {
          // Maybe show an alert
          return;
        }
        onSubmit(selectedType, otherReason);
      } else {
        onSubmit(selectedType);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Report Post</Text>
          <Text style={styles.subtitle}>Why are you reporting this post?</Text>
          
          {reportTypes.map(({ type, label }) => (
            <TouchableOpacity 
              key={type} 
              style={[styles.option, selectedType === type && styles.selectedOption]} 
              onPress={() => setSelectedType(type)}
            >
              <Text style={styles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}

          {selectedType === 'OTHER' && (
            <TextInput
              style={styles.input}
              placeholder="Please provide a reason"
              value={otherReason}
              onChangeText={setOtherReason}
            />
          )}

          <TouchableOpacity 
            style={[styles.submitButton, !selectedType && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={!selectedType}
          >
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#eef',
    borderColor: '#aac',
  },
  optionText: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#d9534f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#d9534f80',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
