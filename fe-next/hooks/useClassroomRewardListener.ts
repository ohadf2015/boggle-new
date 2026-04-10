'use client';

/**
 * useClassroomRewardListener — F-24 client wiring
 *
 * Subscribes to the enriched `classroomGameEnded` socket event and exposes
 * the current user's reward (xpEarned + lessonIds) so a celebration toast
 * or modal can fire. Zero-XP rewards are filtered out — nothing to
 * celebrate and we don't want to spam the user.
 *
 * The hook is read-only and non-invasive: it uses `useSocketOptional` so
 * it safely no-ops when the student hub isn't inside a SocketProvider.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';

export interface ClassroomReward {
  userId: string;
  xpEarned: number;
  lessonIds: string[];
  gameCode: string;
}

interface ClassroomGameEndedPayload {
  gameCode: string;
  rewards?: Array<{
    userId: string;
    xpEarned: number;
    lessonIds: string[];
  }>;
}

export function useClassroomRewardListener(userId: string | undefined | null) {
  const ctx = useSocketOptional();
  const socket = ctx?.socket ?? null;
  const [reward, setReward] = useState<ClassroomReward | null>(null);

  const clearReward = useCallback(() => setReward(null), []);

  useEffect(() => {
    if (!socket || !userId) return;

    const handler = (data: ClassroomGameEndedPayload) => {
      const own = data.rewards?.find(r => r.userId === userId);
      if (!own || own.xpEarned <= 0) return;
      setReward({
        userId: own.userId,
        xpEarned: own.xpEarned,
        lessonIds: own.lessonIds,
        gameCode: data.gameCode,
      });
    };

    socket.on('classroomGameEnded', handler);
    return () => {
      socket.off('classroomGameEnded', handler);
    };
  }, [socket, userId]);

  return { reward, clearReward };
}
