
export type User = {
    id: string;
    name: string;
    username: string;
    avatar: string;
    headerImage?: string;
    bio?: string;
    location?: string;
    website?: string;
    is_active: boolean;
    is_limited: boolean;
    is_shadow_banned: boolean;
    is_suspended: boolean;
};
