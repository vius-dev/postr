import { getPendingReactions, savePendingReactions } from './persistence';
import { PendingReaction } from '../types/pendingReaction';

export const updateReactionQueue = (
  postId: string,
  finalState: 'LIKE' | 'DISLIKE' | 'NONE'
) => {
  const pendingReactions = getPendingReactions();
  const existingReactionIndex = pendingReactions.findIndex(
    (r) => r.postId === postId
  );

  if (existingReactionIndex !== -1) {
    const existingReaction = pendingReactions[existingReactionIndex];
    if (existingReaction.pressCount < 4) {
      existingReaction.finalState = finalState;
      existingReaction.pressCount++;
      existingReaction.lastUpdatedAt = Date.now();
    }
  } else {
    const newReaction: PendingReaction = {
      postId,
      finalState,
      pressCount: 1,
      lastUpdatedAt: Date.now(),
    };
    pendingReactions.push(newReaction);
  }

  savePendingReactions(pendingReactions);
};
