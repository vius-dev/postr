import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/state/auth';

const COUNTRIES = [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "India",
    "Brazil",
    "Indonesia"
];

export default function CountrySettings() {
    const { theme } = useTheme();
    const router = useRouter();
    const user = useAuthStore(state => state.user);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(user?.country || 'United States');
    const [saving, setSaving] = useState(false);

    const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = async (country: string) => {
        setSelected(country);
        setSaving(true);
        try {
            await api.updateCountry(country);
            // Quick delay to show selection
            setTimeout(() => {
                router.back();
            }, 500);
        } catch (e) {
            console.error(e);
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'Select Country' }} />

            <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                <Text style={[styles.info, { color: theme.textSecondary }]}>
                    Select your country. This setting may affect your experience.
                </Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.item, { borderBottomColor: theme.borderLight }]}
                        onPress={() => handleSelect(item)}
                    >
                        <Text style={[styles.itemText, { color: theme.textPrimary }]}>{item}</Text>
                        {selected === item && (
                            <View style={styles.check}>
                                {saving ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    info: {
        fontSize: 14,
        lineHeight: 20,
    },
    item: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemText: {
        fontSize: 16,
    },
    check: {
        width: 24,
        alignItems: 'center',
    }
});
