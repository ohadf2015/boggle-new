'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import { useSocket } from '../utils/SocketContext';
import { clearSessionPreservingUsername } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { usePresence } from '../hooks/usePresence';
import logger from '@/utils/logger';
import type { LetterGrid, Language, Avatar, GridPosition } from '@/types';

// Extracted components
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerWaitingResultsView from './components/PlayerWaitingResultsView';
import PlayerInGameView from './components/PlayerInGameView';

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';

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

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: Avatar;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  isComplete?: boolean;
}

interface TournamentStanding {
  username: string;
  totalScore: number;
  roundsPlayed: number;
  avatar?: Avatar;
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

interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
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

  // Game state
  const [word, setWord] = useState<string>('');
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
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

  // Music ref
  const hasTriggeredUrgentMusicRef = useRef<boolean>(false);

  // Use custom hook for socket events
  usePlayerSocketEvents({
    socket,
    t,
    inputRef,
    wasInActiveGame,
    gameActive,
    letterGrid,
    gameLanguage,
    username,
    queueAchievement,
    playComboSound,
    onShowResults,
    setPlayersReady,
    setShufflingGrid,
    setHighlightedCells,
    setWasInActiveGame,
    setFoundWords,
    setAchievements,
    setLetterGrid,
    setRemainingTime,
    setMinWordLength,
    setGameLanguage,
    setGameActive,
    setShowStartAnimation,
    setWaitingForResults,
    setLeaderboard,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setShowWordFeedback,
    setWordToVote,
    setXpGainedData,
    setLevelUpData,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    foundWords,
    intentionalExitRef,
  });

  // Music effects
  useEffect(() => {
    if (gameActive) {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameActive, fadeToTrack, TRACKS]);

  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 20 && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }
    if (remainingTime === 0) {
      stopMusic(1500);
    }
  }, [remainingTime, gameActive, fadeToTrack, stopMusic, TRACKS]);

  useEffect(() => {
    if (gameActive && remainingTime !== null && remainingTime <= 3 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameActive, playCountdownBeep]);

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
  }, []);

  // Update players from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Handle pending game start
  useEffect(() => {
    if (pendingGameStart && socket && onGameStartConsumed) {
      logger.log('[PLAYER] Processing pending game start from results page:', pendingGameStart);

      setWasInActiveGame(true);
      setFoundWords([]);
      setAchievements([]);
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) setRemainingTime(pendingGameStart.timerSeconds);
      if (pendingGameStart.language) setGameLanguage(pendingGameStart.language);
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      setShowStartAnimation(true);

      if (pendingGameStart.messageId) {
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }

      onGameStartConsumed();
    }
  }, [pendingGameStart, socket, onGameStartConsumed]);

  // Prevent accidental page refresh
  useEffect(() => {
    const shouldWarn = gameActive || foundWords.length > 0 || waitingForResults;
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (intentionalExitRef.current) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameActive, foundWords.length, waitingForResults]);

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

  // Word submission handler
  const handleWordSubmit = useCallback((formedWord: string) => {
    setFoundWords(prev => [...prev, { word: formedWord, isValid: null }]);
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
          foundWords={foundWords as never[]}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
        />
      </>
    );
  }

  if (!gameActive && !waitingForResults) {
    return (
      <>
        {showStartAnimation && (
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        )}
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
      </>
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
        foundWords={foundWords}
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
      />
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
