
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { PollChoice } from '@/types/poll';
import PollDurationModal from '@/components/modals/PollDurationModal';

const MAX_CHOICES = 4;
const POLL_COLORS = [
  '#2CC9B3', // Teal
  '#FFAD1F', // Amber
  '#E0245E', // Red
  '#794BC4', // Purple
  '#3BCF8E', // Green
  '#F47B20', // Orange
  '#F45D91', // Pink
  '#5D6AF4', // Indigo
  '#2CBBCC', // Cyan
  '#9BC92C', // Lime
];

export default function PollScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // Create a randomized palette on component initialization
  const [shuffledPalette] = useState(() =>
    [...POLL_COLORS].sort(() => Math.random() - 0.5)
  );

  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState<PollChoice[]>([
    { text: '', color: shuffledPalette[0], vote_count: 0 },
    { text: '', color: shuffledPalette[1], vote_count: 0 },
  ]);

  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [showDurationModal, setShowDurationModal] = useState(false);

  const handleAddChoice = () => {
    if (choices.length < MAX_CHOICES) {
      setChoices([...choices, { text: '', color: shuffledPalette[choices.length], vote_count: 0 }]);
    }
  };

  const handleChoiceChange = (text: string, index: number) => {
    const newChoices = [...choices];
    newChoices[index].text = text;
    setChoices(newChoices);
  };

  const handleSubmit = async () => {
    if (!question || choices.some(c => !c.text)) return;

    // Calculate total duration in seconds
    const totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60);

    // Minimum 5 minutes
    if (totalSeconds < 300) {
      // In a real app we'd show a toast/error UI
      return;
    }

    try {
      await SyncEngine.enqueuePoll(
        question,
        choices,
        totalSeconds
      );
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={30} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.postButton, { backgroundColor: theme.primary }]} onPress={handleSubmit}>
            <Text style={[styles.postButtonText, { color: theme.textInverse }]}>Post</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer}>
          <TextInput
            style={[styles.questionInput, { color: theme.textPrimary, borderBottomColor: theme.border }]}
            placeholder="Ask a question..."
            placeholderTextColor={theme.textTertiary}
            value={question}
            onChangeText={setQuestion}
            multiline
          />

          <Text style={[styles.choicesHeader, { color: theme.textPrimary }]}>Choices</Text>
          {choices.map((choice, index) => (
            <View key={index} style={styles.choiceContainer}>
              <View style={[styles.colorIndicator, { backgroundColor: choice.color }]} />
              <TextInput
                style={[styles.choiceInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                placeholder={`Choice ${index + 1}`}
                placeholderTextColor={theme.textTertiary}
                value={choice.text}
                onChangeText={(text) => handleChoiceChange(text, index)}
              />
            </View>
          ))}

          {choices.length < MAX_CHOICES && (
            <TouchableOpacity
              style={[styles.addChoiceButton, { backgroundColor: theme.surface }]}
              onPress={handleAddChoice}
            >
              <Text style={[styles.addChoiceText, { color: theme.primary }]}>Add Choice</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.durationRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}
            onPress={() => setShowDurationModal(true)}
          >
            <View style={styles.durationInfo}>
              <Text style={[styles.durationLabel, { color: theme.textPrimary }]}>Poll length</Text>
              <Text style={[styles.durationValue, { color: theme.primary }]}>
                {days} days, {hours} hours, {minutes} mins
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PollDurationModal
        visible={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        initialDays={days}
        initialHours={hours}
        initialMinutes={minutes}
        onSave={(d, h, m) => {
          setDays(d);
          setHours(h);
          setMinutes(m);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonText: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 15,
  },
  questionInput: {
    fontSize: 18,
    fontWeight: 'bold',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    marginBottom: 20,
  },
  choicesHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorIndicator: {
    width: 6,
    height: 48,
    borderRadius: 3,
    marginRight: 10,
  },
  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
  },
  addChoiceButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addChoiceText: {
    fontWeight: 'bold',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  durationValue: {
    fontSize: 14,
    marginTop: 4,
  },
});
