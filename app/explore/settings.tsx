
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreSettings } from '@/state/exploreSettings';

const LOCATIONS = [
    'Worldwide',
    'United Kingdom',
    'United States',
    'Japan',
    'Germany',
    'France',
    'Canada',
    'Australia',
    'Brazil',
    'India'
];

export default function ExploreSettingsScreen() {
    const { theme, isDarkMode } = useTheme();
    const router = useRouter();
    const {
        showLocationContent,
        personalizeTrends,
        explorationLocation,
        setShowLocationContent,
        setPersonalizeTrends,
        setExplorationLocation
    } = useExploreSettings();

    const [isLocationModalVisible, setLocationModalVisible] = useState(false);

    const selectLocation = (location: string) => {
        setExplorationLocation(location);
        setLocationModalVisible(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Explore settings</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Location</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Show content in this location</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                When this is on, you'll see what's happening in your current location right now.
                            </Text>
                        </View>
                        <Switch
                            value={showLocationContent}
                            onValueChange={setShowLocationContent}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={showLocationContent ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>

                    {!showLocationContent && (
                        <TouchableOpacity
                            style={[styles.settingItem, styles.indented]}
                            onPress={() => setLocationModalVisible(true)}
                        >
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Explore locations</Text>
                                <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                    {explorationLocation}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: theme.surface }]} />

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personalization</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Trends for you</Text>
                            <Text style={[styles.settingDescription, { color: theme.textTertiary }]}>
                                You can personalize the trends for you based on your location and who you follow.
                            </Text>
                        </View>
                        <Switch
                            value={personalizeTrends}
                            onValueChange={setPersonalizeTrends}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={personalizeTrends ? theme.primary : (isDarkMode ? '#999' : '#f4f3f4')}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Location Modal */}
            <Modal
                visible={isLocationModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLocationModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
                            <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Location</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        <FlatList
                            data={LOCATIONS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.locationItem, { borderBottomColor: theme.borderLight }]}
                                    onPress={() => selectLocation(item)}
                                >
                                    <Text style={[styles.locationText, { color: theme.textPrimary }]}>{item}</Text>
                                    {explorationLocation === item && (
                                        <Ionicons name="checkmark" size={20} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingVertical: 15,
    },
    sectionTitle: {
        fontSize: 21,
        fontWeight: 'bold',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
    },
    indented: {
        // paddingLeft: 15,
    },
    settingInfo: {
        flex: 1,
        paddingRight: 15,
    },
    settingLabel: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '500',
    },
    settingDescription: {
        fontSize: 14,
        lineHeight: 18,
    },
    divider: {
        height: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '60%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    locationText: {
        fontSize: 16,
    },
});
