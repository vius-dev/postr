import { createDomainPipeline } from '../_core/domain.pipeline';
import { DomainContext } from '../_core/domain.context';
import { RawPost } from './post.raw';
import { Post } from '@/types/post';
import { Poll, PollChoice } from '@/types/poll';

const mapPoll = (rawPoll: any, userVoteIndex?: number | null): Poll | undefined => {
    if (!rawPoll) return undefined;

    // Handle both JSON string and object
    let data = rawPoll;
    if (typeof rawPoll === 'string') {
        try {
            data = JSON.parse(rawPoll);
        } catch (e) {
            return undefined;
        }
    }

    if (!data || !data.choices) return undefined;

    const choices: PollChoice[] = (data.choices || []).map((c: any, index: number) => ({
        text: c.text || c.label,
        color: c.color || ['#1DA1F2', '#17BF63', '#FFAD1F', '#E0245E', '#794BC4'][index % 5],
        vote_count: Number(c.vote_count) || 0
    }));

    const userVoteIdx = userVoteIndex !== null && userVoteIndex !== undefined ? userVoteIndex : (data.userVoteIndex !== undefined ? data.userVoteIndex : undefined);

    // FIX: Reconcile counts if user voted but count is 0 (due to stale server data vs local vote)
    if (userVoteIdx !== undefined && choices[userVoteIdx]) {
        if (choices[userVoteIdx].vote_count === 0) {
            choices[userVoteIdx].vote_count = 1;
        }
    }

    return {
        question: data.question || '',
        choices,
        totalVotes: choices.reduce((sum, c) => sum + c.vote_count, 0),
        expiresAt: data.expiresAt || data.expires_at || data.closes_at || new Date().toISOString(),
        userVoteIndex: userVoteIdx
    };
};

export const PostPipeline = createDomainPipeline<any, RawPost, Post>({
    adapt(source: any): RawPost {
        // Determine source type and normalize
        // SQLite rows use flattened structure and do NOT have the `author` object unless joined as JSON (which we don't do)
        // Supabase rows have the `author` object relation.
        const isSqlite = !source.author;

        if (isSqlite) {
            const quotedId = source.inner_quoted_post_id || source.quoted_post_id;
            const repostedId = source.inner_reposted_post_id || source.reposted_post_id;

            return {
                id: source.id,
                author_id: source.owner_id,
                author: {
                    username: source.username,
                    name: source.display_name,
                    avatar: source.avatar_url,
                    is_verified: !!source.is_verified,
                },
                content: source.content || '',
                type: source.type || 'original',
                created_at: source.created_at,
                updated_at: source.updated_at,
                content_edited_at: source.content_edited_at,
                media: source.media_json ? JSON.parse(source.media_json) : [],
                poll: source.poll_json,
                counts: {
                    likes: source.like_count || 0,
                    dislikes: source.dislike_count || 0,
                    laughs: source.laugh_count || 0,
                    reposts: source.repost_count || 0,
                    replies: source.reply_count || 0,
                },
                viewer_state: {
                    my_reaction: source.my_reaction || 'NONE',
                    is_bookmarked: !!source.is_bookmarked,
                    is_reposted: !!source.is_reposted,
                    user_vote_index: source.user_vote_index,
                },
                parent_id: source.parent_id,
                quoted_post_id: quotedId,
                reposted_post_id: repostedId,
                // Recursive adaptation for quoted/reposted if joined as row prefixes
                quoted_post: quotedId ? {
                    id: quotedId,
                    author_id: source.quoted_author_id,
                    author: {
                        username: source.quoted_author_username,
                        name: source.quoted_author_name,
                        avatar: source.quoted_author_avatar,
                        is_verified: !!source.quoted_author_verified,
                    },
                    content: source.quoted_content || '',
                    type: source.quoted_type || 'original',
                    created_at: source.quoted_created_at,
                    updated_at: source.quoted_updated_at,
                    content_edited_at: source.quoted_content_edited_at,
                    media: source.quoted_media_json ? JSON.parse(source.quoted_media_json) : [],
                    poll: source.quoted_poll_json,
                    counts: {
                        likes: source.quoted_like_count || 0,
                        dislikes: 0,
                        laughs: 0,
                        reposts: source.quoted_repost_count || 0,
                        replies: source.quoted_reply_count || 0,
                    },
                    viewer_state: {
                        my_reaction: 'NONE',
                        is_bookmarked: false,
                        is_reposted: false,
                    }
                } : null,
                reposted_post: repostedId ? {
                    id: repostedId,
                    author_id: source.reposted_author_id,
                    author: {
                        username: source.reposted_author_username,
                        name: source.reposted_author_name,
                        avatar: source.reposted_author_avatar,
                        is_verified: !!source.reposted_author_verified,
                    },
                    content: source.reposted_content || '',
                    type: source.reposted_type || 'original',
                    created_at: source.reposted_created_at,
                    updated_at: source.reposted_updated_at,
                    content_edited_at: source.reposted_content_edited_at,
                    media: source.reposted_media_json ? JSON.parse(source.reposted_media_json) : [],
                    poll: source.reposted_poll_json,
                    counts: {
                        likes: source.reposted_like_count || 0,
                        dislikes: 0,
                        laughs: 0,
                        reposts: source.reposted_repost_count || 0,
                        replies: source.reposted_reply_count || 0,
                    },
                    viewer_state: {
                        my_reaction: 'NONE',
                        is_bookmarked: false,
                        is_reposted: false,
                    }
                } : null,
            };
        } else {
            // Supabase source
            return {
                id: source.id,
                author_id: source.author_id || source.owner_id,
                author: {
                    username: source.author?.username || 'user',
                    name: source.author?.name || 'User',
                    avatar: source.author?.avatar,
                    is_verified: !!source.author?.is_verified,
                },
                content: source.content || '',
                type: source.type || 'original',
                created_at: source.created_at,
                updated_at: source.updated_at,
                content_edited_at: source.content_edited_at,
                media: source.media || [],
                poll: source.poll || source.poll_json,
                counts: {
                    likes: source.reaction_counts?.like_count || source.likeCount || 0,
                    dislikes: source.reaction_counts?.dislike_count || source.dislikeCount || 0,
                    laughs: source.reaction_counts?.laugh_count || source.laughCount || 0,
                    reposts: source.reaction_counts?.repost_count || source.repostCount || 0,
                    replies: source.reaction_counts?.comment_count || source.commentCount || 0,
                },
                viewer_state: {
                    my_reaction: source.userReaction || source.viewer?.reaction || 'NONE',
                    is_bookmarked: !!source.isBookmarked || !!source.viewer?.isBookmarked,
                    is_reposted: !!source.isReposted || !!source.viewer?.isReposted,
                    user_vote_index: source.poll?.userVoteIndex || source.viewer?.userVoteIndex,
                },
                parent_id: source.parent_id || source.parentPostId,
                quoted_post_id: source.quoted_post_id || source.quotedPostId,
                reposted_post_id: source.reposted_post_id || source.repostedPostId,
                quoted_post: source.quoted_post ? this.adapt(source.quoted_post) : null,
                reposted_post: source.reposted_post ? this.adapt(source.reposted_post) : null,
            };
        }
    },

    map(raw, ctx: DomainContext): Post {
        const isSelf = raw.author_id === ctx.viewerId;

        // Defensive Date Handling
        const rawCreated = raw.created_at || new Date().toISOString();
        const rawUpdated = raw.updated_at || rawCreated;

        const createdDate = new Date(rawCreated);
        const updatedDate = new Date(rawUpdated);

        const createdTime = isNaN(createdDate.getTime()) ? Date.now() : createdDate.getTime();
        const updatedTime = isNaN(updatedDate.getTime()) ? createdTime : updatedDate.getTime();

        // Fix: Use content_edited_at if available for true edit detection
        const rawEditedAt = raw.content_edited_at || raw.updated_at;
        const editedDate = rawEditedAt ? new Date(rawEditedAt) : null;
        const editedTime = (editedDate && !isNaN(editedDate.getTime())) ? editedDate.getTime() : createdTime;

        // Allow 60s processing buffer before marking as edited (for legacy fallback or creation lag)
        const isEdited = !!raw.content_edited_at
            ? Math.abs(editedTime - createdTime) >= 60000
            : (!!raw.updated_at && Math.abs(editedTime - createdTime) >= 60000);

        return {
            id: raw.id,
            content: raw.content,
            type: raw.type as any,
            createdAt: isNaN(createdDate.getTime()) ? new Date().toISOString() : rawCreated,
            updatedAt: (raw.updated_at && !isNaN(updatedDate.getTime())) ? raw.updated_at : undefined,
            content_edited_at: (raw.content_edited_at && !isNaN(new Date(raw.content_edited_at).getTime())) ? raw.content_edited_at : undefined,

            author: {
                id: raw.author_id,
                username: raw.author.username,
                name: raw.author.name,
                avatar: raw.author.avatar,
                is_verified: raw.author.is_verified,
            } as any,

            viewer: {
                isSelf,
                reaction: raw.viewer_state.my_reaction as any,
                hasLiked: raw.viewer_state.my_reaction === 'LIKE',
                hasDisliked: raw.viewer_state.my_reaction === 'DISLIKE',
                hasLaughed: raw.viewer_state.my_reaction === 'LAUGH',
                isBookmarked: raw.viewer_state.is_bookmarked,
                isReposted: raw.viewer_state.is_reposted || raw.viewer_state.my_reaction === 'REPOST',
                userVoteIndex: raw.viewer_state.user_vote_index,
            },

            stats: {
                likes: raw.counts.likes,
                dislikes: raw.counts.dislikes,
                laughs: raw.counts.laughs,
                reposts: raw.counts.reposts,
                replies: raw.counts.replies,
            },

            meta: {
                isEdited,
                editedLabel: isEdited ? 'Edited' : null,
                visibility: 'public', // Default for now
            },

            media: (raw.media || []).map(m => ({
                type: m.type,
                url: m.url
            })),

            poll: mapPoll(raw.poll, raw.viewer_state.user_vote_index),

            quotedPost: raw.quoted_post ? this.map(raw.quoted_post, ctx) : undefined,
            repostedPost: raw.reposted_post ? this.map(raw.reposted_post, ctx) : undefined,

            parentPostId: raw.parent_id || undefined,
            quotedPostId: raw.quoted_post_id || undefined,
            repostedPostId: raw.reposted_post_id || undefined,
            repostedBy: (raw.type === 'repost' && raw.reposted_post) ? {
                id: raw.author_id,
                username: raw.author.username,
                name: raw.author.name,
                avatar: raw.author.avatar,
                is_verified: raw.author.is_verified,
                is_suspended: false,
                is_shadow_banned: false,
                is_limited: false,
            } as any : undefined,
        };
    }
});
