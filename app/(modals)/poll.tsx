
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { PollChoice } from '@/types/poll';

const MAX_CHOICES = 4;
const POLL_COLORS = ['#1DA1F2', '#FFAD1F', '#E0245E', '#794BC4'];

export default function PollScreen() {
  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState<PollChoice[]>([
    { text: '', color: POLL_COLORS[0], vote_count: 0 },
    { text: '', color: POLL_COLORS[1], vote_count: 0 },
  ]);
  const router = useRouter();

  const handleAddChoice = () => {
    if (choices.length < MAX_CHOICES) {
      setChoices([...choices, { text: '', color: POLL_COLORS[choices.length], vote_count: 0 }]);
    }
  };

  const handleChoiceChange = (text: string, index: number) => {
    const newChoices = [...choices];
    newChoices[index].text = text;
    setChoices(newChoices);
  };

  const handleSubmit = async () => {
    if (!question || choices.some(c => !c.text)) return;

    try {
      await api.createPoll({ question, choices });
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={30} color="#1DA1F2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.postButton} onPress={handleSubmit}>
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <TextInput
          style={styles.questionInput}
          placeholder="Ask a question..."
          value={question}
          onChangeText={setQuestion}
        />

        <Text style={styles.choicesHeader}>Choices</Text>
        {choices.map((choice, index) => (
          <View key={index} style={styles.choiceContainer}>
            <View style={[styles.colorIndicator, { backgroundColor: choice.color }]} />
            <TextInput
              style={styles.choiceInput}
              placeholder={`Choice ${index + 1}`}
              value={choice.text}
              onChangeText={(text) => handleChoiceChange(text, index)}
            />
          </View>
        ))}

        {choices.length < MAX_CHOICES && (
          <TouchableOpacity style={styles.addChoiceButton} onPress={handleAddChoice}>
            <Text style={styles.addChoiceText}>Add Choice</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 15,
  },
  questionInput: {
    fontSize: 18,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
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
    width: 10,
    height: 40,
    borderRadius: 5,
    marginRight: 10,
  },
  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
  },
  addChoiceButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addChoiceText: {
    color: '#1DA1F2',
    fontWeight: 'bold',
  },
});
