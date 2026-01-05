import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { Poll } from '@/types/poll';

interface PollResultsChartProps {
    poll: Poll;
}

export default function PollResultsChart({ poll }: PollResultsChartProps) {
    const { theme } = useTheme();

    if (!poll || poll.totalVotes === 0) {
        return (
            <View style={[styles.container, { borderTopColor: theme.borderLight }]}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Poll Analytics</Text>
                <View style={styles.emptyContainer}>
                    <Ionicons name="stats-chart" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No votes cast yet</Text>
                </View>
            </View>
        );
    }

    const maxBarHeight = 160;

    return (
        <View style={[styles.container, { borderTopColor: theme.borderLight }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Poll Analytics</Text>

            <View style={styles.chartArea}>
                {poll.choices.map((choice, index) => {
                    const percentage = (choice.vote_count / poll.totalVotes) * 100;
                    const barHeight = (percentage / 100) * maxBarHeight;

                    return (
                        <View key={index} style={styles.barColumn}>
                            <View style={[styles.barWrapper, { height: maxBarHeight + 30 }]}>
                                <Text style={[styles.percentageText, { color: theme.textSecondary }]}>
                                    {Math.round(percentage)}%
                                </Text>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: Math.max(barHeight, 6),
                                            backgroundColor: choice.color || theme.primary,
                                        }
                                    ]}
                                />
                            </View>
                            <View style={styles.labelContainer}>
                                <Text style={[styles.choiceLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                                    {choice.text}
                                </Text>
                                <Text style={[styles.voteCount, { color: theme.textTertiary }]}>
                                    {choice.vote_count} {choice.vote_count === 1 ? 'vote' : 'votes'}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
                <Text style={[styles.totalVotesText, { color: theme.textSecondary }]}>
                    Total: <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>{poll.totalVotes}</Text> votes
                </Text>
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
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    chartArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        marginBottom: 24,
        minHeight: 220,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    barWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    bar: {
        width: '70%',
        maxWidth: 40,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    percentageText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    labelContainer: {
        alignItems: 'center',
        height: 50,
    },
    choiceLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 2,
    },
    voteCount: {
        fontSize: 11,
    },
    footer: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    totalVotesText: {
        fontSize: 14,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
    },
});

