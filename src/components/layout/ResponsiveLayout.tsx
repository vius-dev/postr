
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { WebSidebar } from './WebSidebar';
import { WebWidgets } from './WebWidgets';
import { useTheme } from '@/theme/theme';

interface ResponsiveLayoutProps {
    children: React.ReactNode;
}

export const ResponsiveLayout = ({ children }: ResponsiveLayoutProps) => {
    const { isDesktop, isTablet, showSidebar, showWidgets, isWeb } = useResponsive();
    const { theme } = useTheme();

    if (!isWeb || (!showSidebar && !showWidgets)) {
        return <>{children}</>;
    }

    return (
        <View style={[styles.mainWrapper, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.centerContainer}>
                {/* Left Sidebar */}
                {showSidebar && (
                    <View style={[
                        styles.sidebarContainer,
                        isTablet && styles.sidebarTablet
                    ]}>
                        <WebSidebar compact={isTablet} />
                    </View>
                )}

                {/* Main Content Area */}
                <View style={[
                    styles.contentArea,
                    { backgroundColor: theme.background, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }
                ]}>
                    {children}
                </View>

                {/* Right Widgets */}
                {showWidgets && (
                    <View style={styles.widgetsContainer}>
                        <WebWidgets />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 10, // Top spacing for floating feel
    },
    centerContainer: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 1300,
        gap: 25, // Increased gap for separation
        paddingHorizontal: 20,
    },
    sidebarContainer: {
        flex: 1,
        minWidth: 250,
        maxWidth: 275,
        alignItems: 'flex-end',
        paddingTop: 10,
    },
    sidebarTablet: {
        minWidth: 80,
        maxWidth: 80,
        alignItems: 'center',
    },
    contentArea: {
        flex: 2,
        minWidth: 600,
        maxWidth: 650,
        overflow: 'hidden', // Ensure radius clips content
    },
    widgetsContainer: {
        flex: 1.5,
        minWidth: 350,
        paddingTop: 10,
    },
});
