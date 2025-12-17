
// src/types/feed.ts

import type { FeedPost } from './post';

export type Feed = {
  posts: FeedPost[];
  nextCursor?: string;
};
