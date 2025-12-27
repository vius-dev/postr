
import { User } from '@/types/user';

/**
 * Checks if a user has an active institutional authority based on their official logo
 * and authority dates.
 */
export const isAuthorityActive = (user: { official_logo?: string; is_verified?: boolean; authority_end?: string }): boolean => {
    if (!user.official_logo || !user.is_verified) return false;

    // If no authority_end is set, it's assumed permanent or handled manually
    if (!user.authority_end) return true;

    const now = new Date();
    const end = new Date(user.authority_end);

    return end > now;
};

/**
 * Returns a human-readable label for the verification type.
 */
export const getVerificationLabel = (type?: string): string => {
    switch (type) {
        case 'politician': return 'Official Politician';
        case 'political_party': return 'Verified Political Party';
        case 'government_agency': return 'Official Government Agency';
        case 'civic_org': return 'Verified Civic Organization';
        case 'journalist': return 'Verified Journalist';
        case 'brand': return 'Official Brand';
        default: return 'Official Account';
    }
};
