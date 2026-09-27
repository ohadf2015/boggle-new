import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useAchievementQueue } from '@/components/achievements';
import { useGameActive } from '@/hooks/gameState';
import { midRoundEventQueueStore } from './useMidRoundEventQueue';
import type { AchievementPayload } from '@/shared/types/socket';

interface AchievementsEnvelope {
  achievements?: AchievementPayload[];
}

export function useAchievementSocketBridge(socket: Socket | null): void {
  const { queueAchievement } = useAchievementQueue();
  const gameActive = useGameActive();
  // Mirror gameActive into a ref so the socket handler reads the latest value
  // without needing to rebind listeners on every gameActive flip.
  const gameActiveRef = useRef(gameActive);
  useEffect(() => {
    gameActiveRef.current = gameActive;
  }, [gameActive]);

  useEffect(() => {
    if (!socket) return;

    const handle = (data: AchievementsEnvelope | null | undefined) => {
      const list = data?.achievements;
      if (!Array.isArray(list) || list.length === 0) return;
      const enqueueMidRound = midRoundEventQueueStore.getState().enqueue;
      list.forEach((achievement) => {
        if (!achievement || typeof achievement.key !== 'string') return;
        if (gameActiveRef.current) {
          enqueueMidRound({ kind: 'achievementUnlocked', payload: achievement });
        } else {
          queueAchievement(achievement);
        }
      });
    };

    socket.on('liveAchievementUnlocked', handle);
    socket.on('lifetimeAchievementsUnlocked', handle);

    return () => {
      socket.off('liveAchievementUnlocked', handle);
      socket.off('lifetimeAchievementsUnlocked', handle);
    };
  }, [socket, queueAchievement]);
}
