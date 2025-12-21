
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Poll } from '@/types/poll';
import { useTheme } from '@/theme/theme';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface PollViewProps {
  poll: Poll;
  postId: string;
}

export default function PollView({ poll: initialPoll, postId }: PollViewProps) {
  const { theme } = useTheme();
  const [poll, setPoll] = useState(initialPoll);
  const [isVoting, setIsVoting] = useState(false);

  // Sync with prop updates if needed (e.g. from websocket/simulation)
  React.useEffect(() => {
    setPoll(initialPoll);
  }, [initialPoll]);

  const hasVoted = poll.userVoteIndex !== undefined;
  const isExpired = new Date(poll.expiresAt) < new Date();
  const showResults = hasVoted || isExpired;

  const handleVote = async (index: number) => {
    if (showResults || isVoting) return;
    setIsVoting(true);
    try {
      const updatedPost = await api.votePoll(postId, index);
      if (updatedPost.poll) {
        setPoll(updatedPost.poll);
      }
    } catch (error: any) {
      console.error('Failed to vote:', error);

      const errorMessage = error.message || 'An unexpected error occurred';

      Alert.alert(
        'Poll Error',
        errorMessage,
        [{ text: 'OK' }]
      );

      // [RULE 8] Fallback: Fetch existing state if we are out of sync
      if (errorMessage.includes('already voted')) {
        try {
          const freshPost = await api.fetchPost(postId);
          if (freshPost?.poll) {
            setPoll(freshPost.poll);
          }
        } catch (fetchError) {
          console.error('Failed to sync poll state:', fetchError);
        }
      }
    } finally {
      setIsVoting(false);
    }
  };

  const calculatePercentage = (count: number) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((count / poll.totalVotes) * 100);
  };

  return (
    <View style={styles.container}>
      {poll.choices.map((choice, index) => {
        const percentage = calculatePercentage(choice.vote_count);
        const isUserChoice = poll.userVoteIndex === index;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.choiceButton,
              { borderColor: theme.borderLight },
              showResults && styles.choiceStatic
            ]}
            onPress={() => handleVote(index)}
            disabled={showResults || isVoting}
            activeOpacity={0.7}
          >
            {showResults && (
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${percentage}%`,
                    backgroundColor: choice.color ? choice.color + '33' : theme.borderLight
                  }
                ]}
              />
            )}

            <View style={styles.choiceContent}>
              <Text
                style={[
                  styles.choiceText,
                  { color: theme.textPrimary, fontWeight: isUserChoice ? 'bold' : 'normal' }
                ]}
              >
                {choice.text}
              </Text>
              {showResults && (
                <View style={styles.resultInfo}>
                  {isUserChoice && (
                    <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={styles.checkIcon} />
                  )}
                  <Text style={[styles.percentageText, { color: theme.textPrimary }]}>
                    {percentage}%
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textTertiary }]}>
          {poll.totalVotes} votes · {isExpired ? 'Final results' : '1 day left'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  choiceButton: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  choiceStatic: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  choiceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  choiceText: {
    fontSize: 15,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  checkIcon: {
    marginRight: 4,
  },
  footer: {
    marginTop: 4,
  },
  footerText: {
    fontSize: 13,
  },
});
