import { supabase } from './supabase';
import { getDb } from './db/sqlite';
import { Post, ReactionAction, Comment, Media } from "@/types/post";
import { User, UserProfile, Session } from "@/types/user";
import { List, CreateListInput, UpdateListInput } from '@/types/list';
import { Notification } from "@/types/notification";
import { Conversation, Message } from "@/types/message";
import { ViewerRelationship } from "@/components/profile/ProfileActionRow";
import { generateId } from '@/utils/id';
import { PostPipeline } from '@/domain/post/post.pipeline';

// CONSTANTS:
// -------------------------------------------------------------------------
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_LIMIT = 20;
const MAX_CONTENT_LENGTH = 5000;
const MAX_MEDIA_COUNT = 4;
const MAX_POLL_CHOICES = 4;
const MAX_BIO_LENGTH = 160;
const MAX_NAME_LENGTH = 50;
const INVITE_TOKEN_EXPIRY_HOURS = 24;

const POST_SELECT = `
  *,
  author:profiles!owner_id(*),
  media:post_media(*),
  content_edited_at,
  reaction_counts:reaction_aggregates!subject_id(*),
  quoted_post:posts!quoted_post_id(
    *,
    author:profiles!owner_id(*),
    media:post_media(*),
    reaction_counts:reaction_aggregates!subject_id(*)
  ),
  reposted_post:posts!reposted_post_id(
    *,
    author:profiles!owner_id(*),
    media:post_media(*),
    reaction_counts:reaction_aggregates!subject_id(*)
  )
`;
// Note: We handle deleted_at filtering in the mapping function or query builder because Supabase embedding filters
// can be tricky with correct syntax. Optimally, we'd do `posts!quoted_post_id(*, deleted_at=is.null)` but 
// robust filtering often requires views or RLS. For now, we rely on mapPost to check deleted_at if returned.


export interface PrivacySettings {
  protectPosts: boolean;
  photoTagging: boolean;
  readReceipts: boolean;
  discoveryEmail: boolean;
  discoveryPhone: boolean;
}

export interface NotificationSettings {
  qualityFilter: boolean;
  mentionsOnly: boolean;
  pushMentions: boolean;
  pushReplies: boolean;
  pushLikes: boolean;
  emailDigest: boolean;
}

// VALIDATION HELPERS
// -------------------------------------------------------------------------
const validateContent = (content: string, maxLength = MAX_CONTENT_LENGTH): void => {
  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }
  if (content.length > maxLength) {
    throw new Error(`Content exceeds maximum length of ${maxLength} characters`);
  }
};

const validateMedia = (media?: Media[]): void => {
  if (media && media.length > MAX_MEDIA_COUNT) {
    throw new Error(`Cannot upload more than ${MAX_MEDIA_COUNT} media items`);
  }
};

const validatePollChoices = (choices: any[]): void => {
  if (choices.length < 2) {
    throw new Error('Poll must have at least 2 choices');
  }
  if (choices.length > MAX_POLL_CHOICES) {
    throw new Error(`Poll cannot have more than ${MAX_POLL_CHOICES} choices`);
  }
};

const getAuthenticatedUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
};

// CRYPTO HELPER FOR SECURE TOKENS
// -------------------------------------------------------------------------
const generateSecureToken = (): string => {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-browser environments if any (using Math.random for MVP if crypto is missing)
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// MAPPING FUNCTIONS
// -------------------------------------------------------------------------
const mapPost = (row: any, viewerId?: string | null): Post | null => {
  if (!row) return null;
  const raw = PostPipeline.adapt(row);
  return PostPipeline.map(raw, {
    viewerId: viewerId || null,
    now: new Date().toISOString()
  });
};

const mapProfile = (row: any): User | null => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    headerImage: row.header_image,
    bio: row.bio,
    location: row.location,
    website: row.website,
    is_active: row.is_active,
    is_limited: row.is_limited,
    is_shadow_banned: row.is_shadow_banned,
    is_suspended: row.is_suspended,
    is_muted: row.is_muted || false,
    is_verified: row.is_verified || false,
    verification_type: row.verification_type,
    official_logo: row.official_logo,
    username_status: row.username_status,
    authority_start: row.authority_start,
    authority_end: row.authority_end,
    last_username_change_at: row.last_username_change_at,
    country: row.country
  };
};

const hydratePosts = async (posts: Post[]): Promise<Post[]> => {
  if (posts.length === 0) return posts;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return posts;

  const postIds = posts.map(p => p.id);

  try {
    const [reactions, bookmarks, pollVotes, reposts] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('subject_id, type')
        .eq('actor_id', user.id)
        .in('subject_id', postIds),
      supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('poll_votes')
        .select('post_id, choice_index')
        .eq('user_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('posts')
        .select('reposted_post_id')
        .eq('owner_id', user.id)
        .eq('type', 'repost')
        .in('reposted_post_id', postIds)
    ]);

    // OPTIMISTIC VOTE MERGE: Check local DB for pending votes
    let localVotes: any[] = [];
    try {
      const db = await getDb();
      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        localVotes = await db.getAllAsync(
          `SELECT post_id, choice_index FROM poll_votes WHERE user_id = ? AND post_id IN (${placeholders})`,
          [user.id, ...postIds]
        );
      }
    } catch (e) {
      console.warn('Failed to fetch local votes for hydration', e);
    }

    const reactionMap = new Map(reactions.data?.map((r: any) => [r.subject_id, r.type]) || []);
    const bookmarkSet = new Set(bookmarks.data?.map((b: any) => b.post_id) || []);
    const serverRepostSet = new Set((reposts as any).data?.map((r: any) => r.reposted_post_id) || []);

    // OPTIMISTIC SYNC: Check local DB for is_reposted flag
    const localRepostSet = new Set<string>();
    try {
      const db = await getDb();
      if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(',');
        const localIsReposted = await db.getAllAsync(
          `SELECT id FROM posts WHERE is_reposted = 1 AND id IN (${placeholders})`,
          postIds
        ) as any[];
        localIsReposted.forEach(r => localRepostSet.add(r.id));
      }
    } catch (e) {
      console.warn('Failed to fetch local repost status', e);
    }

    // Server votes (assumed to be reflected in the post's poll_json counts already if synced)
    const serverVoteMap = new Map(pollVotes.data?.map((v: any) => [v.post_id, v.choice_index]) || []);

    // Local votes (pending, might not be in server counts)
    const localVoteMap = new Map();
    localVotes.forEach((v: any) => {
      localVoteMap.set(v.post_id, v.choice_index);
    });

    return posts.map(p => {
      // Determine vote index: Local takes precedence
      const localIdx = localVoteMap.get(p.id);
      const serverIdx = serverVoteMap.get(p.id);
      const userVoteIndex = localIdx !== undefined ? localIdx : serverIdx;

      // If we have a local vote that IS NOT on the server, we assume the server count 
      // doesn't include it yet, so we speculatively increment.
      const isPendingLocalVote = localIdx !== undefined && serverIdx === undefined;

      let poll = p.poll;
      if (poll && userVoteIndex !== undefined) {
        poll = { ...poll, userVoteIndex };

        if (isPendingLocalVote && poll.choices && poll.choices[userVoteIndex]) {
          // Clone choices to avoid mutating original ref if shared
          const newChoices = [...poll.choices];
          const choice = { ...newChoices[userVoteIndex] };
          choice.vote_count = (choice.vote_count || 0) + 1;
          newChoices[userVoteIndex] = choice;

          poll.choices = newChoices;
          poll.totalVotes = (poll.totalVotes || 0) + 1;
        }
      }

      return {
        ...p,
        viewer: {
          ...p.viewer,
          reaction: (reactionMap.get(p.id) as ReactionAction) || 'NONE',
          hasLiked: reactionMap.get(p.id) === 'LIKE',
          hasDisliked: reactionMap.get(p.id) === 'DISLIKE',
          hasLaughed: reactionMap.get(p.id) === 'LAUGH',
          isBookmarked: bookmarkSet.has(p.id),
          isReposted: serverRepostSet.has(p.id) || localRepostSet.has(p.id) || reactionMap.get(p.id) === 'REPOST',
          userVoteIndex
        },
        poll
      };
    });
  } catch (error) {
    console.error('Error hydrating posts:', error);
    return posts;
  }
};

export const api = {
  // AUTHENTICATION
  // -------------------------------------------------------------------------
  login: async (email: string, password: string): Promise<{ user: User; session: any }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await api.ensureProfileExists(data.user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      throw new Error('Failed to create user profile');
    }

    await supabase.from('user_sessions').insert({
      user_id: data.user.id,
      device: 'Mobile App',
      location: 'Local',
      is_current: true
    });

    const mappedProfile = mapProfile(profile);
    if (!mappedProfile) throw new Error('Invalid profile data');

    return {
      user: mappedProfile,
      session: data.session
    };
  },

  register: async (email: string, password: string, username: string, name: string): Promise<{ user: User; session: any }> => {
    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, name }
      }
    });
    if (error) throw error;

    return { user: data.user as any, session: data.session };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getUserId: async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    // Use cached profile if possible, or attempt local session metadata
    // For now, we attempt a quick fetch but catch error for offline
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        // Return minimal profile from session metadata if offline
        return {
          id: user.id,
          username: user.user_metadata?.username || 'user',
          name: user.user_metadata?.name || 'User',
          avatar: user.user_metadata?.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        } as User;
      }

      return mapProfile(profile);
    } catch (e) {
      console.warn('[API] Offline: Using session metadata for user profile');
      return {
        id: user.id,
        username: user.user_metadata?.username || 'user',
        name: user.user_metadata?.name || 'User',
        avatar: user.user_metadata?.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
      } as User;
    }
  },

  ensureProfileExists: async (authUser: any): Promise<void> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      let username = authUser.user_metadata?.username ||
        authUser.email?.split('@')[0] ||
        `user_${authUser.id.split('-')[0]}`;

      if (username.length < 3) {
        username = username + '_' + Math.floor(Math.random() * 100);
      }

      const { error } = await supabase.from('profiles').insert({
        id: authUser.id,
        username: username,
        name: authUser.user_metadata?.name || username,
        avatar: authUser.user_metadata?.avatar || `https://i.pravatar.cc/150?u=${authUser.id}`
      });

      if (error) {
        console.error('Error creating profile:', error);
        throw new Error('Failed to create user profile');
      }
    }
  },

  getSessions: async (): Promise<Session[]> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false });

    if (error) throw error;

    return data.map((s: any) => ({
      id: s.id,
      device: s.device,
      location: s.location || 'Unknown',
      last_active: new Date(s.last_active).toLocaleString(),
      is_current: s.is_current
    }));
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) throw error;
  },

  // POSTS (FEED)
  // -------------------------------------------------------------------------
  getFeed: async (params: { limit?: number; cursor?: string } = {}): Promise<{ posts: Post[]; nextCursor?: string; hasMore: boolean }> => {
    const limit = params.limit || DEFAULT_PAGE_SIZE;

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .is('deleted_at', null)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params.cursor) {
      query = query.lt('created_at', params.cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const user = await api.getCurrentUser();
    const userId = user?.id || null;

    const posts = await hydratePosts(
      data.map(row => mapPost(row, userId)).filter((p): p is Post => p !== null)
    );
    const hasMore = posts.length === limit;

    return {
      posts,
      nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt : undefined,
      hasMore
    };
  },

  getForYouFeed: async (params: { limit?: number; cursor?: string } = {}): Promise<{ posts: Post[]; nextCursor?: string; hasMore: boolean }> => {
    return api.getFeed(params);
  },

  getDeltaFeed: async (since: string): Promise<{ upserts: Post[]; deletedIds: string[] }> => {
    const [upsertsRes, deletionsRes] = await Promise.all([
      supabase
        .from('posts')
        .select(POST_SELECT)
        .or(`updated_at.gt.${since},created_at.gt.${since}`)
        .is('deleted_at', null)
        .order('updated_at', { ascending: true }),
      supabase
        .from('posts')
        .select('id, deleted_at')
        .gt('deleted_at', since)
        .not('deleted_at', 'is', null)
    ]);

    if (upsertsRes.error) throw upsertsRes.error;
    if (deletionsRes.error) throw deletionsRes.error;

    const upsertsData = upsertsRes.data || [];
    const deletionsData = deletionsRes.data || [];

    console.log(`[API] getDeltaFeed: ${upsertsData.length} upserts, ${deletionsData.length} deletions`);

    const user = await api.getCurrentUser();
    const userId = user?.id || null;

    const upserts = await hydratePosts(
      upsertsData.map(row => mapPost(row, userId)).filter((p): p is Post => p !== null)
    );

    const deletedIds = deletionsData.map((r: any) => r.id);

    return { upserts, deletedIds };
  },

  createPost: async (postData: { id?: string; content?: string; type?: string; media?: Media[]; pollJson?: any; quotedPostId?: string; parentId?: string; repostedPostId?: string }): Promise<Post> => {
    // Allow empty content for reposts or media-only posts
    const hasMedia = postData.media && postData.media.length > 0;
    const isRepost = postData.type === 'repost' || postData.repostedPostId;

    if (!isRepost && !hasMedia) {
      validateContent(postData.content || '');
    }
    validateMedia(postData.media);

    const user = await getAuthenticatedUser();

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        id: postData.id || generateId(),
        content: postData.content,
        type: postData.type || (postData.quotedPostId ? 'quote' : postData.repostedPostId ? 'repost' : (postData.parentId ? 'reply' : 'original')),
        quoted_post_id: postData.quotedPostId,
        reposted_post_id: postData.repostedPostId,
        parent_id: postData.parentId,
        owner_id: user.id,
        poll_json: postData.pollJson
      })
      .select(POST_SELECT)
      .single();

    if (postError) throw postError;

    if (postData.media && postData.media.length > 0) {
      const mediaInserts = postData.media.map(m => ({
        post_id: post.id,
        url: m.url,
        type: m.type
      }));

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert(mediaInserts);

      if (mediaError) {
        await supabase
          .from('posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', post.id);
        throw new Error('Failed to upload media');
      }
    }

    const hydrated = await api.getPost(post.id);
    if (!hydrated) throw new Error('Failed to fetch newly created post');
    return hydrated;
  },

  createComment: async (postId: string, commentData: { content: string; media?: Media[] }): Promise<Comment> => {
    validateContent(commentData.content);
    validateMedia(commentData.media);

    const user = await getAuthenticatedUser();

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        id: (commentData as any).id || generateId(),
        content: commentData.content,
        parent_id: postId,
        type: 'reply',
        owner_id: user.id
      })
      .select()
      .single();

    if (postError) throw postError;

    if (commentData.media && commentData.media.length > 0) {
      const mediaInserts = commentData.media.map(m => ({
        post_id: post.id,
        url: m.url,
        type: m.type
      }));

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert(mediaInserts);

      if (mediaError) {
        await supabase
          .from('posts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', post.id);
        throw new Error('Failed to upload media');
      }
    }

    const hydrated = await api.getPost(post.id);
    if (!hydrated) throw new Error('Failed to fetch newly created comment');
    return hydrated as unknown as Comment;
  },

  quote: async (quotedPostId: string, content: string): Promise<Post> => {
    return api.createPost({ content, quotedPostId });
  },

  updatePost: async (postId: string, content: string): Promise<void> => {
    // Polls are immutable
    const post = await api.getPost(postId);
    if (post?.type === 'poll') {
      throw new Error('Polls are not mutable');
    }

    validateContent(content);

    const { error } = await supabase
      .from('posts')
      .update({
        content,
        updated_at: new Date().toISOString(),
        content_edited_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (error) throw error;
  },

  getPost: async (postId: string): Promise<Post | null> => {
    const user = await api.getCurrentUser();
    const userId = user?.id || null;

    // 1. Try Local First
    try {
      const db = await getDb();
      const localPost: any = await db.getFirstAsync(`
            SELECT
                p.*,
                u.username, u.display_name, u.avatar_url, u.verified as is_verified,
                r.reaction_type as my_reaction,
                qp.id as inner_quoted_post_id, qp.content as quoted_content, qp.type as quoted_type,
                qp.created_at as quoted_created_at, qp.updated_at as quoted_updated_at,
                qp.content_edited_at as quoted_content_edited_at,
                qp.media_json as quoted_media_json, qp.poll_json as quoted_poll_json, qp.like_count as quoted_like_count,
                qp.reply_count as quoted_reply_count, qp.repost_count as quoted_repost_count,
                qu.id as quoted_author_id, qu.username as quoted_author_username,
                qu.display_name as quoted_author_name, qu.avatar_url as quoted_author_avatar,
                qu.verified as quoted_author_verified,
                rp.id as inner_reposted_post_id, rp.content as reposted_content, rp.type as reposted_type,
                rp.created_at as reposted_created_at, rp.updated_at as reposted_updated_at,
                rp.content_edited_at as reposted_content_edited_at,
                rp.media_json as reposted_media_json, rp.poll_json as reposted_poll_json, rp.like_count as reposted_like_count,
                rp.reply_count as reposted_reply_count, rp.repost_count as reposted_repost_count,
                ru.id as reposted_author_id, ru.username as reposted_author_username,
                ru.display_name as reposted_author_name, ru.avatar_url as reposted_author_avatar,
                ru.verified as reposted_author_verified,
                pv.choice_index as user_vote_index,
                CASE WHEN b.post_id IS NOT NULL THEN 1 ELSE 0 END as is_bookmarked
            FROM posts p
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN reactions r ON p.id = r.post_id AND r.user_id = ?
            LEFT JOIN poll_votes pv ON p.id = pv.post_id AND pv.user_id = ?
            LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = ?
            LEFT JOIN posts qp ON p.quoted_post_id = qp.id AND qp.deleted = 0
            LEFT JOIN users qu ON qp.owner_id = qu.id
            LEFT JOIN posts rp ON p.reposted_post_id = rp.id AND rp.deleted = 0
            LEFT JOIN users ru ON rp.owner_id = ru.id
            WHERE p.id = ? AND p.deleted = 0
        `, [userId, userId, userId, postId]);

      if (localPost) {
        const ctx = {
          viewerId: userId,
          now: new Date().toISOString()
        };
        // Adapt and Map
        const pipelinePost = PostPipeline.map(PostPipeline.adapt(localPost), ctx);
        // Hydrate local post? Local post is usually already "hydrated" via joins, 
        // BUT hydratePosts fetches EXTRA things like bookmark set if we passed array.
        // However, pipelinePost already has correct viewer state from the SQL query above.
        // So we can return it directly!
        return pipelinePost;
      }
    } catch (e) {
      // Fallback to network if local fails (optional, but good for robustness)
      console.warn('Local getPost failed, falling back to network', e);
    }

    // 2. Fallback to Supabase
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    const mappedPost = mapPost(data, userId);
    if (!mappedPost) return null;
    const hydrated = await hydratePosts([mappedPost]);
    return hydrated[0] || null;
  },

  getPostWithLineage: async (postId: string): Promise<{ post: Post; parents: Post[] } | null> => {
    // Attempt optimizing with RPC if available, fallback to recursive fetch
    try {
      const { data, error } = await supabase.rpc('get_post_lineage', { post_id: postId });
      if (!error && data && data.length > 0) {
        const userLineage = await api.getCurrentUser();
        const userId = userLineage?.id || null;
        const posts = await hydratePosts(data.map((row: any) => mapPost(row, userId)));
        const post = posts.find(p => p.id === postId);
        const parents = posts.filter(p => p.id !== postId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return post ? { post, parents } : null;
      }
    } catch (e) {
      console.warn('RPC get_post_lineage failed, falling back to manual recursion');
    }

    const post = await api.getPost(postId);
    if (!post) return null;

    const parents: Post[] = [];
    let currentParentId = post.parentPostId;
    let depth = 0;
    const MAX_DEPTH = 20;

    while (currentParentId && depth < MAX_DEPTH) {
      const parent = await api.getPost(currentParentId);
      if (parent) {
        parents.unshift(parent);
        currentParentId = parent.parentPostId;
      } else {
        break;
      }
      depth++;
    }

    return { post, parents };
  },

  deletePost: async (postId: string): Promise<void> => {
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) throw error;
  },

  // ENGAGEMENT
  // -------------------------------------------------------------------------
  react: async (postId: string, action: ReactionAction): Promise<void> => {
    const user = await getAuthenticatedUser();

    if (action === 'NONE') {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('subject_id', postId)
        .eq('actor_id', user.id);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('post_reactions')
      .upsert({
        subject_id: postId,
        actor_id: user.id,
        type: action.toUpperCase()
      }, { onConflict: 'subject_id,actor_id' });

    if (error) throw error;
  },

  toggleLike: async (postId: string): Promise<boolean> => {
    const user = await getAuthenticatedUser();

    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('subject_id', postId)
      .eq('actor_id', user.id)
      .eq('type', 'LIKE')
      .maybeSingle();

    if (existing) {
      await api.react(postId, 'NONE');
      return false;
    } else {
      await api.react(postId, 'LIKE');
      return true;
    }
  },

  repost: async (postId: string): Promise<void> => {
    const user = await getAuthenticatedUser();

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('owner_id', user.id)
      .eq('reposted_post_id', postId)
      .eq('type', 'repost')
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      // Unrepost (soft delete)
      await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Repost (Create with stable ID)
      await supabase
        .from('posts')
        .insert({
          id: generateId(),
          owner_id: user.id,
          reposted_post_id: postId,
          type: 'repost'
        });
    }
  },

  toggleBookmark: async (postId: string): Promise<boolean> => {
    const user = await getAuthenticatedUser();

    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, post_id: postId });
      if (error) throw error;
      return true;
    }
  },

  isBookmarked: async (postId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    return !!data;
  },

  getBookmarks: async (): Promise<Post[]> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post:posts!inner(
          ${POST_SELECT.trim()}
        )
      `)
      .eq('user_id', user.id)
      .is('post.deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const currentUser = await api.getCurrentUser();
    const userId = currentUser?.id || null;

    return hydratePosts(
      data.map((row: any) => mapPost(row.post, userId)).filter((p): p is Post => p !== null)
    );
  },

  // MESSAGING
  // -------------------------------------------------------------------------
  getConversations: async (): Promise<Conversation[]> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(user:profiles!conversation_participants_user_id_fkey(*), last_read_at),
        unread:unread_conversations(unread_count)
      `)
      .eq('unread.user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map((c: any) => ({
      ...c,
      pinnedMessageId: c.pinned_message_id,
      participants: (c.participants || []).map((p: any) => p.user),
      unreadCount: c.unread?.[0]?.unread_count || 0
    })) as unknown as Conversation[];
  },

  getConversation: async (conversationId: string): Promise<{ conversation: Conversation; messages: Message[] } | null> => {
    const [conv, msgs] = await Promise.all([
      supabase
        .from('conversations')
        .select(`*, participants:conversation_participants(user:profiles!conversation_participants_user_id_fkey(*))`)
        .eq('id', conversationId)
        .single(),
      api.getMessages(conversationId)
    ]);

    if (conv.error) return null;

    const transformedConv = {
      ...conv.data,
      pinnedMessageId: (conv.data as any).pinned_message_id,
      participants: (conv.data as any).participants.map((p: any) => p.user)
    };

    return { conversation: transformedConv as unknown as Conversation, messages: msgs };
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const user = await getAuthenticatedUser();

    const [messagesRes, participantRes] = await Promise.all([
      supabase
        .from('messages')
        .select(`*, sender:profiles!messages_sender_id_fkey(*), reactions:message_reactions(*)`)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
      supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()
    ]);

    if (messagesRes.error) throw messagesRes.error;
    const lastReadAt = participantRes.data?.last_read_at || new Date(0).toISOString();

    return messagesRes.data.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      text: m.content,
      createdAt: m.created_at,
      isRead: m.created_at <= lastReadAt,
      media: m.media,
      sender: m.sender,
      reactions: (m.reactions || []).reduce((acc: any, r: any) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {})
    }));
  },

  sendMessage: async (conversationId: string, text: string, media?: any[]): Promise<Message> => {
    validateContent(text, 10000);

    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single();

    if (error) throw error;
    return data as unknown as Message;
  },

  markConversationAsRead: async (conversationId: string): Promise<void> => {
    const user = await getAuthenticatedUser();

    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  },

  createConversation: async (userId: string): Promise<Conversation> => {
    const user = await getAuthenticatedUser();

    if (userId === user.id) {
      throw new Error('Cannot create conversation with yourself');
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ type: 'PRIVATE' })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id, is_admin: true },
      { conversation_id: conv.id, user_id: userId, is_admin: true }
    ]);

    return conv as unknown as Conversation;
  },

  createGroupConversation: async (name: string, userIds: string[]): Promise<Conversation> => {
    const user = await getAuthenticatedUser();

    if (userIds.length === 0) {
      throw new Error('Group must have at least one other participant');
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ type: 'GROUP' })
      .select()
      .single();

    if (error) throw error;

    const participants = [user.id, ...userIds].map(uid => ({
      conversation_id: conv.id,
      user_id: uid,
      is_admin: uid === user.id
    }));

    await supabase.from('conversation_participants').insert(participants);

    return conv as unknown as Conversation;
  },

  createChannelConversation: async (name: string, description?: string): Promise<Conversation> => {
    const user = await getAuthenticatedUser();

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ type: 'CHANNEL' })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('conversation_participants').insert({
      conversation_id: conv.id,
      user_id: user.id,
      is_admin: true
    });

    return conv as unknown as Conversation;
  },

  updateConversation: async (conversationId: string, updates: { type?: string; name?: string; description?: string }): Promise<void> => {
    const updatePayload: any = {};
    if (updates.type) updatePayload.type = updates.type;
    if (updates.name) updatePayload.name = updates.name;
    if (updates.description) updatePayload.description = updates.description;

    const { error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId);

    if (error) throw error;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  },

  addReaction: async (conversationId: string, messageId: string, emoji: string): Promise<void> => {
    const user = await getAuthenticatedUser();

    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji
      }, { onConflict: 'message_id,user_id,emoji' });

    if (error) throw error;
  },

  pinMessage: async (conversationId: string, messageId: string): Promise<void> => {
    const { data: conv, error: fetchError } = await supabase
      .from('conversations')
      .select('pinned_message_id')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    const newPinnedId = conv.pinned_message_id === messageId ? null : messageId;

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ pinned_message_id: newPinnedId })
      .eq('id', conversationId);

    if (updateError) throw updateError;
  },

  pinConversation: async (conversationId: string, isPinned: boolean): Promise<void> => {
    const user = await getAuthenticatedUser();

    await supabase
      .from('conversation_participants')
      .update({ is_pinned: isPinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  },

  promoteToAdmin: async (conversationId: string, userId: string): Promise<void> => {
    await supabase
      .from('conversation_participants')
      .update({ is_admin: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  demoteFromAdmin: async (conversationId: string, userId: string): Promise<void> => {
    await supabase
      .from('conversation_participants')
      .update({ is_admin: false })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  getInviteLink: async (conversationId: string): Promise<string> => {
    const user = await getAuthenticatedUser();
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const { error } = await supabase.from('conversation_invites').insert({
      conversation_id: conversationId,
      token: token,
      created_by: user.id,
      expires_at: expiresAt.toISOString()
    });

    if (error) throw error;
    return `https://postr.dev/invite/${token}`;
  },

  // PROFILES
  // -------------------------------------------------------------------------
  getUser: async (usernameOrId: string): Promise<User | null> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);

    let query = supabase.from('profiles').select('*');
    if (isUuid) {
      query = query.eq('id', usernameOrId);
    } else {
      query = query.eq('username', usernameOrId);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return mapProfile(data);
  },

  getProfile: async (userId: string): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const user = mapProfile(data);
    if (!user) throw new Error('Invalid profile data');

    return {
      ...user,
      followers_count: 0,
      following_count: 0,
      post_count: 0,
      joined_date: data.created_at
    } as UserProfile;
  },

  getProfilePosts: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('owner_id', userId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map(row => mapPost(row, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  getProfileReplies: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('owner_id', userId)
      .not('parent_id', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map(row => mapPost(row, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  getProfileMedia: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media!inner(*),
        reaction_counts:reaction_aggregates!subject_id(*)
      `)
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map(row => mapPost(row, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  getProfileLikes: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('post_reactions')
      .select(`
        post:posts!inner(
          *,
          author:profiles!posts_owner_id_fkey(*),
          media:post_media(*),
          reaction_counts:reaction_aggregates!subject_id(*)
        )
      `)
      .eq('actor_id', userId)
      .eq('type', 'LIKE')
      .is('post.deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map((row: any) => mapPost(row.post, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
    const user = await getAuthenticatedUser();

    if (updates.bio && updates.bio.length > MAX_BIO_LENGTH) {
      throw new Error(`Bio cannot exceed ${MAX_BIO_LENGTH} characters`);
    }
    if (updates.name && updates.name.length > MAX_NAME_LENGTH) {
      throw new Error(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }

    const { error } = await supabase.from('profiles').update({
      name: updates.name,
      bio: updates.bio,
      location: updates.location,
      website: updates.website,
      avatar: updates.avatar,
      header_image: updates.headerImage
    }).eq('id', user.id);

    if (error) throw error;
  },

  toggleFollow: async (targetUserId: string): Promise<boolean> => {
    const user = await getAuthenticatedUser();

    if (user.id === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      if (error) throw error;
      return true;
    }
  },

  getUserRelationship: async (targetUserId: string): Promise<ViewerRelationship> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { type: 'NOT_FOLLOWING', targetUserId };
    if (user.id === targetUserId) return { type: 'SELF', targetUserId };

    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId)
      .maybeSingle();
    if (block) return { type: 'BLOCKED', targetUserId };

    const { data: mute } = await supabase
      .from('mutes')
      .select('id')
      .eq('muter_id', user.id)
      .eq('muted_id', targetUserId)
      .maybeSingle();
    if (mute) return { type: 'MUTED', targetUserId };

    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (follow) return { type: 'FOLLOWING', targetUserId };

    return { type: 'NOT_FOLLOWING', targetUserId };
  },

  muteUser: async (userId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (user.id === userId) throw new Error('Cannot mute yourself');
    const { error } = await supabase.from('mutes').insert({ muter_id: user.id, muted_id: userId });
    if (error) throw error;
  },

  unmuteUser: async (userId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const { error } = await supabase.from('mutes').delete().eq('muter_id', user.id).eq('muted_id', userId);
    if (error) throw error;
  },

  blockUser: async (userId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    if (user.id === userId) throw new Error('Cannot block yourself');
    const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId });
    if (error) throw error;
  },

  unblockUser: async (userId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
    if (error) throw error;
  },

  getFollowing: async (userId?: string): Promise<User[]> => {
    const id = userId || (await getAuthenticatedUser()).id;

    const { data, error } = await supabase
      .from('follows')
      .select('target:profiles!following_id(*)')
      .eq('follower_id', id);

    if (error) throw error;
    return data.map((f: any) => mapProfile(f.target)).filter(Boolean) as User[];
  },

  getFollowers: async (userId: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', userId);

    if (error) throw error;
    return data.map((f: any) => mapProfile(f.follower)).filter(Boolean) as User[];
  },

  votePoll: async (postId: string, choiceIndex: number): Promise<Post> => {
    const user = await getAuthenticatedUser();

    const { error } = await supabase.rpc('vote_on_poll', {
      p_post_id: postId,
      p_user_id: user.id,
      p_choice_index: choiceIndex
    });

    if (error) throw error;

    const updatedPost = await api.getPost(postId);
    if (!updatedPost) throw new Error('Failed to fetch updated post');
    return updatedPost;
  },

  createPoll: async (pollData: { question: string; choices: any[]; durationSeconds: number; id?: string }): Promise<Post> => {
    validateContent(pollData.question, 500);
    validatePollChoices(pollData.choices);

    return api.createPost({
      id: pollData.id,
      content: pollData.question,
      type: 'poll',
      pollJson: {
        question: pollData.question,
        choices: pollData.choices,
        expires_at: new Date(Date.now() + pollData.durationSeconds * 1000).toISOString()
      }
    });
  },

  createReport: async (entityType: string, entityId: string, reportType: string, reporterId: string, reason: string): Promise<void> => {
    if (entityType === 'USER' && entityId === reporterId) {
      throw new Error('Cannot report yourself');
    }
    if (entityType === 'POST' || entityType === 'COMMENT') {
      const post = await api.getPost(entityId);
      if (post?.author.id === reporterId) {
        throw new Error('Cannot report your own content');
      }
    }

    validateContent(reason, 1000);

    const { error } = await supabase.from('reports').insert({
      target_type: entityType,
      target_id: entityId,
      report_type: reportType,
      reporter_id: reporterId,
      reason: reason
    });

    if (error) throw error;
  },

  // NOTIFICATIONS
  // -------------------------------------------------------------------------
  getNotifications: async (): Promise<Notification[]> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(*)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((n: any) => ({
      id: n.id,
      type: n.type === 'LIKE' ? 'REACTION' : n.type,
      actor: n.actor,
      recipientId: n.recipient_id,
      createdAt: n.created_at,
      isRead: n.is_read,
      postId: n.data?.post_id,
      postSnippet: n.data?.post_snippet
    })) as unknown as Notification[];
  },

  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_settings')
      .select('notifications')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const n = data?.notifications || {};
    return {
      qualityFilter: n.quality_filter ?? false,
      mentionsOnly: n.mentions_only ?? false,
      pushMentions: n.push_mentions ?? true,
      pushReplies: n.push_replies ?? true,
      pushLikes: n.push_likes ?? true,
      emailDigest: n.email_digest ?? true
    };
  },

  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<void> => {
    const user = await getAuthenticatedUser();

    const { data: existing } = await supabase
      .from('user_settings')
      .select('notifications')
      .eq('user_id', user.id)
      .single();

    const current = existing?.notifications || {};

    const updates: any = {};
    if (settings.qualityFilter !== undefined) updates.quality_filter = settings.qualityFilter;
    if (settings.mentionsOnly !== undefined) updates.mentions_only = settings.mentionsOnly;
    if (settings.pushMentions !== undefined) updates.push_mentions = settings.pushMentions;
    if (settings.pushReplies !== undefined) updates.push_replies = settings.pushReplies;
    if (settings.pushLikes !== undefined) updates.push_likes = settings.pushLikes;
    if (settings.emailDigest !== undefined) updates.email_digest = settings.emailDigest;

    const merged = { ...current, ...updates };

    const { error } = await supabase
      .from('user_settings')
      .update({ notifications: merged })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // SETTINGS & PRIVACY
  // -------------------------------------------------------------------------
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('user_settings')
      .select('privacy')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const p = data?.privacy || {};
    return {
      protectPosts: p.protect_posts ?? false,
      photoTagging: p.photo_tagging ?? true,
      readReceipts: p.read_receipts ?? true,
      discoveryEmail: p.discovery_email ?? true,
      discoveryPhone: p.discovery_phone ?? true
    };
  },

  updatePrivacySettings: async (settings: Partial<PrivacySettings>): Promise<void> => {
    const user = await getAuthenticatedUser();

    const { data: existing } = await supabase
      .from('user_settings')
      .select('privacy')
      .eq('user_id', user.id)
      .single();

    const current = existing?.privacy || {};

    const updates: any = {};
    if (settings.protectPosts !== undefined) updates.protect_posts = settings.protectPosts;
    if (settings.photoTagging !== undefined) updates.photo_tagging = settings.photoTagging;
    if (settings.readReceipts !== undefined) updates.read_receipts = settings.readReceipts;
    if (settings.discoveryEmail !== undefined) updates.discovery_email = settings.discoveryEmail;
    if (settings.discoveryPhone !== undefined) updates.discovery_phone = settings.discoveryPhone;

    const merged = { ...current, ...updates };

    const { error } = await supabase
      .from('user_settings')
      .update({ privacy: merged })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  updateCountry: async (country: string): Promise<void> => {
    const user = await getAuthenticatedUser();

    const { error } = await supabase
      .from('user_settings')
      .update({ country })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  requestDataArchive: async (): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 500));
  },

  // SEARCH & TRENDING
  // -------------------------------------------------------------------------
  searchUsers: async (query: string): Promise<User[]> => {
    if (!query || query.trim().length === 0) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(SEARCH_LIMIT);

    if (error) throw error;
    return data.map(mapProfile).filter(Boolean) as User[];
  },

  searchPosts: async (query: string): Promise<Post[]> => {
    if (!query || query.trim().length === 0) return [];

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .textSearch('fts', query, {
        type: 'websearch',
        config: 'english'
      })
      .is('deleted_at', null)
      .limit(SEARCH_LIMIT);

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map(row => mapPost(row, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  search: async (query: string): Promise<{ posts: Post[]; users: User[] }> => {
    const [posts, users] = await Promise.all([
      api.searchPosts(query),
      api.searchUsers(query)
    ]);
    return { posts, users };
  },

  getTrending: async (limit: number = 10): Promise<{ hashtag: string; count: number }[]> => {
    const { data, error } = await supabase
      .from('hashtags')
      .select('tag, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(h => ({ hashtag: h.tag, count: h.usage_count }));
  },

  getPostsByHashtag: async (tag: string): Promise<Post[]> => {
    if (!tag || tag.trim().length === 0) return [];

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .ilike('content', `%#${tag}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const user = await api.getCurrentUser();
    const currentUserId = user?.id || null;
    return hydratePosts(
      data.map(row => mapPost(row, currentUserId)).filter((p): p is Post => p !== null)
    );
  },

  // LISTS
  // -------------------------------------------------------------------------
  getLists: async (userId: string): Promise<List[]> => {
    const { data, error } = await supabase
      .from('lists')
      .select(`
        *,
        owner:profiles!owner_id(*),
        member_count:list_members(count),
        subscriber_count:list_subscriptions(count)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check if current user is subscribed
    const currentUser = await api.getCurrentUser();

    return Promise.all(data.map(async (l: any) => {
      const isSubscribed = currentUser
        ? await api.isSubscribedToList(l.id, currentUser.id)
        : false;

      return {
        id: l.id,
        owner: l.owner,
        name: l.name,
        description: l.description,
        isPrivate: l.is_private,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        memberCount: l.member_count?.[0]?.count || 0,
        subscriberCount: l.subscriber_count?.[0]?.count || 0,
        isSubscribed
      };
    }));
  },

  getList: async (listId: string): Promise<List | null> => {
    const { data, error } = await supabase
      .from('lists')
      .select(`
        *,
        owner:profiles!owner_id(*),
        member_count:list_members(count),
        subscriber_count:list_subscriptions(count)
      `)
      .eq('id', listId)
      .single();

    if (error) return null;

    const currentUser = await api.getCurrentUser();
    const isSubscribed = currentUser
      ? await api.isSubscribedToList(listId, currentUser.id)
      : false;

    return {
      id: data.id,
      owner: data.owner,
      name: data.name,
      description: data.description,
      isPrivate: data.is_private,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      memberCount: data.member_count?.[0]?.count || 0,
      subscriberCount: data.subscriber_count?.[0]?.count || 0,
      isSubscribed
    };
  },

  createList: async (input: CreateListInput): Promise<List> => {
    const user = await getAuthenticatedUser();

    // 1. Create List
    const { data, error } = await supabase
      .from('lists')
      .insert({
        owner_id: user.id,
        name: input.name,
        description: input.description,
        is_private: input.isPrivate ?? false
      })
      .select('*, owner:profiles!owner_id(*)')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      owner: data.owner, // Joined profile
      name: data.name,
      description: data.description,
      isPrivate: data.is_private,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      memberCount: 0,
      subscriberCount: 0,
      isSubscribed: false
    };
  },

  updateList: async (listId: string, input: UpdateListInput): Promise<void> => {
    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.isPrivate !== undefined) updates.is_private = input.isPrivate;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', listId);

    if (error) throw error;
  },

  deleteList: async (listId: string): Promise<void> => {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId);

    if (error) throw error;
  },

  addListMember: async (listId: string, userId: string): Promise<void> => {
    const currentUser = await getAuthenticatedUser();
    const { error } = await supabase
      .from('list_members')
      .insert({
        list_id: listId,
        user_id: userId,
        added_by: currentUser.id
      });

    if (error) throw error;
  },

  removeListMember: async (listId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('list_members')
      .delete()
      .match({ list_id: listId, user_id: userId });

    if (error) throw error;
  },

  getListMembers: async (listId: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('list_members')
      .select(`
        user:profiles!user_id(*)
      `)
      .eq('list_id', listId);

    if (error) throw error;
    return data.map((d: any) => d.user);
  },

  isSubscribedToList: async (listId: string, userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('list_subscriptions')
      .select('id')
      .match({ list_id: listId, subscriber_id: userId })
      .maybeSingle();

    return !!data;
  },

  subscribeToList: async (listId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('list_subscriptions')
      .insert({
        list_id: listId,
        subscriber_id: user.id
      });

    if (error) throw error;
  },

  unsubscribeFromList: async (listId: string): Promise<void> => {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('list_subscriptions')
      .delete()
      .match({ list_id: listId, subscriber_id: user.id });

    if (error) throw error;
  },

  getListFeed: async (listId: string, params: { limit?: number; cursor?: string } = {}): Promise<{ posts: Post[]; nextCursor?: string; hasMore: boolean }> => {
    // 1. Get member IDs
    const memberUsers = await api.getListMembers(listId);
    const memberIds = memberUsers.map(u => u.id);

    if (memberIds.length === 0) {
      return { posts: [], hasMore: false };
    }

    // 2. Fetch posts from these users (Standard Feed Query filtered by author)
    const limit = params.limit || DEFAULT_PAGE_SIZE;

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .in('owner_id', memberIds)
      .is('deleted_at', null)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (params.cursor) {
      query = query.lt('created_at', params.cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const user = await api.getCurrentUser();
    const userId = user?.id || null;

    const posts = await hydratePosts(
      data.map(row => mapPost(row, userId)).filter((p): p is Post => p !== null)
    );
    const hasMore = posts.length === limit;

    return {
      posts,
      nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt : undefined,
      hasMore
    };
  },

  // REALTIME SUBSCRIPTIONS
  // -------------------------------------------------------------------------
  subscribeToConversation: (conversationId: string, onMessage: (message: Message) => void) => {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onMessage({
              id: data.id,
              conversationId: data.conversation_id,
              senderId: data.sender_id,
              text: data.content,
              createdAt: data.created_at,
              isRead: false,
              media: data.media,
              sender: data.sender,
              reactions: {}
            });
          }
        }
      )
      .subscribe();
  },

  subscribeToNotifications: (userId: string, onNotification: (notification: Notification) => void) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select('*, actor:profiles!actor_id(*)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            onNotification({
              id: data.id,
              type: data.type === 'LIKE' ? 'REACTION' : data.type,
              actor: data.actor,
              recipientId: data.recipient_id,
              createdAt: data.created_at,
              isRead: data.is_read,
              postId: data.data?.post_id,
              postSnippet: data.data?.post_snippet
            });
          }
        }
      )
      .subscribe();
  },

  subscribeToPostComments: (postId: string, onComment: (comment: Post) => void) => {
    return supabase
      .channel(`post_comments:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `parent_id=eq.${postId}`
      },
        async (payload) => {
          const comment = await api.getPost(payload.new.id);
          if (comment) onComment(comment);
        }
      )
      .subscribe();
  },

  hasNewFeedPosts: async (sinceTimestamp: string): Promise<number> => {
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('parent_id', null)
      .gt('created_at', sinceTimestamp)

    if (error) return 0;
    return count || 0;
  },
};
