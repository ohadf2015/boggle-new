'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import { useSocket } from '../utils/SocketContext';
import { clearSessionPreservingUsername } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { usePresence } from '../hooks/usePresence';
import { useHints } from '../hooks/useHints';
import logger from '@/utils/logger';
import type { LetterGrid, Language, Avatar, GridPosition, TournamentStanding } from '@/types';
import type {
  LiveLeaderboardEntry as LeaderboardEntry,
  ViewTournamentData as TournamentData,
  XpGainedData,
  LevelUpData,
} from '@/shared/types/view';

// Extracted components
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerWaitingResultsView from './components/PlayerWaitingResultsView';
import PlayerInGameView from './components/PlayerInGameView';

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';
import { resetComboState } from '@/shared/utils/comboUtils';
import { useGameStateContext } from '@/contexts/GameStateContext';

// ==========================================
// Type Definitions
// ==========================================

interface Player {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface PendingGameStart {
  letterGrid?: LetterGrid;
  timerSeconds?: number;
  language?: Language;
  minWordLength?: number;
  messageId?: string;
}

interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string;
  };
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

interface PlayerViewProps {
  onShowResults: (data: unknown) => void;
  initialPlayers?: Player[];
  username: string;
  gameCode: string;
  pendingGameStart?: PendingGameStart | null;
  onGameStartConsumed?: () => void;
}

// ==========================================
// Component
// ==========================================

/**
 * PlayerView - Main player component managing game state and views
 * Memoized to prevent unnecessary re-renders from parent updates
 */
const PlayerView: React.FC<PlayerViewProps> = memo(({
  onShowResults,
  initialPlayers = [],
  username,
  gameCode,
  pendingGameStart,
  onGameStartConsumed
}) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const intentionalExitRef = useRef<boolean>(false);

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

  // Use foundWords and boardTheme from GameStateContext (shared with usePlayerWordEvents)
  const { foundWords, setFoundWords, boardTheme } = useGameStateContext();

  // Game state
  const [word, setWord] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [letterGrid, setLetterGrid] = useState<LetterGrid | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [waitingForResults, setWaitingForResults] = useState<boolean>(false);
  const [showStartAnimation, setShowStartAnimation] = useState<boolean>(false);
  const [minWordLength, setMinWordLength] = useState<number>(2);

  // Player state
  const [playersReady, setPlayersReady] = useState<Player[]>(initialPlayers);

  // Calculate human player count (exclude bots)
  const humanPlayerCount = playersReady.filter(p => !p.isBot && !p.disconnected).length;

  // Enable hints for single-player mode
  const hints = useHints({
    socket,
    playerCount: humanPlayerCount,
    gameActive,
  });
  const [shufflingGrid, setShufflingGrid] = useState<LetterGrid | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<GridPosition[]>([]);
  const [gameLanguage, setGameLanguage] = useState<Language | null>(null);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Track active game session
  const [wasInActiveGame, setWasInActiveGame] = useState<boolean>(false);

  // Combo system
  const [comboLevel, setComboLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboLevelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);

  // Combo shield system
  const comboShieldsUsedRef = useRef<number>(0);

  // Tournament state
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [tournamentStandings, setTournamentStandings] = useState<TournamentStanding[]>([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState<boolean>(false);

  // Word feedback state
  const [showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [wordToVote, setWordToVote] = useState<WordToVote | null>(null);

  // XP and Level state
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // Earthquake/Fire Round state
  const [earthquakeState, setEarthquakeState] = useState<'idle' | 'warning' | 'shaking' | 'fire-round'>('idle');
  const [fireRoundActive, setFireRoundActive] = useState(false);
  const [fireRoundRemaining, setFireRoundRemaining] = useState(0);

  // Music refs
  const hasTriggeredUrgentMusicRef = useRef<boolean>(false);
  const totalGameTimeRef = useRef<number>(180); // Default 3 minutes, updated on game start
  const earthquakeMusicActiveRef = useRef<boolean>(false); // Track if earthquake music is playing

  // Use custom hook for socket events (now uses GameStateContext - no more prop drilling!)
  usePlayerSocketEvents({
    socket,
    t,
    inputRef,
    username,
    queueAchievement,
    playComboSound,
    fireRoundActive,
    onShowResults,
    setShowWordFeedback,
    setWordToVote,
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    intentionalExitRef,
    totalGameTimeRef,
    // Start music immediately when startGame event is received for better synchronization
    onGameStart: () => {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false;
    },
  });

  // Reset urgent music ref when game becomes active (for urgent music trigger)
  useEffect(() => {
    if (gameActive) {
      // Note: Music is now started in onGameStart callback for better synchronization
      // This effect only resets the urgent music ref as a safety measure
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameActive]);

  // Urgent music trigger - plays after 33% of game time has elapsed
  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      // Trigger when 33% of time has elapsed (67% remaining)
      const triggerThreshold = totalGameTimeRef.current * 0.67;
      if (remainingTime <= triggerThreshold) {
        hasTriggeredUrgentMusicRef.current = true;
        // Only play if earthquake music is not active (earthquake music takes priority)
        if (!earthquakeMusicActiveRef.current) {
          fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 1000, 1000);
        }
      }
    }
    // When time runs out, music will transition to bossa for results validation (handled by waitingForResults effect)
  }, [remainingTime, gameActive, fadeToTrack, TRACKS]);

  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 3 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameActive, playCountdownBeep]);

  // Earthquake/Fire Round music - plays bossa-arcade during earthquake phases
  useEffect(() => {
    if (!gameActive) return;

    // When earthquake starts (warning, shaking, or fire-round), play bossa-arcade
    if (earthquakeState !== 'idle' && !earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = true;
      fadeToTrack(TRACKS.BOSSA_ARCADE, 800, 800);
    }

    // When earthquake ends, keep playing bossa-arcade (don't restore to previous track)
    // This provides a consistent experience - earthquake music stays for remainder of game
    if (earthquakeState === 'idle' && earthquakeMusicActiveRef.current) {
      earthquakeMusicActiveRef.current = false;
      // Keep bossa-arcade playing - no track restoration needed
    }
  }, [earthquakeState, gameActive, remainingTime, fadeToTrack, TRACKS]);

  // Results validation music - plays bossa when entering results phase
  useEffect(() => {
    if (waitingForResults) {
      // Transition to bossa for results validation and results page
      fadeToTrack(TRACKS.BOSSA, 1500, 1500);
    }
  }, [waitingForResults, fadeToTrack, TRACKS]);

  // Client-side countdown timer
  useEffect(() => {
    if (!gameActive) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(intervalId);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameActive]);

  // Keep refs in sync
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  // Activate game when countdown animation completes
  useEffect(() => {
    if (!showStartAnimation && letterGrid && remainingTime && remainingTime > 0 && !gameActive && !waitingForResults) {
      logger.log('[PLAYER] Countdown animation complete, activating game');
      setGameActive(true);
    }
  }, [showStartAnimation, letterGrid, remainingTime, gameActive, waitingForResults]);

  // Clear shuffling grid when game starts
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      setHighlightedCells([]);
    }
  }, [gameActive]);

  // Clear game state on mount and cleanup
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);
    setAchievements([]);

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, [setFoundWords]);

  // Update players from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Handle pending game start
  useEffect(() => {
    if (!pendingGameStart || !socket || !onGameStartConsumed) {
      return;
    }

    logger.log('[PLAYER] Processing pending game start:', pendingGameStart);

    setWasInActiveGame(true);
    setFoundWords([]);
    setAchievements([]);

    // For late joins, show waiting screen briefly before starting animation
    // This gives visual confirmation that the player successfully joined the room
    const isLateJoin = pendingGameStart.messageId?.startsWith('late-join-');
    const delay = isLateJoin ? 1500 : 0; // 1.5 second delay for late joins to show room code

    // Set game language immediately so waiting screen shows correct language
    if (pendingGameStart.language) setGameLanguage(pendingGameStart.language);

    const startGame = () => {
      // Set game data and start animation
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        setRemainingTime(pendingGameStart.timerSeconds);
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
      }
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      setShowStartAnimation(true);

      // Trigger music immediately for synchronization (same as onGameStart callback)
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false;

      if (pendingGameStart.messageId) {
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }
    };

    onGameStartConsumed();

    if (delay > 0) {
      // Late join - delay to show waiting screen briefly
      const startAnimationTimer = setTimeout(startGame, delay);
      return () => clearTimeout(startAnimationTimer);
    } else {
      // Normal game start - no delay
      startGame();
      return;
    }
  }, [pendingGameStart, socket, onGameStartConsumed, fadeToTrack, TRACKS]);

  // Exit handlers
  const handleExitRoom = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowExitConfirm(true);
  }, []);

  const confirmExitRoom = useCallback(() => {
    logger.log('[PLAYER] Exit confirmed, closing connection');
    intentionalExitRef.current = true;

    try {
      if (socket && gameCode && username) {
        logger.log('[PLAYER] Emitting leaveRoom event');
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[PLAYER] Error emitting leaveRoom event:', error);
    }

    clearSessionPreservingUsername(username);

    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        logger.error('[PLAYER] Error disconnecting socket:', error);
      }
      window.location.reload();
    }, 200);
  }, [socket, gameCode, username]);

  // Word submission handler - adds word with pending validation state
  // Uses WordDetail type from GameStateContext
  const handleWordSubmit = useCallback((formedWord: string) => {
    setFoundWords(prev => [...prev, {
      word: formedWord,
      score: 0, // Will be updated when validated
      validated: false, // Pending validation - will be updated by usePlayerWordEvents
      isDuplicate: false,
    }]);
  }, [setFoundWords]);

  // Map WordDetail (from context) to FoundWord (expected by components)
  // This ensures type compatibility between context and view components
  const mappedFoundWords = useMemo(() =>
    foundWords.map(w => ({
      word: w.word,
      isValid: w.validated === true ? true : w.validated === false ? null : null,
      score: w.score,
      duplicate: w.isDuplicate,
      comboBonus: w.comboBonus,
      fireRoundBonus: w.fireRoundBonus,
    })),
    [foundWords]
  );

  // Reset combo handler (for client-side duplicate detection)
  const handleResetCombo = useCallback(() => {
    resetComboState(
      { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
      { setComboLevel, setLastWordTime }
    );
  }, []);

  // Render appropriate view
  if (waitingForResults) {
    return (
      <>
        {showStartAnimation && (
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        )}
        <PlayerWaitingResultsView
          username={username}
          gameCode={gameCode}
          t={t}
          dir={dir}
          leaderboard={leaderboard}
          foundWords={mappedFoundWords}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
        />
      </>
    );
  }

  // Show game board during countdown animation when we have letterGrid
  // This allows players to see the board while countdown is active
  // Also covers the transition period between countdown ending and gameActive being set
  const hasGameData = letterGrid && remainingTime !== null && remainingTime > 0;
  const showGameView = gameActive || (hasGameData && !waitingForResults);

  if (!showGameView && !waitingForResults) {
    // When countdown animation is active, only show the countdown overlay
    // Don't render PlayerWaitingView underneath to avoid double loaders
    if (showStartAnimation) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">
        <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={gameLanguage}
          username={username}
          t={t}
          playersReady={playersReady}
          shufflingGrid={shufflingGrid}
          highlightedCells={highlightedCells}
          showQR={showQR}
          setShowQR={setShowQR}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
        />
      </div>
    );
  }

  return (
    <>
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}
      <PlayerInGameView
        username={username}
        gameCode={gameCode}
        t={t}
        dir={dir}
        socket={socket}
        letterGrid={letterGrid}
        shufflingGrid={shufflingGrid}
        gameActive={gameActive}
        showStartAnimation={showStartAnimation}
        remainingTime={remainingTime}
        gameLanguage={gameLanguage}
        minWordLength={minWordLength}
        comboLevel={comboLevel}
        comboLevelRef={comboLevelRef}
        foundWords={mappedFoundWords}
        leaderboard={leaderboard}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onExitRoom={handleExitRoom}
        onConfirmExit={confirmExitRoom}
        onWordSubmit={handleWordSubmit}
        setWord={setWord}
        onResetCombo={handleResetCombo}
        hints={hints}
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        boardTheme={boardTheme}
      />
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
