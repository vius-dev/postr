import { Post, ReactionAction, Comment } from "@/types/post";
import { PollChoice } from "@/types/poll";
import { User, UserProfile } from "@/types/user";
import { Report, ReportableEntityType, ReportType } from "@/types/reports";
import { createReport as createReportApi } from './reportsApi';
import { FeedEngine } from './feed/FeedEngine';
import { ViewerRelationship } from "@/components/profile/ProfileActionRow";
import { Notification } from "@/types/notification";
import { Conversation, Message } from "@/types/message";
import { eventEmitter } from "@/lib/EventEmitter";

// --- Data Structures for Moderation ---
const mutedUsers = new Set<string>();
const blockedUsersIDs = new Set<string>();
const followingIDs = new Set<string>();
const allNotifications: Notification[] = [];
const hashtagUsage = new Map<string, number>();

// Helpers for Phase-6 Discovery
const parseMentions = (content: string): string[] => {
  const matches = content.match(/@(\w+)/g);
  return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
};

const parseHashtags = (content: string): string[] => {
  const matches = content.match(/#(\w+)/g);
  return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
};

const createNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
  const newNotif: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  allNotifications.unshift(newNotif);
};

// --- Mock User Data ---
const allUsers: User[] = [
  {
    id: '0', name: 'Current User', username: 'currentuser', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', headerImage: 'https://picsum.photos/seed/picsum/600/200', bio: 'Just a regular user navigating the digital world.', location: 'San Francisco, CA', website: 'https://example.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
  },
  {
    id: '1', name: 'John Doe', username: 'johndoe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', headerImage: 'https://picsum.photos/seed/johndoe/600/200', bio: 'Exploring technology and art.', location: 'New York, NY', website: 'https://johndoe.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
  },
  {
    id: '2', name: 'Jane Smith', username: 'janesmith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', headerImage: 'https://picsum.photos/seed/janesmith/600/200', bio: 'Foodie and traveler.', location: 'London, UK', website: 'https://janesmithadventures.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
  },
  {
    id: '3', name: 'Alice', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', headerImage: 'https://picsum.photos/seed/alice/600/200', bio: 'Open source lover.', location: 'Berlin, Germany', website: '', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
  },
  {
    id: '4', name: 'Bob', username: 'bob', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a', headerImage: 'https://picsum.photos/seed/bob/600/200', bio: 'Designer.', location: 'Paris, France', website: '', is_active: true, is_limited: false, is_shadow_banned: true, is_suspended: false, is_muted: false
  },
  {
    id: '5', name: 'Charlie', username: 'charlie', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b', headerImage: 'https://picsum.photos/seed/charlie/600/200', bio: 'Just memes.', location: 'Internet', website: '', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
  },
  {
    id: '6', name: 'David', username: 'david', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c', headerImage: 'https://picsum.photos/seed/david/600/200', bio: 'Suspended.', location: 'Nowhere', website: '', is_active: false, is_limited: false, is_shadow_banned: false, is_suspended: true, is_muted: false
  },
];

const userMap = new Map(allUsers.map(user => [user.id, user]));

const allPosts: Post[] = [
  { id: '101', author: userMap.get('1')!, content: 'Fresh post 1', createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '102', author: userMap.get('2')!, content: 'Fresh post 2', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '103', author: userMap.get('3')!, content: 'Fresh post 3', createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '104', author: userMap.get('1')!, content: 'Fresh post 4', createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '105', author: userMap.get('2')!, content: 'Fresh post 5', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '106', author: userMap.get('3')!, content: 'Fresh post 6', createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '107', author: userMap.get('1')!, content: 'Fresh post 7', createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '108', author: userMap.get('2')!, content: 'Fresh post 8', createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '109', author: userMap.get('3')!, content: 'Fresh post 9', createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '110', author: userMap.get('1')!, content: 'Fresh post 10', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '111', author: userMap.get('2')!, content: 'Fresh post 11', createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '112', author: userMap.get('3')!, content: 'Fresh post 12', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '113', author: userMap.get('1')!, content: 'Fresh post 13', createdAt: new Date(Date.now() - 1000 * 60 * 13).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '114', author: userMap.get('2')!, content: 'Fresh post 14', createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '115', author: userMap.get('3')!, content: 'Fresh post 15', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '116', author: userMap.get('1')!, content: 'Fresh post 16', createdAt: new Date(Date.now() - 1000 * 60 * 16).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '117', author: userMap.get('2')!, content: 'Fresh post 17', createdAt: new Date(Date.now() - 1000 * 60 * 17).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '118', author: userMap.get('3')!, content: 'Fresh post 18', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '119', author: userMap.get('1')!, content: 'Fresh post 19', createdAt: new Date(Date.now() - 1000 * 60 * 19).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '120', author: userMap.get('2')!, content: 'Fresh post 20', createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
];

// Mock initial data
followingIDs.add('1'); // Following John Doe
followingIDs.add('2'); // Following Jane Smith
mutedUsers.add('bob'); // Muted Bob
blockedUsersIDs.add('6'); // Blocked David

hashtagUsage.set('coding', 15);
hashtagUsage.set('expo', 10);
hashtagUsage.set('supabase', 8);
hashtagUsage.set('pre2023', 25);

allNotifications.push({
  id: 'notif-1',
  type: 'MENTION',
  actor: userMap.get('1')!,
  recipientId: '0',
  postId: '101',
  postSnippet: 'Hey @currentuser have you seen this?',
  createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  isRead: false,
});
allNotifications.push({
  id: 'notif-2',
  type: 'FOLLOW',
  actor: userMap.get('2')!,
  recipientId: '0',
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  isRead: true,
});

const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    { id: 'm1', senderId: '1', text: 'Hey! How are you doing?', createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString() },
    { id: 'm2', senderId: '0', text: 'I am good, thanks for asking! How about you?', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: 'm3', senderId: '1', text: 'Doing great. Just working on this cool project.', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    { id: 'm4', senderId: '0', text: 'Sounds interesting! Tell me more.', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'm5', senderId: '1', text: 'It is a new social media app with a focus on privacy.', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: 'm6', senderId: '1', text: 'We are using React Native and Expo.', createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
    { id: 'm7', senderId: '0', text: 'Wow, that is the stack I am learning right now!', createdAt: new Date().toISOString() },
  ],
  'conv-2': [],
  'conv-3': [
      { id: 'm8', senderId: '1', text: 'Anyone hitting a bug with the latest Expo SDK?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()}
  ],
  'conv-4': [
    { id: 'm9', senderId: '2', text: 'Big news from Expo today!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()}
  ]
};

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    participants: [userMap.get('0')!, userMap.get('1')!],
    lastMessage: mockMessages['conv-1'][mockMessages['conv-1'].length - 1],
    unreadCount: 1,
    type: "DM"
  },
  {
    id: 'conv-2',
    participants: [userMap.get('0')!, userMap.get('2')!],
    lastMessage: {
      id: 'msg-2',
      senderId: '0',
      text: 'Check out this post!',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    unreadCount: 0,
    type: "DM"
  },
  {
    id: 'conv-3',
    name: 'React Native Devs',
    participants: [userMap.get('0')!, userMap.get('1')!, userMap.get('3')!],
    lastMessage: mockMessages['conv-3'][mockMessages['conv-3'].length - 1],
    unreadCount: 3,
    type: "GROUP"
  },
  {
    id: 'conv-4',
    name: 'Expo Fanatics',
    participants: [userMap.get('0')!, userMap.get('2')!, userMap.get('4')!, userMap.get('5')!],
    lastMessage: mockMessages['conv-4'][mockMessages['conv-4'].length - 1],
    unreadCount: 0,
    type: "CHANNEL"
  }
];

const feedEngine = new FeedEngine({
  fetchAuthorTimeline: async (authorId: string) => {
    return allPosts.filter(post =>
      post.author.id === authorId || post.repostedBy?.id === authorId
    );
  },
  getFollowedAuthorIds: async (_userId: string) => {
    const ids = Array.from(followingIDs);
    if (!ids.includes('0')) ids.push('0'); // Always include self
    return ids;
  }
});

export const api = {
  createPost: async (post: { content: string, quotedPostId?: string }): Promise<Post> => {
    const quotedPost = post.quotedPostId ? allPosts.find(p => p.id === post.quotedPostId) : undefined;
    const newPost: Post = {
      id: (allPosts.length + 1).toString(),
      author: userMap.get('0')!,
      content: post.content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      laughCount: 0,
      repostCount: 0,
      commentCount: 0,
      userReaction: 'NONE',
      quotedPost,
    };
    allPosts.unshift(newPost);

    // Phase-6: Discovery & Awareness
    const mentions = parseMentions(post.content);
    mentions.forEach(username => {
      const recipient = allUsers.find(u => u.username === username);
      if (recipient && recipient.id !== '0') {
        createNotification({
          type: 'MENTION',
          actor: userMap.get('0')!,
          recipientId: recipient.id,
          postId: newPost.id,
          postSnippet: post.content.substring(0, 50)
        });
      }
    });

    const hashtags = parseHashtags(post.content);
    hashtags.forEach(tag => {
      hashtagUsage.set(tag, (hashtagUsage.get(tag) || 0) + 1);
    });

    if (quotedPost) {
      createNotification({
        type: 'QUOTE',
        actor: userMap.get('0')!,
        recipientId: quotedPost.author.id,
        postId: newPost.id,
        postSnippet: post.content.substring(0, 50)
      });
    }

    feedEngine.invalidateCache('0');
    return newPost;
  },

  createPoll: async (poll: { question: string, choices: PollChoice[] }): Promise<Post> => {
    const newPost: Post = {
      id: (allPosts.length + 1).toString(),
      author: userMap.get('0')!,
      content: poll.question,
      poll: { choices: poll.choices.map(c => ({ ...c, vote_count: 0 })), question: "" },
      createdAt: new Date().toISOString(),
      likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE',
    };
    allPosts.unshift(newPost);
    feedEngine.invalidateCache('0');
    return newPost;
  },

  fetchFeed: async (cursor?: string): Promise<{ posts: Post[], nextCursor: string | undefined }> => {
    let structuredCursor: any = undefined;
    try {
      if (cursor) structuredCursor = JSON.parse(cursor);
    } catch (e) { }

    const response = await feedEngine.fetchFeed({
      userId: '0',
      cursor: structuredCursor,
      pageSize: 4,
      depth: structuredCursor ? 1 : 0,
    });

    return {
      posts: response.posts,
      nextCursor: response.nextCursor ? JSON.stringify(response.nextCursor) : undefined,
    };
  },

  getForYouFeed: async (offset = 0): Promise<Post[]> => {
    const pageSize = 10;
    const filteredPosts = allPosts.filter(
      p => !mutedUsers.has(p.author.username) && !blockedUsersIDs.has(p.author.id)
    );
    return filteredPosts.slice(offset, offset + pageSize);
  },

  fetchPost: async (postId: string): Promise<Post | undefined> => {
    return allPosts.find(p => p.id === postId);
  },

  fetchUser: async (username: string): Promise<User | undefined> => {
    return allUsers.find(u => u.username === username);
  },

  fetchUserRelationship: async (targetUserId: string): Promise<ViewerRelationship> => {
    if (targetUserId === '0') return { type: 'SELF' };
    if (blockedUsersIDs.has(targetUserId)) return { type: 'BLOCKED' };
    const isFollowing = followingIDs.has(targetUserId);
    const targetUser = userMap.get(targetUserId);
    const isMuted = targetUser ? mutedUsers.has(targetUser.username) : false;
    if (isFollowing) return isMuted ? { type: 'MUTED' } : { type: 'FOLLOWING' };
    return { type: 'NOT_FOLLOWING' };
  },

  followUser: async (userId: string) => {
    followingIDs.add(userId);
    createNotification({
      type: 'FOLLOW',
      actor: userMap.get('0')!,
      recipientId: userId
    });
    feedEngine.invalidateCache();
  },
  unfollowUser: async (userId: string) => { followingIDs.delete(userId); feedEngine.invalidateCache(); },

  muteUser: async (userId: string) => {
    const user = userMap.get(userId);
    if (user) mutedUsers.add(user.username);
    feedEngine.invalidateCache();
  },
  unmuteUser: async (userId: string) => {
    const user = userMap.get(userId);
    if (user) mutedUsers.delete(user.username);
    feedEngine.invalidateCache();
  },

  blockUser: async (userId: string) => { blockedUsersIDs.add(userId); feedEngine.invalidateCache(); },
  unblockUser: async (userId: string) => { blockedUsersIDs.delete(userId); feedEngine.invalidateCache(); },

  getProfile: async (userId: string): Promise<UserProfile> => {
    const user = userMap.get(userId);
    if (!user) throw new Error("User not found");
    return user;
  },

  getProfileByUsername: async (username: string): Promise<UserProfile> => {
    const user = allUsers.find(u => u.username === username);
    if (!user) throw new Error("User not found");
    return user;
  },

  getProfilePosts: async (userId: string) => allPosts.filter(p => p.author.id === userId && !p.repostedBy),
  getProfileReplies: async (userId: string) => allPosts.filter(p => p.author.id === userId && (p.parentPostId || p.quotedPost)),
  getProfileMedia: async (userId: string) => allPosts.filter(p => p.author.id === userId && p.media && p.media.length > 0),
  getProfileReactions: async (_userId: string) => allPosts.filter(p => p.userReaction === 'LIKE' || p.userReaction === 'DISLIKE'),

  getFollowing: async (_userId: string) => allUsers.filter(u => followingIDs.has(u.id)),
  getFollowers: async (_userId: string) => allUsers.slice(0, 3), // Mock

  react: async (postId: string, action: ReactionAction) => {
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      const prevReaction = post.userReaction;
      post.userReaction = action;

      if (action !== 'NONE' && action !== prevReaction) {
        createNotification({
          type: 'REACTION',
          actor: userMap.get('0')!,
          recipientId: post.author.id,
          postId: post.id,
          postSnippet: post.content.substring(0, 50)
        });
      }
    }
  },

  repost: async (postId: string) => {
    const post = allPosts.find(p => p.id === postId);
    if (post) {
      post.isReposted = !post.isReposted;
      post.repostCount += post.isReposted ? 1 : -1;

      if (post.isReposted) {
        const repostEntry: Post = {
          ...post,
          id: `repost-${post.id}-${Date.now()}`,
          repostedBy: userMap.get('0')!,
          createdAt: new Date().toISOString()
        };
        allPosts.unshift(repostEntry);

        createNotification({
          type: 'REPOST',
          actor: userMap.get('0')!,
          recipientId: post.author.id,
          postId: post.id,
          postSnippet: post.content.substring(0, 50)
        });
      } else {
        const idx = allPosts.findIndex(p => p.repostedBy?.id === '0' && p.id.startsWith(`repost-${post.id}`));
        if (idx !== -1) allPosts.splice(idx, 1);
      }

      feedEngine.invalidateCache('0');
    }
  },

  fetchNotifications: async (): Promise<Notification[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return allNotifications.filter(n => n.recipientId === '0');
  },

  getTrends: async (): Promise<{ hashtag: string, count: number }[]> => {
    return Array.from(hashtagUsage.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },

  search: async (query: string): Promise<{ posts: Post[], users: User[] }> => {
    const q = query.toLowerCase();
    const posts = allPosts.filter(p => !p.repostedBy && p.content.toLowerCase().includes(q));
    const users = allUsers.filter(u => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    return { posts, users };
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const user = userMap.get('0');
    if (user) Object.assign(user, updates);
  },

  createReport: async (entityType: ReportableEntityType, entityId: string, reportType: ReportType, reporterId: string, reason?: string) => {
    return createReportApi(entityType, entityId, reportType, reporterId, reason);
  },

  getConversations: async (): Promise<Conversation[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockConversations.map(conv => ({
      ...conv,
      lastMessage: mockMessages[conv.id]?.[mockMessages[conv.id]?.length - 1] || conv.lastMessage,
    }));
  },

  getConversation: async (convId: string): Promise<Conversation | undefined> => {
    const conversation = mockConversations.find(c => c.id === convId);
    if (!conversation) return undefined;

    return {
      ...conversation,
      lastMessage: mockMessages[convId]?.[mockMessages[convId]?.length - 1] || conversation.lastMessage,
    };
  },

  getMessages: async (convId: string): Promise<Message[]> => {
    return mockMessages[convId] || [];
  },

  sendMessage: async (convId: string, text: string): Promise<Message> => {
    const conversation = mockConversations.find(c => c.id === convId);
    if (!conversation) throw new Error("Conversation not found");

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: '0', // Assume current user is sending
      text,
      createdAt: new Date().toISOString(),
    };

    if (!mockMessages[convId]) {
      mockMessages[convId] = [];
    }
    mockMessages[convId].push(newMessage);
    
    // Update the last message of the conversation
    conversation.lastMessage = newMessage;
    conversation.unreadCount = (conversation.unreadCount || 0) + 1;

    // In a real app, this would be a push notification or websocket event
    eventEmitter.emit('newMessage', { conversationId: convId, message: newMessage });

    return newMessage;
  },
};
