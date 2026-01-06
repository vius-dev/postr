import { RawEntity } from '../_core/domain.types';

export interface RawPost extends RawEntity {
    id: string;
    author_id: string;
    author: {
        username: string;
        name: string;
        avatar: string;
        is_verified: boolean;
    };
    content: string;
    type: string;
    created_at: string;
    updated_at?: string | null;
    content_edited_at?: string | null;

    media?: any[]; // Raw media array
    poll?: any;    // Raw poll object or JSON

    counts: {
        likes: number;
        dislikes: number;
        laughs: number;
        reposts: number;
        replies: number;
    };

    viewer_state: {
        my_reaction: string; // 'LIKE', 'DISLIKE', 'LAUGH', 'NONE'
        is_bookmarked: boolean;
        is_reposted: boolean;
        user_vote_index?: number | null;
    };

    parent_id?: string | null;
    reply_to_username?: string | null;
    quoted_post_id?: string | null;
    reposted_post_id?: string | null;

    quoted_post?: RawPost | null;
    reposted_post?: RawPost | null;
}
