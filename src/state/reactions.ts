
// src/state/reactions.ts

// This file will contain the contract for the reaction state.
// It will be extended with state management logic in a future phase.

import type { UserReaction } from '@/types/reaction';

export type ReactionState = {
  [postId: string]: UserReaction;
};
