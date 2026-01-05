import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { eventEmitter } from '@/lib/EventEmitter';
import { api } from '@/lib/api';
import { ReactionAction } from '@/types/post';

interface PostCounts {
  likes: number;
  dislikes: number;
  laughs: number;
  reposts: number;
  replies: number;
}

interface RealtimeState {
  counts: Record<string, PostCounts>;
  userReactions: Record<string, ReactionAction>;
  userReposts: Record<string, boolean>;
  userBookmarks: Record<string, boolean>;
}

interface PostInitializationData extends PostCounts {
  userReaction: ReactionAction;
  isReposted: boolean;
  isBookmarked: boolean;
}

interface RealtimeContextType extends RealtimeState {
  setCounts: (postId: string, updates: Partial<PostCounts>) => void;
  initializePost: (postId: string, initial: PostInitializationData) => void;
  toggleReaction: (postId: string, action: ReactionAction) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const DEFAULT_COUNTS: PostCounts = {
  likes: 0,
  dislikes: 0,
  laughs: 0,
  reposts: 0,
  replies: 0,
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<RealtimeState>({
    counts: {},
    userReactions: {},
    userReposts: {},
    userBookmarks: {},
  });

  const setCounts = useCallback(
    (postId: string, updates: Partial<PostCounts>) => {
      setState(prev => ({
        ...prev,
        counts: {
          ...prev.counts,
          [postId]: {
            ...(prev.counts[postId] || { ...DEFAULT_COUNTS }),
            ...updates,
          },
        },
      }));
    },
    []
  );

  const initializePost = useCallback(
    (postId: string, initial: PostInitializationData) => {
      setState(prev => {
        if (
          prev.counts[postId] &&
          prev.userReactions[postId] !== undefined
        ) {
          return prev;
        }

        return {
          ...prev,
          counts: {
            ...prev.counts,
            [postId]: {
              likes: initial.likes,
              dislikes: initial.dislikes,
              laughs: initial.laughs,
              reposts: initial.reposts,
              replies: initial.replies,
            },
          },
          userReactions: {
            ...prev.userReactions,
            [postId]: initial.userReaction,
          },
          userReposts: {
            ...prev.userReposts,
            [postId]: initial.isReposted,
          },
          userBookmarks: {
            ...prev.userBookmarks,
            [postId]: initial.isBookmarked,
          },
        };
      });
    },
    []
  );

  const toggleReaction = useCallback(async (postId: string, action: ReactionAction) => {
    let nextReaction: ReactionAction = 'NONE';
    let rollback:
      | { reaction: ReactionAction; counts: PostCounts }
      | null = null;

    setState(prev => {
      const currentReaction = prev.userReactions[postId] || 'NONE';
      nextReaction = currentReaction === action ? 'NONE' : action;

      const currentCounts = prev.counts[postId] || {
        ...DEFAULT_COUNTS,
      };
      const newCounts = { ...currentCounts };

      rollback = {
        reaction: currentReaction,
        counts: currentCounts,
      };

      if (currentReaction !== 'NONE') {
        const key =
          `${currentReaction.toLowerCase()}s` as keyof PostCounts;
        newCounts[key] = Math.max(0, newCounts[key] - 1);
      }

      if (nextReaction !== 'NONE') {
        const key =
          `${nextReaction.toLowerCase()}s` as keyof PostCounts;
        newCounts[key] += 1;
      }

      return {
        ...prev,
        counts: { ...prev.counts, [postId]: newCounts },
        userReactions: {
          ...prev.userReactions,
          [postId]: nextReaction,
        },
      };
    });

    try {
      await api.react(postId, nextReaction);
    } catch (error) {
      if (rollback) {
        setState(prev => ({
          ...prev,
          counts: {
            ...prev.counts,
            [postId]: rollback!.counts,
          },
          userReactions: {
            ...prev.userReactions,
            [postId]: rollback!.reaction,
          },
        }));
      }
      throw error;
    }
  }, []);

  const toggleRepost = useCallback(async (postId: string) => {
    let next = false;
    let rollback:
      | { reposted: boolean; counts: PostCounts }
      | null = null;

    setState(prev => {
      const current = prev.userReposts[postId] || false;
      next = !current;

      const currentCounts = prev.counts[postId] || {
        ...DEFAULT_COUNTS,
      };

      rollback = {
        reposted: current,
        counts: currentCounts,
      };

      return {
        ...prev,
        counts: {
          ...prev.counts,
          [postId]: {
            ...currentCounts,
            reposts: Math.max(
              0,
              currentCounts.reposts + (next ? 1 : -1)
            ),
          },
        },
        userReposts: {
          ...prev.userReposts,
          [postId]: next,
        },
      };
    });

    try {
      await api.repost(postId);
    } catch (error) {
      if (rollback) {
        setState(prev => ({
          ...prev,
          counts: {
            ...prev.counts,
            [postId]: rollback!.counts,
          },
          userReposts: {
            ...prev.userReposts,
            [postId]: rollback!.reposted,
          },
        }));
      }
      throw error;
    }
  }, []);

  const toggleBookmark = useCallback(async (postId: string) => {
    let previous = false;

    setState(prev => {
      previous = prev.userBookmarks[postId] || false;
      return {
        ...prev,
        userBookmarks: {
          ...prev.userBookmarks,
          [postId]: !previous,
        },
      };
    });

    try {
      await api.toggleBookmark(postId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        userBookmarks: {
          ...prev.userBookmarks,
          [postId]: previous,
        },
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    const handleCountUpdate = ({
      postId,
      updates,
    }: {
      postId: string;
      updates: Partial<PostCounts>;
    }) => {
      setCounts(postId, updates);
    };

    const handleNewComment = ({ parentId }: { parentId: string }) => {
      setState(prev => {
        const current = prev.counts[parentId]?.replies || 0;
        return {
          ...prev,
          counts: {
            ...prev.counts,
            [parentId]: {
              ...(prev.counts[parentId] || {
                ...DEFAULT_COUNTS,
              }),
              replies: current + 1,
            },
          },
        };
      });
    };

    const handleEngagementUpdate = ({ postId, counts, myReaction, isReposted }: any) => {
      setState(prev => ({
        ...prev,
        counts: {
          ...prev.counts,
          [postId]: counts,
        },
        userReactions: {
          ...prev.userReactions,
          [postId]: myReaction,
        },
        userReposts: {
          ...prev.userReposts,
          [postId]: isReposted,
        },
      }));
    };

    eventEmitter.on('count-update', handleCountUpdate);
    eventEmitter.on('newComment', handleNewComment);
    eventEmitter.on('post-engagement-updated', handleEngagementUpdate);

    return () => {
      eventEmitter.off('count-update', handleCountUpdate);
      eventEmitter.off('newComment', handleNewComment);
      eventEmitter.off('post-engagement-updated', handleEngagementUpdate);
    };
  }, [setCounts]);

  return (
    <RealtimeContext.Provider
      value={{
        ...state,
        setCounts,
        initializePost,
        toggleReaction,
        toggleRepost,
        toggleBookmark,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      'useRealtime must be used within a RealtimeProvider'
    );
  }
  return context;
};
