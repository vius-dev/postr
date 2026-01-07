/**
 * Error Branding System
 * 
 * Transforms technical SDK/database errors into friendly, user-facing messages.
 * All error messages follow these principles:
 * - Never blame the user
 * - Provide clear next steps
 * - Use friendly, non-technical language
 * - Be concise and actionable
 */

export interface BrandedError {
    message: string;
    action?: 'retry' | 'navigate' | 'wait' | 'contact_support' | 'check_email';
    severity: 'error' | 'warning' | 'info';
}

/**
 * Supabase/Postgres Error Codes
 */
const SUPABASE_ERRORS = {
    // Unique violation (e.g., duplicate username/email)
    '23505': 'That username is already taken. How about trying something else?',

    // No rows returned (used in .single() queries)
    'PGRST116': 'We couldn\'t find what you\'re looking for.',

    // Foreign key violation
    '23503': 'This item is linked to something else and can\'t be removed right now.',

    // Check constraint violation
    '23514': 'That value doesn\'t meet our requirements. Please try something different.',
} as const;

/**
 * Authentication Error Patterns
 */
const AUTH_ERRORS = {
    'Invalid login credentials': 'Hmm, we couldn\'t find that account. Double-check your email and password?',
    'Email not confirmed': 'Almost there! Please check your inbox and confirm your email first.',
    'User already registered': 'Looks like you already have an account! Try logging in instead.',
    'Password should be at least': 'Let\'s make your password stronger—try adding more characters or symbols.',
    'rate limit': 'Whoa, slow down! Please wait a moment before trying again.',
    'Email rate limit exceeded': 'We\'ve sent you several emails recently. Please wait a bit before requesting another.',
    'Invalid email': 'That email address doesn\'t look quite right. Mind double-checking it?',
    'weak password': 'Your password needs to be stronger. Try mixing letters, numbers, and symbols!',
} as const;

/**
 * Network Error Patterns
 */
const NETWORK_ERRORS = {
    'Failed to fetch': 'You\'re offline right now. We\'ll sync everything once you\'re back online!',
    'Network request failed': 'Couldn\'t connect to the internet. Check your connection and try again?',
    'timeout': 'This is taking longer than usual. Want to try again?',
    'ECONNREFUSED': 'We\'re having trouble connecting. Please try again in a moment.',
} as const;

/**
 * Validation Error Patterns
 */
const VALIDATION_ERRORS = {
    'Content cannot be empty': 'Your post needs some content! What\'s on your mind?',
    'Content exceeds maximum length': 'Whoa, that\'s a lot! Try keeping it under 5000 characters.',
    'Cannot upload more than': 'You can attach up to 4 images or videos per post.',
    'Poll must have at least': 'Polls need at least 2 options to get started.',
    'Username must be at least': 'Your username needs to be at least 3 characters long.',
    'Username cannot exceed': 'That username is a bit too long—try keeping it under 15 characters.',
    'Username can only contain': 'Usernames can only use letters, numbers, and underscores.',
    'Name cannot exceed': 'Your display name is a bit too long—keep it under 50 characters.',
    'Bio exceeds maximum': 'Your bio is looking great, but it needs to be under 160 characters.',
    'cannot report yourself': 'You can\'t report your own content.',
    'cannot follow yourself': 'You can\'t follow yourself!',
    'cannot block yourself': 'You can\'t block yourself.',
} as const;

/**
 * Content/Social Error Patterns
 */
const CONTENT_ERRORS = {
    'Not authenticated': 'You need to be logged in to do that.',
    'Failed to create user profile': 'We hit a snag setting up your profile. Please try logging in again.',
    'Invalid profile data': 'Something went wrong with your profile. Try refreshing the page?',
    'Conversation not found': 'We couldn\'t find that conversation. It may have been deleted.',
    'Message too long': 'That message is a bit long—try breaking it into smaller parts?',
    'Cannot message blocked user': 'You can\'t send messages to users you\'ve blocked.',
} as const;

/**
 * Maps an error to a friendly, branded message
 */
export function mapError(error: unknown): BrandedError {
    // Handle null/undefined
    if (!error) {
        return {
            message: 'Something unexpected happened, but we\'re on it!',
            severity: 'error',
            action: 'retry',
        };
    }

    // Extract error message and code
    const errorObj = error as any;
    const message = errorObj?.message || errorObj?.error?.message || String(error);
    const code = errorObj?.code || errorObj?.error?.code;

    // Check for Supabase/Postgres error codes
    if (code && code in SUPABASE_ERRORS) {
        return {
            message: SUPABASE_ERRORS[code as keyof typeof SUPABASE_ERRORS],
            severity: 'error',
            action: 'retry',
        };
    }

    // Check authentication errors
    for (const [pattern, friendlyMsg] of Object.entries(AUTH_ERRORS)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return {
                message: friendlyMsg,
                severity: 'error',
                action: pattern.includes('email') ? 'check_email' : 'retry',
            };
        }
    }

    // Check network errors
    for (const [pattern, friendlyMsg] of Object.entries(NETWORK_ERRORS)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return {
                message: friendlyMsg,
                severity: 'warning',
                action: 'wait',
            };
        }
    }

    // Check validation errors
    for (const [pattern, friendlyMsg] of Object.entries(VALIDATION_ERRORS)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return {
                message: friendlyMsg,
                severity: 'error',
                action: 'retry',
            };
        }
    }

    // Check content/social errors
    for (const [pattern, friendlyMsg] of Object.entries(CONTENT_ERRORS)) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return {
                message: friendlyMsg,
                severity: 'error',
                action: pattern.includes('Not authenticated') ? 'navigate' : 'retry',
            };
        }
    }

    // Server errors (500, 502, 503, etc.)
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return {
            message: 'Our servers are having a moment. Please try again in a few seconds.',
            severity: 'error',
            action: 'wait',
        };
    }

    // Fallback for unknown errors
    // Log the original error for debugging
    console.error('[Error Mapper] Unknown error:', error);

    return {
        message: 'Something unexpected happened, but we\'re on it!',
        severity: 'error',
        action: 'contact_support',
    };
}

/**
 * Extracts a user-friendly message from an error
 */
export function getErrorMessage(error: unknown): string {
    return mapError(error).message;
}

/**
 * Checks if an error is a network/offline error
 */
export function isNetworkError(error: unknown): boolean {
    const message = String(error).toLowerCase();
    return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('offline') ||
        message.includes('timeout') ||
        message.includes('econnrefused')
    );
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
    const message = String(error).toLowerCase();
    return (
        message.includes('not authenticated') ||
        message.includes('unauthorized') ||
        message.includes('invalid login') ||
        message.includes('session')
    );
}
