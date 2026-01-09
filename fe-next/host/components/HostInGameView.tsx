'use client';

import React, { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import InGameScreen from '../../components/game/InGameScreen';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { BoardTheme } from '@/shared/types/socket';
import { useAuth } from '@/contexts/AuthContext';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface HostInGameViewProps {
  // Core props
  gameCode: string;
  username: string;
  roomLanguage: Language;
  t: (path: string, params?: Record<string, string | number>) => string;

  // Game state
  tableData: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  minWordLength: number;
  comboLevel: number;
  comboLevelRef: React.MutableRefObject<number>;

  // Host playing state
  hostPlaying: boolean;
  showStartAnimation: boolean;
  hostFoundWords: string[];
  onWordSubmit: (word: string) => void;

  // Players
  playersReady: (string | PlayerData)[];
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;

  // Actions
  onStopGame: () => void;
  socket: Socket | null;

  // Earthquake/Fire Round
  earthquakeState?: EarthquakeState;
  fireRoundActive?: boolean;
  fireRoundRemaining?: number;

  // Theme
  boardTheme?: BoardTheme | null;
}

// ==================== Component ====================

/**
 * HostInGameView - Wrapper that uses the unified InGameScreen component
 * Transforms host-specific props to the shared component interface
 */
const HostInGameView: React.FC<HostInGameViewProps> = ({
  // Core props
  gameCode,
  username,
  roomLanguage,
  t,

  // Game state
  tableData,
  remainingTime,
  timerValue,
  minWordLength,
  comboLevel,
  comboLevelRef,

  // Host playing state
  hostPlaying,
  showStartAnimation,
  hostFoundWords,
  onWordSubmit,

  // Players
  playersReady,
  playerScores,
  playerWordCounts,

  // Actions
  socket,

  // Earthquake/Fire Round
  earthquakeState = 'idle',
  fireRoundActive = false,
  fireRoundRemaining = 0,

  // Theme
  boardTheme,
}): React.ReactElement => {
  // Get player's game history for trail display logic
  const { profile } = useAuth();

  // Build leaderboard from players data
  const leaderboard = useMemo(() => {
    return [...playersReady].map(player => {
      const playerUsername = typeof player === 'string' ? player : player.username;
      const avatar = typeof player === 'object' ? player.avatar : null;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
      const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
      const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
      const isBot = typeof player === 'object' ? player.isBot : false;

      return {
        username: playerUsername,
        score: playerScores[playerUsername] || 0,
        wordCount: playerWordCounts[playerUsername] || 0,
        avatar: avatar || undefined,
        isHost: isHostPlayer,
        presenceStatus,
        isWindowFocused,
        isBot,
      };
    }).sort((a, b) => b.score - a.score);
  }, [playersReady, playerScores, playerWordCounts]);

  // Normalize found words to expected format
  const foundWords = useMemo(() => {
    return hostFoundWords.map((word, index) => ({
      word,
      isValid: true,
      timestamp: index,
    }));
  }, [hostFoundWords]);

  return (
    <InGameScreen
      // Core identity
      username={username}
      gameCode={gameCode}
      isHost={true}
      isPlaying={hostPlaying}
      gameplayFocusMode={hostPlaying}
      t={t}
      socket={socket}

      // Game state
      letterGrid={tableData}
      remainingTime={remainingTime}
      timerValue={timerValue}
      gameActive={true}
      showStartAnimation={showStartAnimation}
      gameLanguage={roomLanguage}
      minWordLength={minWordLength}
      comboLevel={comboLevel}
      comboLevelRef={comboLevelRef}

      // Player data
      foundWords={foundWords}
      leaderboard={leaderboard}

      // Callbacks
      onWordSubmit={onWordSubmit}

      // Earthquake/Fire Round
      earthquakeState={earthquakeState}
      fireRoundActive={fireRoundActive}
      fireRoundRemaining={fireRoundRemaining}

      // Theme
      boardTheme={boardTheme}

      // Player experience (for keyboard trail display)
      totalGamesPlayed={profile?.total_games}
    />
  );
};

export default HostInGameView;
