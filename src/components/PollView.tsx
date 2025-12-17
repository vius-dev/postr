
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Poll } from '@/types/poll';

interface PollViewProps {
  poll: Poll;
}

export default function PollView({ poll }: PollViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.choices.map((choice, index) => (
        <View key={index} style={styles.choiceContainer}>
          <View style={[styles.colorIndicator, { backgroundColor: choice.color }]} />
          <Text style={styles.choiceText}>{choice.text}</Text>
          <Text style={styles.voteCount}>{`${choice.vote_count} votes`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  question: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorIndicator: {
    width: 10,
    height: 30,
    borderRadius: 5,
    marginRight: 10,
  },
  choiceText: {
    flex: 1,
    fontSize: 14,
  },
  voteCount: {
    fontSize: 14,
    color: '#888',
  },
});
