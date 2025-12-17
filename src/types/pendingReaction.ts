export type PendingReaction = {
  postId: string;
  finalState: 'LIKE' | 'DISLIKE' | 'NONE';
  pressCount: number;
  lastUpdatedAt: number;
};