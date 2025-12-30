'use client';

import React, { memo, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import TvJoinBar from './tv-broadcast/TvJoinBar';
import TvGameHeader from './tv-broadcast/TvGameHeader';
import TvGrid from './tv-broadcast/TvGrid';
import TvLeaderboard from './tv-broadcast/TvLeaderboard';
import TvNotificationQueue from './tv-broadcast/TvNotificationQueue';
import { useTvPlayerCombos } from '../hooks/useTvPlayerCombos';
import { useTvNotifications } from '../hooks/useTvNotifications';
import { useTvSounds } from '../hooks/useTvSounds';
import type { Language, LetterGrid, Avatar as AvatarType } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
}

interface TvBroadcastViewProps {
  // Core props
  gameCode: string;
  username: string; // Host username
  roomLanguage: Language;
  roomName?: string;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game state
  tableData: LetterGrid;
  remainingTime: number | null;
  timerValue: number; // in minutes

  // Players
  playersReady: (string | PlayerData)[];
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;

  // Socket
  socket: Socket | null;

  // Earthquake/Fire Round
  earthquakeState?: EarthquakeState;
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;
}

// ==================== Component ====================

/**
 * TvBroadcastView - TV-optimized spectator view for multiplayer games
 * Shows when host is NOT playing - perfect for TV/projector display
 * Features:
 * - Kahoot-style join bar with QR code
 * - Large letter grid
 * - Live leaderboard with combo indicators
 * - Exciting real-time notifications
 */
const TvBroadcastView = memo<TvBroadcastViewProps>(({
  // Core props
  gameCode,
  username,
  roomName,

  // Game state
  tableData,
  remainingTime,
  timerValue,

  // Players
  playersReady,
  playerScores,
  playerWordCounts,

  // Socket
  socket,

  // Earthquake/Fire Round
  earthquakeState = 'idle',
  fireRoundActive = false,
  fireRoundRemaining = 0,
}) => {
  // Track player combos
  const { playerCombos } = useTvPlayerCombos({
    socket,
    enabled: true,
  });

  // Sound effects
  const { playSound } = useTvSounds({
    enabled: true,
    volume: 0.7,
  });

  // Notifications with sound integration
  const { notifications, dismissNotification } = useTvNotifications({
    socket,
    enabled: true,
    onNotification: (notification) => {
      playSound(notification.tier);
    },
  });

  // Build leaderboard data
  const leaderboardData = useMemo(() => {
    return playersReady.map(player => {
      const playerUsername = typeof player === 'string' ? player : player.username;
      const avatar = typeof player === 'object' ? player.avatar : null;
      const isHost = typeof player === 'object' ? player.isHost : false;

      return {
        username: playerUsername,
        score: playerScores[playerUsername] || 0,
        wordCount: playerWordCounts[playerUsername] || 0,
        avatar: avatar || undefined,
        isHost: isHost || playerUsername === username,
      };
    });
  }, [playersReady, playerScores, playerWordCounts, username]);

  const isEarthquakeShaking = earthquakeState === 'shaking';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
      {/* Join Bar (Kahoot-style) */}
      <TvJoinBar
        gameCode={gameCode}
        roomName={roomName}
        playerCount={playersReady.length}
      />

      {/* Game Header with Timer */}
      <TvGameHeader
        remainingTime={remainingTime}
        timerValue={timerValue}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        earthquakeState={earthquakeState}
      />

      {/* Main Content: Grid + Leaderboard (50/50) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left: Grid */}
        <div className="flex-1 bg-neo-cream rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden">
          {tableData && tableData.length > 0 ? (
            <TvGrid
              grid={tableData}
              fireRoundActive={fireRoundActive}
              earthquakeShaking={isEarthquakeShaking}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-neo-black/50 font-bold text-xl">Waiting for game...</p>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div className="flex-1 bg-neo-cream rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden">
          <TvLeaderboard
            players={leaderboardData}
            playerCombos={playerCombos}
            hostUsername={username}
          />
        </div>
      </div>

      {/* Notification Overlay */}
      <TvNotificationQueue
        notifications={notifications}
        onDismiss={dismissNotification}
        maxVisible={1}
      />
    </div>
  );
});

TvBroadcastView.displayName = 'TvBroadcastView';

export default TvBroadcastView;
