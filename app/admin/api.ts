
import { Report } from '@/types/reports';
import { User } from '@/types/user';
import { Post, Author, Comment } from '@/types/post';

// --- MOCK DATABASE ---
let mockUsers: User[] = [
  { id: 'user-123', name: 'Alice', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false },
  { id: 'user-456', name: 'Bob', username: 'bob', avatar: 'https://i.pravatar.cc/150?u=bob', is_active: true, is_limited: false, is_shadow_banned: false, is_suspended: false, is_muted: false },
  { id: 'user-789', name: 'Charlie', username: 'charlie', avatar: 'https://i.pravatar.cc/150?u=charlie', is_active: false, is_limited: true, is_shadow_banned: false, is_suspended: true, is_muted: false },
];

const alice: Author = { id: 'user-123', name: 'Alice', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice' };
const bob: Author = { id: 'user-456', name: 'Bob', username: 'bob', avatar: 'https://i.pravatar.cc/150?u=bob' };
const charlie: Author = { id: 'user-789', name: 'Charlie', username: 'charlie', avatar: 'https://i.pravatar.cc/150?u=charlie' };

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    author: charlie,
    content: 'This is a controversial comment with a suspicious image.',
    createdAt: new Date().toISOString(),
    userReaction: 'NONE',
    likeCount: 0,
    dislikeCount: 5,
    laughCount: 0,
    repostCount: 0,
    commentCount: 0,
    media: [{ type: 'image', url: 'https://picsum.photos/seed/spam1/400/400' }]
  },
  {
    id: 'comment-2',
    author: alice,
    content: 'I agree with the post!',
    createdAt: new Date().toISOString(),
    userReaction: 'LIKE',
    likeCount: 10,
    dislikeCount: 0,
    laughCount: 0,
    repostCount: 0,
    commentCount: 0
  },
];

let mockPosts: Post[] = [
  {
    id: 'post-123',
    content: 'This is a spam post with links and a fake prize image.',
    author: bob,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    dislikeCount: 0,
    laughCount: 0,
    repostCount: 0,
    commentCount: 0,
    userReaction: 'NONE',
    media: [
      { type: 'image', url: 'https://picsum.photos/seed/scam1/600/400' },
      { type: 'image', url: 'https://picsum.photos/seed/scam2/600/400' }
    ]
  },
  { id: 'post-456', content: 'I love this app!', author: alice, createdAt: new Date().toISOString(), likeCount: 10, dislikeCount: 0, laughCount: 5, repostCount: 2, commentCount: 2, userReaction: 'LIKE', comments: mockComments },
];

let mockReports: Report[] = [
  {
    id: '1',
    entityType: 'POST',
    entityId: 'post-123',
    reportType: 'SPAM',
    reporterId: 'user-123',
    createdAt: new Date().toISOString(),
    reason: 'This is a spam post.',
  },
  {
    id: '2',
    entityType: 'USER',
    entityId: 'user-789',
    reportType: 'HARASSMENT',
    reporterId: 'user-123',
    createdAt: new Date().toISOString(),
    reason: 'This user is harassing me.',
  },
];

// --- AUDIT LOGS (Phase 20) ---
export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: 'USER' | 'POST' | 'COMMENT' | 'REPORT';
  entityId: string;
  createdAt: string;
  details?: string;
}

let mockAuditLogs: AuditLog[] = [];

const recordAuditLog = (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
  mockAuditLogs.unshift({
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  });
};


// --- ANALYTICS API ---
export const fetchAnalytics = async (): Promise<{ userCount: number, postCount: number, reportCount: number }> => {
  return {
    userCount: mockUsers.length,
    postCount: mockPosts.length,
    reportCount: mockReports.length,
  };
};

// --- USER API ---
export const fetchAllUsers = async (): Promise<User[]> => {
  return [...mockUsers];
};

export const getUserById = async (userId: string): Promise<User | null> => {
  return mockUsers.find(u => u.id === userId) || null;
}

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  const userIndex = mockUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) throw new Error('User not found');
  const oldUser = mockUsers[userIndex];
  mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };

  recordAuditLog({
    adminId: 'admin-0',
    action: 'UPDATE_USER',
    entityType: 'USER',
    entityId: userId,
    details: `Updated fields: ${Object.keys(updates).join(', ')}`
  });

  return mockUsers[userIndex];
};

// --- REPORT API ---
export const fetchAllReports = async (): Promise<Report[]> => {
  return [...mockReports];
};

export const getReportsByReporterId = async (reporterId: string): Promise<Report[]> => {
  return mockReports.filter(r => r.reporterId === reporterId);
}

export const dismissReport = async (reportId: string): Promise<{ success: boolean }> => {
  mockReports = mockReports.filter(r => r.id !== reportId);

  recordAuditLog({
    adminId: 'admin-0',
    action: 'DISMISS_REPORT',
    entityType: 'REPORT',
    entityId: reportId
  });

  return { success: true };
};

// --- CONTENT API ---
export const fetchAllPosts = async (): Promise<Post[]> => {
  return [...mockPosts];
};

export const getPostsByAuthorId = async (authorId: string): Promise<Post[]> => {
  return mockPosts.filter(p => p.author.id === authorId);
}

export const getCommentsByAuthorId = async (authorId: string): Promise<Comment[]> => {
  const userComments: Comment[] = [];
  mockPosts.forEach(post => {
    if (post.comments) {
      post.comments.forEach(comment => {
        if (comment.author.id === authorId) {
          userComments.push(comment);
        }
      });
    }
  });
  return userComments;
}

export const deletePost = async (postId: string): Promise<{ success: boolean }> => {
  mockPosts = mockPosts.filter(p => p.id !== postId);
  mockReports = mockReports.filter(r => !(r.entityType === 'POST' && r.entityId === postId));

  recordAuditLog({
    adminId: 'admin-0',
    action: 'DELETE_POST',
    entityType: 'POST',
    entityId: postId
  });

  return { success: true };
};

export const deleteComment = async (commentId: string): Promise<{ success: boolean }> => {
  let deleted = false;
  for (const post of mockPosts) {
    if (post.comments) {
      const commentIndex = post.comments.findIndex(c => c.id === commentId);
      if (commentIndex > -1) {
        post.comments.splice(commentIndex, 1);
        post.commentCount = post.comments.length;
        deleted = true;
        break;
      }
    }
  }

  if (deleted) {
    recordAuditLog({
      adminId: 'admin-0',
      action: 'DELETE_COMMENT',
      entityType: 'COMMENT',
      entityId: commentId
    });
  }

  return { success: deleted };
};

export const getPostById = async (postId: string): Promise<Post | null> => {
  return mockPosts.find(p => p.id === postId) || null;
}

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  return [...mockAuditLogs];
};
