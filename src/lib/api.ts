import { supabase } from './supabase';
import { Post, ReactionAction, Comment, Media } from "@/types/post";
import { User, UserProfile, Session } from "@/types/user";
import { Notification } from "@/types/notification";
import { Conversation, Message } from "@/types/message";
import { ViewerRelationship } from "@/components/profile/ProfileActionRow";


export interface PrivacySettings {
  protectPosts: boolean;
  photoTagging: boolean;
  readReceipts: boolean;
  discoveryEmail: boolean;
  discoveryPhone: boolean;
}

export interface NotificationSettings {
  qualityFilter: boolean;
  pushMentions: boolean;
  pushReplies: boolean;
  pushLikes: boolean;
  emailDigest: boolean;
}


/**
 * Maps a raw database row from the 'posts' table (with joined profiles and aggregates)
 * to the strict Post type.
 */
const mapPost = (row: any): Post => {
  return {
    id: row.id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media: row.media,
    likeCount: row.reaction_counts?.like_count || 0,
    dislikeCount: row.reaction_counts?.dislike_count || 0,
    laughCount: row.reaction_counts?.laugh_count || 0,
    repostCount: row.reaction_counts?.repost_count || 0,
    commentCount: row.reaction_counts?.comment_count || 0,
    userReaction: 'NONE', // Filled by hydratePosts
    isBookmarked: false, // Filled by hydratePosts
    parentPostId: row.parent_id,
    poll: row.poll
  } as Post;
};

/**
 * Maps a raw database row from the 'profiles' table to the strict User type.
 */
const mapProfile = (row: any): User => {
  if (!row) return null as any;
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

/**
 * Batch hydrates posts with current-user-specific status (reactions, bookmarks).
 */
const hydratePosts = async (posts: Post[]): Promise<Post[]> => {
  if (posts.length === 0) return posts;
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return posts;

  const postIds = posts.map(p => p.id);

  // Parallel fetch reactions and bookmarks
  const [reactions, bookmarks] = await Promise.all([
    supabase
      .from('post_reactions')
      .select('subject_id, type')
      .eq('actor_id', user.id)
      .in('subject_id', postIds),
    supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
  ]);

  const reactionMap = new Map(reactions.data?.map((r: any) => [r.subject_id, r.type]));
  const bookmarkSet = new Set(bookmarks.data?.map((b: any) => b.post_id));

  return posts.map(p => ({
    ...p,
    userReaction: (reactionMap.get(p.id) as ReactionAction) || 'NONE',
    isBookmarked: bookmarkSet.has(p.id)
  }));
};

export const api = {
  // AUTHENTICATION
  // -------------------------------------------------------------------------
  login: async (email: string, password: string): Promise<{ user: User; session: any }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Retry fetching profile briefly in case trigger is slow
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (p) {
        profile = p;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!profile) {
      // Emergency fall-through if trigger failed
      await api.ensureProfileExists(data.user);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      profile = p;
    }

    await supabase.from('user_sessions').insert({
      user_id: data.user.id,
      device: 'Mobile App',
      location: 'Local',
      is_current: true
    });

    return {
      user: mapProfile(profile),
      session: data.session
    };
  },

  register: async (email: string, password: string, username: string, name: string): Promise<{ user: User; session: any }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, name }
      }
    });
    if (error) throw error;

    // We don't map profile here because it's handled by the trigger 
    // and navigation usually waits for session update which triggers hydrate in AuthProvider
    return { user: data.user as any, session: data.session };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return { ...user, ...profile } as unknown as User;
  },

  ensureProfileExists: async (authUser: any): Promise<void> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      let username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || `user_${authUser.id.split('-')[0]}`;

      // Ensure length
      if (username.length < 3) username = username + '_' + Math.floor(Math.random() * 100);

      const { error } = await supabase.from('profiles').insert({
        id: authUser.id,
        username: username,
        name: authUser.user_metadata?.name || username,
        avatar: authUser.user_metadata?.avatar || `https://i.pravatar.cc/150?u=${authUser.id}`
      });
      if (error) console.error('Error creating profile manually:', error);
    }
  },


  getSessions: async (): Promise<Session[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

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
  getFeed: async (params: { limit?: number; cursor?: string } = {}): Promise<{ posts: Post[]; nextCursor?: string }> => {
    // Simple global feed for MVP
    let query = supabase
      .from('posts')
      .select(`
                *,
                author:profiles!posts_owner_id_fkey(*),
                media:post_media(*),
                reaction_counts:reaction_aggregates(*)
            `)
      .order('created_at', { ascending: false })
      .limit(params.limit || 20);

    if (params.cursor) {
      query = query.lt('created_at', params.cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const posts = await hydratePosts(data.map(mapPost));

    return {
      posts,
      nextCursor: posts.length > 0 ? posts[posts.length - 1].createdAt : undefined
    };
  },

  getForYouFeed: async (params: { limit?: number; cursor?: string } = {}): Promise<{ posts: Post[]; nextCursor?: string }> => {
    return api.getFeed(params);
  },

  fetchFeed: async (params: { limit?: number; cursor?: string } | string = {}): Promise<{ posts: Post[]; nextCursor?: string }> => {
    if (typeof params === 'string') {
      return api.getFeed({ cursor: params });
    }
    return api.getFeed(params);
  },

  createPost: async (postData: { content: string; media?: { type: 'image' | 'video'; url: string }[]; quotedPostId?: string }): Promise<Post> => {
    // 1. Insert Post
    const { data: post, error } = await supabase.from('posts').insert({
      content: postData.content,
      quoted_post_id: postData.quotedPostId,
      owner_id: (await supabase.auth.getUser()).data.user!.id
    }).select().single();

    if (error) throw error;

    // 2. Insert Media (if any)
    if (postData.media && postData.media.length > 0) {
      const mediaInserts = postData.media.map(m => ({
        post_id: post.id,
        url: m.url, // Assumes URL is already uploaded/public or handled
        type: m.type
      }));
      await supabase.from('post_media').insert(mediaInserts);
    }

    // Return fully hydrated post
    const hydrated = await api.fetchPost(post.id);
    if (!hydrated) throw new Error('Failed to fetch newly created post');
    return hydrated;
  },

  createComment: async (postId: string, commentData: { content: string, media?: Media[] }): Promise<Comment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: post, error } = await supabase.from('posts').insert({
      content: commentData.content,
      parent_id: postId,
      owner_id: user.id
    }).select().single();

    if (error) throw error;

    if (commentData.media && commentData.media.length > 0) {
      const mediaInserts = commentData.media.map(m => ({
        post_id: post.id,
        url: m.url,
        type: m.type
      }));
      await supabase.from('post_media').insert(mediaInserts);
    }

    const hydrated = await api.fetchPost(post.id);
    if (!hydrated) throw new Error('Failed to fetch newly created comment');
    return hydrated as unknown as Comment;
  },

  quote: async (quotedPostId: string, content: string): Promise<Post> => {
    return api.createPost({ content, quotedPostId });
  },

  updatePost: async (postId: string, content: string): Promise<void> => {
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId); // RLS handles auth/time check
    if (error) throw error;
  },

  fetchPost: async (postId: string): Promise<Post | null> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
                *,
                author:profiles!posts_owner_id_fkey(*),
                media:post_media(*),
                reaction_counts:reaction_aggregates(*)
            `)
      .eq('id', postId)
      .single();

    if (error || !data) return null;

    const hydrated = await hydratePosts([mapPost(data)]);
    return hydrated[0] || null;
  },

  fetchPostWithLineage: async (postId: string): Promise<{ post: Post, parents: Post[] } | undefined> => {
    const post = await api.fetchPost(postId);
    if (!post) return undefined;

    const parents: Post[] = [];
    let currentParentId = post.parentPostId;

    while (currentParentId) {
      const parent = await api.fetchPost(currentParentId);
      if (parent) {
        parents.unshift(parent);
        currentParentId = parent.parentPostId;
      } else {
        break;
      }
    }

    return { post, parents };
  },

  deletePost: async (postId: string): Promise<void> => {
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() }) // Soft delete
      .eq('id', postId);
    if (error) throw error;
  },

  // ENGAGEMENT
  // -------------------------------------------------------------------------
  react: async (postId: string, action: ReactionAction): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (action === 'NONE') {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('subject_id', postId)
        .eq('actor_id', user.id);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('subject_id', postId)
      .eq('actor_id', user.id)
      .eq('type', 'LIKE')
      .single();

    if (existing) {
      await api.react(postId, 'NONE');
      return false;
    } else {
      await api.react(postId, 'LIKE');
      return true;
    }
  },

  repostPost: async (postId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if we already reposted this
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('owner_id', user.id)
      .eq('parent_id', postId)
      .eq('type', 'repost')
      .is('deleted_at', null)
      .single();

    if (existing) {
      // Un-repost (soft delete)
      await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Repost
      const { error } = await supabase.from('posts').insert({
        owner_id: user.id,
        content: '',
        type: 'repost',
        parent_id: postId
      });
      if (error) throw error;
    }
  },

  repost: async (postId: string): Promise<void> => {
    return api.repostPost(postId);
  },

  toggleBookmark: async (postId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

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
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    return !!data;
  },

  getBookmarks: async (): Promise<Post[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post:posts(
          *,
          author:profiles!posts_owner_id_fkey(*),
          media:post_media(*),
          reaction_counts:reaction_aggregates(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map((row: any) => mapPost(row.post)));
  },

  // MESSAGING (Realtime)
  // -------------------------------------------------------------------------
  getConversations: async (): Promise<Conversation[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

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
    })) as any;
  },

  getConversation: async (conversationId: string): Promise<{ conversation: Conversation, messages: Message[] } | null> => {
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
    return { conversation: transformedConv as any, messages: msgs };
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Parallel fetch messages and user's last read timestamp
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
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: (await supabase.auth.getUser()).data.user!.id,
      content: text
    }).select('*, sender:profiles!messages_sender_id_fkey(*)').single();
    if (error) throw error;
    return data as any;
  },

  markConversationAsRead: async (conversationId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  },

  createConversation: async (userId: string): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conv, error } = await supabase.from('conversations').insert({
      type: 'PRIVATE'
    }).select().single();
    if (error) throw error;

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id, is_admin: true },
      { conversation_id: conv.id, user_id: userId, is_admin: true }
    ]);

    return conv as any;
  },

  createGroupConversation: async (name: string, userIds: string[]): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conv, error } = await supabase.from('conversations').insert({
      type: 'GROUP'
    }).select().single();
    if (error) throw error;

    const participants = [user.id, ...userIds].map(uid => ({
      conversation_id: conv.id,
      user_id: uid,
      is_admin: uid === user.id
    }));

    await supabase.from('conversation_participants').insert(participants);

    return conv as any;
  },

  createChannelConversation: async (name: string, description?: string): Promise<Conversation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conv, error } = await supabase.from('conversations').insert({
      type: 'CHANNEL'
    }).select().single();
    if (error) throw error;

    await supabase.from('conversation_participants').insert({
      conversation_id: conv.id,
      user_id: user.id,
      is_admin: true
    });

    return conv as any;
  },

  updateConversation: async (conversationId: string, updates: any): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .update({
        type: updates.type,
      })
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
    await supabase
      .from('conversation_participants')
      .update({ is_pinned: isPinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', (await supabase.auth.getUser()).data.user!.id);
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
    return `https://postr.dev/invite/${conversationId}`;
  },

  // PROFILES
  // -------------------------------------------------------------------------
  fetchUser: async (usernameOrId: string): Promise<User | null> => {
    // Check if UUID or username
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
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;

    const user = mapProfile(data);

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
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media(*),
        reaction_counts:reaction_aggregates(*)
      `)
      .eq('owner_id', userId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map(mapPost));
  },

  getProfileReplies: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media(*),
        reaction_counts:reaction_aggregates(*)
      `)
      .eq('owner_id', userId)
      .not('parent_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map(mapPost));
  },

  getProfileMedia: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media!inner(*),
        reaction_counts:reaction_aggregates(*)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map(mapPost));
  },

  getProfileReactions: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('post_reactions')
      .select(`
        post:posts(
          *,
          author:profiles!posts_owner_id_fkey(*),
          media:post_media(*),
          reaction_counts:reaction_aggregates(*)
        )
      `)
      .eq('actor_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map((row: any) => mapPost(row.post)));
  },

  getProfileLikes: async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('post_reactions')
      .select(`
        post:posts(
          *,
          author:profiles!posts_owner_id_fkey(*),
          media:post_media(*),
          reaction_counts:reaction_aggregates(*)
        )
      `)
      .eq('actor_id', userId)
      .eq('type', 'LIKE')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map((row: any) => mapPost(row.post)));
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
    const { error } = await supabase.from('profiles').update({
      name: updates.name,
      bio: updates.bio,
      location: updates.location,
      website: updates.website,
      avatar: updates.avatar,
      header_image: updates.headerImage
    }).eq('id', (await supabase.auth.getUser()).data.user!.id);
    if (error) throw error;
  },

  toggleFollow: async (targetUserId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.id === targetUserId) throw new Error('Cannot follow yourself');

    const { data: existing } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

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

  followUser: async (userId: string): Promise<void> => {
    await api.toggleFollow(userId);
  },

  unfollowUser: async (userId: string): Promise<void> => {
    await api.toggleFollow(userId);
  },

  fetchUserRelationship: async (targetUserId: string): Promise<ViewerRelationship> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { type: 'NOT_FOLLOWING', targetUserId };
    if (user.id === targetUserId) return { type: 'SELF', targetUserId };

    const { data: block } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', user.id)
      .eq('blocked_id', targetUserId)
      .single();
    if (block) return { type: 'BLOCKED', targetUserId };

    const { data: mute } = await supabase
      .from('mutes')
      .select('*')
      .eq('muter_id', user.id)
      .eq('muted_id', targetUserId)
      .single();
    if (mute) return { type: 'MUTED', targetUserId };

    const { data: follow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (follow) return { type: 'FOLLOWING', targetUserId };

    return { type: 'NOT_FOLLOWING', targetUserId };
  },

  muteUser: async (userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('mutes').insert({ muter_id: user.id, muted_id: userId });
    if (error) throw error;
  },

  unmuteUser: async (userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('mutes').delete().eq('muter_id', user.id).eq('muted_id', userId);
    if (error) throw error;
  },

  blockUser: async (userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId });
    if (error) throw error;
  },

  unblockUser: async (userId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
    if (error) throw error;
  },

  getFollowing: async (userId?: string): Promise<User[]> => {
    const id = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!id) return [];

    const { data, error } = await supabase
      .from('follows')
      .select('target:profiles!following_id(*)')
      .eq('follower_id', id);

    if (error) throw error;
    return data.map((f: any) => f.target) as User[];
  },

  getFollowers: async (userId: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('follows')
      .select('follower:profiles!follower_id(*)')
      .eq('following_id', userId);

    if (error) throw error;
    return data.map((f: any) => f.follower) as User[];
  },

  votePoll: async (postId: string, choiceIndex: number): Promise<Post> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('vote_on_poll', {
      p_post_id: postId,
      p_user_id: user.id,
      p_choice_index: choiceIndex
    });

    if (error) throw error;

    const updatedPost = await api.fetchPost(postId);
    if (!updatedPost) throw new Error('Failed to fetch updated post');
    return updatedPost;
  },

  createPoll: async (pollData: { question: string; choices: any[]; durationSeconds: number }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: post, error: postError } = await supabase.from('posts').insert({
      content: pollData.question,
      owner_id: user.id
    }).select().single();
    if (postError) throw postError;

    const { error: pollError } = await supabase.from('polls').insert({
      post_id: post.id,
      question: pollData.question,
      choices: pollData.choices,
      expires_at: new Date(Date.now() + pollData.durationSeconds * 1000).toISOString()
    });
    if (pollError) throw pollError;
  },

  createReport: async (entityType: string, entityId: string, reportType: string, reporterId: string, reason: string): Promise<void> => {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
      type: n.type === 'LIKE' ? 'REACTION' : n.type, // Map DB type to Frontend type
      actor: n.actor,
      recipientId: n.recipient_id,
      createdAt: n.created_at,
      isRead: n.is_read,
      postId: n.data?.post_id,
      postSnippet: n.data?.post_snippet
    })) as Notification[];
  },

  fetchNotifications: async (): Promise<Notification[]> => {
    return api.getNotifications();
  },

  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_settings')
      .select('notifications')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const n = data?.notifications || {};
    return {
      qualityFilter: n.quality_filter ?? false,
      pushMentions: n.push_mentions ?? true,
      pushReplies: n.push_replies ?? true,
      pushLikes: n.push_likes ?? true,
      emailDigest: n.email_digest ?? true
    };
  },

  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First fetch existing to merge (since it's a jsonb column)
    const { data: existing } = await supabase
      .from('user_settings')
      .select('notifications')
      .eq('user_id', user.id)
      .single();

    const current = existing?.notifications || {};

    // Map camelCase to snake_case for DB
    const updates: any = {};
    if (settings.qualityFilter !== undefined) updates.quality_filter = settings.qualityFilter;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

  // INFRASTRUCTURE
  // -------------------------------------------------------------------------
  updateCountry: async (country: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_settings')
      .update({ country })
      .eq('user_id', user.id);
    if (error) throw error;
  },

  requestDataArchive: async (): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 500));
  },

  getUserId: (): string => {
    return (api as any).CURRENT_USER_ID || '0';
  },

  // SEARCH & TRENDING
  // -------------------------------------------------------------------------
  searchUsers: async (query: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data as User[];
  },

  searchPosts: async (query: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media(*),
        reaction_counts:reaction_aggregates(*)
      `)
      .textSearch('fts', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(20);

    if (error) throw error;
    return hydratePosts(data.map(mapPost));
  },

  search: async (query: string): Promise<{ posts: Post[], users: User[] }> => {
    const [posts, users] = await Promise.all([
      api.searchPosts(query),
      api.searchUsers(query)
    ]);
    return { posts, users };
  },

  getTrending: async (limit: number = 10): Promise<{ hashtag: string, count: number }[]> => {
    const { data, error } = await supabase
      .from('hashtags')
      .select('tag, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(h => ({ hashtag: h.tag, count: h.usage_count }));
  },

  getTrends: async (limit: number = 10): Promise<{ hashtag: string, count: number }[]> => {
    return api.getTrending(limit);
  },

  getPostsByHashtag: async (tag: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_owner_id_fkey(*),
        media:post_media(*),
        reaction_counts:reaction_aggregates(*)
      `)
      .ilike('content', `%#${tag}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return hydratePosts(data.map(mapPost));
  },

};

