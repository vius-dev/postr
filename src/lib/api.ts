
// This file will abstract all Supabase calls.
// It will be extended with function stubs for now.
import { Post, ReactionAction, Comment } from "@/types/post";
import { PollChoice } from "@/types/poll";
import { User, UserProfile } from "@/types/user";
import { Report, ReportableEntityType, ReportType } from "@/types/reports";
import { createReport as createReportApi } from './reportsApi';

// --- Data Structures for Moderation ---
type PendingReaction = {
  postId: string;
  action: ReactionAction;
};

const mutedUsers = new Set<string>();
const blockedUsers = new Set<string>();

// --- Mock User Data ---
const allUsers: User[] = [
  { id: '0', name: 'Current User', username: 'currentuser', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', headerImage: 'https://picsum.photos/seed/picsum/600/200', bio: 'Just a regular user navigating the digital world. I love coding and coffee.', location: 'San Francisco, CA', website: 'https://example.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '1', name: 'John Doe', username: 'johndoe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', headerImage: 'https://picsum.photos/seed/johndoe/600/200', bio: 'Exploring the intersection of technology and art. #tech #art', location: 'New York, NY', website: 'https://johndoe.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '2', name: 'Jane Smith', username: 'janesmith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e', headerImage: 'https://picsum.photos/seed/janesmith/600/200', bio: 'Foodie, traveler, and bookworm. Always looking for the next adventure.', location: 'London, UK', website: 'https://janesmithadventures.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '3', name: 'Alice', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f', headerImage: 'https://picsum.photos/seed/alice/600/200', bio: 'Lover of open source and cats. Building cool things with code.', location: 'Berlin, Germany', website: 'https://github.com/alice', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '4', name: 'Bob', username: 'bob', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a', headerImage: 'https://picsum.photos/seed/bob/600/200', bio: 'Designer and front-end developer. Making the web beautiful.', location: 'Paris, France', website: 'https://bob.design', is_active: true, is_limited: false, is_shadow_banned: true, is_suspended: false }, // Shadow-banned user
  { id: '5', name: 'Charlie', username: 'charlie', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b', headerImage: 'https://picsum.photos/seed/charlie/600/200', bio: 'Just here for the memes.', location: 'Internet', website: '', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '6', name: 'David', username: 'david', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c', headerImage: 'https://picsum.photos/seed/david/600/200', bio: 'This account is suspended.', location: 'Nowhere', website: '', is_active: false, is_limited: false, is_shadow_banned: false, is_suspended: true }, // Suspended user
  { id: '9', name: 'Emily', username: 'emily', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704g', headerImage: 'https://picsum.photos/seed/emily/600/200', bio: 'Musician and songwriter. Trying to change the world one song at a time.', location: 'Nashville, TN', website: 'https://emilysongs.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '10', name: 'Grace', username: 'grace', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704i', headerImage: 'https://picsum.photos/seed/grace/600/200', bio: 'Scientist and researcher. Passionate about climate change and sustainability.', location: 'Zurich, Switzerland', website: '', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '11', name: 'Heidi', username: 'heidi', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704j', headerImage: 'https://picsum.photos/seed/heidi/600/200', bio: 'Athlete and fitness enthusiast. Pushing my limits every day.', location: 'Los Angeles, CA', website: 'https://heidifit.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
  { id: '12', name: 'Frank', username: 'frank', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704h', headerImage: 'https://picsum.photos/seed/frank/600/200', bio: 'Photographer capturing moments in time.', location: 'Tokyo, Japan', website: 'https://frankphoto.com', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false },
];

const userMap = new Map(allUsers.map(user => [user.id, user]));

const allPosts: Post[] = [
  { id: '7', repostedBy: userMap.get('9')!, author: userMap.get('1')!, content: 'This is the first post! So excited to be here. #newbeginnings', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), likeCount: 10, dislikeCount: 1, laughCount: 0, repostCount: 5, commentCount: 2, userReaction: 'NONE', comments: [ { id: 'c1', author: userMap.get('10')!, content: 'Welcome! Great to have you here.', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 1, userReaction: 'NONE', replies: [ { id: 'r1', author: userMap.get('1')!, content: 'Thanks, Grace!', createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE' }, ], }, { id: 'c2', author: userMap.get('11')!, content: 'Looking forward to your posts!', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), likeCount: 0, dislikeCount: 0, laughCount: 0, repostCount: 0, commentCount: 0, userReaction: 'NONE', replies: [], }, ], },
  { id: '8', author: userMap.get('12')!, content: 'This is a great point. I would also add...', quotedPost: { id: '1', author: userMap.get('1')!, content: 'This is the first post! So excited to be here. #newbeginnings', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), likeCount: 10, dislikeCount: 1, laughCount: 0, repostCount: 5, commentCount: 2, userReaction: 'NONE', }, createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), likeCount: 15, dislikeCount: 0, laughCount: 0, repostCount: 3, commentCount: 4, userReaction: 'LIKE', },
  { id: '1', author: userMap.get('1')!, content: 'This is the first post! So excited to be here. #newbeginnings', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), likeCount: 10, dislikeCount: 1, laughCount: 0, repostCount: 5, commentCount: 2, userReaction: 'NONE', },
  { id: '2', author: userMap.get('2')!, content: 'Hello world! This is a great day. Just enjoying the weather.', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), likeCount: 25, dislikeCount: 0, laughCount: 0, repostCount: 12, commentCount: 8, userReaction: 'LIKE', },
  { id: '3', author: userMap.get('3')!, content: 'Just had the best coffee ever. Highly recommend the new cafe downtown.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), likeCount: 50, dislikeCount: 2, laughCount: 0, repostCount: 20, commentCount: 15, userReaction: 'NONE', },
  { id: '4', author: userMap.get('4')!, content: 'Working on a new project. It is going to be amazing! #coding #developer', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), likeCount: 150, dislikeCount: 5, laughCount: 0, repostCount: 75, commentCount: 30, userReaction: 'DISLIKE', },
  { id: '5', author: userMap.get('5')!, content: 'Is anyone else watching the new season of that show? No spoilers!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), likeCount: 80, dislikeCount: 3, laughCount: 0, repostCount: 10, commentCount: 25, userReaction: 'NONE', },
  { id: '6', author: userMap.get('6')!, content: 'Just finished a marathon. Feeling tired but accomplished. #running', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), likeCount: 200, dislikeCount: 10, laughCount: 0, repostCount: 50, commentCount: 40, userReaction: 'LIKE', },
];

export const api = {
  createPost: async (post: { content: string }): Promise<Post> => {
    console.log(`Creating post with content: ${post.content}`);
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
    };
    allPosts.unshift(newPost);
    await new Promise(resolve => setTimeout(resolve, 500));
    return newPost;
  },

  createPoll: async (poll: { question: string, choices: PollChoice[] }): Promise<Post> => {
    console.log(`Creating poll with question: ${poll.question} and choices: ${poll.choices.map(c => c.text).join(', ')}`)
    const newPost: Post = {
      id: (allPosts.length + 1).toString(),
      author: userMap.get('0')!,
      content: poll.question,
      poll: {
        choices: poll.choices.map(choice => ({ ...choice, vote_count: 0 })),
        question: ""
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
    await new Promise(resolve => setTimeout(resolve, 500));
    return newPost;
  },

  fetchFeed: async (cursor?: string): Promise<{ posts: Post[], nextCursor: string | undefined }> => {
    console.log(`Fetching feed with cursor: ${cursor}`);
    const pageSize = 4;
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const filteredPosts = allPosts.filter(post => {
      const author = userMap.get(post.author.id);
      if (!author) return false;

      if (author.is_shadow_banned) return false;

      return (
        !blockedUsers.has(author.username) &&
        !mutedUsers.has(author.username) &&
        author.is_active &&
        !author.is_suspended
      );
    });

    const posts = filteredPosts.slice(startIndex, startIndex + pageSize);
    const nextCursor = startIndex + pageSize < filteredPosts.length ? (startIndex + pageSize).toString() : undefined;

    return {
      posts,
      nextCursor,
    };
  },

  fetchPost: async (postId: string): Promise<Post | undefined> => {
    console.log(`Fetching post with id: ${postId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const post = allPosts.find(p => p.id === postId);

    if (!post) return undefined;

    const author = userMap.get(post.author.id);
    if (!author) return undefined;

    if (author.is_shadow_banned || author.is_suspended || !author.is_active || blockedUsers.has(author.username) || mutedUsers.has(author.username)) {
      return undefined;
    }
    return post;
  },

  getProfile: async (userId: string): Promise<UserProfile> => {
      const user = userMap.get(userId);
      if(!user) throw new Error("User not found");
      return user;
  },

  getProfileByUsername: async (username: string): Promise<UserProfile> => {
    const user = allUsers.find(u => u.username === username);
    if(!user) throw new Error("User not found");
    return user;
  },

  getPostsByUser: async (userId: string): Promise<Post[]> => {
    return allPosts.filter(p => p.author.id === userId);
  },

  updateProfile: async (updates: Partial<UserProfile>): Promise<void> => {
    console.log('Updating profile with', updates);
    const currentUser = userMap.get('0');
    if (currentUser) {
        Object.assign(currentUser, updates);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  muteUser: async (userId: string): Promise<void> => {
    console.log(`Muting user @${userId}`);
    const user = userMap.get(userId);
    if (user) {
      mutedUsers.add(user.username);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  blockUser: async (userId: string): Promise<void> => {
    console.log(`Blocking user @${userId}`);
    const user = userMap.get(userId);
    if (user) {
      blockedUsers.add(user.username);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  createReport: async (
    entityType: ReportableEntityType,
    entityId: string,
    reportType: ReportType,
    reporterId: string,
    reason?: string
  ): Promise<Report> => {
    console.log(`Creating report for ${entityType} ${entityId} of type ${reportType}`);
    return createReportApi(entityType, entityId, reportType, reporterId, reason);
  },

  react: async (postId: string, action: ReactionAction): Promise<void> => {
    console.log(`Reacting to post ${postId} with ${action}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },
  
  batchReact: async (reactions: PendingReaction[]): Promise<void> => {
    console.log('Batching reactions:', reactions);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  },

  repost: async (postId: string): Promise<void> => {
    console.log(`Reposting post ${postId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  quote: async (postId: string, text: string): Promise<void> => {
    console.log(`Quoting post ${postId} with text: \"${text}\"`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  bookmark: async (postId: string): Promise<void> => {
    console.log(`Bookmarking post ${postId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  forgotPassword: async (email: string): Promise<void> => {
    console.log(`Sending password reset link to ${email}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  fetchAllUsers: async (): Promise<User[]> => {
    console.log('Fetching all users');
    await new Promise(resolve => setTimeout(resolve, 500));
    return allUsers;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    console.log(`Updating user ${userId} with`, updates);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      Object.assign(user, updates);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  },

  fetchUser: async (username: string): Promise<User | undefined> => {
    console.log(`Fetching user @${username}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = allUsers.find(u => u.username === username);
    if (user && (user.is_suspended || !user.is_active)) {
        return undefined;
    }
    return user;
  },

  followUser: async (userId: string): Promise<void> => {
    console.log(`Following user ${userId}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          console.log(`Successfully followed user ${userId}`);
          resolve();
        } else {
          console.log(`Failed to follow user ${userId}`);
          reject(new Error('API Error'));
        }
      }, 500);
    });
  },

  unfollowUser: async (userId: string): Promise<void> => {
    console.log(`Unfollowing user ${userId}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          console.log(`Successfully unfollowed user ${userId}`);
          resolve();
        } else {
          console.log(`Failed to unfollow user ${userId}`);
          reject(new Error('API Error'));
        }
      }, 500);
    });
  },
};
