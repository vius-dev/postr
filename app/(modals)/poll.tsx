
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { PollChoice } from '@/types/poll';

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
      await api.createPoll({
        question,
        choices,
        durationSeconds: totalSeconds
      });
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

          <View style={[styles.durationSection, { borderTopColor: theme.border }]}>
            <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Poll length</Text>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerItem}>
                <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Days</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.capsuleScroll}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDays(d)}
                      style={[
                        styles.capsule,
                        { borderColor: theme.border },
                        days === d && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                    >
                      <Text style={[
                        styles.capsuleText,
                        { color: theme.textPrimary },
                        days === d && { color: theme.textInverse }
                      ]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerRow}>
                <View style={[styles.pickerItem, { flex: 1 }]}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Hours</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleScroll}>
                    {[0, 1, 2, 3, 6, 12, 18, 23].map(h => (
                      <TouchableOpacity
                        key={h}
                        onPress={() => setHours(h)}
                        style={[
                          styles.capsule,
                          { borderColor: theme.border },
                          hours === h && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                      >
                        <Text style={[
                          styles.capsuleText,
                          { color: theme.textPrimary },
                          hours === h && { color: theme.textInverse }
                        ]}>{h}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.pickerItem, { flex: 1 }]}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Minutes</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleScroll}>
                    {[0, 5, 10, 15, 30, 45].map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setMinutes(m)}
                        style={[
                          styles.capsule,
                          { borderColor: theme.border },
                          minutes === m && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                      >
                        <Text style={[
                          styles.capsuleText,
                          { color: theme.textPrimary },
                          minutes === m && { color: theme.textInverse }
                        ]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  durationSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickerContainer: {
    gap: 16,
  },
  pickerItem: {
    gap: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  capsuleScroll: {
    gap: 8,
    paddingRight: 20,
  },
  capsule: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
  },
  capsuleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
