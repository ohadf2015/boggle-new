/**
 * Host Player Events Hook
 * Handles player management socket events: updateUsers, presence, achievements, XP, connection status
 */
import { useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { neoInfoToast } from '../../../components/NeoToast';
import { processAchievements } from '@/shared/utils/achievementUtils';
import { createXpGainedHandler, createLevelUpHandler } from '@/shared/utils/xpUtils';
import { createConnectionHandlers } from '@/shared/utils/connectionUtils';
import { createPlayerPresenceHandler } from '@/shared/utils/presenceUtils';
import logger from '@/utils/logger';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload } from '@/shared/types/socket';
import type { LeaderboardEntry } from '@/shared/types/game';

interface Player {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

interface UseHostPlayerEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  queueAchievement: (achievement: AchievementPayload) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<any[]>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;
}

/**
 * Hook for managing host player-related socket events
 */
export function useHostPlayerEvents({
  socket,
  t,
  hostPlaying,
  queueAchievement,
  setPlayersReady,
  setPlayerWordCounts,
  setPlayerScores,
  setPlayerAchievements,
  setHostAchievements,
  setXpGainedData,
  setLevelUpData,
}: UseHostPlayerEventsProps): void {
  // Create memoized handlers using shared utilities
  const connectionHandlers = useMemo(
    () => createConnectionHandlers(t, 'HOST'),
    [t]
  );
  const {
    handlePlayerDisconnected,
    handlePlayerReconnected,
    handlePlayerConnectionStatusChanged,
    handlePlayerLeft,
  } = connectionHandlers;

  const handlePlayerPresenceUpdate = useMemo(
    () => createPlayerPresenceHandler(setPlayersReady),
    [setPlayersReady]
  );
  const handleXpGained = useMemo(
    () => createXpGainedHandler(t, setXpGainedData, 'HOST'),
    [t, setXpGainedData]
  );
  const handleLevelUp = useMemo(
    () => createLevelUpHandler(t, setLevelUpData, 'HOST'),
    [t, setLevelUpData]
  );

  useEffect(() => {
    if (!socket) return;

    const handleUpdateUsers = (data: any) => {
      const newUsers = data.users || [];
      setPlayersReady(newUsers);

      const currentUsernames = new Set(newUsers.map((u: string | Player) =>
        typeof u === 'string' ? u : u.username
      ));

      // Filter out players who left
      setPlayerScores(prev => {
        const filtered: Record<string, number> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname] ?? 0;
          }
        });
        return filtered;
      });

      setPlayerWordCounts(prev => {
        const filtered: Record<string, number> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname] ?? 0;
          }
        });
        return filtered;
      });

      setPlayerAchievements(prev => {
        const filtered: Record<string, any[]> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname] ?? [];
          }
        });
        return filtered;
      });
    };

    const handlePlayerJoinedLate = (data: any) => {
      neoInfoToast(`${data.username} ${t('hostView.playerJoinedLate')}`, {
        icon: '🚀',
        duration: 4000,
      });
    };

    const handlePlayerFoundWord = (data: any) => {
      setPlayerWordCounts(prev => ({
        ...prev,
        [data.username]: data.wordCount
      }));
      if (data.score !== undefined) {
        setPlayerScores(prev => ({
          ...prev,
          [data.username]: data.score
        }));
      }
    };

    const handleUpdateLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      if (!data.leaderboard || !Array.isArray(data.leaderboard)) return;

      const newScores: Record<string, number> = {};
      const newWordCounts: Record<string, number> = {};

      data.leaderboard.forEach((entry: LeaderboardEntry) => {
        newScores[entry.username] = entry.score;
        if ((entry as any).wordCount !== undefined) {
          newWordCounts[entry.username] = (entry as any).wordCount;
        }
      });

      setPlayerScores(newScores);
      setPlayerWordCounts(prev => ({ ...prev, ...newWordCounts }));
    };

    const handleAchievementUnlocked = (data: any) => {
      if (!hostPlaying && data.username && data.achievement) {
        setPlayerAchievements(prev => ({
          ...prev,
          [data.username]: [...(prev[data.username] || []), data.achievement]
        }));
      }
    };

    const handleLiveAchievementUnlocked = (data: any) => {
      const validAchievements = processAchievements(data, queueAchievement, 'HOST');
      if (hostPlaying && validAchievements.length > 0) {
        setHostAchievements(prev => [...prev, ...validAchievements]);
      }
    };

    // Register listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerPresenceUpdate', handlePlayerPresenceUpdate);
    socket.on('playerJoinedLate', handlePlayerJoinedLate);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('updateLeaderboard', handleUpdateLeaderboard);
    socket.on('leaderboardUpdate', handleUpdateLeaderboard); // Same handler for bot updates
    socket.on('achievementUnlocked', handleAchievementUnlocked);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('playerDisconnected', handlePlayerDisconnected);
    socket.on('playerReconnected', handlePlayerReconnected);
    socket.on('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerPresenceUpdate', handlePlayerPresenceUpdate);
      socket.off('playerJoinedLate', handlePlayerJoinedLate);
      socket.off('playerFoundWord', handlePlayerFoundWord);
      socket.off('updateLeaderboard', handleUpdateLeaderboard);
      socket.off('leaderboardUpdate', handleUpdateLeaderboard);
      socket.off('achievementUnlocked', handleAchievementUnlocked);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('playerDisconnected', handlePlayerDisconnected);
      socket.off('playerReconnected', handlePlayerReconnected);
      socket.off('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
    };
  }, [
    socket,
    t,
    hostPlaying,
    queueAchievement,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setHostAchievements,
    handlePlayerDisconnected,
    handlePlayerReconnected,
    handlePlayerConnectionStatusChanged,
    handlePlayerLeft,
    handlePlayerPresenceUpdate,
    handleXpGained,
    handleLevelUp,
  ]);
}
