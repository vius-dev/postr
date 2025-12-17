
// src/state/offlineQueue.ts

// This file will contain a stub for the offline queue.
// It will be extended with logic for buffering and replaying actions.

export type OfflineAction = {
  type: string;
  payload: any;
};

export const offlineQueue: OfflineAction[] = [];
