
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/theme';
import { useRouter, usePathname } from 'expo-router';

interface SidebarItemProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    href: string;
    compact?: boolean;
}

export const SidebarItem = ({ label, icon, href, compact }: SidebarItemProps) => {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    // Check if current path matches href 
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isActive && {
                    backgroundColor: theme.surfaceHover,
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    elevation: 5
                },
                compact && styles.compactContainer
            ]}
            onPress={() => router.push(href as any)}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <Ionicons
                    name={isActive ? icon : `${icon}-outline` as any}
                    size={28}
                    color={isActive ? theme.primary : theme.textPrimary}
                />
                {!compact && (
                    <Text
                        style={[
                            styles.label,
                            { color: isActive ? theme.primary : theme.textPrimary },
                            isActive && { color: theme.primary, fontWeight: '800' }
                        ]}
                    >
                        {label}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 15, // Softer rounding
        marginVertical: 4,
        alignSelf: 'center',
        width: '90%', // Fill the dock mostly
    },
    compactContainer: {
        alignSelf: 'center',
        paddingHorizontal: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    label: {
        fontSize: 19,
        marginRight: 10,
    },
});
