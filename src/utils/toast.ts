/**
 * Branded Toast/Alert System
 * 
 * Provides consistent, user-friendly error/success messaging throughout the app.
 * Replaces raw Alert.alert() calls with branded alternatives.
 */

import { Alert, Platform } from 'react-native';
import { getErrorMessage, mapError } from './errors';

/**
 * Shows a branded error message to the user
 */
export function showError(error: unknown, title?: string): void {
    const brandedError = mapError(error);

    Alert.alert(
        title || '😕 Oops',
        brandedError.message,
        [
            {
                text: 'OK',
                style: 'cancel',
            },
        ],
        { cancelable: true }
    );
}

/**
 * Shows a success message to the user
 */
export function showSuccess(message: string, title?: string): void {
    Alert.alert(
        title || '✅ Success',
        message,
        [
            {
                text: 'OK',
                style: 'default',
            },
        ],
        { cancelable: true }
    );
}

/**
 * Shows an info message to the user
 */
export function showInfo(message: string, title?: string): void {
    Alert.alert(
        title || 'ℹ️ Heads up',
        message,
        [
            {
                text: 'OK',
                style: 'default',
            },
        ],
        { cancelable: true }
    );
}

/**
 * Shows a confirmation dialog
 */
export function showConfirm(
    message: string,
    onConfirm: () => void,
    options?: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
    }
): void {
    Alert.alert(
        options?.title || '🤔 Are you sure?',
        message,
        [
            {
                text: options?.cancelText || 'Cancel',
                style: 'cancel',
            },
            {
                text: options?.confirmText || 'Confirm',
                style: options?.destructive ? 'destructive' : 'default',
                onPress: onConfirm,
            },
        ],
        { cancelable: true }
    );
}

/**
 * Shows a warning message
 */
export function showWarning(message: string, title?: string): void {
    Alert.alert(
        title || '⚠️ Warning',
        message,
        [
            {
                text: 'OK',
                style: 'default',
            },
        ],
        { cancelable: true }
    );
}

/**
 * Helper to show validation errors
 */
export function showValidationError(fieldName: string, requirement: string): void {
    showError(
        `${fieldName} ${requirement}`,
        'Check your input'
    );
}

/**
 * Helper to show network errors with retry option
 */
export function showNetworkError(onRetry?: () => void): void {
    if (onRetry) {
        Alert.alert(
            '📡 Connection Issue',
            'We\'re having trouble connecting. Would you like to try again?',
            [
                {
                    text: 'Not now',
                    style: 'cancel',
                },
                {
                    text: 'Retry',
                    onPress: onRetry,
                },
            ],
            { cancelable: true }
        );
    } else {
        showError('We\'re having trouble connecting. Please check your internet connection.');
    }
}

/**
 * Helper to show auth errors with login redirect option
 */
export function showAuthError(onLogin?: () => void): void {
    if (onLogin) {
        Alert.alert(
            '🔒 Login Required',
            'You need to be logged in to do that.',
            [
                {
                    text: 'Not now',
                    style: 'cancel',
                },
                {
                    text: 'Log in',
                    onPress: onLogin,
                },
            ],
            { cancelable: true }
        );
    } else {
        showError('You need to be logged in to do that.');
    }
}
