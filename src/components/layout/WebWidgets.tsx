
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import TrendItem from '../TrendItem';

export const WebWidgets = () => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
                {/* Search Bar */}
                <View style={[styles.searchWrapper, { backgroundColor: theme.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
                        <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search"
                            placeholderTextColor={theme.textTertiary}
                            style={[styles.searchInput, { color: theme.textPrimary }]}
                        />
                    </View>
                </View>

                {/* What's Happening */}
                <View style={[styles.widgetCard, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.widgetTitle, { color: theme.textPrimary }]}>What's happening</Text>
                    <TrendItem hashtag="ReactNative" count={12500} rank={1} />
                    <TrendItem hashtag="ExpoRouter" count={8400} rank={2} />
                    <TrendItem hashtag="WebDevelopment" count={5200} rank={3} />
                    <TrendItem hashtag="PostrApp" count={3100} rank={4} />
                    <View style={styles.showMore}>
                        <Text style={[styles.showMoreText, { color: theme.primary }]}>Show more</Text>
                    </View>
                </View>

                {/* Who to follow */}
                <View style={[styles.widgetCard, { backgroundColor: theme.surface, marginTop: 15 }]}>
                    <Text style={[styles.widgetTitle, { color: theme.textPrimary }]}>Who to follow</Text>
                    <View style={styles.recommendedUser}>
                        <View style={[styles.avatar, { backgroundColor: theme.border }]} />
                        <View style={styles.recommendedUserInfo}>
                            <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>React Native</Text>
                            <Text style={[styles.userHandle, { color: theme.textTertiary }]} numberOfLines={1}>@reactnative</Text>
                        </View>
                        <View style={[styles.followButton, { backgroundColor: theme.textPrimary }]}>
                            <Text style={[styles.followButtonText, { color: theme.background }]}>Follow</Text>
                        </View>
                    </View>
                    <View style={styles.showMore}>
                        <Text style={[styles.showMoreText, { color: theme.primary }]}>Show more</Text>
                    </View>
                </View>

                {/* Footer Links */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.textTertiary }]}>
                        Terms of Service Privacy Policy Cookie Policy Accessibility Ads info More © 2025 Postr Corp.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '92%',
        paddingHorizontal: 20,
        width: 350,
        marginTop: 10,
        borderRadius: 30,
        paddingTop: 20,
        // Glass effect
        backgroundColor: 'rgba(255,255,255,0.0)', // Transparent container, widgets float inside
    },
    searchWrapper: {
        paddingVertical: 10,
        marginBottom: 5,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 25,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    widgetCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    widgetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        padding: 15,
    },
    showMore: {
        padding: 15,
    },
    showMoreText: {
        fontSize: 15,
    },
    recommendedUser: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    recommendedUserInfo: {
        flex: 1,
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 15,
        // Ensure truncation works
    },
    userHandle: {
        fontSize: 14,
    },
    followButton: {
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    followButtonText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    footer: {
        padding: 15,
        paddingTop: 20,
    },
    footerText: {
        fontSize: 13,
        lineHeight: 18,
    }
});
