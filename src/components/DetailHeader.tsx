import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';

interface DetailHeaderProps {
    title?: string;
    onBack?: () => void;
}

const DetailHeader = ({ title = 'Post', onBack }: DetailHeaderProps) => {
    const { theme } = useTheme();
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <View style={[
            styles.header,
            {
                backgroundColor: theme.background,
                borderBottomColor: theme.border,
            }
        ]}>
            <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                activeOpacity={0.7}
            >
                <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {title}
            </Text>

            {/* Spacer for centering title if needed, or just let it align left like Twitter */}
            <View style={styles.rightSpacer} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 100,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 19,
        fontWeight: '800', // Pre-2023 Twitter style
        flex: 1,
    },
    rightSpacer: {
        width: 40,
    },
});

export default DetailHeader;
