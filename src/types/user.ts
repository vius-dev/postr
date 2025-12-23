export type User = {
    id: string;
    name: string;
    username: string;
    avatar: string;
    headerImage?: string;
    bio?: string;
    location?: string;
    website?: string;
    phone?: string;
    is_active: boolean;
    is_limited: boolean;
    is_shadow_banned: boolean;
    is_suspended: boolean;
    is_muted: boolean;
    last_username_change_at?: string;
    country?: string;
};

export type UserProfile = User & {
    followers_count: number;
    following_count: number;
};

export type Session = {
    id: string;
    device: string;
    location: string;
    last_active: string;
    is_current: boolean;
};
