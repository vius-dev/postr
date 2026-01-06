import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'info' | 'success' | 'error';

interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const showToast = useCallback(({ message, type = 'info', duration = 3000 }: ToastOptions) => {
        setToast({ message, type, duration });

        Animated.sequence([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.delay(duration),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setToast(null);
        });
    }, []);

    const getBackgroundColor = () => {
        switch (toast?.type) {
            case 'success': return '#4BB543';
            case 'error': return theme.error || '#FF0000';
            default: return theme.primary;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            backgroundColor: getBackgroundColor(),
                            opacity,
                            bottom: insets.bottom + 80,
                        }
                    ]}
                >
                    <Text style={styles.toastText}>{toast.message}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
