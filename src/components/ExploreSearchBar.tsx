
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';

interface ExploreSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    containerStyle?: ViewStyle;
    autoFocus?: boolean;
}

/**
 * Reusable SearchBar component that mirrors the "Explore" tab's search UI and logic.
 * Use this for platform-wide consistency in search fields.
 */
export default function ExploreSearchBar({
    value,
    onChangeText,
    placeholder = "Search Vius",
    containerStyle,
    autoFocus = false,
}: ExploreSearchBarProps) {
    const { theme } = useTheme();

    return (
        <View style={[styles.searchBar, { backgroundColor: theme.surface }, containerStyle]}>
            <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
            <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder={placeholder}
                placeholderTextColor={theme.textTertiary}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoFocus={autoFocus}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color={theme.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        paddingVertical: 0, // Ensure text is vertically centered on Android
    },
});
