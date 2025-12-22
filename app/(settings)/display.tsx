import { View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DisplaySettings() {
    const { theme, isDarkMode, themeMode, setThemeMode } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Display and Sound' }} />
            <ScrollView>
                <View style={styles.previewContainer}>
                    <Text style={[styles.previewText, { color: theme.textSecondary, marginBottom: 10 }]}>Preview</Text>
                    <View style={[styles.tweetPreview, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
                        <View style={styles.previewHeader}>
                            <View style={[styles.avatar, { backgroundColor: theme.primary }]} />
                            <View>
                                <Text style={[styles.previewName, { color: theme.textPrimary }]}>Postr App</Text>
                                <Text style={{ color: theme.textTertiary }}>@postr</Text>
                            </View>
                        </View>
                        <Text style={[styles.previewContent, { color: theme.textPrimary }]}>
                            This is how your timeline will look with current display settings. #Postr #Design
                        </Text>
                    </View>
                </View>

                <View style={[styles.section, { marginTop: 30 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Display</Text>

                    {['system', 'light', 'dark'].map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.row, { borderBottomColor: theme.borderLight }]}
                            onPress={() => setThemeMode(mode as any)}
                        >
                            <View style={styles.textContainer}>
                                <Text style={[styles.label, { color: theme.textPrimary, textTransform: 'capitalize' }]}>
                                    {mode}
                                </Text>
                            </View>
                            {themeMode === mode && (
                                <Ionicons name="checkmark" size={24} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Mock Font Size Slider */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Font Size (Mock)</Text>
                    <View style={styles.sliderContainer}>
                        <Text style={[styles.smallA, { color: theme.textPrimary }]}>Aa</Text>
                        <View style={[styles.sliderTrack, { backgroundColor: theme.borderLight }]}>
                            {/* Pseudo slider visual */}
                            <View style={[styles.sliderThumb, { backgroundColor: theme.primary, left: '50%' }]} />
                        </View>
                        <Text style={[styles.largeA, { color: theme.textPrimary }]}>Aa</Text>
                    </View>
                    <Text style={[styles.description, { textAlign: 'center', marginTop: 10, color: theme.textSecondary }]}>
                        Adjusting this would change global font size.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
    },
    previewContainer: {
        padding: 20,
    },
    previewText: {
        textAlign: 'center',
        fontWeight: 'bold',
    },
    tweetPreview: {
        borderRadius: 16,
        padding: 15,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    previewName: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    previewContent: {
        fontSize: 15,
        lineHeight: 22,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    sliderTrack: {
        flex: 1,
        height: 4,
        marginHorizontal: 15,
        borderRadius: 2,
        position: 'relative',
    },
    sliderThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        top: -8,
    },
    smallA: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    largeA: {
        fontSize: 24,
        fontWeight: 'bold',
    }
});
