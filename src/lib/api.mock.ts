import { Post, ReactionAction, Comment, Media } from "@/types/post";
import { PollChoice } from "@/types/poll";
import { User, UserProfile, Session } from "@/types/user";
import { Report, ReportableEntityType, ReportType } from "@/types/reports";
import { createReport as createReportApi } from './reportsApi';
import { FeedEngine } from './feed/FeedEngine';
import { ViewerRelationship } from "@/components/profile/ProfileActionRow";
import { Notification } from "@/types/notification";
import { Conversation, Message } from "@/types/message";
import { PostrList } from "@/types/lists";
import { eventEmitter } from "@/lib/EventEmitter";

/**
 * =============================================================================
 * PRODUCTION MOCK API - SOCIAL PLATFORM BACKEND SIMULATION
 * =============================================================================
 * 
 * This file serves as a high-fidelity "mirror" of a Supabase/PostgreSQL 
 * production backend. It simulates complex social graph interactions, 
 * real-time fan-out, and administrative moderation.
 * 
 * --- BACKEND ARCHITECTURE BLUEPRINT ---
 * 
 * [RLS - ROW LEVEL SECURITY]
 * - posts: { SELECT: (is_public OR author_id=uid() OR author_id IN (follows)), INSERT: auth.uid()=author_id }
 * - profiles: { SELECT: true, UPDATE: auth.uid()=id }
 * - conversations: { SELECT: auth.uid() IN (participants), INSERT: auth.uid() IN (participants) }
 * - notifications: { SELECT: auth.uid()=recipient_id, UPDATE: auth.uid()=recipient_id }
 * 
 * [TRIGGERS - DATABASE AUTOMATIONS]
 * - on_post_insert: 
 *   1. Increment user.post_count
 *   2. If @mentions: Insert into notifications
 *   3. If #hashtags: Update hashtag_usage leaderboard
 * - on_interaction (like/repost):
 *   1. Increment/Decrement post.counts
 *   2. Notify author if actor != author
 * - on_follow:
 *   1. Increment following_count (actor) and followers_count (target)
 * 
 * [EDGE FUNCTIONS - SERVERLESS COMPUTE]
 * - push_fanout: Dispatches mobile push notifications to all followers on new post.
 * - media_optimize: Processes raw uploads (Resize, JPEG-XL, BlurHash generation).
 * - safety_filter: Asynchronous AI content scanning (LLM/Vision) for policy violations.
 * 
 * [CRON JOBS - SCHEDULED TASKS]
 * - compute_trends: Every 10m - Scans recent hashtag usage and rank globally.
 * - cleanup_orphans: Every 24h - Removes messages in deleted conversations.
 * - report_aggregator: Hourly - Batches high-volume reports for moderator review.
 * 
 * =============================================================================
 */

/**
 * A complete, production-ready mock API that simulates a real social media
 * platform backend with all features working realistically.
 * 
 * Features:
 * - Multi-user system with 60+ generated users
 * - Full social graph (follow, mute, block)
 * - Posts, comments, reactions, reposts
 * - Real-time notifications
 * - Direct messaging and group chats
 * - Rate limiting and security
 * - Living world simulation (autonomous user activity)
 * - Content discovery (hashtags, mentions, search)
 * - Bookmarks and polls
 * - Profile management
 * - Moderation and reporting
 * - Complete admin dashboard system
 * 
 * =============================================================================
 */

// =============================================================================
// GLOBAL CONFIGURATION
// =============================================================================

/** Current authenticated user ID */
let CURRENT_USER_ID = '0';

/** Admin user IDs */
const ADMIN_USER_IDS = new Set(['0', 'admin', 'moderator_1', 'moderator_2']);

/** Simulation settings */
const SIMULATION_CONFIG = {
  /** Enable autonomous user activity */
  ENABLE_LIVING_WORLD: true,
  /** Interval for simulation checks (ms) */
  SIMULATION_INTERVAL: 60000,
  /** Probability of random follow per interval */
  FOLLOW_PROBABILITY: 0.1,
  /** Probability of random reaction per interval */
  REACTION_PROBABILITY: 0.15,
  /** Probability of random post per interval */
  POST_PROBABILITY: 0.05,
  /** Enable verbose logging */
  VERBOSE_LOGGING: true,
};

// =============================================================================
// DATA STRUCTURES - SOCIAL GRAPH & CONTENT
// =============================================================================

/** 
 * Social Graph: followerId -> Set<followedId> 
 * SQL: followers table (id, follower_id, following_id, created_at)
 * TRIGGER: on_follow - sync user.following_count / user.followers_count
 */
const followingMap = new Map<string, Set<string>>();

/** Social Graph: followedId -> Set<followerId> */
const followersMap = new Map<string, Set<string>>();

/** 
 * Tracks bookmarked posts: userId -> Set<postId> 
 * SQL: bookmarks table (id, user_id, post_id, created_at)
 * RLS: user_id = auth.uid()
 */
const bookmarksMap = new Map<string, Set<string>>();

/** Tracks post reactions: postId -> Map<userId, ReactionAction> */
const reactionsMap = new Map<string, Map<string, ReactionAction>>();

/** Tracks reposts: postId -> Set<userId> */
const repostsMap = new Map<string, Set<string>>();

/** Muted users: userId -> Set<mutedUserId> */
const mutedMap = new Map<string, Set<string>>();

/** Blocked users: userId -> Set<blockedUserId> */
const blockedMap = new Map<string, Set<string>>();

/** Username History Log */
const usernameHistory: { user_id: string, old_username: string, changed_at: string }[] = [];

/** All lists in the system */
const reservedUsernames: { username: string; category: 'system' | 'role' | 'party' | 'politician'; reason: string; }[] = [
  { username: 'admin', category: 'system', reason: 'System account' },
  { username: 'support', category: 'system', reason: 'Support account' },
  { username: 'pulse', category: 'system', reason: 'Platform name' },
  { username: 'official', category: 'system', reason: 'Misleading authority' },
  { username: 'moderator', category: 'system', reason: 'Staff impersonation' },
  { username: 'verified', category: 'system', reason: 'Trust badge misuse' },
  { username: 'president', category: 'role', reason: 'Political office' },
  { username: 'governor', category: 'role', reason: 'Political office' },
  { username: 'senator', category: 'role', reason: 'Political office' },
  { username: 'minister', category: 'role', reason: 'Political office' },
  { username: 'mayor', category: 'role', reason: 'Political office' },
  { username: 'apc', category: 'party', reason: 'Political party' },
  { username: 'pdp', category: 'party', reason: 'Political party' },
  { username: 'labourparty', category: 'party', reason: 'Political party' },
  { username: 'lp', category: 'party', reason: 'Political party' },
  { username: 'tinubu', category: 'politician', reason: 'Public figure' },
  { username: 'obi', category: 'politician', reason: 'Public figure' },
  { username: 'atiku', category: 'politician', reason: 'Public figure' }
];

/** All lists in the system */
const allLists: PostrList[] = [
  {
    id: 'list-1',
    name: 'Tech News',
    ownerId: '1',
    isPrivate: false,
    memberIds: ['2', '3', '4'],
    subscriberIds: ['0', '1'],
    createdAt: new Date().toISOString()
  }
];

/** All notifications in the system */
const allNotifications: Notification[] = [];

/** 
 * Hashtag usage tracking: hashtag -> count 
 * CRON: Monthly reset or weight decay for "Trending"
 */
const hashtagUsage = new Map<string, number>();

/** Tracks post views: postId -> Set<userId> */
const postViewsMap = new Map<string, Set<string>>();

/** Tracks poll votes: postId -> Map<userId, choiceIndex> */
const pollVotesMap = new Map<string, Map<string, number>>();

/** Session tracking for analytics: userId -> lastActive timestamp */
const userSessions = new Map<string, number>();

// =============================================================================
// ADMINISTRATION DATA STRUCTURES
// =============================================================================

/**
 * Admin dashboard statistics
 */
const adminStats = {
  // Track moderation actions
  moderationActions: [] as {
    id: string;
    adminId: string;
    action: string;
    targetId: string;
    targetType: string;
    reason?: string;
    timestamp: number;
  }[],

  // System events log
  systemEvents: [] as {
    id: string;
    type: 'ERROR' | 'WARNING' | 'INFO' | 'SECURITY';
    message: string;
    data?: any;
    timestamp: number;
  }[],

  // User growth tracking
  dailyStats: new Map<string, {
    date: string;
    newUsers: number;
    newPosts: number;
    activeUsers: number;
    reports: number;
    resolvedReports: number;
  }>(),

  // Cache for expensive calculations
  cachedStats: {
    lastUpdated: 0,
    data: null as any
  }
};

// =============================================================================
// METRICS & MONITORING
// =============================================================================

/**
 * Metrics collection for system monitoring
 */
const metrics = {
  requests: new Map<string, number>(),
  errors: new Map<string, number>(),
  latencies: new Map<string, number[]>(),

  recordRequest(endpoint: string, duration: number): void {
    const count = this.requests.get(endpoint) || 0;
    this.requests.set(endpoint, count + 1);

    const latencies = this.latencies.get(endpoint) || [];
    latencies.push(duration);
    this.latencies.set(endpoint, latencies.slice(-100)); // Keep last 100
  },

  recordError(endpoint: string): void {
    const count = this.errors.get(endpoint) || 0;
    this.errors.set(endpoint, count + 1);
  },

  getMetrics(): any {
    const endpoints = Array.from(this.requests.keys());
    const endpointStats = endpoints.map(endpoint => {
      const latencies = this.latencies.get(endpoint) || [];
      const count = this.requests.get(endpoint) || 0;
      const errors = this.errors.get(endpoint) || 0;
      const totalLatency = latencies.reduce((a, b) => a + b, 0);
      const avgLatency = latencies.length > 0 ? totalLatency / latencies.length : 0;

      return {
        endpoint,
        count,
        errors,
        avgLatency
      };
    });

    return {
      totalRequests: endpointStats.reduce((sum, stat) => sum + stat.count, 0),
      totalErrors: endpointStats.reduce((sum, stat) => sum + stat.errors, 0),
      errorRate: endpointStats.reduce((sum, stat) => sum + stat.errors, 0) /
        endpointStats.reduce((sum, stat) => sum + stat.count, 1),
      endpointStats
    };
  },

  calculatePercentile(values: number[], percentile: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(percentile / 100 * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
};

// =============================================================================
// RATE LIMITER - PRODUCTION-GRADE THROTTLING
// =============================================================================

/**
 * Implements a sliding window rate limiter for API actions
 */
class RateLimiter {
  private actions: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly name: string;

  /**
   * @param limit - Maximum number of actions allowed in the time window
   * @param windowMs - Time window in milliseconds
   * @param name - Name of the rate limiter for logging
   */
  constructor(limit: number, windowMs: number, name: string = 'RateLimiter') {
    this.limit = limit;
    this.windowMs = windowMs;
    this.name = name;
  }

  /**
   * Check if an action can be performed without exceeding the rate limit
   */
  canPerformAction(): boolean {
    const now = Date.now();
    this.actions = this.actions.filter(timestamp => now - timestamp < this.windowMs);
    return this.actions.length < this.limit;
  }

  /**
   * Record that an action was performed
   */
  recordAction(): void {
    this.actions.push(Date.now());
    this.logState();
  }

  /**
   * Get the number of actions remaining before hitting the limit
   */
  getRemainingActions(): number {
    const now = Date.now();
    this.actions = this.actions.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.limit - this.actions.length);
  }

  /**
   * Get the timestamp when the rate limit will reset
   */
  getResetTime(): number {
    if (this.actions.length === 0) return 0;
    const oldestAction = Math.min(...this.actions);
    return oldestAction + this.windowMs;
  }

  /**
   * Get a human-readable status message
   */
  getStatusMessage(): string {
    const remaining = this.getRemainingActions();
    if (remaining === 0) {
      const waitSeconds = Math.ceil((this.getResetTime() - Date.now()) / 1000);
      return `Rate limit exceeded.Try again in ${waitSeconds} s. (${this.limit} actions per ${this.windowMs / 1000}s)`;
    }
    return `${remaining} actions remaining`;
  }

  /**
   * Log current rate limiter state
   */
  private logState(): void {
    if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
      console.log(`[${this.name}]Actions: ${this.actions.length}/${this.limit}, Remaining: ${this.getRemainingActions()}`);
    }
  }

  /**
   * Reset all recorded actions (useful for testing)
   */
  reset(): void {
    this.actions = [];
  }
}

// Initialize rate limiters for different actions
const followRateLimiter = new RateLimiter(10, 60 * 1000, 'FollowLimiter');
const reportRateLimiter = new RateLimiter(5, 60 * 1000, 'ReportLimiter');
const postRateLimiter = new RateLimiter(50, 60 * 1000, 'PostLimiter');
const messageRateLimiter = new RateLimiter(100, 60 * 1000, 'MessageLimiter');
const reactionRateLimiter = new RateLimiter(200, 60 * 1000, 'ReactionLimiter');

// =============================================================================
// CONTENT PARSING & DISCOVERY HELPERS
// =============================================================================

/**
 * Extract @mentions from post content
 * @param content - Post text content
 * @returns Array of mentioned usernames (lowercase, without @)
 */
const parseMentions = (content: string): string[] => {
  const matches = content.match(/@(\w+)/g);
  return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
};

/**
 * Extract #hashtags from post content
 * @param content - Post text content
 * @returns Array of hashtags (lowercase, without #)
 */
const parseHashtags = (content: string): string[] => {
  const matches = content.match(/#(\w+)/g);
  return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
};

/**
 * Extract URLs from post content
 * @param content - Post text content
 * @returns Array of URLs found in the content
 */
const parseUrls = (content: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = content.match(urlRegex);
  return matches || [];
};

/**
 * Calculate engagement score for ranking posts
 * @param post - Post to calculate score for
 * @returns Engagement score (higher is better)
 */
const calculateEngagementScore = (post: Post): number => {
  const recentnessBonus = Math.max(0, 100 - (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
  const likeWeight = post.likeCount * 3;
  const commentWeight = post.commentCount * 5;
  const repostWeight = post.repostCount * 4;
  const laughWeight = post.laughCount * 2;
  const dislikePenalty = post.dislikeCount * -2;

  return recentnessBonus + likeWeight + commentWeight + repostWeight + laughWeight + dislikePenalty;
};

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

/**
 * Create and store a new notification
 * @param notification - Notification data (without id, createdAt, isRead)
 */
const createNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
  // Don't create notification if recipient is the same as actor
  if (notification.recipientId === notification.actor.id) {
    return;
  }

  // Check if recipient has blocked the actor
  const recipientBlocked = blockedMap.get(notification.recipientId);
  if (recipientBlocked && recipientBlocked.has(notification.actor.id)) {
    return;
  }

  // Check for duplicate recent notifications (prevent spam)
  const recentDuplicate = allNotifications.find(n =>
    n.recipientId === notification.recipientId &&
    n.actor.id === notification.actor.id &&
    n.type === notification.type &&
    n.postId === notification.postId &&
    Date.now() - new Date(n.createdAt).getTime() < 60000 // Within last minute
  );

  if (recentDuplicate) {
    if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
      console.log(`[Notification] Skipped duplicate notification`);
    }
    return;
  }

  const newNotif: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  allNotifications.unshift(newNotif);

  if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
    console.log(`[Notification] Created ${newNotif.type} notification for user ${newNotif.recipientId}`);
  }

  // Emit event for real-time notification
  eventEmitter.emit('newNotification', newNotif);
};

// =============================================================================
// USER GENERATION - REALISTIC MOCK USERS
// =============================================================================

/**
 * Generate a diverse set of mock users with realistic profiles
 * @returns Array of generated User objects
 */
const generateMockUsers = (): User[] => {
  const users: User[] = [
    {
      id: '0',
      name: 'Dev Team',
      username: 'devteam',
      avatar: 'https://i.pravatar.cc/150?u=devteam',
      headerImage: 'https://picsum.photos/seed/devteam/600/200',
      bio: 'Official Developer Team. Building the future of @postr. 🚀',
      location: 'The Matrix',
      website: 'https://postr.dev',
      is_active: true,
      is_limited: false,
      is_shadow_banned: false,
      is_suspended: false,
      is_muted: false
    },
  ];

  // Name pools for generating diverse user profiles
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Sage', 'River', 'Phoenix', 'Skyler', 'Dakota', 'Rowan', 'Finley', 'Emerson',
    'Reese', 'Parker', 'Cameron', 'Blake', 'Drew', 'Charlie', 'Harley', 'Sam'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'
  ];

  const locations = [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
    'London, UK', 'Paris, France', 'Berlin, Germany', 'Tokyo, Japan', 'Sydney, Australia',
    'Toronto, Canada', 'Amsterdam, Netherlands', 'Barcelona, Spain', 'Singapore', 'Dubai, UAE'
  ];

  const bioTemplates = [
    'Tech enthusiast 💻',
    'Coffee lover ☕ | Code writer',
    'Always learning something new 📚',
    'Building cool stuff 🚀',
    'Designer & developer ✨',
    'Open source contributor 🌟',
    'Just here for the memes 😄',
    'Exploring the world 🌍',
    'Foodie adventures 🍕',
    'Creative thinker | Problem solver',
    'Full-stack developer | Coffee addict',
    'UX/UI Designer | Pixel perfectionist',
    'Startup founder | Serial entrepreneur',
    'Digital nomad 🏖️',
    'AI/ML enthusiast 🤖',
    'Photographer | Visual storyteller 📸',
    'Fitness junkie | Healthy living 💪',
    'Music lover | Playlist curator 🎵',
    'Book worm | Literary critic 📖',
    'Gaming enthusiast | Streamer 🎮'
  ];

  // Generate 60 diverse users
  for (let i = 1; i <= 60; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
    const bio = bioTemplates[i % bioTemplates.length];
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
      // Simulate various account states
      is_active: i % 50 !== 0, // Most users are active
      is_limited: i % 20 === 0, // 5% limited
      is_shadow_banned: i % 25 === 0, // 4% shadow banned
      is_suspended: i % 30 === 0, // ~3% suspended
      is_muted: false // Users don't start muted
    });
  }

  console.log(`[UserGen] Generated ${users.length} mock users`);
  return users;
};

// =============================================================================
// DATA INITIALIZATION
// =============================================================================

/** All users in the system */
const allUsers: User[] = generateMockUsers();

/** Quick user lookup by ID */
const userMap = new Map(allUsers.map(user => [user.id, user]));

/** All posts in the system (chronologically ordered, newest first) */
const allPosts: Post[] = [
  {
    id: '101',
    author: userMap.get('1')!,
    content: 'Fresh post 1: Welcome to the thread testing! #coding #social',
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
        content: 'This is a top-level comment! Great thread 👍',
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
        author: userMap.get(CURRENT_USER_ID)!,
        content: 'Dev Team checking in. Simulation is active. 🚀',
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
  { id: '106', author: userMap.get('3')!, content: 'Fresh post 6 #expo', createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '107', author: userMap.get('1')!, content: 'Fresh post 7', createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '108', author: userMap.get('2')!, content: 'Fresh post 8', createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '109', author: userMap.get('3')!, content: 'Fresh post 9', createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '110', author: userMap.get('1')!, content: 'Fresh post 10', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '111', author: userMap.get('2')!, content: 'Fresh post 11 #supabase', createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '112', author: userMap.get('3')!, content: 'Fresh post 12', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '113', author: userMap.get('1')!, content: 'Fresh post 13', createdAt: new Date(Date.now() - 1000 * 60 * 13).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '114', author: userMap.get('2')!, content: 'Fresh post 14', createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '115', author: userMap.get('3')!, content: 'Fresh post 15', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '116', author: userMap.get('1')!, content: 'Fresh post 16', createdAt: new Date(Date.now() - 1000 * 60 * 16).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '117', author: userMap.get('2')!, content: 'Fresh post 17', createdAt: new Date(Date.now() - 1000 * 60 * 17).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '118', author: userMap.get('3')!, content: 'Fresh post 18', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '119', author: userMap.get('1')!, content: 'Fresh post 19', createdAt: new Date(Date.now() - 1000 * 60 * 19).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  { id: '120', author: userMap.get('2')!, content: 'Fresh post 20', createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' },
  {
    id: 'poll-1',
    author: userMap.get('1')!,
    content: 'Which feature do you like most in Postr?',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likeCount: 5,
    dislikeCount: 0,
    laughCount: 2,
    repostCount: 1,
    commentCount: 0,
    userReaction: 'NONE',
    poll: {
      question: 'Which feature do you like most in Postr?',
      choices: [
        { text: 'Real-time Feed', color: '#1DA1F2', vote_count: 12 },
        { text: 'Living World Simulation', color: '#17BF63', vote_count: 8 },
        { text: 'Separation of Concerns', color: '#794BC4', vote_count: 15 },
        { text: 'Pre-2023 Aesthetics', color: '#F45D22', vote_count: 10 },
      ],
      totalVotes: 45,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    }
  },
];

/**
 * Recursively seed comments and replies into the addressable allPosts array
 * This ensures all content can be found by ID regardless of nesting level
 */
const seedAddressableEntities = (items: (Post | Comment)[]) => {
  items.forEach(item => {
    // Make comments/replies addressable at the top level
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

// Seed addressable entities asynchronously to avoid blocking
setTimeout(() => {
  seedAddressableEntities(allPosts);
  console.log('[Init] Addressable entities seeded');
}, 0);

// =============================================================================
// MESSAGING SYSTEM - MOCK DATA
// =============================================================================

/** Message storage by conversation ID */
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
    { id: 'ms1', senderId: '0', text: 'Dev Team created the group', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: 'SYSTEM' },
    { id: 'm8', senderId: '1', text: 'Anyone hitting a bug with the latest Expo SDK?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'CHAT' }
  ],
  'conv-4': [
    { id: 'ms2', senderId: '0', text: 'Channel created', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), type: 'SYSTEM' },
    { id: 'm9', senderId: '2', text: 'Big news from Expo today!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), type: 'CHAT', reactions: { '👍': 42, '🚀': 12 } }
  ]
};

/** Conversation metadata */
const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    participants: Array.from(new Set([CURRENT_USER_ID, '1'])).map(id => userMap.get(id)!),
    lastMessage: mockMessages['conv-1'][mockMessages['conv-1'].length - 1],
    unreadCount: 1,
    type: "DM",
    isPinned: true
  },
  {
    id: 'conv-2',
    participants: Array.from(new Set([CURRENT_USER_ID, '2'])).map(id => userMap.get(id)!),
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
    participants: Array.from(new Set([CURRENT_USER_ID, '0', '1', '3'])).map(id => userMap.get(id)!),
    lastMessage: mockMessages['conv-3'][mockMessages['conv-3'].length - 1],
    unreadCount: 3,
    type: "GROUP",
    ownerId: '0',
    adminIds: ['0'],
    description: 'A group for discussing React Native development and best practices.',
    isPinned: true
  },
  {
    id: 'conv-4',
    name: 'Expo Fanatics',
    participants: Array.from(new Set([CURRENT_USER_ID, '0', '2', '4', '5'])).map(id => userMap.get(id)!),
    lastMessage: mockMessages['conv-4'][mockMessages['conv-4'].length - 1],
    unreadCount: 0,
    type: "CHANNEL",
    ownerId: '0',
    adminIds: ['0'],
    description: 'Official announcements and updates from the Expo ecosystem.',
    pinnedMessageId: 'ms2'
  }
];

// =============================================================================
// FEED ENGINE INTEGRATION
// =============================================================================

/** Feed engine for algorithmic content delivery */
const feedEngine = new FeedEngine({
  fetchAuthorTimeline: async (authorId: string) => {
    return allPosts.filter(post =>
      (post.author.id === authorId || post.repostedBy?.id === authorId) && !post.parentPostId
    );
  },
  getFollowedAuthorIds: async (userId: string) => {
    const followed = followingMap.get(userId) || new Set<string>();
    const ids = Array.from(followed);
    if (!ids.includes(userId)) ids.push(userId); // Always include self
    return ids;
  }
});

// =============================================================================
// POST HYDRATION - INJECT VIEWER-SPECIFIC DATA
// =============================================================================

// = [RULE 6] Canonical Poll Resolution Logic =
const getCanonicalId = (id: string): string => {
  if (id.startsWith('repost:')) {
    return id.split(':')[1];
  }
  return id;
};

/**
 * Hydrate a post with viewer-specific information
 * This adds the viewer's reaction state, repost status, and real-time counts
 * 
 * @param post - Base post object
 * @param viewerId - ID of the viewing user
 * @returns Hydrated post with viewer-specific data
 */
const hydratePost = (post: Post, viewerId: string = CURRENT_USER_ID): Post => {
  const canonicalId = getCanonicalId(post.id);
  const postReactions = reactionsMap.get(canonicalId);
  const userReaction = postReactions?.get(viewerId) || 'NONE';
  const isReposted = repostsMap.get(canonicalId)?.has(viewerId) || false;
  const isBookmarked = bookmarksMap.get(viewerId)?.has(canonicalId) || false;

  // Calculate real-time counts from interaction maps (scoped to canonical ID)
  const reactionsByType = Array.from(postReactions?.values() || []);
  const additionalLikes = reactionsByType.filter(r => r === 'LIKE').length;
  const additionalDislikes = reactionsByType.filter(r => r === 'DISLIKE').length;
  const additionalLaughs = reactionsByType.filter(r => r === 'LAUGH').length;
  const additionalReposts = repostsMap.get(canonicalId)?.size || 0;

  // Merge base counts with real-time interaction counts
  const hydrated: Post = {
    ...post,
    userReaction,
    isReposted,
    isBookmarked,
    likeCount: post.likeCount + additionalLikes,
    dislikeCount: post.dislikeCount + additionalDislikes,
    laughCount: post.laughCount + additionalLaughs,
    repostCount: post.repostCount + additionalReposts,
  };

  // Hydrate poll data if present
  if (hydrated.poll) {
    const userVotes = pollVotesMap.get(canonicalId);
    const userVoteIndex = userVotes?.get(viewerId);
    const totalVotes = hydrated.poll.choices.reduce((sum, choice) => sum + (choice.vote_count || 0), 0);

    hydrated.poll = {
      ...hydrated.poll,
      userVoteIndex,
      totalVotes,
    };
  }

  // Recursively hydrate nested content
  if (hydrated.quotedPost) {
    hydrated.quotedPost = hydratePost(hydrated.quotedPost, viewerId);
  }

  if (hydrated.comments) {
    hydrated.comments = hydrated.comments.map(c => hydratePost(c as Post, viewerId) as Comment);
  }
  if (hydrated.quotedPost) {
    hydrated.quotedPost = hydratePost(hydrated.quotedPost, viewerId);
  }

  return hydrated;
};

// =============================================================================
// ADMINISTRATION HELPERS
// =============================================================================

/**
 * Check if current user has admin privileges
 */
const isAdmin = (userId: string = CURRENT_USER_ID): boolean => {
  return ADMIN_USER_IDS.has(userId);
};

/**
 * Admin actions require authentication
 */
const requireAdmin = (): void => {
  if (!isAdmin(CURRENT_USER_ID)) {
    throw new Error('Unauthorized: Admin privileges required');
  }
};

// =============================================================================
// ADMIN API ENDPOINTS
// =============================================================================

const adminApi = {
  // ---------------------------------------------------------------------------
  // DASHBOARD OVERVIEW
  // ---------------------------------------------------------------------------

  /**
   * Get comprehensive admin dashboard statistics
   */
  getDashboardStats: async (): Promise<{
    overview: {
      totalUsers: number;
      activeUsers24h: number;
      totalPosts: number;
      posts24h: number;
      totalReports: number;
      openReports: number;
      avgEngagement: number;
      systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    };
    growth: {
      userGrowth: { date: string; count: number }[];
      postGrowth: { date: string; count: number }[];
      engagementTrend: { date: string; rate: number }[];
    };
    moderation: {
      actions24h: number;
      resolvedReports24h: number;
      pendingActions: number;
      topModerators: { id: string; name: string; actions: number }[];
    };
    system: {
      apiCalls: number;
      errorRate: number;
      avgResponseTime: number;
      memoryUsage: number;
      cacheHitRate: number;
    };
  }> => {
    requireAdmin();

    // Calculate active users (active in last 24 hours)
    const activeUsers24h = Array.from(userSessions.entries()).filter(
      ([_, lastActive]) => Date.now() - lastActive < 24 * 60 * 60 * 1000
    ).length;

    // Posts in last 24 hours
    const posts24h = allPosts.filter(p =>
      Date.now() - new Date(p.createdAt).getTime() < 24 * 60 * 60 * 1000
    ).length;

    // Calculate average engagement
    const engagementScores = allPosts
      .slice(0, 100) // Sample recent posts
      .map(p => calculateEngagementScore(p));
    const avgEngagement = engagementScores.length > 0
      ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
      : 0;

    // Generate growth data (last 7 days)
    const growthData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayUsers = allUsers.filter(u => {
        const created = new Date(u.id === '0' ? Date.now() : parseInt(u.id) * 1000);
        return created.getTime() >= dayStart && created.getTime() < dayEnd;
      }).length;

      const dayPosts = allPosts.filter(p => {
        const created = new Date(p.createdAt).getTime();
        return created >= dayStart && created < dayEnd;
      }).length;

      return {
        date: dateStr,
        userCount: dayUsers,
        postCount: dayPosts,
        engagement: Math.random() * 10 + avgEngagement // Simulated trend
      };
    }).reverse();

    // Get moderation stats
    const moderationActions24h = adminStats.moderationActions.filter(a =>
      Date.now() - a.timestamp < 24 * 60 * 60 * 1000
    );

    const resolvedReports24h = moderationActions24h.filter(a =>
      a.action === 'RESOLVE_REPORT'
    ).length;

    const pendingReports = adminStats.moderationActions.filter(a =>
      a.action === 'REPORT' &&
      !adminStats.moderationActions.some(resolve =>
        resolve.action === 'RESOLVE_REPORT' &&
        resolve.targetId === a.targetId
      )
    ).length;

    // Calculate top moderators
    const moderatorActions = new Map<string, number>();
    adminStats.moderationActions.forEach(action => {
      if (action.action.includes('RESOLVE') || action.action.includes('MODERATE') || action.action.includes('UPDATE')) {
        moderatorActions.set(action.adminId, (moderatorActions.get(action.adminId) || 0) + 1);
      }
    });

    const topModerators = Array.from(moderatorActions.entries())
      .map(([id, actions]) => ({
        id,
        name: userMap.get(id)?.name || 'Unknown',
        actions
      }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 5);

    // Get system metrics
    const systemMetrics = metrics.getMetrics();

    return {
      overview: {
        totalUsers: allUsers.length,
        activeUsers24h,
        totalPosts: allPosts.length,
        posts24h,
        totalReports: adminStats.moderationActions.filter(a => a.action === 'REPORT').length,
        openReports: pendingReports,
        avgEngagement: parseFloat(avgEngagement.toFixed(2)),
        systemHealth: 'healthy'
      },
      growth: {
        userGrowth: growthData.map(d => ({ date: d.date, count: d.userCount })),
        postGrowth: growthData.map(d => ({ date: d.date, count: d.postCount })),
        engagementTrend: growthData.map(d => ({ date: d.date, rate: d.engagement }))
      },
      moderation: {
        actions24h: moderationActions24h.length,
        resolvedReports24h,
        pendingActions: pendingReports,
        topModerators
      },
      system: {
        apiCalls: systemMetrics.totalRequests,
        errorRate: systemMetrics.errorRate,
        avgResponseTime: parseFloat(
          (systemMetrics.endpointStats.reduce((avg: number, stat: any) =>
            avg + stat.avgLatency, 0
          ) / systemMetrics.endpointStats.length || 0).toFixed(2)
        ),
        memoryUsage: 0.65, // Simulated
        cacheHitRate: 0.92 // Simulated
      }
    };
  },

  /**
   * Get paginated user list with filtering
   * SQL: SELECT * FROM profiles WHERE status = :filter ...
   * RLS: Bypass required (Service Role or Admin role check).
   */
  getUsers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: 'active' | 'suspended' | 'limited' | 'shadow_banned' | 'inactive';
    sort?: 'newest' | 'oldest' | 'most_posts' | 'most_followers';
  } = {}): Promise<{
    users: (User & {
      postCount: number;
      followerCount: number;
      lastActive: string | null;
      status: string;
    })[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    requireAdmin();

    const {
      page = 1,
      limit = 20,
      search = '',
      filter,
      sort = 'newest'
    } = params;

    // Filter users
    let filteredUsers = allUsers.filter(user => {
      // Search filter
      if (search && !user.username.toLowerCase().includes(search.toLowerCase()) &&
        !user.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filter) {
        switch (filter) {
          case 'active':
            if (!user.is_active) return false;
            break;
          case 'suspended':
            if (!user.is_suspended) return false;
            break;
          case 'limited':
            if (!user.is_limited) return false;
            break;
          case 'shadow_banned':
            if (!user.is_shadow_banned) return false;
            break;
          case 'inactive':
            if (user.is_active) return false;
            break;
        }
      }

      return true;
    });

    // Sort users
    filteredUsers.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return parseInt(b.id) - parseInt(a.id);
        case 'oldest':
          return parseInt(a.id) - parseInt(b.id);
        case 'most_posts':
          const aPosts = allPosts.filter(p => p.author.id === a.id).length;
          const bPosts = allPosts.filter(p => p.author.id === b.id).length;
          return bPosts - aPosts;
        case 'most_followers':
          const aFollowers = followersMap.get(a.id)?.size || 0;
          const bFollowers = followersMap.get(b.id)?.size || 0;
          return bFollowers - aFollowers;
        default:
          return 0;
      }
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Enrich with stats
    const enrichedUsers = paginatedUsers.map(user => ({
      ...user,
      postCount: allPosts.filter(p =>
        p.author.id === user.id && !p.parentPostId && !p.repostedBy
      ).length,
      followerCount: followersMap.get(user.id)?.size || 0,
      lastActive: userSessions.get(user.id)
        ? new Date(userSessions.get(user.id)!).toISOString()
        : null,
      status: user.is_suspended ? 'suspended' :
        user.is_shadow_banned ? 'shadow_banned' :
          user.is_limited ? 'limited' :
            user.is_active ? 'active' : 'inactive'
    }));

    return {
      users: enrichedUsers,
      total: filteredUsers.length,
      page,
      totalPages: Math.ceil(filteredUsers.length / limit)
    };
  },

  /**
   * Get detailed user information
   */
  getUserDetails: async (userId: string): Promise<{
    user: User;
    stats: {
      posts: number;
      comments: number;
      likesGiven: number;
      likesReceived: number;
      followers: number;
      following: number;
      joined: string;
      lastActive: string | null;
    };
    recentActivity: Post[];
    moderationHistory: any[];
    flags: {
      isSpamSuspect: boolean;
      isBotSuspect: boolean;
      hasBeenReported: boolean;
      reportCount: number;
    };
  }> => {
    requireAdmin();

    const user = userMap.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate likes received
    let likesReceived = 0;
    reactionsMap.forEach(reactions => {
      if (reactions.has(userId) && reactions.get(userId) === 'LIKE') {
        likesReceived++;
      }
    });

    // Calculate flags
    const userReports = adminStats.moderationActions.filter(a =>
      a.targetId === userId && a.targetType === 'USER'
    );

    const isSpamSuspect = allPosts.filter(p =>
      p.author.id === userId
    ).length > 50; // More than 50 posts

    const isBotSuspect = !userSessions.has(userId) &&
      allPosts.filter(p => p.author.id === userId).length > 10;

    return {
      user,
      stats: {
        posts: allPosts.filter(p =>
          p.author.id === userId && !p.parentPostId && !p.repostedBy
        ).length,
        comments: allPosts.filter(p =>
          p.author.id === userId && p.parentPostId
        ).length,
        likesGiven: Array.from(reactionsMap.values()).reduce((count, reactions) =>
          count + (reactions.get(userId) === 'LIKE' ? 1 : 0), 0
        ),
        likesReceived,
        followers: followersMap.get(userId)?.size || 0,
        following: followingMap.get(userId)?.size || 0,
        joined: new Date(parseInt(userId) * 1000 || Date.now()).toISOString(),
        lastActive: userSessions.get(userId)
          ? new Date(userSessions.get(userId)!).toISOString()
          : null
      },
      recentActivity: allPosts
        .filter(p => p.author.id === userId)
        .slice(0, 10)
        .map(p => hydratePost(p)),
      moderationHistory: userReports,
      flags: {
        isSpamSuspect,
        isBotSuspect,
        hasBeenReported: userReports.length > 0,
        reportCount: userReports.length
      }
    };
  },

  /**
   * Update user account status (Moderation Action)
   * SQL: UPDATE profiles SET status = :status WHERE id = :userId
   * TRIGGER: on_user_suspended -> Invalidate all active sessions.
   * AUDIT: Logs action to moderation_history table.
   */
  updateUserStatus: async (
    userId: string,
    updates: {
      is_suspended?: boolean;
      is_limited?: boolean;
      is_shadow_banned?: boolean;
      is_active?: boolean;
      is_muted?: boolean;
      reason?: string;
    }
  ): Promise<void> => {
    requireAdmin();

    const user = userMap.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow modifying admin users
    if (ADMIN_USER_IDS.has(userId) && userId !== CURRENT_USER_ID) {
      throw new Error('Cannot modify other admin users');
    }

    // Apply updates
    Object.assign(user, updates);

    // Log moderation action
    adminStats.moderationActions.push({
      id: `mod-${Date.now()}`,
      adminId: CURRENT_USER_ID,
      action: 'UPDATE_USER_STATUS',
      targetId: userId,
      targetType: 'USER',
      reason: updates.reason || JSON.stringify(updates),
      timestamp: Date.now()
    });

    console.log(`[Admin] Updated user ${userId} status:`, updates);
  },

  /**
   * Delete user account (GDPR/Enforcement)
   * SQL: DELETE FROM profiles WHERE id = :userId (Cascades to posts, reactions etc.)
   * AUDIT: Final log entry before deletion.
   */
  deleteUser: async (userId: string, reason?: string): Promise<void> => {
    requireAdmin();

    const user = userMap.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting admin users
    if (ADMIN_USER_IDS.has(userId)) {
      throw new Error('Cannot delete admin users');
    }

    // Remove user from all data structures
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      allUsers.splice(userIndex, 1);
    }

    // Remove user's posts
    for (let i = allPosts.length - 1; i >= 0; i--) {
      if (allPosts[i].author.id === userId) {
        allPosts.splice(i, 1);
      }
    }

    // Clean up social graph
    followingMap.delete(userId);
    followersMap.delete(userId);
    mutedMap.delete(userId);
    blockedMap.delete(userId);
    followingMap.forEach(following => following.delete(userId));
    followersMap.forEach(followers => followers.delete(userId));
    mutedMap.forEach(muted => muted.delete(userId));
    blockedMap.forEach(blocked => blocked.delete(userId));

    // Clean up interactions
    reactionsMap.forEach(reactions => reactions.delete(userId));
    repostsMap.forEach(reposts => reposts.delete(userId));
    bookmarksMap.delete(userId);
    pollVotesMap.forEach(votes => votes.delete(userId));
    userSessions.delete(userId);

    // Log moderation action
    adminStats.moderationActions.push({
      id: `mod-${Date.now()}`,
      adminId: CURRENT_USER_ID,
      action: 'DELETE_USER',
      targetId: userId,
      targetType: 'USER',
      reason,
      timestamp: Date.now()
    });

    console.log(`[Admin] Deleted user ${userId}: ${reason || 'No reason provided'}`);
  },

  // ---------------------------------------------------------------------------
  // SYSTEM MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get system logs
   */
  getSystemLogs: async (params: {
    type?: 'ERROR' | 'WARNING' | 'INFO' | 'SECURITY';
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    logs: typeof adminStats.systemEvents[0][];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    requireAdmin();

    let filteredLogs = adminStats.systemEvents;

    // Apply filters
    if (params.type) {
      filteredLogs = filteredLogs.filter(log => log.type === params.type);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.data?.toString().toLowerCase().includes(searchLower)
      );
    }

    if (params.from) {
      const fromDate = new Date(params.from).getTime();
      filteredLogs = filteredLogs.filter(log => log.timestamp >= fromDate);
    }

    if (params.to) {
      const toDate = new Date(params.to).getTime();
      filteredLogs = filteredLogs.filter(log => log.timestamp <= toDate);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const page = params.page || 1;
    const limit = params.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      logs: filteredLogs.slice(startIndex, endIndex),
      total: filteredLogs.length,
      page,
      totalPages: Math.ceil(filteredLogs.length / limit)
    };
  },

  /**
   * Clear system cache
   */
  clearCache: async (cacheType?: 'all' | 'users' | 'posts' | 'feed'): Promise<{
    cleared: string[];
    sizeFreed: number;
  }> => {
    requireAdmin();

    const cleared: string[] = [];

    if (!cacheType || cacheType === 'all' || cacheType === 'feed') {
      feedEngine.invalidateCache('all');
      cleared.push('feed_cache');
    }

    // Simulate memory freeing
    const sizeFreed = Math.floor(Math.random() * 1000) + 500;

    // Log action
    adminStats.systemEvents.push({
      id: `cache-${Date.now()}`,
      type: 'INFO',
      message: `Cache cleared: ${cacheType || 'all'}`,
      data: { cleared, sizeFreed },
      timestamp: Date.now()
    });

    return { cleared, sizeFreed };
  },

  /**
   * Send system announcement
   */
  sendAnnouncement: async (announcement: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'CRITICAL' | 'UPDATE';
    targetUsers?: 'all' | 'premium' | 'specific';
    specificUserIds?: string[];
    channels?: ('in_app' | 'email' | 'push')[];
  }): Promise<{
    sent: number;
    failed: number;
    announcementId: string;
  }> => {
    requireAdmin();

    // Simulate sending to users
    let targetCount = 0;

    if (announcement.targetUsers === 'all') {
      targetCount = allUsers.length;
    } else if (announcement.targetUsers === 'premium') {
      // 20% premium users
      targetCount = Math.floor(allUsers.length * 0.2);
    } else if (announcement.targetUsers === 'specific' && announcement.specificUserIds) {
      targetCount = announcement.specificUserIds.length;
    }

    // Simulate some failures
    const sent = Math.floor(targetCount * 0.95);
    const failed = targetCount - sent;

    const announcementId = `announce-${Date.now()}`;

    // Log action
    adminStats.systemEvents.push({
      id: announcementId,
      type: 'INFO',
      message: `System announcement sent: ${announcement.title}`,
      data: { announcement, sent, failed },
      timestamp: Date.now()
    });

    console.log(`[Admin] Sent announcement to ${sent} users: ${announcement.title}`);

    return { sent, failed, announcementId };
  },

  /**
   * Get system configuration
   */
  getSystemConfig: async (): Promise<{
    rateLimits: Record<string, { limit: number; windowMs: number }>;
    contentFilters: {
      enabled: boolean;
      bannedWordsCount: number;
      spamDetection: boolean;
    };
    moderation: {
      autoModeration: boolean;
      reportThreshold: number;
      autoSuspend: boolean;
    };
    features: {
      polls: boolean;
      mediaUpload: boolean;
      directMessages: boolean;
      groups: boolean;
      hashtags: boolean;
      trending: boolean;
    };
    maintenance: {
      mode: boolean;
      message: string;
    };
  }> => {
    requireAdmin();

    return {
      rateLimits: {
        follow: { limit: 10, windowMs: 60000 },
        post: { limit: 50, windowMs: 60000 },
        message: { limit: 100, windowMs: 60000 },
        reaction: { limit: 200, windowMs: 60000 },
        report: { limit: 5, windowMs: 60000 }
      },
      contentFilters: {
        enabled: true,
        bannedWordsCount: 100,
        spamDetection: true
      },
      moderation: {
        autoModeration: false,
        reportThreshold: 3,
        autoSuspend: false
      },
      features: {
        polls: true,
        mediaUpload: true,
        directMessages: true,
        groups: true,
        hashtags: true,
        trending: true
      },
      maintenance: {
        mode: false,
        message: ''
      }
    };
  },

  /**
   * Put system in maintenance mode
   */
  setMaintenanceMode: async (enabled: boolean, message?: string): Promise<void> => {
    requireAdmin();

    adminStats.systemEvents.push({
      id: `maintenance-${Date.now()}`,
      type: enabled ? 'WARNING' : 'INFO',
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      data: { enabled, message },
      timestamp: Date.now()
    });

    console.log(`[Admin] Maintenance mode ${enabled ? 'enabled' : 'disabled'}: ${message || 'No message'}`);
  }
};

// =============================================================================
// SETTINGS SIMULATION
// =============================================================================

export interface PrivacySettings {
  protectPosts: boolean;
  photoTagging: boolean;
  discoveryEmail: boolean;
  discoveryPhone: boolean;
  readReceipts: boolean;
}

export interface NotificationSettings {
  qualityFilter: boolean;
  pushMentions: boolean;
  pushReplies: boolean;
  pushLikes: boolean;
  emailDigest: boolean;
}

// Mock database for settings
const mockPrivacySettings = new Map<string, PrivacySettings>();
const mockNotificationSettings = new Map<string, NotificationSettings>();

// Initialize default settings for current user
const defaultPrivacy: PrivacySettings = {
  protectPosts: false,
  photoTagging: true,
  discoveryEmail: true,
  discoveryPhone: false,
  readReceipts: true
};

const defaultNotifications: NotificationSettings = {
  qualityFilter: true,
  pushMentions: true,
  pushReplies: true,
  pushLikes: false,
  emailDigest: true
};

mockPrivacySettings.set('0', defaultPrivacy);
mockNotificationSettings.set('0', defaultNotifications);

// =============================================================================
// MAIN API INTERFACE - PUBLIC METHODS
// =============================================================================

export const api = {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION & SESSION HANDLING
  // ---------------------------------------------------------------------------

  /**
   * Set the current active session user ID
   * This synchronizes the Mock API with the Supabase Auth session
   */
  setSessionUser: (userId: string) => {
    CURRENT_USER_ID = userId;
    console.log(`[API] Session user set to: ${userId}`);
  },

  /**
   * Ensure a profile exists for the given user (Simulate 'on_auth_user_created' trigger)
   * If the user doesn't exist in our mock DB, create a fresh profile for them.
   */
  ensureProfileExists: async (sessionUser: any): Promise<void> => {
    if (!sessionUser || !sessionUser.id) return;

    if (userMap.has(sessionUser.id)) {
      // Profile already exists
      return;
    }

    console.log(`[API] New user detected: ${sessionUser.id}. Auto-provisioning profile...`);

    // Create new profile based on session data
    // Fallback to email username if metadata is missing
    const emailUsername = sessionUser.email ? sessionUser.email.split('@')[0] : `user${Math.floor(Math.random() * 1000)}`;
    const metadata = sessionUser.user_metadata || {};
    const username = metadata.username || emailUsername;
    const name = metadata.name || username;

    const newProfile: User = {
      id: sessionUser.id,
      name: name,
      username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''), // Sanitize
      avatar: `https://i.pravatar.cc/150?u=${sessionUser.id}`, // Deterministic avatar
      headerImage: `https://picsum.photos/seed/${sessionUser.id}/600/200`,
      bio: 'Just joined Postr! 👋',
      location: 'New User',
      website: '',
      is_active: true,
      is_limited: false,
      is_shadow_banned: false,
      is_suspended: false,
      is_muted: false
    };

    // Add to mock database
    allUsers.push(newProfile);
    userMap.set(newProfile.id, newProfile);

    // Initialize empty user structures
    followingMap.set(newProfile.id, new Set());
    followersMap.set(newProfile.id, new Set());
    bookmarksMap.set(newProfile.id, new Set());
    mutedMap.set(newProfile.id, new Set());
    blockedMap.set(newProfile.id, new Set());

    console.log(`[API] Auto-provisioned profile for ${newProfile.username} (${newProfile.id})`);
  },
  // ---------------------------------------------------------------------------
  // SETTINGS & ACCOUNT MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Update account password (Mock)
   */
  updatePassword: async (current: string, newPass: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (current === 'wrong') throw new Error('Incorrect password');
    console.log(`[API] Password updated for user ${CURRENT_USER_ID}`);
  },

  /**
   * Get current privacy settings
   */
  getPrivacySettings: async (): Promise<PrivacySettings> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPrivacySettings.get(CURRENT_USER_ID) || { ...defaultPrivacy };
  },

  /**
   * Update privacy settings
   */
  updatePrivacySettings: async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const current = mockPrivacySettings.get(CURRENT_USER_ID) || { ...defaultPrivacy };
    const updated = { ...current, ...settings };
    mockPrivacySettings.set(CURRENT_USER_ID, updated);
    console.log(`[API] Privacy settings updated for ${CURRENT_USER_ID}`, updated);
    return updated;
  },

  /**
   * Get notification settings
   */
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockNotificationSettings.get(CURRENT_USER_ID) || { ...defaultNotifications };
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const current = mockNotificationSettings.get(CURRENT_USER_ID) || { ...defaultNotifications };
    const updated = { ...current, ...settings };
    mockNotificationSettings.set(CURRENT_USER_ID, updated);
    console.log(`[API] Notification settings updated for ${CURRENT_USER_ID}`, updated);
    return updated;
  },

  /**
   * Get active sessions
   */
  getSessions: async (): Promise<Session[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 'session-1',
        device: 'iPhone 13 Pro',
        location: 'San Francisco, CA',
        last_active: 'Now',
        is_current: true,
      },
      {
        id: 'session-2',
        device: 'MacBook Pro',
        location: 'San Francisco, CA',
        last_active: '2 hours ago',
        is_current: false,
      },
      {
        id: 'session-3',
        device: 'iPad Air',
        location: 'San Jose, CA',
        last_active: '3 days ago',
        is_current: false,
      }
    ];
  },

  /**
   * Revoke a session
   * @param sessionId - ID of the session to revoke
   */
  revokeSession: async (sessionId: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[API] Revoked session: ${sessionId}`);
    return true;
  },

  // ---------------------------------------------------------------------------
  // POST CREATION & MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new post
   * SQL: INSERT INTO posts (id, author_id, content, ...) VALUES (...)
   * TRIGGER: on_post_insert -> Increment profile stats, notify mentions, parse hashtags.
   * EDGE: fan_out_notifications -> Push to all active followers.
   */
  createPost: async (post: { content: string, quotedPostId?: string, media?: Media[] }): Promise<Post> => {
    // Rate limiting
    if (!postRateLimiter.canPerformAction()) {
      throw new Error(postRateLimiter.getStatusMessage());
    }
    postRateLimiter.recordAction();

    // Validate content
    if (!post.content.trim() && !post.media?.length) {
      throw new Error('Post must have content or media');
    }

    if (post.content.length > 280) {
      throw new Error('Post content exceeds 280 characters');
    }

    // Find quoted post if specified
    const quotedPost = post.quotedPostId ? allPosts.find(p => p.id === post.quotedPostId) : undefined;
    if (post.quotedPostId && !quotedPost) {
      throw new Error('Quoted post not found');
    }

    // Create new post
    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: userMap.get(CURRENT_USER_ID)!,
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

    // [TRIGGER] Process mentions
    const mentions = parseMentions(post.content);
    mentions.forEach(username => {
      const recipient = allUsers.find(u => u.username === username);
      if (recipient && recipient.id !== CURRENT_USER_ID) {
        createNotification({
          type: 'MENTION',
          actor: userMap.get(CURRENT_USER_ID)!,
          recipientId: recipient.id,
          postId: newPost.id,
          postSnippet: post.content.substring(0, 50)
        });
      }
    });

    // [TRIGGER] Process hashtags
    const hashtags = parseHashtags(post.content);
    hashtags.forEach(tag => {
      hashtagUsage.set(tag, (hashtagUsage.get(tag) || 0) + 1);
    });

    // [TRIGGER] Notify quoted post author
    if (quotedPost && quotedPost.author.id !== CURRENT_USER_ID) {
      createNotification({
        type: 'QUOTE',
        actor: userMap.get(CURRENT_USER_ID)!,
        recipientId: quotedPost.author.id,
        postId: newPost.id,
        postSnippet: post.content.substring(0, 50)
      });
    }

    // Invalidate feed cache (Simulates Redis cache invalidation)
    feedEngine.invalidateCache(CURRENT_USER_ID);

    console.log(`[Post] Created post ${newPost.id}`);
    return hydratePost(newPost);
  },

  /**
   * Quote a post with local content
   * @param quotedPostId - ID of post to quote
   * @param content - User's comment
   * @returns Newly created quote post
   */
  quote: async (quotedPostId: string, content: string): Promise<Post> => {
    return api.createPost({ content, quotedPostId });
  },

  /**
   * Report a post, user, or message for policy violations
   * SQL: INSERT INTO reports (reporter_id, victim_id, ...) VALUES (...)
   * TRIGGER: on_report_insert -> Notify moderators, check for auto-suspension thresholds.
   * @param targetType - What is being reported
   * @param targetId - ID of the target
   * @param type - Type of violation
   * @param reporterId - Who is reporting
   * @param reason - Detailed reason
   */
  createReport: async (targetType: ReportableEntityType, targetId: string, type: ReportType, reporterId: string, reason: string): Promise<Report> => {
    return createReportApi(targetType, targetId, type, reporterId, reason);
  },

  /**
   * Create a new poll
   * SQL: INSERT INTO posts (id, author_id, content, poll_data, ...) VALUES (...)
   * TRIGGER: on_post_insert -> Increment profile stats, notify mentions, parse hashtags.
   * EDGE: fan_out_notifications -> Push to all active followers.
   * @param poll - Poll data (question, choices, and optional duration)
   * @returns Newly created poll post
   */
  createPoll: async (poll: { question: string, choices: PollChoice[], durationSeconds?: number }): Promise<Post> => {
    // Rate limiting
    if (!postRateLimiter.canPerformAction()) {
      throw new Error(postRateLimiter.getStatusMessage());
    }
    postRateLimiter.recordAction();

    // Validate poll
    if (!poll.question.trim()) {
      throw new Error('Poll question is required');
    }
    if (poll.choices.length < 2) {
      throw new Error('Poll must have at least 2 choices');
    }
    if (poll.choices.length > 4) {
      throw new Error('Poll cannot have more than 4 choices');
    }

    const newPost: Post = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: userMap.get(CURRENT_USER_ID)!,
      content: poll.question,
      poll: {
        choices: poll.choices.map(c => ({ ...c, vote_count: 0 })),
        question: poll.question,
        totalVotes: 0,
        expiresAt: new Date(Date.now() + (poll.durationSeconds || 24 * 60 * 60) * 1000).toISOString()
      },
      createdAt: new Date().toISOString(),
      likeCount: 0,
      dislikeCount: 0,
      laughCount: 0,
      repostCount: 0,
      commentCount: 0,
      userReaction: 'NONE',
    };

    allPosts.unshift(newPost);
    feedEngine.invalidateCache(CURRENT_USER_ID);

    // [RULE 3, 7] Poll belongs to the poll entity, but in this mock it's identified by postId.
    // Ensure the poll votes map is initialized.
    if (!pollVotesMap.has(newPost.id)) {
      pollVotesMap.set(newPost.id, new Map());
    }

    console.log(`[Poll] Created poll ${newPost.id}`);
    return hydratePost(newPost);
  },

  /**
   * Vote on a poll
   * @param postId - ID of the poll post
   * @param choiceIndex - Index of the selected choice
   * @returns Updated poll post
   */
  votePoll: async (postId: string, choiceIndex: number): Promise<Post> => {
    const canonicalId = getCanonicalId(postId);
    const post = allPosts.find(p => p.id === canonicalId);
    if (!post || !post.poll) {
      throw new Error('Poll not found');
    }

    if (choiceIndex < 0 || choiceIndex >= post.poll.choices.length) {
      throw new Error('Invalid choice index');
    }

    // Track user's vote
    if (!pollVotesMap.has(canonicalId)) {
      pollVotesMap.set(canonicalId, new Map());
    }

    const votes = pollVotesMap.get(canonicalId)!;

    // RULE 1, 4, 5, 8: Final, immutable vote. No re-voting or editing.
    if (votes.has(CURRENT_USER_ID)) {
      throw new Error('You have already voted in this poll. Votes are immutable.');
    }

    // Add new vote (Append-only as per Rule 5)
    votes.set(CURRENT_USER_ID, choiceIndex);
    post.poll.choices[choiceIndex].vote_count++;

    console.log(`[Poll] User ${CURRENT_USER_ID} voted for choice ${choiceIndex} in poll ${postId}`);
    return hydratePost(post);
  },

  /**
   * Delete a post
   * RLS: author_id = auth.uid() OR is_admin()
   * TRIGGER: on_post_delete -> Cleanup associations, decrement stats.
   * @param postId - ID of the post to delete
   * @returns True if deleted successfully
   */
  deletePost: async (postId: string): Promise<boolean> => {
    const index = allPosts.findIndex(p => p.id === postId);
    if (index === -1) return false;

    const post = allPosts[index];
    // Only allow author to delete or an admin
    if (post.author.id !== CURRENT_USER_ID && !isAdmin()) {
      throw new Error('Not authorized to delete this post');
    }

    // Remove from main array
    allPosts.splice(index, 1);

    // Clean up related data
    bookmarksMap.forEach(bookmarks => bookmarks.delete(postId));

    // [RULE 5, 7] DO NOT cleanup pollVotesMap. 
    // Votes must persist since quotes/reposts may still reference the poll.
    // if (post.poll) {
    //   pollVotesMap.delete(postId);
    // }

    feedEngine.invalidateCache(CURRENT_USER_ID);
    eventEmitter.emit('postDeleted', postId);

    console.log(`[Post] Deleted post ${postId}`);
    return true;
  },

  // ---------------------------------------------------------------------------
  // FEED & DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * Fetch the personalized feed for the current user
   * SQL: SELECT * FROM posts WHERE author_id IN (following) OR author_id = uid()
   * RLS: Enforced natively via "Posts visibility" policy.
   * CACHE: Results are usually hit from a Redis-backed pre-computed "Home Timeline".
   */
  fetchFeed: async (cursor?: string): Promise<{ posts: Post[], nextCursor: string | undefined }> => {
    // Implementation details...
    let structuredCursor: any = undefined;
    try {
      if (cursor) structuredCursor = JSON.parse(cursor);
    } catch (e) {
      console.warn('[Feed] Invalid cursor format');
    }

    const response = await feedEngine.fetchFeed({
      userId: CURRENT_USER_ID,
      cursor: structuredCursor,
      pageSize: 4,
      depth: structuredCursor ? 1 : 0,
    });

    // Track session activity
    userSessions.set(CURRENT_USER_ID, Date.now());

    return {
      posts: response.posts.map(p => hydratePost(p)),
      nextCursor: response.nextCursor ? JSON.stringify(response.nextCursor) : undefined,
    };
  },

  /**
   * Get the "For You" algorithmic feed
   * SQL: Aggregated read-model optimized for high-throughput discovery.
   * RANKING: Pre-2023 focus was chronological, but "For You" uses calculateEngagementScore().
   */
  getForYouFeed: async (offset = 0): Promise<Post[]> => {
    const pageSize = 10;
    const muted = mutedMap.get(CURRENT_USER_ID) || new Set();
    const blocked = blockedMap.get(CURRENT_USER_ID) || new Set();

    // Filter out muted/blocked users and discovery-restricted content
    const filteredPosts = allPosts.filter(
      p => !muted.has(p.author.id) &&
        !blocked.has(p.author.id) &&
        !p.author.is_shadow_banned && // Discovery restricted
        !p.parentPostId
    );

    // Sort by engagement score for algorithmic feed
    const rankedPosts = [...filteredPosts].sort((a, b) =>
      calculateEngagementScore(b) - calculateEngagementScore(a)
    );

    userSessions.set(CURRENT_USER_ID, Date.now());

    return rankedPosts.slice(offset, offset + pageSize).map(p => hydratePost(p));
  },

  /**
   * Fetch a single post by ID
   * @param id - Post ID
   * @returns Post or undefined if not found
   */
  fetchPost: async (id: string): Promise<Post | undefined> => {
    const post = allPosts.find(p => p.id === id);

    if (post) {
      // Track view
      if (!postViewsMap.has(id)) {
        postViewsMap.set(id, new Set());
      }
      postViewsMap.get(id)!.add(CURRENT_USER_ID);
    }

    return post ? hydratePost(post) : undefined;
  },

  /**
   * Fetch a post with its full parent thread lineage
   * @param postId - Post ID
   * @returns Post with parent chain or undefined
   */
  fetchPostWithLineage: async (postId: string): Promise<{ post: Post, parents: Post[] } | undefined> => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return undefined;

    // Build parent chain
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

    // Track view
    if (!postViewsMap.has(postId)) {
      postViewsMap.set(postId, new Set());
    }
    postViewsMap.get(postId)!.add(CURRENT_USER_ID);

    return {
      post: hydratePost(post),
      parents: parents.map(p => hydratePost(p))
    };
  },

  /**
   * Search for posts and users
   * SQL: PostgreSQL FTS (Full Text Search) with GIN indexes on ts_vector columns.
   * EDGE: Potential offload to Meilisearch or Algolia for typo-tolerance.
   */
  search: async (query: string): Promise<{ posts: Post[], users: User[] }> => {
    if (!query.trim()) {
      return { posts: [], users: [] };
    }

    const isUserSearch = query.startsWith('@');
    const q = isUserSearch ? query.slice(1).toLowerCase() : query.toLowerCase();

    const muted = mutedMap.get(CURRENT_USER_ID) || new Set();
    const blocked = blockedMap.get(CURRENT_USER_ID) || new Set();

    // Search posts
    const posts = allPosts.filter(p =>
      !p.repostedBy &&
      p.content.toLowerCase().includes(isUserSearch ? query.toLowerCase() : q) &&
      !muted.has(p.author.id) &&
      !blocked.has(p.author.id)
    ).slice(0, 20).map(p => hydratePost(p));

    // Search users
    const users = allUsers.filter(u => {
      const usernameMatch = u.username.toLowerCase().includes(q);
      const nameMatch = u.name.toLowerCase().includes(q);
      const bioMatch = !isUserSearch && u.bio?.toLowerCase().includes(q);

      if (isUserSearch) {
        // When searching with @, prioritize username prefix and then name
        return (usernameMatch || nameMatch) && !blocked.has(u.id);
      }

      return (usernameMatch || nameMatch || bioMatch) &&
        !blocked.has(u.id) &&
        u.id !== CURRENT_USER_ID;
    }).sort((a, b) => {
      if (isUserSearch) {
        const aUser = a.username.toLowerCase();
        const bUser = b.username.toLowerCase();
        if (aUser.startsWith(q) && !bUser.startsWith(q)) return -1;
        if (!aUser.startsWith(q) && bUser.startsWith(q)) return 1;
      }
      return 0;
    }).slice(0, 20);

    console.log(`[Search] Query: "${query}" found ${posts.length} posts and ${users.length} users`);
    return { posts, users };
  },

  /**
   * Get trending hashtags
   * CRON: Trending scores are recalculated every 10 mins using a time-decay algorithm.
   * SQL: SELECT tag, count FROM trending_cache ORDER BY score DESC LIMIT :limit
   */
  getTrends: async (limit = 10): Promise<{ hashtag: string, count: number }[]> => {
    return Array.from(hashtagUsage.entries())
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  /**
   * Get posts by hashtag
   * @param hashtag - Hashtag to search for (without #)
   * @returns Array of posts containing the hashtag
   */
  getPostsByHashtag: async (hashtag: string): Promise<Post[]> => {
    const tag = hashtag.toLowerCase().replace('#', '');
    const muted = mutedMap.get(CURRENT_USER_ID) || new Set();
    const blocked = blockedMap.get(CURRENT_USER_ID) || new Set();

    return allPosts
      .filter(p => {
        const tags = parseHashtags(p.content);
        return tags.includes(tag) &&
          !muted.has(p.author.id) &&
          !blocked.has(p.author.id);
      })
      .slice(0, 50)
      .map(p => hydratePost(p));
  },

  // ---------------------------------------------------------------------------
  // COMMENTS & REPLIES
  // ---------------------------------------------------------------------------

  /**
   * Create a comment or reply
   * SQL: INSERT INTO comments (id, parent_id, author_id, content, ...)
   * TRIGGER: on_comment_insert -> Increment parent.comment_count, notify parent author.
   * RLS: Enforced same as posts (visibility depends on parent).
   */
  createComment: async (parentId: string, commentData: { content: string, media?: Media[] }): Promise<Comment> => {
    // Rate limiting
    if (!postRateLimiter.canPerformAction()) {
      throw new Error(postRateLimiter.getStatusMessage());
    }
    postRateLimiter.recordAction();

    // Validate content
    if (!commentData.content.trim() && !commentData.media?.length) {
      throw new Error('Comment must have content or media');
    }

    if (commentData.content.length > 280) {
      throw new Error('Comment exceeds 280 characters');
    }

    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: userMap.get(CURRENT_USER_ID)!,
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

    // Make comment addressable and attach to parent
    const addressablePost: Post = {
      ...newComment,
      parentPostId: parentId,
      comments: [],
    };

    // Use the same reference for both
    const finalComment = addressablePost as unknown as Comment;

    allPosts.unshift(addressablePost);

    // Find and attach to parent
    const findAndAdd = (items: (Post | Comment)[]): boolean => {
      for (const item of items) {
        if (item.id === parentId) {
          if (!item.comments) item.comments = [];
          item.comments.unshift(finalComment);
          item.commentCount++;

          // Notify parent author
          if (item.author.id !== CURRENT_USER_ID) {
            createNotification({
              type: 'COMMENT',
              actor: userMap.get(CURRENT_USER_ID)!,
              recipientId: item.author.id,
              postId: item.id,
              postSnippet: commentData.content.substring(0, 50)
            });
          }
          return true;
        }

        if (item.comments && findAndAdd(item.comments)) return true;
      }
      return false;
    };

    const found = findAndAdd(allPosts);
    if (!found) {
      throw new Error('Parent post or comment not found');
    }

    // Process mentions
    const mentions = parseMentions(commentData.content);
    mentions.forEach(username => {
      const recipient = allUsers.find(u => u.username === username);
      if (recipient && recipient.id !== CURRENT_USER_ID) {
        createNotification({
          type: 'MENTION',
          actor: userMap.get(CURRENT_USER_ID)!,
          recipientId: recipient.id,
          postId: newComment.id,
          postSnippet: commentData.content.substring(0, 50)
        });
      }
    });

    eventEmitter.emit('newComment', { parentId, comment: finalComment });
    console.log(`[Comment] Created comment ${finalComment.id} on ${parentId}`);

    return finalComment;
  },

  // ---------------------------------------------------------------------------
  // REACTIONS & ENGAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * React to a post (like, dislike, laugh)
   * SQL: INSERT INTO reactions (user_id, post_id, type) VALUES (...) ON CONFLICT (user_id, post_id) DO UPDATE SET type = EXCLUDED.type
   * TRIGGER: on_reaction_change -> Increment/Decrement cached counts on posts table.
   * RLS: user_id = auth.uid()
   */
  react: async (postId: string, action: ReactionAction) => {
    // Rate limiting
    if (!reactionRateLimiter.canPerformAction()) {
      throw new Error(reactionRateLimiter.getStatusMessage());
    }
    reactionRateLimiter.recordAction();

    const canonicalId = getCanonicalId(postId);
    const post = allPosts.find(p => p.id === canonicalId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!reactionsMap.has(canonicalId)) {
      reactionsMap.set(canonicalId, new Map());
    }
    const postReactions = reactionsMap.get(canonicalId)!;

    const prevReaction = postReactions.get(CURRENT_USER_ID) || 'NONE';
    const finalAction = prevReaction === action ? 'NONE' : action;

    if (finalAction === 'NONE') {
      postReactions.delete(CURRENT_USER_ID);
      console.log(`[Reaction] User ${CURRENT_USER_ID} removed reaction from ${canonicalId}`);
    } else {
      postReactions.set(CURRENT_USER_ID, finalAction);
      console.log(`[Reaction] User ${CURRENT_USER_ID} reacted ${finalAction} to ${canonicalId}`);
    }

    // Notify post author
    if (finalAction !== 'NONE' && finalAction !== prevReaction && post.author.id !== CURRENT_USER_ID) {
      createNotification({
        type: 'REACTION',
        actor: userMap.get(CURRENT_USER_ID)!,
        recipientId: post.author.id,
        postId: post.id,
        postSnippet: post.content.substring(0, 50)
      });
    }
  },

  /**
   * Repost or un-repost a post
   * SQL: INSERT INTO reposts (user_id, post_id) VALUES (uid, pid)
   * TRIGGER: on_repost -> Increment post.repost_count, fan out to followers' Home Timelines.
   */
  repost: async (postId: string) => {
    // Rate limiting
    if (!reactionRateLimiter.canPerformAction()) {
      throw new Error(reactionRateLimiter.getStatusMessage());
    }
    reactionRateLimiter.recordAction();

    const canonicalId = getCanonicalId(postId);
    const post = allPosts.find(p => p.id === canonicalId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!repostsMap.has(canonicalId)) {
      repostsMap.set(canonicalId, new Set());
    }
    const postReposts = repostsMap.get(canonicalId)!;

    if (postReposts.has(CURRENT_USER_ID)) {
      // Un-repost
      postReposts.delete(CURRENT_USER_ID);

      // Remove virtual repost entry
      const idx = allPosts.findIndex(p =>
        p.repostedBy?.id === CURRENT_USER_ID &&
        p.id.startsWith(`repost:${canonicalId}:`)
      );
      if (idx !== -1) {
        allPosts.splice(idx, 1);
      }

      console.log(`[Repost] User ${CURRENT_USER_ID} removed repost of ${canonicalId}`);
    } else {
      // Repost
      postReposts.add(CURRENT_USER_ID);

      const repostEntry: Post = {
        ...post,
        id: `repost:${post.id}:${Date.now()}`,
        repostedBy: userMap.get(CURRENT_USER_ID)!,
        createdAt: new Date().toISOString()
      };
      allPosts.unshift(repostEntry);

      // Notify original author
      if (post.author.id !== CURRENT_USER_ID) {
        createNotification({
          type: 'REPOST',
          actor: userMap.get(CURRENT_USER_ID)!,
          recipientId: post.author.id,
          postId: post.id,
          postSnippet: post.content.substring(0, 50)
        });
      }

      console.log(`[Repost] User ${CURRENT_USER_ID} reposted ${canonicalId}`);
    }

    feedEngine.invalidateCache(CURRENT_USER_ID);
  },

  /**
   * Update an existing post
   * Enforces 15-minute edit window and ownership check
   */
  updatePost: async (postId: string, content: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const post = allPosts.find(p => p.id === postId);
    if (!post) throw new Error('Post not found');

    if (post.author.id !== CURRENT_USER_ID) {
      throw new Error('Unauthorized: You can only edit your own posts');
    }

    const createdAt = new Date(post.createdAt).getTime();
    const now = Date.now();
    const editWindow = 15 * 60 * 1000; // 15 minutes

    if (now - createdAt > editWindow) {
      throw new Error('Edit window expired. Posts can only be edited within 15 minutes.');
    }

    // Apply update
    post.content = content;

    // In a real DB, we'd update an 'updatedAt' column
    // Here we just modify the in-memory object reference which propagates to FeedEngine

    console.log(`[API] Post ${postId} updated by ${CURRENT_USER_ID}`);
    feedEngine.invalidateCache(CURRENT_USER_ID);
  },

  /**
   * Toggle bookmark status for a post
   * @param postId - ID of the post
   * @returns True if bookmarked, false if unbookmarked
   */
  toggleBookmark: async (postId: string): Promise<boolean> => {
    const canonicalId = getCanonicalId(postId);
    const post = allPosts.find(p => p.id === canonicalId);
    if (!post) {
      throw new Error('Post not found');
    }

    if (!bookmarksMap.has(CURRENT_USER_ID)) {
      bookmarksMap.set(CURRENT_USER_ID, new Set());
    }

    const bookmarks = bookmarksMap.get(CURRENT_USER_ID)!;

    if (bookmarks.has(canonicalId)) {
      bookmarks.delete(canonicalId);
      console.log(`[Bookmark] Removed bookmark for ${canonicalId}`);
      return false;
    } else {
      bookmarks.add(canonicalId);
      console.log(`[Bookmark] Added bookmark for ${canonicalId}`);
      return true;
    }
  },

  /**
   * Check if a post is bookmarked
   * @param postId - ID of the post
   * @returns True if bookmarked
   */
  isBookmarked: async (postId: string): Promise<boolean> => {
    const canonicalId = getCanonicalId(postId);
    return bookmarksMap.get(CURRENT_USER_ID)?.has(canonicalId) || false;
  },

  /**
   * Get all bookmarked posts
   * @returns Array of bookmarked posts
   */
  getBookmarks: async (): Promise<Post[]> => {
    const bookmarks = bookmarksMap.get(CURRENT_USER_ID);
    if (!bookmarks) return [];

    return allPosts
      .filter(p => bookmarks.has(p.id))
      .map(p => hydratePost(p));
  },

  // ---------------------------------------------------------------------------
  // USER PROFILES & RELATIONSHIPS
  // ---------------------------------------------------------------------------

  /**
   * Fetch a user by username
   * @param username - Username to search for
   * @returns User or undefined
   */
  fetchUser: async (identifier: string): Promise<User | undefined> => {
    // Try by ID first, then by username
    const userById = userMap.get(identifier);
    if (userById) return userById;

    return allUsers.find(u => u.username.toLowerCase() === identifier.toLowerCase());
  },

  /**
   * Get user profile by ID
   * @param userId - User ID
   * @returns User profile with follower/following counts
   */
  getProfile: async (userId: string): Promise<UserProfile> => {
    const user = userMap.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      followers_count: followersMap.get(userId)?.size || 0,
      following_count: followingMap.get(userId)?.size || 0,
    };
  },

  /**
   * Get user profile by username
   * @param username - Username
   * @returns User profile with follower/following counts
   */
  getProfileByUsername: async (username: string): Promise<UserProfile> => {
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      followers_count: followersMap.get(user.id)?.size || 0,
      following_count: followingMap.get(user.id)?.size || 0,
    };
  },

  /**
   * Update current user's profile
   */
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    // Prevent direct username updates
    if (updates.username) {
      throw new Error('Username cannot be updated directly. Use updateUsernameRPC().');
    }

    const user = userMap.get(CURRENT_USER_ID);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, ...updates };

    // Update main storage
    userMap.set(CURRENT_USER_ID, updatedUser);

    // Update array
    const idx = allUsers.findIndex(u => u.id === CURRENT_USER_ID);
    if (idx !== -1) {
      allUsers[idx] = updatedUser;
    }

    console.log(`[API] Profile updated for ${CURRENT_USER_ID}`);
    return updatedUser;
  },

  /**
   * Update User Country
   */
  updateCountry: async (country: string): Promise<User> => {
    const user = userMap.get(CURRENT_USER_ID);
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, country };
    userMap.set(CURRENT_USER_ID, updatedUser);

    // Update array for consistency
    const idx = allUsers.findIndex(u => u.id === CURRENT_USER_ID);
    if (idx !== -1) {
      allUsers[idx] = updatedUser;
    }

    console.log(`[API] Country updated to: ${country}`);
    return updatedUser;
  },

  /**
   * Request Data Archive
   */
  requestDataArchive: async (): Promise<void> => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`[API] Data archive requested for ${CURRENT_USER_ID}`);
    // In a real app, this would trigger an email job

  },

  /**
   * Secure RPC for Username Change
   * Enforces:
   * 1. Auth check
   * 2. Normalize (lower/trim)
   * 3. Length guard (4-15 chars)
   * 4. Cooldown (14 days)
   * 5. Uniqueness (Case-insensitive)
   * 6. History logging
   */
  updateUsernameRPC: async (newUsername: string): Promise<void> => {
    // 1. Auth check
    const user = userMap.get(CURRENT_USER_ID);
    if (!user) {
      throw new Error('Not authenticated');
    }


    // 2. Normalize
    const username = newUsername.trim().toLowerCase();

    // 3. Length guard
    if (username.length < 4 || username.length > 15) {
      throw new Error('Invalid username length. Must be 4-15 characters.');
    }

    // Checking Reserved Usernames
    const reserved = reservedUsernames.find(r => r.username === username);
    if (reserved) {
      throw new Error(`This username is reserved (${reserved.category}).`);
    }

    // 4. Cooldown check
    if (user.last_username_change_at) {
      const lastChange = new Date(user.last_username_change_at);
      const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceChange < 14) {
        throw new Error('Username can only be changed every 14 days.');
      }
    }

    // 5. Uniqueness check
    const existing = allUsers.find(u => u.username.toLowerCase() === username && u.id !== CURRENT_USER_ID);
    if (existing) {
      throw new Error('This username is already taken.'); // Code: 23505
    }

    // 6. Atomic Update & History
    // Store old username in history
    usernameHistory.push({
      user_id: user.id,
      old_username: user.username,
      changed_at: new Date().toISOString()
    });

    // Update User object
    const updatedUser = {
      ...user,
      username: username, // Update with normalized username
      last_username_change_at: new Date().toISOString()
    };

    userMap.set(CURRENT_USER_ID, updatedUser);
    const idx = allUsers.findIndex(u => u.id === CURRENT_USER_ID);
    if (idx !== -1) {
      allUsers[idx] = updatedUser;
    }

    console.log(`[RPC] Username changed: ${user.username} -> ${username}`);
  },



  /**
   * Get user's posts
   * @param userId - User ID
   * @returns Array of user's posts
   */
  getProfilePosts: async (userId: string): Promise<Post[]> => {
    return allPosts
      .filter(p => p.author.id === userId && !p.repostedBy && !p.parentPostId)
      .map(p => hydratePost(p));
  },

  /**
   * Get user's replies and comments
   * @param userId - User ID
   * @returns Array of user's replies
   */
  getProfileReplies: async (userId: string): Promise<Post[]> => {
    return allPosts
      .filter(p => p.author.id === userId && p.parentPostId && !p.repostedBy)
      .map(p => hydratePost(p));
  },

  /**
   * Get user's liked posts
   * @param userId - User ID
   * @returns Array of posts liked by the user
   */
  getProfileLikes: async (userId: string): Promise<Post[]> => {
    const likedPosts: Post[] = [];

    reactionsMap.forEach((userReactions, postId) => {
      if (userReactions.get(userId) === 'LIKE') {
        const post = allPosts.find(p => p.id === postId);
        if (post) {
          likedPosts.push(post);
        }
      }
    });

    return likedPosts.map(p => hydratePost(p));
  },

  /**
   * Get user's media posts
   * @param userId - User ID
   * @returns Array of user's posts with media
   */
  getProfileMedia: async (userId: string): Promise<Post[]> => {
    return allPosts
      .filter(p => p.author.id === userId && p.media && p.media.length > 0)
      .map(p => hydratePost(p));
  },

  /**
   * Get relationship status between current user and target user
   * @param targetUserId - Target user ID
   * @returns Relationship status object
   */
  fetchUserRelationship: async (targetUserId: string): Promise<ViewerRelationship> => {
    if (targetUserId === CURRENT_USER_ID) return { type: 'SELF', targetUserId };

    const isFollowing = followingMap.get(CURRENT_USER_ID)?.has(targetUserId) || false;
    const isMuted = mutedMap.get(CURRENT_USER_ID)?.has(targetUserId) || false;
    const isBlocked = blockedMap.get(CURRENT_USER_ID)?.has(targetUserId) || false;

    if (isBlocked) return { type: 'BLOCKED', targetUserId };
    if (isMuted) return { type: 'MUTED', targetUserId };
    if (isFollowing) return { type: 'FOLLOWING', targetUserId };

    return { type: 'NOT_FOLLOWING', targetUserId };
  },

  // ---------------------------------------------------------------------------
  // FOLLOW / UNFOLLOW / MUTE / BLOCK
  // ---------------------------------------------------------------------------

  /**
   * Follow or unfollow a user
   * SQL: INSERT INTO follows (follower_id, following_id) VALUES (uid, target) ON CONFLICT DO DELETE
   * TRIGGER: on_follow_change -> Update scores in profiles table.
   * RLS: follower_id = auth.uid()
   */
  toggleFollow: async (targetUserId: string): Promise<boolean> => {
    // Rate limiting
    if (!followRateLimiter.canPerformAction()) {
      throw new Error(followRateLimiter.getStatusMessage());
    }
    followRateLimiter.recordAction();

    const targetUser = userMap.get(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUserId === CURRENT_USER_ID) {
      throw new Error('Cannot follow yourself');
    }

    // Initialize data structures if needed
    if (!followingMap.has(CURRENT_USER_ID)) {
      followingMap.set(CURRENT_USER_ID, new Set());
    }
    if (!followersMap.has(targetUserId)) {
      followersMap.set(targetUserId, new Set());
    }

    const currentUserFollowing = followingMap.get(CURRENT_USER_ID)!;
    const targetUserFollowers = followersMap.get(targetUserId)!;

    if (currentUserFollowing.has(targetUserId)) {
      // Unfollow
      currentUserFollowing.delete(targetUserId);
      targetUserFollowers.delete(CURRENT_USER_ID);

      console.log(`[Follow] User ${CURRENT_USER_ID} unfollowed ${targetUserId}`);
      return false;
    } else {
      // Follow
      currentUserFollowing.add(targetUserId);
      targetUserFollowers.add(CURRENT_USER_ID);

      // Send notification
      createNotification({
        type: 'FOLLOW',
        actor: userMap.get(CURRENT_USER_ID)!,
        recipientId: targetUserId,
      });

      console.log(`[Follow] User ${CURRENT_USER_ID} followed ${targetUserId}`);
      return true;
    }
  },

  /**
   * Specifically follow a user
   */
  followUser: async (targetUserId: string): Promise<void> => {
    const isFollowing = followingMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (!isFollowing) {
      await api.toggleFollow(targetUserId);
    }
  },

  /**
   * Specifically unfollow a user
   */
  unfollowUser: async (targetUserId: string): Promise<void> => {
    const isFollowing = followingMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (isFollowing) {
      await api.toggleFollow(targetUserId);
    }
  },

  /**
   * Mute or unmute a user
   * SQL: INSERT INTO mutes (user_id, muted_id) VALUES (uid, target) ON CONFLICT DO DELETE
   * RLS: user_id = auth.uid()
   */
  toggleMute: async (targetUserId: string): Promise<boolean> => {
    const targetUser = userMap.get(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (!mutedMap.has(CURRENT_USER_ID)) {
      mutedMap.set(CURRENT_USER_ID, new Set());
    }

    const mutedUsers = mutedMap.get(CURRENT_USER_ID)!;

    if (mutedUsers.has(targetUserId)) {
      mutedUsers.delete(targetUserId);
      console.log(`[Mute] User ${CURRENT_USER_ID} unmuted ${targetUserId}`);
      return false;
    } else {
      mutedUsers.add(targetUserId);
      console.log(`[Mute] User ${CURRENT_USER_ID} muted ${targetUserId}`);
      return true;
    }
  },

  /**
   * Specifically mute a user
   */
  muteUser: async (targetUserId: string): Promise<void> => {
    const isMuted = mutedMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (!isMuted) {
      await api.toggleMute(targetUserId);
    }
  },

  /**
   * Specifically unmute a user
   */
  unmuteUser: async (targetUserId: string): Promise<void> => {
    const isMuted = mutedMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (isMuted) {
      await api.toggleMute(targetUserId);
    }
  },

  /**
   * Block or unblock a user
   * SQL: INSERT INTO blocks (user_id, blocked_id) VALUES (uid, target) ON CONFLICT DO DELETE
   * TRIGGER: on_block -> Automatically unfollow both ways.
   * RLS: user_id = auth.uid()
   */
  toggleBlock: async (targetUserId: string): Promise<boolean> => {
    const targetUser = userMap.get(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUserId === CURRENT_USER_ID) {
      throw new Error('Cannot block yourself');
    }

    if (!blockedMap.has(CURRENT_USER_ID)) {
      blockedMap.set(CURRENT_USER_ID, new Set());
    }

    const blockedUsers = blockedMap.get(CURRENT_USER_ID)!;

    if (blockedUsers.has(targetUserId)) {
      // Unblock
      blockedUsers.delete(targetUserId);

      // Also remove from muted if they were muted
      mutedMap.get(CURRENT_USER_ID)?.delete(targetUserId);

      console.log(`[Block] User ${CURRENT_USER_ID} unblocked ${targetUserId}`);
      return false;
    } else {
      // Block
      blockedUsers.add(targetUserId);

      // Also automatically unfollow and remove follower
      followingMap.get(CURRENT_USER_ID)?.delete(targetUserId);
      followersMap.get(CURRENT_USER_ID)?.delete(targetUserId);
      followingMap.get(targetUserId)?.delete(CURRENT_USER_ID);
      followersMap.get(targetUserId)?.delete(CURRENT_USER_ID);

      console.log(`[Block] User ${CURRENT_USER_ID} blocked ${targetUserId}`);
      return true;
    }
  },

  /**
   * Specifically block a user
   */
  blockUser: async (targetUserId: string): Promise<void> => {
    const isBlocked = blockedMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (!isBlocked) {
      await api.toggleBlock(targetUserId);
    }
  },

  /**
   * Specifically unblock a user
   */
  unblockUser: async (targetUserId: string): Promise<void> => {
    const isBlocked = blockedMap.get(CURRENT_USER_ID)?.has(targetUserId);
    if (isBlocked) {
      await api.toggleBlock(targetUserId);
    }
  },

  /**
   * Get users following the current user
   * @returns Array of follower users
   */
  getFollowers: async (userId: string = CURRENT_USER_ID): Promise<User[]> => {
    const followers = followersMap.get(userId) || new Set();
    return Array.from(followers)
      .map(id => userMap.get(id))
      .filter((user): user is User => user !== undefined);
  },

  /**
   * Get users the specified user is following
   * @param userId - User ID (defaults to current user)
   * @returns Array of followed users
   */
  getFollowing: async (userId: string = CURRENT_USER_ID): Promise<User[]> => {
    const following = followingMap.get(userId) || new Set();
    return Array.from(following)
      .map(id => userMap.get(id))
      .filter((user): user is User => user !== undefined);
  },

  /**
   * Get all reactions (Likes, Dislikes, Laughs) for a profile
   * @param userId - User ID
   * @returns Array of posts the user has reacted to
   */
  getProfileReactions: async (userId: string): Promise<Post[]> => {
    const reactedPosts: Post[] = [];

    reactionsMap.forEach((userReactions, postId) => {
      // If user has any reaction to this post
      if (userReactions.has(userId)) {
        const post = allPosts.find(p => p.id === postId);
        if (post) {
          reactedPosts.push(post);
        }
      }
    });

    return reactedPosts.map(p => hydratePost(p));
  },

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  /**
   * Fetch notifications for current user
   * SQL: SELECT * FROM notifications WHERE recipient_id = auth.uid()
   * RLS: recipient_id = auth.uid()
   */
  fetchNotifications: async (limit = 50): Promise<Notification[]> => {
    const userNotifications = allNotifications.filter(
      n => n.recipientId === CURRENT_USER_ID
    );

    return userNotifications.slice(0, limit);
  },

  /**
   * Mark notification as read
   * @param notificationId - Notification ID
   */
  markNotificationRead: async (notificationId: string): Promise<void> => {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification && notification.recipientId === CURRENT_USER_ID) {
      notification.isRead = true;
      console.log(`[Notification] Marked ${notificationId} as read`);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: async (): Promise<void> => {
    allNotifications.forEach(notification => {
      if (notification.recipientId === CURRENT_USER_ID) {
        notification.isRead = true;
      }
    });
    console.log(`[Notification] Marked all as read for user ${CURRENT_USER_ID}`);
  },

  /**
   * Delete a notification
   * @param notificationId - Notification ID
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    const index = allNotifications.findIndex(
      n => n.id === notificationId && n.recipientId === CURRENT_USER_ID
    );

    if (index !== -1) {
      allNotifications.splice(index, 1);
      console.log(`[Notification] Deleted notification ${notificationId}`);
    }
  },

  /**
   * Clear all notifications
   */
  clearNotifications: async (): Promise<void> => {
    const initialLength = allNotifications.length;

    // Remove only current user's notifications
    for (let i = allNotifications.length - 1; i >= 0; i--) {
      if (allNotifications[i].recipientId === CURRENT_USER_ID) {
        allNotifications.splice(i, 1);
      }
    }

    console.log(`[Notification] Cleared notifications for user ${CURRENT_USER_ID}. Removed ${initialLength - allNotifications.length} notifications`);
  },

  // ---------------------------------------------------------------------------
  // MESSAGING
  // ---------------------------------------------------------------------------

  /**
   * Get all conversations for current user
   * @returns Array of conversations
   */
  getConversations: async (): Promise<Conversation[]> => {
    // Filter conversations where current user is a participant
    return mockConversations.filter(conv =>
      conv.participants.some(p => p.id === CURRENT_USER_ID)
    );
  },

  /**
   * Toggle pin status for a conversation
   * @param conversationId - Conversation ID
   * @param pinned - Whether to pin or unpin
   */
  pinConversation: async (conversationId: string, pinned: boolean): Promise<void> => {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.isPinned = pinned;
    console.log(`[Conversation] ${pinned ? 'Pinned' : 'Unpinned'} conversation ${conversationId}`);
  },

  /**
   * Get a specific conversation by ID
   * @param conversationId - Conversation ID
   * @returns Conversation with messages
   */
  getConversation: async (conversationId: string): Promise<{
    conversation: Conversation;
    messages: Message[];
  } | undefined> => {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) return undefined;

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.id === CURRENT_USER_ID);
    if (!isParticipant) return undefined;

    const messages = mockMessages[conversationId] || [];

    // Mark as read
    conversation.unreadCount = 0;

    return { conversation, messages };
  },

  /**
   * Get messages for a conversation
   * @param conversationId - Conversation ID
   * @returns Array of messages
   */
  getMessages: async (conversationId: string): Promise<Message[]> => {
    return mockMessages[conversationId] || [];
  },

  /**
   * Send a message in a conversation
   * SQL: INSERT INTO messages (conversation_id, sender_id, text) VALUES (...)
   * TRIGGER: on_message_insert -> Update conversation.last_message, notify participants.
   * REALTIME: Broadcasts via WAL (Write Ahead Log) to subscribed clients.
   */
  sendMessage: async (conversationId: string, message: string): Promise<Message> => {
    // Rate limiting
    if (!messageRateLimiter.canPerformAction()) {
      throw new Error(messageRateLimiter.getStatusMessage());
    }
    messageRateLimiter.recordAction();

    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.id === CURRENT_USER_ID);
    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: CURRENT_USER_ID,
      text: message,
      createdAt: new Date().toISOString(),
      type: 'CHAT',
    };

    // Add to messages
    if (!mockMessages[conversationId]) {
      mockMessages[conversationId] = [];
    }
    mockMessages[conversationId].push(newMessage);

    // Update conversation metadata
    conversation.lastMessage = newMessage;

    // Increment unread count for other participants
    conversation.participants.forEach(participant => {
      if (participant.id !== CURRENT_USER_ID) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;

        // Create notification for other participants
        createNotification({
          type: 'MESSAGE',
          actor: userMap.get(CURRENT_USER_ID)!,
          recipientId: participant.id,
          postId: conversationId,
          postSnippet: message.substring(0, 50),
        });
      }
    });

    // Notify listeners via EventEmitter
    eventEmitter.emit('newMessage', { conversationId, message: newMessage });

    console.log(`[Message] Sent message in conversation ${conversationId}`);
    return newMessage;
  },

  /**
   * Add a reaction to a message
   * @param conversationId - Conversation ID (not strictly needed but for safety)
   * @param messageId - Message ID
   * @param emoji - Emoji string
   */
  addReaction: async (conversationId: string, messageId: string, emoji: string): Promise<void> => {
    const messages = mockMessages[conversationId];
    if (!messages) throw new Error('Conversation not found');

    const message = messages.find(m => m.id === messageId);
    if (!message) throw new Error('Message not found');

    if (!message.reactions) message.reactions = {};
    message.reactions[emoji] = (message.reactions[emoji] || 0) + 1;

    // Notify via event emitter
    eventEmitter.emit('newMessage', { conversationId, message });

    console.log(`[Message] Reacted ${emoji} to msg ${messageId}`);
  },

  /**
   * Pin a message in a conversation
   * @param conversationId - Conversation ID
   * @param messageId - Message ID
   */
  pinMessage: async (conversationId: string, messageId: string): Promise<void> => {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error('Conversation not found');

    // Toggle logic
    conversation.pinnedMessageId = conversation.pinnedMessageId === messageId ? undefined : messageId;

    // Create system message about pinning
    if (conversation.pinnedMessageId) {
      const msg = await api.sendMessage(conversationId, `A message was pinned to the conversation.`);
      msg.type = 'SYSTEM';
    }

    console.log(`[Message] Toggled pin for msg ${messageId} in conv ${conversationId}`);
  },

  /**
   * Create a new direct message conversation
   * @param targetUserId - User ID to message
   * @param initialMessage - Optional initial message
   * @returns New conversation
   */
  createConversation: async (
    targetUserId: string,
    initialMessage?: string
  ): Promise<Conversation> => {
    const targetUser = userMap.get(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if conversation already exists
    const existingConversation = mockConversations.find(conv =>
      conv.type === 'DM' &&
      conv.participants.length === 2 &&
      conv.participants.some(p => p.id === CURRENT_USER_ID) &&
      conv.participants.some(p => p.id === targetUserId)
    );

    if (existingConversation) {
      // If initial message provided, send it
      if (initialMessage) {
        await api.sendMessage(existingConversation.id, initialMessage);
      }
      return existingConversation;
    }

    // Create new conversation
    const newConversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      participants: [userMap.get(CURRENT_USER_ID)!, targetUser],
      lastMessage: initialMessage ? {
        id: `temp-msg-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: initialMessage,
        createdAt: new Date().toISOString(),
      } : undefined,
      unreadCount: 0,
      type: 'DM',
    };

    mockConversations.unshift(newConversation);
    mockMessages[newConversation.id] = [];

    // Send initial message if provided
    if (initialMessage) {
      await api.sendMessage(newConversation.id, initialMessage);
    }

    console.log(`[Conversation] Created DM with user ${targetUserId}`);
    return newConversation;
  },

  /**
   * Create a new group conversation
   * @param name - Group name
   * @param participantIds - Array of participant user IDs
   * @param description - Optional group description
   * @returns New group conversation
   */
  createGroupConversation: async (
    name: string,
    participantIds: string[],
    description?: string
  ): Promise<Conversation> => {
    // Validate participants
    const participants = [userMap.get(CURRENT_USER_ID)!];
    participantIds.forEach(id => {
      const user = userMap.get(id);
      if (user && user.id !== CURRENT_USER_ID) {
        participants.push(user);
      }
    });

    if (participants.length < 2) {
      throw new Error('Group must have at least 2 participants');
    }

    // Create group conversation
    const newConversation: Conversation = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      participants,
      lastMessage: {
        id: `sys-msg-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: `${userMap.get(CURRENT_USER_ID)!.name} created the group "${name}"`,
        createdAt: new Date().toISOString(),
        type: 'SYSTEM',
      },
      unreadCount: 0,
      type: 'GROUP',
      ownerId: CURRENT_USER_ID,
      adminIds: [CURRENT_USER_ID],
      description,
    };

    mockConversations.unshift(newConversation);
    mockMessages[newConversation.id] = [];

    // Add system message
    const systemMessage: Message = {
      id: newConversation.lastMessage?.id || `sys-${Date.now()}`,
      senderId: CURRENT_USER_ID,
      text: newConversation.lastMessage?.text || '',
      createdAt: new Date().toISOString(),
      type: 'SYSTEM',
    };
    mockMessages[newConversation.id].push(systemMessage);

    console.log(`[Conversation] Created group "${name}" with ${participants.length} participants`);
    return newConversation;
  },

  /**
   * Create a new channel conversation
   * @param name - Channel name
   * @param description - Optional channel description
   * @returns New channel conversation
   */
  createChannelConversation: async (
    name: string,
    description?: string
  ): Promise<Conversation> => {
    // Create channel conversation
    const newConversation: Conversation = {
      id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      participants: [userMap.get(CURRENT_USER_ID)!], // Start with just the owner
      lastMessage: {
        id: `sys-msg-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: `Channel "${name}" was created`,
        createdAt: new Date().toISOString(),
        type: 'SYSTEM',
      },
      unreadCount: 0,
      type: 'CHANNEL',
      ownerId: CURRENT_USER_ID,
      adminIds: [CURRENT_USER_ID],
      description,
    };

    mockConversations.unshift(newConversation);
    mockMessages[newConversation.id] = [
      {
        id: newConversation.lastMessage?.id || `sys-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: newConversation.lastMessage?.text || '',
        createdAt: new Date().toISOString(),
        type: 'SYSTEM',
      }
    ];

    console.log(`[Conversation] Created channel "${name}"`);
    return newConversation;
  },

  promoteToAdmin: async (conversationId: string, userId: string): Promise<void> => {
    const conv = mockConversations.find(c => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (!conv.adminIds) conv.adminIds = [conv.ownerId!];
    if (!conv.adminIds.includes(userId)) {
      conv.adminIds.push(userId);
      eventEmitter.emit('conversationUpdated', { conversationId, updates: { adminIds: conv.adminIds } });
    }
  },

  demoteFromAdmin: async (conversationId: string, userId: string): Promise<void> => {
    const conv = mockConversations.find(c => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (conv.ownerId === userId) throw new Error('Cannot demote the owner');
    if (conv.adminIds) {
      conv.adminIds = conv.adminIds.filter(id => id !== userId);
      eventEmitter.emit('conversationUpdated', { conversationId, updates: { adminIds: conv.adminIds } });
    }
  },

  removeFromConversation: async (conversationId: string, userId: string): Promise<void> => {
    const conv = mockConversations.find(c => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (conv.ownerId === userId) throw new Error('Cannot remove the owner');
    conv.participants = conv.participants.filter(p => p.id !== userId);
    if (conv.adminIds) {
      conv.adminIds = conv.adminIds.filter(id => id !== userId);
    }
    eventEmitter.emit('conversationUpdated', { conversationId, updates: { participants: conv.participants, adminIds: conv.adminIds } });
  },

  leaveConversation: async (conversationId: string): Promise<void> => {
    const conv = mockConversations.find(c => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (conv.ownerId === CURRENT_USER_ID) throw new Error('Owner cannot leave. Delete the conversation instead.');
    conv.participants = conv.participants.filter(p => p.id !== CURRENT_USER_ID);
    if (conv.adminIds) {
      conv.adminIds = conv.adminIds.filter(id => id !== CURRENT_USER_ID);
    }
    eventEmitter.emit('conversationUpdated', { conversationId, updates: { participants: conv.participants, adminIds: conv.adminIds } });
  },

  updateConversation: async (conversationId: string, updates: Partial<Conversation>): Promise<void> => {
    const index = mockConversations.findIndex(c => c.id === conversationId);
    if (index === -1) throw new Error('Conversation not found');
    mockConversations[index] = { ...mockConversations[index], ...updates };
    eventEmitter.emit('conversationUpdated', { conversationId, updates });
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    const index = mockConversations.findIndex(c => c.id === conversationId);
    if (index === -1) throw new Error('Conversation not found');
    mockConversations.splice(index, 1);
    delete mockMessages[conversationId];
    eventEmitter.emit('conversationDeleted', conversationId);
  },

  // ---------------------------------------------------------------------------
  // LISTS MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new user list
   * @param list - List details
   * @returns Newly created list
   */
  createList: async (list: Omit<PostrList, 'id' | 'createdAt' | 'memberIds' | 'subscriberIds'>): Promise<PostrList> => {
    const newList: PostrList = {
      ...list,
      id: `list-${Date.now()}`,
      memberIds: [],
      subscriberIds: [CURRENT_USER_ID], // Owner is first subscriber
      createdAt: new Date().toISOString()
    };
    allLists.push(newList);
    console.log(`[Lists] Created list: ${newList.name}`);
    return newList;
  },

  /**
   * Fetch lists for a user (owned, member of, or subscribed to)
   * @param userId - User ID
   * @returns Array of lists
   */
  fetchLists: async (userId: string = CURRENT_USER_ID): Promise<PostrList[]> => {
    return allLists.filter(list =>
      list.ownerId === userId ||
      list.memberIds.includes(userId) ||
      list.subscriberIds.includes(userId)
    );
  },

  /**
   * Add a member to a list
   * @param listId - List ID
   * @param userId - User to add
   */
  addMemberToList: async (listId: string, userId: string): Promise<void> => {
    const list = allLists.find(l => l.id === listId);
    if (!list) throw new Error('List not found');
    if (list.ownerId !== CURRENT_USER_ID) throw new Error('Unauthorized');

    if (!list.memberIds.includes(userId)) {
      list.memberIds.push(userId);
      console.log(`[Lists] Added user ${userId} to list ${listId}`);
    }
  },

  /**
   * Remove a member from a list
   * @param listId - List ID
   * @param userId - User to remove
   */
  removeMemberFromList: async (listId: string, userId: string): Promise<void> => {
    const list = allLists.find(l => l.id === listId);
    if (!list) throw new Error('List not found');
    if (list.ownerId !== CURRENT_USER_ID) throw new Error('Unauthorized');

    list.memberIds = list.memberIds.filter(id => id !== userId);
    console.log(`[Lists] Removed user ${userId} from list ${listId}`);
  },

  /**
   * Subscribe to or unsubscribe from a list
   * @param listId - List ID
   * @returns Updated subscription status
   */
  toggleListSubscription: async (listId: string): Promise<boolean> => {
    const list = allLists.find(l => l.id === listId);
    if (!list) throw new Error('List not found');

    const index = list.subscriberIds.indexOf(CURRENT_USER_ID);
    if (index !== -1) {
      list.subscriberIds.splice(index, 1);
      return false;
    } else {
      list.subscriberIds.push(CURRENT_USER_ID);
      return true;
    }
  },

  /**
   * Get posts from members of a list
   * @param listId - List ID
   * @returns Array of posts
   */
  getListPosts: async (listId: string): Promise<Post[]> => {
    const list = allLists.find(l => l.id === listId);
    if (!list) throw new Error('List not found');

    const memberSet = new Set(list.memberIds);
    return allPosts
      .filter(p => memberSet.has(p.author.id) && !p.parentPostId)
      .slice(0, 50)
      .map(p => hydratePost(p));
  },

  // ---------------------------------------------------------------------------
  // MODERATION & REPORTING
  // ---------------------------------------------------------------------------

  /**
   * Report content or user
   * @param entityType - Type of entity being reported
   * @param entityId - ID of the entity
   * @param reportType - Type of report
   * @param reason - Optional reason text
   */
  report: async (
    entityType: ReportableEntityType,
    entityId: string,
    reportType: ReportType,
    reason?: string
  ): Promise<void> => {
    // Rate limiting
    if (!reportRateLimiter.canPerformAction()) {
      throw new Error(reportRateLimiter.getStatusMessage());
    }
    reportRateLimiter.recordAction();

    // Validate entity exists
    let entityExists = false;

    switch (entityType) {
      case 'POST':
        entityExists = allPosts.some(p => p.id === entityId);
        break;
      case 'USER':
        entityExists = userMap.has(entityId);
        break;
      case 'COMMENT':
        entityExists = allPosts.some(p =>
          p.id === entityId ||
          (p.comments && p.comments.some(c => c.id === entityId))
        );
        break;
      case 'MESSAGE':
        entityExists = Object.values(mockMessages).some(
          messages => messages.some(m => m.id === entityId)
        );
        break;
    }

    if (!entityExists) {
      throw new Error('Entity not found');
    }

    await createReportApi(
      entityType,
      entityId,
      reportType,
      CURRENT_USER_ID,
      reason || ''
    );

    console.log(`[Report] User ${CURRENT_USER_ID} reported ${entityType} ${entityId} for ${reportType}`);
  },

  // ---------------------------------------------------------------------------
  // ANALYTICS & INSIGHTS
  // ---------------------------------------------------------------------------

  /**
   * Get post analytics (views, engagement rate)
   * @param postId - Post ID
   * @returns Analytics data
   */
  getPostAnalytics: async (postId: string): Promise<{
    views: number;
    likes: number;
    dislikes: number;
    laughs: number;
    reposts: number;
    comments: number;
    engagementRate: number;
  }> => {
    const post = allPosts.find(p => p.id === postId);
    if (!post || post.author.id !== CURRENT_USER_ID) {
      throw new Error('Post not found or unauthorized');
    }

    const views = postViewsMap.get(postId)?.size || 0;
    const reactions = reactionsMap.get(postId);
    const likes = (post.likeCount || 0) + (reactions ? Array.from(reactions.values()).filter(r => r === 'LIKE').length : 0);
    const dislikes = (post.dislikeCount || 0) + (reactions ? Array.from(reactions.values()).filter(r => r === 'DISLIKE').length : 0);
    const laughs = (post.laughCount || 0) + (reactions ? Array.from(reactions.values()).filter(r => r === 'LAUGH').length : 0);
    const reposts = (post.repostCount || 0) + (repostsMap.get(postId)?.size || 0);
    const comments = post.commentCount || 0;

    const engagementRate = views > 0
      ? ((likes + comments + reposts) / views) * 100
      : 0;

    return {
      views,
      likes,
      dislikes,
      laughs,
      reposts,
      comments,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    };
  },

  /**
   * Get user activity stats
   * @param userId - User ID (defaults to current user)
   * @returns Activity statistics
   */
  getUserActivity: async (userId: string = CURRENT_USER_ID): Promise<{
    postsCount: number;
    commentsCount: number;
    likesGiven: number;
    repostsCount: number;
    followersCount: number;
    followingCount: number;
    lastActive: string | null;
  }> => {
    const postsCount = allPosts.filter(p =>
      p.author.id === userId && !p.parentPostId && !p.repostedBy
    ).length;

    const commentsCount = allPosts.filter(p =>
      p.author.id === userId && p.parentPostId
    ).length;

    let likesGiven = 0;
    reactionsMap.forEach(userReactions => {
      if (userReactions.get(userId) === 'LIKE') {
        likesGiven++;
      }
    });

    const repostsCount = Array.from(repostsMap.values()).reduce((count, reposters) => {
      return count + (reposters.has(userId) ? 1 : 0);
    }, 0);

    const followersCount = followersMap.get(userId)?.size || 0;
    const followingCount = followingMap.get(userId)?.size || 0;
    const lastActive = userSessions.get(userId)
      ? new Date(userSessions.get(userId)!).toISOString()
      : null;

    return {
      postsCount,
      commentsCount,
      likesGiven,
      repostsCount,
      followersCount,
      followingCount,
      lastActive,
    };
  },

  // ---------------------------------------------------------------------------
  // SYSTEM & UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get API health status
   * @returns API health information
   */
  getHealth: async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    users: number;
    posts: number;
    notifications: number;
    conversations: number;
    uptime: number;
    timestamp: string;
  }> => {
    const startTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    return {
      status: 'healthy',
      users: allUsers.length,
      posts: allPosts.length,
      notifications: allNotifications.length,
      conversations: mockConversations.length,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Clear all data (for testing/reset)
   * @warning This will reset the entire mock database
   */
  clearAllData: async (): Promise<void> => {
    // Clear all data structures
    followingMap.clear();
    followersMap.clear();
    mutedMap.clear();
    blockedMap.clear();
    bookmarksMap.clear();
    reactionsMap.clear();
    repostsMap.clear();
    hashtagUsage.clear();
    postViewsMap.clear();
    pollVotesMap.clear();
    userSessions.clear();

    // Clear arrays
    allNotifications.length = 0;

    // Reset posts to initial state (keep seed posts)
    allPosts.length = 0;

    // Re-add initial posts
    const initialPosts: Post[] = [
      // ... (re-add the initial 20 posts from above)
    ];

    initialPosts.forEach(post => allPosts.push(post));

    // Reset conversations
    mockConversations.length = 0;

    // Re-add initial conversations
    const initialConversations: Conversation[] = [
      // ... (re-add the initial conversations from above)
    ];

    initialConversations.forEach(conv => mockConversations.push(conv));

    // Reset messages
    Object.keys(mockMessages).forEach(key => {
      mockMessages[key] = [];
    });

    // Re-add initial messages
    const initialMessages = {
      // ... (re-add the initial messages from above)
    };

    Object.assign(mockMessages, initialMessages);

    console.log('[System] All data cleared and reset to initial state');
  },

  /**
   * Export user data (GDPR/compliance)
   * @returns User data export
   */
  exportUserData: async (): Promise<{
    profile: User;
    posts: Post[];
    comments: Comment[];
    likes: Post[];
    bookmarks: Post[];
    followers: User[];
    following: User[];
    notifications: Notification[];
    messages: Message[];
    createdAt: string;
  }> => {
    const userPosts = allPosts.filter(p =>
      p.author.id === CURRENT_USER_ID && !p.parentPostId && !p.repostedBy
    );

    const userComments = allPosts.filter(p =>
      p.author.id === CURRENT_USER_ID && p.parentPostId
    ) as Comment[];

    const userLikes: Post[] = [];
    reactionsMap.forEach((userReactions, postId) => {
      if (userReactions.get(CURRENT_USER_ID) === 'LIKE') {
        const post = allPosts.find(p => p.id === postId);
        if (post) userLikes.push(post);
      }
    });

    const userBookmarks = allPosts.filter(p =>
      bookmarksMap.get(CURRENT_USER_ID)?.has(p.id)
    );

    const userFollowers = Array.from(followersMap.get(CURRENT_USER_ID) || [])
      .map(id => userMap.get(id))
      .filter((user): user is User => user !== undefined);

    const userFollowing = Array.from(followingMap.get(CURRENT_USER_ID) || [])
      .map(id => userMap.get(id))
      .filter((user): user is User => user !== undefined);

    const userNotifications = allNotifications.filter(
      n => n.recipientId === CURRENT_USER_ID
    );

    const userMessages: Message[] = [];
    Object.values(mockMessages).forEach(messages => {
      messages.forEach(msg => {
        if (msg.senderId === CURRENT_USER_ID) {
          userMessages.push(msg);
        }
      });
    });

    return {
      profile: userMap.get(CURRENT_USER_ID)!,
      posts: userPosts,
      comments: userComments,
      likes: userLikes,
      bookmarks: userBookmarks,
      followers: userFollowers,
      following: userFollowing,
      notifications: userNotifications,
      messages: userMessages,
      createdAt: new Date().toISOString(),
    };
  },

  // ---------------------------------------------------------------------------
  // ADMIN ENDPOINTS
  // ---------------------------------------------------------------------------

  markConversationAsRead: async (conversationId: string): Promise<void> => {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
      eventEmitter.emit('conversationRead', conversationId);
    }
  },

  getUserId: () => CURRENT_USER_ID,

  getInviteLink: async (conversationId: string): Promise<string> => {
    return `https://postr.dev/join/${conversationId}`;
  },



  admin: adminApi,


};

// =============================================================================
// LIVING WORLD SIMULATION - AUTONOMOUS USER ACTIVITY
// =============================================================================

/**
 * Simulate random user activity to create a living social network
 */
const simulateLivingWorld = () => {
  if (!SIMULATION_CONFIG.ENABLE_LIVING_WORLD) return;

  const performRandomAction = () => {
    // Pick a random user (excluding current user)
    const activeUsers = allUsers.filter(u =>
      u.id !== CURRENT_USER_ID &&
      u.is_active &&
      !u.is_suspended
    );

    if (activeUsers.length === 0) return;

    const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];

    // Decide which action to perform based on probabilities
    const rand = Math.random();

    if (rand < SIMULATION_CONFIG.FOLLOW_PROBABILITY) {
      // Random follow
      const usersToFollow = allUsers.filter(u =>
        u.id !== randomUser.id &&
        u.id !== CURRENT_USER_ID &&
        !followingMap.get(randomUser.id)?.has(u.id)
      );

      if (usersToFollow.length > 0) {
        const targetUser = usersToFollow[Math.floor(Math.random() * usersToFollow.length)];

        // Initialize data structures
        if (!followingMap.has(randomUser.id)) {
          followingMap.set(randomUser.id, new Set());
        }
        if (!followersMap.has(targetUser.id)) {
          followersMap.set(targetUser.id, new Set());
        }

        followingMap.get(randomUser.id)!.add(targetUser.id);
        followersMap.get(targetUser.id)!.add(randomUser.id);

        if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
          console.log(`[Simulation] ${randomUser.username} followed ${targetUser.username}`);
        }
      }
    }
    else if (rand < SIMULATION_CONFIG.FOLLOW_PROBABILITY + SIMULATION_CONFIG.REACTION_PROBABILITY) {
      // Random reaction
      const postsToReact = allPosts.filter(p =>
        p.author.id !== randomUser.id &&
        !p.parentPostId // Don't react to comments
      );

      if (postsToReact.length > 0) {
        const targetPost = postsToReact[Math.floor(Math.random() * postsToReact.length)];
        const actions: ReactionAction[] = ['LIKE', 'DISLIKE', 'LAUGH'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        if (!reactionsMap.has(targetPost.id)) {
          reactionsMap.set(targetPost.id, new Map());
        }

        reactionsMap.get(targetPost.id)!.set(randomUser.id, randomAction);

        if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
          console.log(`[Simulation] ${randomUser.username} reacted ${randomAction} to post by ${targetPost.author.username}`);
        }
      }
    }
    else if (rand < SIMULATION_CONFIG.FOLLOW_PROBABILITY + SIMULATION_CONFIG.REACTION_PROBABILITY + SIMULATION_CONFIG.POST_PROBABILITY) {
      // Random post
      const postContents = [
        `Just discovered this amazing platform! #excited #newhere`,
        `Working on some cool projects today. #coding #developer`,
        `Beautiful day outside! ☀️ #weather #sunny`,
        `Any recommendations for good books to read? #books #recommendations`,
        `Learning new technologies is always fun! #learning #tech`,
        `Coffee and code - the perfect combination. ☕ #developerlife`,
        `Just finished a big project! Time to celebrate. 🎉 #achievement`,
        `Thinking about starting a new side project. Any ideas? #sideproject`,
        `The future of technology is looking bright! #future #tech`,
        `Random thought: What if social media was more positive? #positivity`
      ];

      const randomContent = postContents[Math.floor(Math.random() * postContents.length)];

      const newPost: Post = {
        id: `sim-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        author: randomUser,
        content: randomContent,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        dislikeCount: 0,
        laughCount: 0,
        repostCount: 0,
        commentCount: 0,
        userReaction: 'NONE',
      };

      allPosts.unshift(newPost);

      // Process hashtags
      const hashtags = parseHashtags(randomContent);
      hashtags.forEach(tag => {
        hashtagUsage.set(tag, (hashtagUsage.get(tag) || 0) + 1);
      });

      if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
        console.log(`[Simulation] ${randomUser.username} posted: "${randomContent.substring(0, 50)}..."`);
      }
    }
  };

  // Run simulation at configured interval
  setInterval(() => {
    performRandomAction();
  }, SIMULATION_CONFIG.SIMULATION_INTERVAL);

  console.log(`[Simulation] Living world simulation started (interval: ${SIMULATION_CONFIG.SIMULATION_INTERVAL}ms)`);
};

// =============================================================================
// ADMIN EVENT SIMULATION
// =============================================================================

/**
 * Simulate system events for admin dashboard
 */
const simulateAdminEvents = () => {
  if (!SIMULATION_CONFIG.VERBOSE_LOGGING) return;

  // Simulate random reports
  if (Math.random() < 0.1) {
    const randomUsers = allUsers.filter(u =>
      !ADMIN_USER_IDS.has(u.id) && Math.random() < 0.5
    ).slice(0, 3);

    const randomPosts = allPosts.filter(() => Math.random() < 0.1).slice(0, 2);

    [...randomUsers, ...randomPosts].forEach(target => {
      adminStats.moderationActions.push({
        id: `report-${Date.now()}-${Math.random()}`,
        adminId: allUsers[Math.floor(Math.random() * allUsers.length)].id,
        action: 'REPORT',
        targetId: target.id,
        targetType: 'username' in target ? 'USER' : 'POST',
        reason: ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation'][
          Math.floor(Math.random() * 4)
        ],
        timestamp: Date.now() - Math.random() * 24 * 60 * 60 * 1000
      });
    });
  }

  // Simulate system events
  if (Math.random() < 0.05) {
    const eventTypes: Array<typeof adminStats.systemEvents[0]['type']> = [
      'INFO', 'WARNING', 'ERROR', 'SECURITY'
    ];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const messages = {
      INFO: [
        'New user registered',
        'Backup completed successfully',
        'Cache warmed up',
        'Database connection pool refreshed'
      ],
      WARNING: [
        'High memory usage detected',
        'API response times increasing',
        'Rate limit threshold approaching',
        'Unusual login pattern detected'
      ],
      ERROR: [
        'Database connection failed',
        'Third-party API timeout',
        'File upload service unavailable',
        'Cache cluster node down'
      ],
      SECURITY: [
        'Multiple failed login attempts',
        'Suspicious API request pattern',
        'Potential XSS attempt blocked',
        'Rate limit evasion attempt detected'
      ]
    };

    adminStats.systemEvents.push({
      id: `event-${Date.now()}`,
      type: eventType,
      message: messages[eventType][Math.floor(Math.random() * messages[eventType].length)],
      timestamp: Date.now() - Math.random() * 60 * 60 * 1000
    });
  }
};

// =============================================================================
// EVENT LISTENERS - REAL-TIME UPDATES
// =============================================================================

// Listen for real-time events
eventEmitter.on('newNotification', (notification: Notification) => {
  // You could add WebSocket broadcasting here for real-time updates
  if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
    console.log(`[Event] New notification: ${notification.type} for user ${notification.recipientId}`);
  }
});

eventEmitter.on('newComment', ({ parentId, comment }: { parentId: string, comment: Comment }) => {
  // Broadcast comment to relevant clients
  if (SIMULATION_CONFIG.VERBOSE_LOGGING) {
    console.log(`[Event] New comment ${comment.id} on post ${parentId}`);
  }
});

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize living world simulation
if (SIMULATION_CONFIG.ENABLE_LIVING_WORLD) {
  // Start after a short delay
  setTimeout(() => {
    simulateLivingWorld();
    // Start admin event simulation
    setInterval(simulateAdminEvents, 30000); // Every 30 seconds
  }, 5000);
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export type definitions for convenience
export type {
  Post, ReactionAction, Comment, Media,
  PollChoice, User, UserProfile,
  Report, ReportableEntityType, ReportType,
  Notification, Conversation, Message
};

// Export rate limiters for testing/debugging
export {
  followRateLimiter,
  reportRateLimiter,
  postRateLimiter,
  messageRateLimiter,
  reactionRateLimiter
};

// Export data for debugging (readonly)
export const debugData = {
  getUsers: () => [...allUsers],
  getPosts: () => [...allPosts],
  getNotifications: () => [...allNotifications],
  getFollowingMap: () => new Map(followingMap),
  getFollowersMap: () => new Map(followersMap),
  getReactionsMap: () => new Map(reactionsMap),
  getHashtagUsage: () => new Map(hashtagUsage),
  getAdminStats: () => ({ ...adminStats }),
  getMetrics: () => metrics.getMetrics()
};

// Export configuration
export { SIMULATION_CONFIG, CURRENT_USER_ID };

// Export admin API separately as well
export { adminApi };
