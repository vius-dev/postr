import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Poll } from '@/types/poll';
import { useTheme } from '@/theme/theme';

interface PollResultsChartProps {
    poll: Poll;
}

export default function PollResultsChart({ poll }: PollResultsChartProps) {
    const { theme } = useTheme();

    const calculatePercentage = (count: number) => {
        if (poll.totalVotes === 0) return 0;
        return (count / poll.totalVotes) * 100;
    };

    return (
        <View style={[styles.container, { borderTopColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Poll Analytics</Text>

            <View style={styles.chartContainer}>
                {poll.choices.map((choice, index) => {
                    const percentage = calculatePercentage(choice.vote_count);

                    return (
                        <View key={index} style={styles.choiceRow}>
                            <View style={styles.labelContainer}>
                                <Text style={[styles.choiceLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {choice.text}
                                </Text>
                                <Text style={[styles.voteCount, { color: theme.textTertiary }]}>
                                    {choice.vote_count} votes
                                </Text>
                            </View>

                            <View style={styles.barWrapper}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            width: `${percentage}%`,
                                            backgroundColor: choice.color || ['#1DA1F2', '#17BF63', '#FFAD1F', '#E0245E', '#794BC4'][index % 5]
                                        }
                                    ]}
                                />
                                <Text style={[styles.percentageText, { color: theme.textPrimary }]}>
                                    {Math.round(percentage)}%
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderTopWidth: 1,
        marginTop: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    chartContainer: {
        gap: 16,
    },
    choiceRow: {
        gap: 4,
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    choiceLabel: {
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    voteCount: {
        fontSize: 12,
    },
    barWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bar: {
        height: 12,
        borderRadius: 6,
        minWidth: 4,
    },
    percentageText: {
        fontSize: 13,
        fontWeight: '600',
        width: 40,
    },
});
