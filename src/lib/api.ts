import { Post, ReactionAction, Comment, Media } from "@/types/post";
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
const followersMap = new Map<string, Set<string>>(); // userId -> Set of follower IDs
const allNotifications: Notification[] = [];
const hashtagUsage = new Map<string, number>();

// --- Rate Limiter for Follow Actions (Phase 19) --- 
class RateLimiter {
  private actions: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  canPerformAction(): boolean {
    const now = Date.now();
    this.actions = this.actions.filter(timestamp => now - timestamp < this.windowMs);
    return this.actions.length < this.limit;
  }

  recordAction(): void {
    this.actions.push(Date.now());
  }

  getRemainingActions(): number {
    const now = Date.now();
    this.actions = this.actions.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.limit - this.actions.length);
  }

  getResetTime(): number {
    if (this.actions.length === 0) return 0;
    const oldestAction = Math.min(...this.actions);
    return oldestAction + this.windowMs;
  }
}

const followRateLimiter = new RateLimiter(10, 60 * 1000); // 10 follows per minute

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

// --- Mock User Data (Phase 19: Scaled to 50+) ---
const generateMockUsers = (): User[] => {
  const users: User[] = [
    {
      id: '0', name: 'Current User', username: 'currentuser', avatar: 'https://i.pravatar.cc/150?u=currentuser', headerImage: 'https://picsum.photos/seed/currentuser/600/200', bio: 'Just a regular user navigating the digital world.', location: 'San Francisco, CA', website: 'https://example.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false
    },
  ];

  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River', 'Phoenix', 'Skyler', 'Dakota', 'Rowan', 'Finley', 'Emerson', 'Reese', 'Parker', 'Cameron', 'Blake'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA', 'London, UK', 'Paris, France', 'Berlin, Germany', 'Tokyo, Japan', 'Sydney, Australia'];
  const bios = ['Tech enthusiast', 'Coffee lover ☕', 'Always learning', 'Building cool stuff', 'Designer & developer', 'Open source contributor', 'Just here for the memes', 'Exploring the world', 'Foodie adventures', 'Creative thinker'];

  for (let i = 1; i <= 60; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
    const bio = bios[i % bios.length];
    const location = locations[i % locations.length];

    users.push({
      id: i.toString(),
      name,
      username,
      avatar: `https://i.pravatar.cc/150?u=${username}`,
      headerImage: `https://picsum.photos/seed/${username}/600/200`,
      bio,
      location,
      website: i % 3 === 0 ? `https://${username}.com` : '',
      is_active: true,
      is_limited: i % 20 === 0,
      is_shadow_banned: i % 25 === 0,
      is_suspended: i % 30 === 0,
      is_muted: false
    });
  }

  return users;
};

const allUsers: User[] = generateMockUsers();

const userMap = new Map(allUsers.map(user => [user.id, user]));

const allPosts: Post[] = [
  {
    id: '101',
    author: userMap.get('1')!,
    content: 'Fresh post 1: Welcome to the thread testing!',
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    likeCount: 5,
    dislikeCount: 1,
    laughCount: 2,
    repostCount: 3,
    commentCount: 2,
    userReaction: 'NONE',
    comments: [
      {
        id: 'c1',
        author: userMap.get('2')!,
        content: 'This is a top-level comment!',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        likeCount: 2,
        dislikeCount: 0,
        laughCount: 1,
        repostCount: 0,
        commentCount: 1,
        userReaction: 'NONE',
        parentPostId: '101',
        comments: [
          {
            id: 'r1',
            author: userMap.get('3')!,
            content: 'And this is a nested reply to that comment!',
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            likeCount: 1,
            dislikeCount: 0,
            laughCount: 0,
            repostCount: 0,
            commentCount: 0,
            userReaction: 'NONE',
            parentPostId: 'c1',
          }
        ]
      },
      {
        id: 'c2',
        author: userMap.get('0')!,
        content: 'Test comment from the current user.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        likeCount: 10,
        dislikeCount: 0,
        laughCount: 5,
        repostCount: 1,
        commentCount: 0,
        userReaction: 'LIKE',
      }
    ]
  },
  { id: '102', author: userMap.get('2')!, content: 'Fresh post 2 (replying to 101)', createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE', parentPostId: '101' },
  { id: '103', author: userMap.get('3')!, content: 'Fresh post 3 (replying to 102)', createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE', parentPostId: '102' },
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

const seedAddressableEntities = (items: (Post | Comment)[]) => {
  items.forEach(item => {
    // If it's a comment/reply (mock ids start with c or r), ensure it's in allPosts for addressability
    if (item.id.startsWith('c') || item.id.startsWith('r')) {
      if (!allPosts.some(p => p.id === item.id)) {
        allPosts.push(item as Post);
      }
    }
    if (item.comments && item.comments.length > 0) {
      seedAddressableEntities(item.comments);
    }
  });
};

// Seed addressable entities from initial allPosts
setTimeout(() => seedAddressableEntities(allPosts), 0);

// Mock initial data (Phase 19: Reset follow state)
// followingIDs starts empty - users must explicitly follow
mutedUsers.add('alexsmith20'); // Example muted user
blockedUsersIDs.add('30'); // Example blocked user

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
    { id: 'm1', senderId: '1', text: 'Hey! How are you doing?', createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(), type: 'CHAT' },
    { id: 'm2', senderId: '0', text: 'I am good, thanks for asking! How about you?', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'CHAT' },
    { id: 'm3', senderId: '1', text: 'Doing great. Just working on this cool project.', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(), type: 'CHAT' },
    { id: 'm4', senderId: '0', text: 'Sounds interesting! Tell me more.', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: 'CHAT' },
    { id: 'm5', senderId: '1', text: 'It is a new social media app with a focus on privacy.', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'CHAT' },
    { id: 'm6', senderId: '1', text: 'We are using React Native and Expo.', createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(), type: 'CHAT' },
    { id: 'm7', senderId: '0', text: 'Wow, that is the stack I am learning right now!', createdAt: new Date().toISOString(), type: 'CHAT' },
  ],
  'conv-2': [],
  'conv-3': [
    { id: 'ms1', senderId: '1', text: 'John Doe joined the group', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: 'SYSTEM' },
    { id: 'm8', senderId: '1', text: 'Anyone hitting a bug with the latest Expo SDK?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'CHAT' }
  ],
  'conv-4': [
    { id: 'ms2', senderId: '0', text: 'Channel created', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), type: 'SYSTEM' },
    { id: 'm9', senderId: '2', text: 'Big news from Expo today!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), type: 'CHAT', reactions: { '👍': 42, '🚀': 12 } }
  ]
};

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    participants: [userMap.get('0')!, userMap.get('1')!],
    lastMessage: mockMessages['conv-1'][mockMessages['conv-1'].length - 1],
    unreadCount: 1,
    type: "DM",
    isPinned: true
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
    type: "GROUP",
    ownerId: '1',
    description: 'A group for discussing React Native development and best practices.',
    isPinned: true
  },
  {
    id: 'conv-4',
    name: 'Expo Fanatics',
    participants: [userMap.get('0')!, userMap.get('2')!, userMap.get('4')!, userMap.get('5')!],
    lastMessage: mockMessages['conv-4'][mockMessages['conv-4'].length - 1],
    unreadCount: 0,
    type: "CHANNEL",
    ownerId: '2',
    description: 'Official announcements and updates from the Expo ecosystem.',
    pinnedMessageId: 'ms2'
  }
];

const feedEngine = new FeedEngine({
  fetchAuthorTimeline: async (authorId: string) => {
    return allPosts.filter(post =>
      (post.author.id === authorId || post.repostedBy?.id === authorId) && !post.parentPostId
    );
  },
  getFollowedAuthorIds: async (_userId: string) => {
    const ids = Array.from(followingIDs);
    if (!ids.includes('0')) ids.push('0'); // Always include self
    return ids;
  }
});

export const api = {
  createPost: async (post: { content: string, quotedPostId?: string, media?: Media[] }): Promise<Post> => {
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
      media: post.media,
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

  fetchPost: async (id: string): Promise<Post | undefined> => {
    return allPosts.find(p => p.id === id);
  },

  fetchPostWithLineage: async (postId: string): Promise<{ post: Post, parents: Post[] } | undefined> => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return undefined;

    const parents: Post[] = [];
    let currentParentId = post.parentPostId;
    while (currentParentId) {
      const parent = allPosts.find(p => p.id === currentParentId);
      if (parent) {
        parents.unshift(parent);
        currentParentId = parent.parentPostId;
      } else {
        break;
      }
    }

    return { post, parents };
  },

  createComment: async (parentId: string, commentData: { content: string, media?: Media[] }): Promise<Comment> => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: userMap.get('0')!,
      content: commentData.content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      laughCount: 0,
      repostCount: 0,
      commentCount: 0,
      userReaction: 'NONE',
      media: commentData.media,
    };

    // Add to allPosts as a Post-compatible object for addressability
    // We add it to the top-level so it can be found by fetchPostWithLineage
    const addressablePost: Post = {
      ...newComment,
      parentPostId: parentId,
      comments: [], // Comments will be added here if this comment gets replies
    };
    allPosts.unshift(addressablePost);

    // Find parent (can be a post or a comment)
    const findAndAdd = (items: (Post | Comment)[]): boolean => {
      for (const item of items) {
        if (item.id === parentId) {
          if (!item.comments) item.comments = [];
          item.comments.unshift(newComment);
          item.commentCount++;
          return true;
        }

        // Recursive search using unified 'comments' field
        if (item.comments && findAndAdd(item.comments)) return true;
      }
      return false;
    };

    const found = findAndAdd(allPosts);
    if (!found) {
      // If not found in replies/comments, check if parentId is a post id itself
      const post = allPosts.find(p => p.id === parentId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.unshift(newComment);
        post.commentCount++;
      } else {
        throw new Error("Parent not found");
      }
    }

    eventEmitter.emit('newComment', { parentId, comment: newComment });
    return newComment;
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
    if (!followRateLimiter.canPerformAction()) {
      const resetTime = followRateLimiter.getResetTime();
      const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. You can follow again in ${waitSeconds} seconds. Limit: 10 follows per minute.`);
    }

    followingIDs.add(userId);
    followRateLimiter.recordAction();

    // Update followers map for the target user
    if (!followersMap.has(userId)) {
      followersMap.set(userId, new Set());
    }
    followersMap.get(userId)!.add('0'); // Current user ID is '0'

    createNotification({
      type: 'FOLLOW',
      actor: userMap.get('0')!,
      recipientId: userId
    });
    feedEngine.invalidateCache();
  },

  unfollowUser: async (userId: string) => {
    if (!followRateLimiter.canPerformAction()) {
      const resetTime = followRateLimiter.getResetTime();
      const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. You can unfollow again in ${waitSeconds} seconds. Limit: 10 actions per minute.`);
    }

    followingIDs.delete(userId);
    followRateLimiter.recordAction();

    // Update followers map for the target user
    if (followersMap.has(userId)) {
      followersMap.get(userId)!.delete('0');
    }

    feedEngine.invalidateCache();
  },

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
  getFollowers: async (userId: string) => {
    const followerIds = followersMap.get(userId) || new Set<string>();
    return allUsers.filter(u => followerIds.has(u.id));
  },

  react: async (postId: string, action: ReactionAction) => {
    const findTarget = (items: (Post | Comment)[]): (Post | Comment) | undefined => {
      for (const item of items) {
        if (item.id === postId) return item;
        if (item.comments && item.comments.length > 0) {
          const found = findTarget(item.comments);
          if (found) return found;
        }
      }
      return undefined;
    };

    const target = findTarget(allPosts);
    if (target) {
      const prevReaction = target.userReaction;
      const finalAction = prevReaction === action ? 'NONE' : action;

      // Update counts
      if (prevReaction === 'LIKE') target.likeCount = Math.max(0, (target.likeCount || 0) - 1);
      if (prevReaction === 'DISLIKE') target.dislikeCount = Math.max(0, (target.dislikeCount || 0) - 1);
      if (prevReaction === 'LAUGH') target.laughCount = Math.max(0, (target.laughCount || 0) - 1);

      if (finalAction === 'LIKE') target.likeCount = (target.likeCount || 0) + 1;
      if (finalAction === 'DISLIKE') target.dislikeCount = (target.dislikeCount || 0) + 1;
      if (finalAction === 'LAUGH') target.laughCount = (target.laughCount || 0) + 1;

      target.userReaction = finalAction;

      if (finalAction !== 'NONE' && finalAction !== prevReaction) {
        createNotification({
          type: 'REACTION',
          actor: userMap.get('0')!,
          recipientId: target.author.id,
          postId: target.id,
          postSnippet: target.content.substring(0, 50)
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
      type: 'CHAT',
    };

    if (!mockMessages[convId]) {
      mockMessages[convId] = [];
    }
    mockMessages[convId].push(newMessage);

    // Update the last message of the conversation
    conversation.lastMessage = newMessage;

    // In a real app, this would be a push notification or websocket event
    eventEmitter.emit('newMessage', { conversationId: convId, message: newMessage });

    // Simulate a response for Groups/Channels
    if (conversation.type !== 'DM') {
      setTimeout(() => {
        const botId = conversation.participants.find(p => p.id !== '0')?.id || '1';
        const response: Message = {
          id: `bot-${Date.now()}`,
          senderId: botId,
          text: `Interesting point! Let's discuss more about "${text.substring(0, 10)}..."`,
          createdAt: new Date().toISOString(),
          type: 'CHAT',
        };
        mockMessages[convId].push(response);
        conversation.lastMessage = response;
        eventEmitter.emit('newMessage', { conversationId: convId, message: response });
      }, 2000);
    } else if (text.toLowerCase().includes('pinned')) {
      // Simulate a system message if the user mentions pinning
      setTimeout(() => {
        const systemMsg: Message = {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          text: 'Tip: You can pin this conversation to the top of your inbox.',
          createdAt: new Date().toISOString(),
          type: 'SYSTEM',
        };
        mockMessages[convId].push(systemMsg);
        eventEmitter.emit('newMessage', { conversationId: convId, message: systemMsg });
      }, 1000);
    }

    return newMessage;
  },

  addReaction: async (convId: string, msgId: string, emoji: string): Promise<void> => {
    const messages = mockMessages[convId];
    if (!messages) return;
    const message = messages.find(m => m.id === msgId);
    if (!message) return;

    if (!message.reactions) message.reactions = {};
    message.reactions[emoji] = (message.reactions[emoji] || 0) + 1;

    eventEmitter.emit('newMessage', { conversationId: convId, message }); // Broadcast update
  },

  removeReaction: async (convId: string, msgId: string, emoji: string): Promise<void> => {
    const messages = mockMessages[convId];
    if (!messages) return;
    const message = messages.find(m => m.id === msgId);
    if (!message || !message.reactions || !message.reactions[emoji]) return;

    message.reactions[emoji]--;
    if (message.reactions[emoji] <= 0) delete message.reactions[emoji];

    eventEmitter.emit('newMessage', { conversationId: convId, message }); // Broadcast update
  },

  pinConversation: async (convId: string, pinned: boolean): Promise<void> => {
    const conversation = mockConversations.find(c => c.id === convId);
    if (conversation) {
      conversation.isPinned = pinned;
    }
  },

  pinMessage: async (convId: string, msgId: string): Promise<void> => {
    const conversation = mockConversations.find(c => c.id === convId);
    if (conversation) {
      conversation.pinnedMessageId = msgId;

      // Add a system message about pinning
      const systemMsg: Message = {
        id: `sys-pin-${Date.now()}`,
        senderId: 'system',
        text: 'A message was pinned to the top.',
        createdAt: new Date().toISOString(),
        type: 'SYSTEM',
      };
      if (!mockMessages[convId]) mockMessages[convId] = [];
      mockMessages[convId].push(systemMsg);
      eventEmitter.emit('newMessage', { conversationId: convId, message: systemMsg });
    }
  },
};
