import MMKV from 'react-native-mmkv';
import { PendingReaction } from '../types/pendingReaction';

const storage = new MMKV({ id: 'pending-reactions' });

const PENDING_REACTIONS_KEY = 'pendingReactions';

export const getPendingReactions = (): PendingReaction[] => {
  const reactionsJSON = storage.getString(PENDING_REACTIONS_KEY);
  return reactionsJSON ? JSON.parse(reactionsJSON) : [];
};

export const savePendingReactions = (reactions: PendingReaction[]) => {
  storage.set(PENDING_REACTIONS_KEY, JSON.stringify(reactions));
};
