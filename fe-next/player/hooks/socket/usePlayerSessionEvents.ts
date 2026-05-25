/**
 * Player Session Events Hook
 * Handles connection, presence, achievements, XP, and error events
 *
 * REFACTORED: Now uses GameStateContext instead of prop drilling
 */
import { useEffect, useMemo, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoInfoToast, wordErrorToast, TOAST_ICONS } from '../../../components/NeoToast';
import { clearSessionPreservingUsername } from '../../../utils/session';
import { throttleLatest } from '../../../utils/throttle';
import { socketErrorMessage } from '../../../utils/socketErrorMessage';
import { resolveHostLeftMessage } from '../../../lib/multiplayer/resolveHostLeftMessage';
import { processAchievements } from '@/shared/utils/achievementUtils';
import { createXpGainedHandler, createLevelUpHandler } from '@/shared/utils/xpUtils';
import { createConnectionHandlers } from '@/shared/utils/connectionUtils';
import { createPlayerPresenceHandler } from '@/shared/utils/presenceUtils';
import { useGameActions } from '@/hooks/gameState';
import logger from '@/utils/logger';
import type { AchievementPayload } from '@/shared/types/socket';
import type { LeaderboardEntry, LetterGrid } from '@/shared/types/game';
import type { Player } from '@/hooks/gameState/types';

interface UsePlayerSessionEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  username: string;
  queueAchievement: (achievement: AchievementPayload) => void;
  intentionalExitRef: MutableRefObject<boolean>;
}

interface UpdateUsersPayload { users?: Player[] }
interface ShufflingGridPayload {
  grid?: LetterGrid;
  highlightedCells?: Array<{ row: number; col: number }>;
}
interface LeaderboardUpdatePayload { leaderboard: LeaderboardEntry[] }

/** Coalesce the opponent-score leaderboard flood to ~6.7 updates/sec. */
const LEADERBOARD_THROTTLE_MS = 150;
interface LiveAchievementPayload { achievements?: unknown[] }
interface HostMessagePayload {
  message?: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
  gracePeriodMs?: number;
}
interface HostTransferredPayload {
  message?: string;
  newHost?: string;
  previousHost?: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}
interface SocketErrorEventPayload { code?: string; message?: string }

/**
 * Hook for managing player session-related socket events
 */
export function usePlayerSessionEvents({
  socket,
  t,
  username,
  queueAchievement,
  intentionalExitRef,
}: UsePlayerSessionEventsProps): void {
  // Get state setters from Zustand store (actions never trigger re-renders)
  const {
    setPlayers: setPlayersReady,
    setShufflingGrid,
    setHighlightedCells,
    setAchievements,
    setLeaderboard,
    setXpGainedData,
    setLevelUpData,
  } = useGameActions();
  // Create memoized handlers using shared utilities
  // Pass username to filter out self-notifications (e.g., player doesn't see "you reconnected" toast)
  const connectionHandlers = useMemo(
    () => createConnectionHandlers(t, 'PLAYER', username),
    [t, username]
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
    () => createXpGainedHandler(t, setXpGainedData, 'PLAYER'),
    [t, setXpGainedData]
  );
  const handleLevelUp = useMemo(
    () => createLevelUpHandler(t, setLevelUpData, 'PLAYER'),
    [t, setLevelUpData]
  );

  useEffect(() => {
    if (!socket) return;

    // Leaderboard updates stream in on every opponent's word in a busy room
    // (up to ~150/s in a 50-player game). Each raw setLeaderboard re-executes
    // PlayerView → InGameScreen, stealing frame budget from the player's own
    // word-drag RAF. Coalesce to ~6.7/s with the freshest payload: the leading
    // edge keeps the player's own score instant, the display is already frozen
    // mid-drag by useFrozenWhileSelecting, and 6.7/s is faster than anyone can
    // read a scoreboard. cancel() on cleanup avoids a post-unmount setState.
    const throttledSetLeaderboard = throttleLatest(
      (lb: LeaderboardEntry[]) => setLeaderboard(lb),
      LEADERBOARD_THROTTLE_MS,
    );

    const handleUpdateUsers = (data: UpdateUsersPayload) => {
      setPlayersReady(data.users || []);
    };

    const handleShufflingGridUpdate = (data: ShufflingGridPayload) => {
      if (data.grid) {
        setShufflingGrid(data.grid);
      }
      if (data.highlightedCells !== undefined) {
        setHighlightedCells(data.highlightedCells);
      }
    };

    const handleUpdateLeaderboard = (data: LeaderboardUpdatePayload) => {
      throttledSetLeaderboard(data.leaderboard);
    };

    const handleLiveAchievementUnlocked = (data: LiveAchievementPayload) => {
      const validAchievements = processAchievements(data, queueAchievement, 'PLAYER');
      if (validAchievements.length > 0) {
        setAchievements(prev => [...prev, ...validAchievements]);
      }
    };

    const handleHostDisconnected = (data: HostMessagePayload) => {
      logger.log('[PLAYER] Host disconnected, waiting for reconnection');
      neoInfoToast(
        resolveHostLeftMessage(data, t, 'playerView.hostDisconnected'),
        { icon: TOAST_ICONS.hourglass, duration: 5000 }
      );
    };

    const handleHostTransferred = (data: HostTransferredPayload) => {
      logger.log('[PLAYER] Host transferred to:', data.newHost);
      // Silent — the host crown moves on the player roster, no toast needed.
    };

    const handleSessionTakenOver = (data: HostMessagePayload) => {
      logger.log('[PLAYER] Session taken over by another tab');
      intentionalExitRef.current = true;
      clearSessionPreservingUsername(username);
      neoInfoToast(data.message || t('playerView.sessionMovedToAnotherTab') || 'Session moved to another tab', {
        icon: TOAST_ICONS.smartphone,
        duration: 3000
      });
    };

    const handleSessionMigrated = (data: HostMessagePayload) => {
      logger.log('[PLAYER] Session migrated to different room');
      intentionalExitRef.current = true;
      clearSessionPreservingUsername(username);
      neoInfoToast(data.message || t('playerView.sessionMovedToAnotherRoom') || 'Session moved to another room', {
        duration: 3000
      });
    };

    const handleError = (data: SocketErrorEventPayload) => {
      const message = socketErrorMessage(data, t);
      wordErrorToast(message, { duration: 3000 });
    };

    const handleRateLimited = () => {
      wordErrorToast(t('playerView.tooFast') || 'Slow down! Submitting too fast', { duration: 2000 });
    };

    // Register listeners
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('playerPresenceUpdate', handlePlayerPresenceUpdate);
    socket.on('shufflingGridUpdate', handleShufflingGridUpdate);
    socket.on('updateLeaderboard', handleUpdateLeaderboard);
    socket.on('liveAchievementUnlocked', handleLiveAchievementUnlocked);
    socket.on('hostDisconnected', handleHostDisconnected);
    socket.on('hostTransferred', handleHostTransferred);
    socket.on('playerDisconnected', handlePlayerDisconnected);
    socket.on('playerReconnected', handlePlayerReconnected);
    socket.on('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('sessionTakenOver', handleSessionTakenOver);
    socket.on('sessionMigrated', handleSessionMigrated);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);
    socket.on('error', handleError);
    socket.on('rateLimited', handleRateLimited);

    return () => {
      throttledSetLeaderboard.cancel();
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('playerPresenceUpdate', handlePlayerPresenceUpdate);
      socket.off('shufflingGridUpdate', handleShufflingGridUpdate);
      socket.off('updateLeaderboard', handleUpdateLeaderboard);
      socket.off('liveAchievementUnlocked', handleLiveAchievementUnlocked);
      socket.off('hostDisconnected', handleHostDisconnected);
      socket.off('hostTransferred', handleHostTransferred);
      socket.off('playerDisconnected', handlePlayerDisconnected);
      socket.off('playerReconnected', handlePlayerReconnected);
      socket.off('playerConnectionStatusChanged', handlePlayerConnectionStatusChanged);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('sessionTakenOver', handleSessionTakenOver);
      socket.off('sessionMigrated', handleSessionMigrated);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
      socket.off('error', handleError);
      socket.off('rateLimited', handleRateLimited);
    };
    // Setters are stable from context (wrapped in useCallback)
  }, [
    socket,
    t,
    username,
    queueAchievement,
    setPlayersReady,
    setShufflingGrid,
    setHighlightedCells,
    setAchievements,
    setLeaderboard,
    setXpGainedData,
    setLevelUpData,
    intentionalExitRef,
    handlePlayerDisconnected,
    handlePlayerReconnected,
    handlePlayerConnectionStatusChanged,
    handlePlayerLeft,
    handlePlayerPresenceUpdate,
    handleXpGained,
    handleLevelUp,
  ]);
}
