'use client';

import React, { useCallback, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import InGameScreen from '../../components/game/InGameScreen';
import { BlastGame } from '@/components/blast/BlastGame';
import { useBlastMultiplayerBridge } from '@/components/blast/hooks/useBlastMultiplayerBridge';
import { WordHuntGame } from '@/components/wordhunt/WordHuntGame';
import { QuickReactions, FloatingReaction } from '@/components/game/QuickReactions';
import { AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { BoardTheme } from '@/shared/types/socket';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGameMode,
  useBlastTileOverlay,
  useWordHuntTargetLength,
  useWordHuntMyLife,
  useWordHuntTargetAttempts,
  useWordHuntTargetFound,
  useWordHuntPlayerLives,
  useWordHuntEliminatedPlayers,
} from '@/hooks/gameState/store';

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

  // Blast multiplayer: total game duration for CircularTimer progress ring
  totalTime?: number;
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

  // Blast multiplayer
  totalTime,
}): React.ReactElement => {
  // Get player's game history for trail display logic
  const { profile } = useAuth();

  // Game mode state from Zustand
  const gameMode = useGameMode();
  const blastTileOverlay = useBlastTileOverlay();
  const wordHuntTargetLength = useWordHuntTargetLength();
  const wordHuntLife = useWordHuntMyLife();
  const wordHuntAttempts = useWordHuntTargetAttempts();
  const wordHuntFound = useWordHuntTargetFound();
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();

  // Quick emoji reactions for multiplayer
  const { floatingReactions, sendReaction, dismissReaction } = useQuickReactions({
    socket: socket ?? null,
    username,
  });

  // Blast multiplayer bridge — converts Zustand state to BlastGame props
  const blastBridge = useBlastMultiplayerBridge({
    letterGrid: tableData,
    gridSize: tableData?.[0]?.length ?? 4,
  });

  // Blast multiplayer: emit word + comboType to server via socket
  const handleBlastWordWithCombo = useCallback((word: string, comboType: string | null) => {
    if (!socket) return;
    socket.emit('submitWord', { word, comboType });
  }, [socket]);

  // Word hunt guess handler — emits to server
  const handleWordHuntGuess = useCallback((guess: string) => {
    if (!socket) return;
    socket.emit('submitTargetWord', { guess });
  }, [socket]);

  // Build leaderboard from players data
  const leaderboard = useMemo(() => {
    return [...playersReady].map(player => {
      const playerUsername = typeof player === 'string' ? player : player.username;
      const avatar = typeof player === 'object' ? player.avatar : null;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
      const presenceStatus = typeof player === 'object' ? player.presenceStatus : 'active' as PresenceStatus;
      const isWindowFocused = typeof player === 'object' ? player.isWindowFocused : true;
      const isBot = typeof player === 'object' ? player.isBot : false;
      const disconnected = typeof player === 'object' ? player.disconnected : false;

      return {
        username: playerUsername,
        score: playerScores[playerUsername] || 0,
        wordCount: playerWordCounts[playerUsername] || 0,
        avatar: avatar || undefined,
        isHost: isHostPlayer,
        presenceStatus,
        isWindowFocused,
        isBot,
        disconnected,
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

  // Blast with host playing: use dedicated BlastGame (same as PlayerInGameView)
  if (gameMode === 'blast' && hostPlaying) {
    return (
      <BlastGame
        config={blastBridge.config}
        mode="multiplayer"
        remainingTime={remainingTime}
        totalTime={totalTime}
        leaderboard={leaderboard}
        username={username}
        onGameEnd={() => {/* Server controls game end in multiplayer */}}
        onQuit={() => {/* Host uses stop game, not quit */}}
        onWordWithComboType={handleBlastWordWithCombo}
        initialTileStates={blastBridge.initialTileStates}
        blastSeed={blastBridge.blastSeed}
      />
    );
  }

  // Word-hunt with host playing: use dedicated WordHuntGame
  if (gameMode === 'word-hunt' && hostPlaying) {
    return (
      <WordHuntGame
        grid={tableData}
        gameLanguage={roomLanguage}
        leaderboard={leaderboard}
        username={username}
        score={leaderboard.find(p => p.username === username)?.score ?? 0}
        onQuit={() => {/* Host uses stop game, not quit */}}
        onWordSubmit={onWordSubmit}
        onWordHuntGuess={handleWordHuntGuess}
        gameActive={true}
        minWordLength={minWordLength}
        socket={socket}
        foundWords={foundWords}
      />
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Quick Reactions overlay for host */}
      {leaderboard.length > 1 && hostPlaying && (
        <>
          <div className="absolute inset-0 pointer-events-none z-40">
            <AdaptiveAnimatePresence>
              {floatingReactions.map((r) => (
                <FloatingReaction key={r.id} id={r.id} emoji={r.emoji} username={r.username} x={r.x} y={r.y} onComplete={dismissReaction} />
              ))}
            </AdaptiveAnimatePresence>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 md:bottom-auto md:top-1/2 md:left-auto md:right-2 md:-translate-y-1/2 md:translate-x-0">
            <QuickReactions onReaction={sendReaction} layout="bar" className="md:hidden" />
            <QuickReactions onReaction={sendReaction} layout="vertical" className="hidden md:flex" />
          </div>
        </>
      )}
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

      // Game mode overlays
      gameMode={gameMode ?? undefined}
      blastTileOverlay={blastTileOverlay}
      wordHuntTargetLength={wordHuntTargetLength}
      wordHuntAttempts={wordHuntAttempts}
      wordHuntFound={wordHuntFound}
      wordHuntLife={wordHuntLife}
      wordHuntPlayerLives={wordHuntPlayerLives}
      wordHuntEliminatedPlayers={wordHuntEliminatedPlayers}
      onWordHuntGuess={hostPlaying ? handleWordHuntGuess : undefined}

      // Player experience (for keyboard trail inactivity threshold)
      totalGamesPlayed={profile?.total_games}
    />
    </div>
  );
};

export default HostInGameView;
