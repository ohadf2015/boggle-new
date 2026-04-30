import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useAchievementQueue } from '@/components/achievements';
import type { AchievementPayload } from '@/shared/types/socket';

interface AchievementsEnvelope {
  achievements?: AchievementPayload[];
}

export function useAchievementSocketBridge(socket: Socket | null): void {
  const { queueAchievement } = useAchievementQueue();

  useEffect(() => {
    if (!socket) return;

    const handle = (data: AchievementsEnvelope | null | undefined) => {
      const list = data?.achievements;
      if (!Array.isArray(list) || list.length === 0) return;
      list.forEach((achievement) => {
        if (achievement && typeof achievement.key === 'string') {
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
