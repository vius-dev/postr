
import React, { createContext, useContext, useEffect, useState } from 'react';
import { eventEmitter } from '@/lib/EventEmitter';

interface RealtimeState {
  likeCounts: {
    [postId: string]: number;
  };
}

interface RealtimeContextType extends RealtimeState {
  setLikeCount: (postId: string, count: number) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RealtimeState>({ likeCounts: {} });

  const setLikeCount = (postId: string, count: number) => {
    setState((prevState) => ({
      ...prevState,
      likeCounts: {
        ...prevState.likeCounts,
        [postId]: count,
      },
    }));
  };

  useEffect(() => {
    const handleLikeCountUpdate = ({ postId, count }: { postId: string, count: number }) => {
      setLikeCount(postId, count);
    };

    eventEmitter.on('like-count-update', handleLikeCountUpdate);

    return () => {
      eventEmitter.off('like-count-update', handleLikeCountUpdate);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ ...state, setLikeCount }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
