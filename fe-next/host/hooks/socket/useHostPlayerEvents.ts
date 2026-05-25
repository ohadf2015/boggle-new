/**
 * Host Player Events Hook
 * Handles player management socket events: updateUsers, presence, achievements, XP, connection status
 */
import { useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { neoInfoToast, TOAST_ICONS } from '../../../components/NeoToast';
import { processAchievements } from '@/shared/utils/achievementUtils';
import { createXpGainedHandler, createLevelUpHandler } from '@/shared/utils/xpUtils';
import { createConnectionHandlers } from '@/shared/utils/connectionUtils';
import { createPlayerPresenceHandler } from '@/shared/utils/presenceUtils';
import { throttleLatest } from '../../../utils/throttle';
import logger from '@/utils/logger';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload } from '@/shared/types/socket';
import type { GameUser } from '@/shared/types/game';
import type { Player } from '@/hooks/useGameState';

interface LeaderboardWirePlayer {
  username: string;
  score: number;
  wordCount?: number;
}

/** Coalesce the opponent-score leaderboard flood to ~6.7 updates/sec. */
const LEADERBOARD_THROTTLE_MS = 150;

interface UseHostPlayerEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  hostUsername?: string;
  queueAchievement: (achievement: AchievementPayload) => void;

  // State setters
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, unknown[]>>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<unknown[]>>;

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
  hostUsername,
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
  // Pass hostUsername to filter out self-notifications when host is also playing
  const connectionHandlers = useMemo(
    () => createConnectionHandlers(t, 'HOST', hostUsername),
    [t, hostUsername]
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

    // Coalesce the opponent-score leaderboard flood (one event per word in a
    // busy room) to ~6.7/s with the freshest payload, so a host who is also
    // playing doesn't lose word-drag frame budget to per-event re-renders.
    const throttledApplyLeaderboard = throttleLatest((leaderboard: LeaderboardWirePlayer[]) => {
      const newScores: Record<string, number> = {};
      const newWordCounts: Record<string, number> = {};
      leaderboard.forEach((entry) => {
        newScores[entry.username] = entry.score;
        if (entry.wordCount !== undefined) {
          newWordCounts[entry.username] = entry.wordCount;
        }
      });
      setPlayerScores(newScores);
      setPlayerWordCounts(prev => ({ ...prev, ...newWordCounts }));
    }, LEADERBOARD_THROTTLE_MS);

    const handleUpdateUsers = (data: { users: Array<GameUser | string> }) => {
      const newUsers = (data.users || []) as Player[];
      setPlayersReady(newUsers);

      const currentUsernames = new Set((data.users || []).map((u) =>
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
        const filtered: Record<string, unknown[]> = {};
        Object.keys(prev).forEach(uname => {
          if (currentUsernames.has(uname)) {
            filtered[uname] = prev[uname] ?? [];
          }
        });
        return filtered;
      });
    };

    const handlePlayerJoinedLate = (data: { username: string }) => {
      neoInfoToast(`${data.username} ${t('hostView.playerJoinedLate')}`, {
        icon: TOAST_ICONS.rocket,
        duration: 4000,
      });
    };

    const handlePlayerFoundWord = (data: { username: string; word: string; wordCount: number; score: number; comboLevel: number }) => {
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

    const handleUpdateLeaderboard = (data: { leaderboard: LeaderboardWirePlayer[] }) => {
      if (!data.leaderboard || !Array.isArray(data.leaderboard)) return;
      throttledApplyLeaderboard(data.leaderboard);
    };

    const handleAchievementUnlocked = (data: { username?: string; achievement?: AchievementPayload }) => {
      if (!hostPlaying && data.username && data.achievement) {
        const username = data.username;
        const achievement = data.achievement;
        setPlayerAchievements(prev => ({
          ...prev,
          [username]: [...(prev[username] || []), achievement]
        }));
      }
    };

    const handleLiveAchievementUnlocked = (data: { achievements: AchievementPayload[] }) => {
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
      throttledApplyLeaderboard.cancel();
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
