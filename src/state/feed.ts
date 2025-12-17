
// src/state/feed.ts

// This file will contain the contract for the feed state.
// It will be extended with state management logic in a future phase.

import type { FeedPost } from '@/types/post';

export type FeedState = {
  posts: FeedPost[];
  isLoading: boolean;
  error: string | null;
  nextCursor?: string;
};
