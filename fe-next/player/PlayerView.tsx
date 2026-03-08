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
import { useGameTimer } from '../hooks/useGameTimer';
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
import PlayerInGameView from './components/PlayerInGameView';
import NewPlayerOnboarding from '../components/game/NewPlayerOnboarding';
import FirstTimeAchievement, { useFirstTimeAchievement } from '../components/game/FirstTimeAchievement';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Loader2 } from 'lucide-react';

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';
import { resetComboState, calculateComboChainWindow } from '@/shared/utils/comboUtils';
import {
  useFoundWords,
  useBoardTheme,
  useTotalBoardWords,
  useWaitingForResults,
  useLetterGrid,
  useShufflingGrid,
  useLeaderboard,
  useGameActions,
  useGameMode,
} from '@/hooks/gameState';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useHideNavigation } from '@/contexts/NavigationContext';

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
  /** Room language from parent - used for displaying share button before game starts */
  roomLanguage?: Language | null;
  /** Called when guest name is confirmed changed by server */
  onUsernameChange?: (newName: string) => void;
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
  onGameStartConsumed,
  roomLanguage,
  onUsernameChange,
}) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const intentionalExitRef = useRef<boolean>(false);
  const setIsInGame = useHideNavigation();

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

  // Use game state from Zustand store (selective subscriptions for performance)
  // CRITICAL: letterGrid, shufflingGrid, and leaderboard MUST come from store, not local state
  // The socket handlers in usePlayerGameEvents and usePlayerSessionEvents update the STORE,
  // so we must read from store to see real-time updates
  const foundWords = useFoundWords();
  const boardTheme = useBoardTheme();
  const totalBoardWords = useTotalBoardWords();
  const waitingForResults = useWaitingForResults();
  const letterGrid = useLetterGrid();
  const shufflingGrid = useShufflingGrid();
  const leaderboard = useLeaderboard();

  // Get setters from Zustand store (actions never trigger re-renders)
  const { setFoundWords, setWaitingForResults, setLetterGrid, setShufflingGrid } = useGameActions();

  // Game state
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showStartAnimation, setShowStartAnimation] = useState<boolean>(false);
  const [showModeReveal, setShowModeReveal] = useState<boolean>(false);
  const [minWordLength, setMinWordLength] = useState<number>(2);
  const gameMode = useGameMode();

  // Multiplayer timer - uses timestamp-based countdown that syncs with server
  // Initial time will be set when game starts via socket event
  const gameTimer = useGameTimer({
    initialTime: 180, // Default, will be updated on game start
    isPaused: !gameActive, // Pause when game is not active
    autoStart: false, // Don't auto-start, wait for game to become active
    onTimeUp: () => {
      // Time up is handled by server, this is just for local display
      logger.log('[PLAYER] Local timer reached 0');
    },
  });

  // Use timer's remaining time for display
  // Note: Always use the actual timer value, not conditioned on gameActive
  // The timer is set during pendingGameStart processing before gameActive is true
  const remainingTime = gameTimer.remainingTime;

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
  const [highlightedCells, setHighlightedCells] = useState<GridPosition[]>([]);
  const [gameLanguage, setGameLanguage] = useState<Language | null>(null);

  // Lobby ready state
  const [isLobbyReady, setIsLobbyReady] = useState<boolean>(false);
  const [lobbyReadyUsernames, setLobbyReadyUsernames] = useState<string[]>([]);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Track active game session
  const [wasInActiveGame, setWasInActiveGame] = useState<boolean>(false);

  // Navigation guard - prevent accidental navigation during active game
  useNavigationGuard({
    enabled: gameActive,
    message: t('playerView.exitWarning'),
    onNavigationAttempt: () => {
      // Show the exit confirmation dialog
      setShowExitConfirm(true);
      return false; // Block navigation, let modal handle it
    },
  });

  // Combo system
  const [comboLevel, setComboLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboLevelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);

  // Combo shield system
  const comboShieldsUsedRef = useRef<number>(0);

  // Combo timer tracking for visual feedback
  // PERFORMANCE: Uses RAF instead of setInterval to reduce state updates
  const [comboTimeRemaining, setComboTimeRemaining] = useState<number | null>(null);
  const [comboDanger, setComboDanger] = useState(false);
  const comboTimerRafRef = useRef<number | null>(null);
  const lastDisplayedComboTimeRef = useRef<number>(100);
  const DANGER_THRESHOLD = 30; // 30% remaining = danger
  const COMBO_UPDATE_THRESHOLD = 2; // Only update when change is >2% (reduces state updates)

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

  // Pre-game loading: server sends 'gameStarting' immediately when host clicks Start,
  // before heavy processing (dict loading, board gen). Cleared when actual startGame arrives.
  const [isGameLoading, setIsGameLoading] = useState(false);

  // First-time achievement tracking (only for new players)
  const { pendingAchievement, triggerAchievement, clearAchievement } = useFirstTimeAchievement();
  const isNewPlayerRef = useRef(isNewPlayer()); // Check once on mount

  // Music refs
  const hasTriggeredUrgentMusicRef = useRef<boolean>(false);
  const totalGameTimeRef = useRef<number>(180); // Default 3 minutes, updated on game start
  const earthquakeMusicActiveRef = useRef<boolean>(false); // Track if earthquake music is playing

  // Memoized game start handler to prevent unnecessary effect re-runs
  const handleGameStart = useCallback(() => {
    fadeToTrack(TRACKS.IN_GAME, 800, 800);
    hasTriggeredUrgentMusicRef.current = false;
  }, [fadeToTrack, TRACKS.IN_GAME]);

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
    // Timer sync for multiplayer
    gameTimer,
    // Start music immediately when startGame event is received for better synchronization
    onGameStart: handleGameStart,
  });

  // Lobby ready: listen for playersReadyUpdate during waiting state
  useEffect(() => {
    if (!socket || gameActive) return;

    const handleLobbyReadyUpdate = (data: { readyCount: number; totalPlayers: number; readyUsernames?: string[] }) => {
      if (data.readyUsernames) {
        setLobbyReadyUsernames(data.readyUsernames);
      }
    };

    socket.on('playersReadyUpdate', handleLobbyReadyUpdate);
    return () => {
      socket.off('playersReadyUpdate', handleLobbyReadyUpdate);
    };
  }, [socket, gameActive]);

  // Listen for gameStarting — lightweight pre-notification before heavy server processing
  useEffect(() => {
    if (!socket) return;
    const handleGameStarting = () => {
      setIsGameLoading(true);
    };
    socket.on('gameStarting', handleGameStarting);
    return () => { socket.off('gameStarting', handleGameStarting); };
  }, [socket]);

  // Clear loading state when actual game data arrives
  useEffect(() => {
    if (showModeReveal || showStartAnimation || gameActive) {
      setIsGameLoading(false);
    }
  }, [showModeReveal, showStartAnimation, gameActive]);

  // Toggle lobby ready and emit to server
  const handleToggleLobbyReady = useCallback(() => {
    if (!socket) return;
    const newReady = !isLobbyReady;
    setIsLobbyReady(newReady);
    socket.emit('lobbyReady', { ready: newReady });
  }, [socket, isLobbyReady]);

  // Handle guest name change
  const handleNameChange = useCallback((newName: string) => {
    // Store in localStorage for persistence across sessions
    import('@/utils/profileStorage').then(({ setStoredUsername }) => {
      setStoredUsername(newName);
    });
    // Notify server if socket is available
    if (socket) {
      socket.emit('updateGuestName', { newName });
    }
  }, [socket]);

  // Listen for server confirmation of name change
  useEffect(() => {
    if (!socket) return;
    const handleNameUpdated = (data: { newName: string }) => {
      if (data?.newName) {
        onUsernameChange?.(data.newName);
      }
    };
    socket.on('guestNameUpdated', handleNameUpdated);
    return () => { socket.off('guestNameUpdated', handleNameUpdated); };
  }, [socket, onUsernameChange]);

  // Reset lobby ready state when game starts
  useEffect(() => {
    if (gameActive) {
      setIsLobbyReady(false);
      setLobbyReadyUsernames([]);
    }
  }, [gameActive]);

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
    if (gameActive && remainingTime !== null && remainingTime <= 10 && remainingTime > 0) {
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

  // Keep refs in sync with state for use in callbacks
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  // Combo timer visual feedback - tracks time remaining for combo window
  // PERFORMANCE: Uses RAF instead of 50ms setInterval to reduce state updates from 20/sec to ~10/sec
  useEffect(() => {
    // Clear any existing RAF
    if (comboTimerRafRef.current) {
      cancelAnimationFrame(comboTimerRafRef.current);
      comboTimerRafRef.current = null;
    }

    // Only track time if we have an active combo
    if (comboLevel > 0 && lastWordTime !== null) {
      const comboWindow = calculateComboChainWindow(comboLevel);
      lastDisplayedComboTimeRef.current = 100;

      // Immediately set initial timer value to ensure arc is visible
      setComboTimeRemaining(100);
      setComboDanger(false);

      const updateTimeRemaining = () => {
        const now = Date.now();
        const elapsed = now - (lastWordTimeRef.current ?? now);
        const remaining = Math.max(0, 100 - (elapsed / comboWindow) * 100);

        // Only trigger state update if change is visually significant (>2%)
        // This reduces state updates from ~20/sec to ~10/sec while keeping smooth visuals
        const shouldUpdate = Math.abs(remaining - lastDisplayedComboTimeRef.current) > COMBO_UPDATE_THRESHOLD;

        if (shouldUpdate || remaining === 0) {
          lastDisplayedComboTimeRef.current = remaining;
          setComboTimeRemaining(remaining);

          // Check danger state
          const isNowDanger = remaining <= DANGER_THRESHOLD && remaining > 0;
          setComboDanger(isNowDanger);
        }

        // Continue RAF loop while combo is active
        if (remaining > 0) {
          comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
        }
      };

      // Start RAF loop
      comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
    } else {
      setComboTimeRemaining(null);
      setComboDanger(false);
      lastDisplayedComboTimeRef.current = 100;
    }

    return () => {
      if (comboTimerRafRef.current) {
        cancelAnimationFrame(comboTimerRafRef.current);
      }
    };
  }, [comboLevel, lastWordTime]);

  // Activate game when countdown animation completes
  useEffect(() => {
    if (!showModeReveal && !showStartAnimation && letterGrid && remainingTime && remainingTime > 0 && !gameActive && !waitingForResults) {
      logger.log('[PLAYER] Countdown animation complete, activating game');
      setGameActive(true);
    }
  }, [showModeReveal, showStartAnimation, letterGrid, remainingTime, gameActive, waitingForResults]);

  // Auto-dismiss mode reveal after 2 seconds, then trigger countdown
  useEffect(() => {
    if (!showModeReveal) return;
    const timer = setTimeout(() => {
      setShowModeReveal(false);
      setShowStartAnimation(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showModeReveal]);

  // Clear shuffling grid when game starts
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
      setHighlightedCells([]);
    }
  }, [gameActive, setShufflingGrid]);

  // Show onboarding for first-time players during WAITING phase (not during gameplay)
  // This gives players time to learn before the game starts
  useEffect(() => {
    // Only show during waiting phase (not gameActive) and when connected
    if (!gameActive && !showOnboarding && socket) {
      const hasSeenOnboarding = localStorage.getItem('lexiclash_seen_onboarding');
      if (!hasSeenOnboarding) {
        // Small delay to let the waiting view render first
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [gameActive, showOnboarding, socket]);

  // Handle onboarding dismissal
  const handleOnboardingDismiss = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('lexiclash_seen_onboarding', 'true');
  }, []);

  // Track first-time achievements for new players
  const prevFoundWordsCountRef = useRef(0);
  const prevComboLevelRef = useRef(0);

  useEffect(() => {
    // Only track for new players during active game
    if (!isNewPlayerRef.current || !gameActive) return;

    // Check for first word achievement
    const validWords = foundWords.filter(w => w.validated !== false);
    if (validWords.length > 0 && prevFoundWordsCountRef.current === 0) {
      triggerAchievement('firstWord');
    }

    // Check for first long word (5+ letters)
    const hasLongWord = validWords.some(w => w.word.length >= 5);
    if (hasLongWord && !validWords.slice(0, prevFoundWordsCountRef.current).some(w => w.word.length >= 5)) {
      triggerAchievement('firstLongWord');
    }

    prevFoundWordsCountRef.current = validWords.length;
  }, [foundWords, gameActive, triggerAchievement]);

  // Track first combo achievement
  useEffect(() => {
    if (!isNewPlayerRef.current || !gameActive) return;

    // Trigger on first combo (level 2 or higher)
    if (comboLevel >= 2 && prevComboLevelRef.current < 2) {
      triggerAchievement('firstCombo');
    }
    prevComboLevelRef.current = comboLevel;
  }, [comboLevel, gameActive, triggerAchievement]);

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
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        // Sync timer with pending game start
        gameTimer.reset();
        gameTimer.setTime(pendingGameStart.timerSeconds);
      }
      if (pendingGameStart.minWordLength) setMinWordLength(pendingGameStart.minWordLength);
      // Show mode reveal first, which will trigger countdown animation after 2s
      setShowModeReveal(true);

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
  }, [pendingGameStart, socket, onGameStartConsumed, fadeToTrack, TRACKS, gameTimer, setFoundWords, setLetterGrid]);

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

    // Disable navigation guard BEFORE navigation to prevent native browser prompt
    setGameActive(false);

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

  // Handle logo click exit request
  // Use refs to access latest values without re-registering the event listener
  const gameActiveRef = useRef(gameActive);
  const confirmExitRoomRef = useRef(confirmExitRoom);

  useEffect(() => {
    gameActiveRef.current = gameActive;
    confirmExitRoomRef.current = confirmExitRoom;
  });

  useEffect(() => {
    const handleRoomExitRequest = (event: CustomEvent) => {
      const { gameCode: requestedCode, username: requestedUsername, source } = event.detail;

      // Verify the request is for this game session
      if (requestedCode === gameCode && requestedUsername === username) {
        logger.log(`[PLAYER] Room exit requested from ${source}`);

        // If game is not active (waiting state), auto-exit without confirmation
        if (!gameActiveRef.current) {
          logger.log('[PLAYER] Auto-exiting from waiting state');
          confirmExitRoomRef.current();
        } else {
          // Game is active - show confirmation modal
          logger.log('[PLAYER] Showing exit confirmation for active game');
          setShowExitConfirm(true);
        }
      }
    };

    window.addEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    return () => {
      window.removeEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    };
  }, [gameCode, username]);

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

  // Show game board during countdown animation when we have letterGrid
  // This allows players to see the board while countdown is active
  // Also covers the transition period between countdown ending and gameActive being set
  const hasGameData = letterGrid && remainingTime !== null && remainingTime > 0;
  const showGameView = gameActive || (hasGameData && !waitingForResults);

  // Hide bottom navigation during gameplay
  useEffect(() => {
    setIsInGame(showModeReveal || showStartAnimation || !!showGameView);
    return () => setIsInGame(false);
  }, [showModeReveal, showStartAnimation, showGameView, setIsInGame]);

  // Map game mode to display label
  const modeRevealLabel = gameMode === 'blast' ? 'BLAST!' : gameMode === 'word-hunt' ? 'WORD HUNT!' : 'CLASSIC!';

  if (!showGameView && !waitingForResults) {
    // Show loading indicator when server is preparing the game
    if (isGameLoading) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-neo-lime animate-spin" />
            <div className="text-lg font-bold text-white/70">
              {t('common.preparingGame')}
            </div>
          </div>
        </div>
      );
    }

    // Show dramatic mode reveal overlay before countdown
    if (showModeReveal) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <AdaptiveAnimatePresence>
            <AdaptiveMotion.div
              key="mode-reveal"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="text-7xl font-neo-display font-black text-neo-lime uppercase tracking-wider drop-shadow-[0_0_40px_rgba(163,230,53,0.5)]">
                {modeRevealLabel}
              </div>
              <AdaptiveMotion.div
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                className="h-1 bg-neo-lime rounded-full"
              />
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
        </div>
      );
    }

    // When countdown animation is active, only show the countdown overlay
    // Don't render PlayerWaitingView underneath to avoid double loaders
    if (showStartAnimation) {
      return (
        <div className="h-full bg-neo-navy flex items-center justify-center overflow-hidden">
          <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
        </div>
      );
    }

    return (
      <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={gameLanguage || roomLanguage || null}
          username={username}
          t={t}
          playersReady={playersReady}
          showQR={showQR}
          setShowQR={setShowQR}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
          onNameChange={handleNameChange}
        />
    );
  }

  // Waiting for results — brief transition until scores arrive (no validation modal)
  if (waitingForResults) {
    const playerEntry = leaderboard.find(p => p.username === username);
    const playerScore = playerEntry?.score ?? 0;
    const validWords = foundWords.filter(w => w.validated !== false);

    return (
      <div className="flex-1 w-full bg-neo-navy flex items-center justify-center">
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          <div className="border-3 border-neo-black rounded-neo shadow-hard px-6 py-4 bg-gradient-to-br from-neo-yellow to-neo-orange">
            <div className="font-black text-neo-black text-3xl tabular-nums">
              {playerScore.toLocaleString()}
            </div>
            <div className="font-bold uppercase tracking-wider text-neo-black/60 text-xs">
              {t('common.score')}
            </div>
          </div>
          <div className="text-white/60 font-bold text-sm">
            {validWords.length} {t('common.words')}
          </div>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('game.calculatingResults')}</span>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  return (
    <>
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}
      {showOnboarding && (
        <NewPlayerOnboarding
          t={t}
          onDismiss={handleOnboardingDismiss}
        />
      )}
      {/* First-time achievement celebrations for new players */}
      {isNewPlayerRef.current && (
        <FirstTimeAchievement
          achievementType={pendingAchievement}
          onDismiss={clearAchievement}
          position="top"
        />
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
        comboTimeRemaining={comboTimeRemaining}
        comboDanger={comboDanger}
        foundWords={mappedFoundWords}
        leaderboard={leaderboard}
        totalBoardWords={totalBoardWords}
        tournamentData={tournamentData}
        tournamentStandings={tournamentStandings}
        showTournamentStandings={showTournamentStandings}
        setShowTournamentStandings={setShowTournamentStandings}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onExitRoom={handleExitRoom}
        onConfirmExit={confirmExitRoom}
        onWordSubmit={handleWordSubmit}
        onResetCombo={handleResetCombo}
        hints={hints}
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        boardTheme={boardTheme}
        onShowTutorial={() => setShowOnboarding(true)}
        totalTime={totalGameTimeRef.current}
      />
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
