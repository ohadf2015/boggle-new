'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo, useReducer } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { usePlayerMusic } from './hooks/usePlayerMusic';
import { useFirstTimeTracking } from './hooks/useFirstTimeTracking';
import { usePlayerExit } from './hooks/usePlayerExit';
import { usePlayerLobby } from './hooks/usePlayerLobby';
import { useAchievementQueue } from '../components/achievements';
import { usePresence } from '../hooks/usePresence';
import { useHints } from '../hooks/useHints';
import { useGameTimer } from '../hooks/useGameTimer';
import { useTimerZeroWatchdog } from '../hooks/useTimerZeroWatchdog';
import { useTimerStallWatchdog } from '../hooks/useTimerStallWatchdog';
import { addGameBreadcrumb } from '../utils/sentry';
import logger from '@/utils/logger';
import type { TournamentStanding } from '@/types';
import type {
  ViewTournamentData as TournamentData,
} from '@/shared/types/view';

// Extracted components
import PlayerWaitingView from './components/PlayerWaitingView';
import PlayerInGameView from './components/PlayerInGameView';
import FirstTimeAchievement, { useFirstTimeAchievement } from '../components/game/FirstTimeAchievement';
import ModeRevealOverlay from '@/components/game/ModeRevealOverlay';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import type { CoachModeKey } from '@/lib/tutorial/modeCoachStore';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Loader2 } from 'lucide-react';

// Custom hooks
import usePlayerSocketEvents from './hooks/usePlayerSocketEvents';
import { resetComboState } from '@/shared/utils/comboUtils';
import {
  sendCountdownComplete,
  stashStartGameMessageId,
  consumeStashedMessageId,
  wasStartGameHandled,
  markStartGameHandled,
} from '@/shared/utils/gameEventUtils';
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
  useGameModeConfirmed,
  useGameStore,
  useGameLanguage,
} from '@/hooks/gameState';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';

import type { WordToVote, PlayerViewProps } from './types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

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
  seriesRoundNumber,
  onExitToLobby,
}) => {
  const { t, dir } = useLanguage();
  const { socket } = useSocket();
  const { playComboSound } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const intentionalExitRef = useRef<boolean>(false);
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
  const { setFoundWords, setLetterGrid, setShufflingGrid, setWaitingForResults } = useGameActions();

  // Game state
  const [gameActive, setGameActive] = useState<boolean>(false);
  // Batch showModeReveal + showStartAnimation — sequential animation states
  type RevealState = { showModeReveal: boolean; showStartAnimation: boolean };
  type RevealAction = { type: 'startReveal' } | { type: 'endReveal' } | { type: 'reset' };
  const [revealState, dispatchReveal] = useReducer(
    (state: RevealState, action: RevealAction): RevealState => {
      switch (action.type) {
        case 'startReveal': return { showModeReveal: true, showStartAnimation: false };
        case 'endReveal': return { showModeReveal: false, showStartAnimation: true };
        case 'reset': return { showModeReveal: false, showStartAnimation: false };
        default: return state;
      }
    },
    { showModeReveal: false, showStartAnimation: false }
  );
  const { showModeReveal, showStartAnimation } = revealState;
  const setShowModeReveal = (v: boolean) =>
    v ? dispatchReveal({ type: 'startReveal' }) : dispatchReveal({ type: 'reset' });
  const setShowStartAnimation = (v: boolean) =>
    v ? dispatchReveal({ type: 'endReveal' }) : dispatchReveal({ type: 'reset' });
  const [minWordLength, setMinWordLength] = useState<number>(2);
  const gameMode = useGameMode();
  // Gate game_started until the server-resolved mode is confirmed, so MP `random`
  // games don't tag start with the stale requested mode (matches game_completed).
  const gameModeConfirmed = useGameModeConfirmed();

  // Map GameMode string to CoachModeKey for ModeCoach mount
  function getCoachMode(gm: string | undefined): CoachModeKey | undefined {
    if (!gm) return undefined;
    const modeMap: Record<string, CoachModeKey> = {
      'classic': 'classic',
      'blast': 'blast',
      'word-hunt': 'wordHunt',
      'wheel-rush': 'wheelRush',
      'word-tower': 'wordTower',
      'shiritori': 'shiritori',
      'sealed-bid': 'sealedBid',
      'crossword': 'crossword',
    };
    return modeMap[gm];
  }
  const coachMode = getCoachMode(gameMode);

  // Captures the messageId from the most recent startGame so we can emit
  // `countdownComplete` once the GoRipplesAnimation finishes. Server gates
  // round-timer start on this signal, so the timer doesn't tick during 3-2-1.
  const pendingMessageIdRef = useRef<string | null>(null);
  // Tracks the messageId we've already driven the mode-reveal/GoRipples
  // sequence for. Server retries `startGame` for unacked clients with the
  // SAME messageId — without this guard, each retry re-triggers
  // setShowModeReveal(true) and the player sees the countdown twice.
  const revealedMessageIdRef = useRef<string | null>(null);

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

  // Destructure stable useCallback methods so effects can depend on them individually
  // without re-firing on every render (gameTimer object is new each render).
  const { reset: timerReset, setTime: timerSetTime, resume: timerResume } = gameTimer;

  // Use timer's remaining time for display
  // Note: Always use the actual timer value, not conditioned on gameActive
  // The timer is set during pendingGameStart processing before gameActive is true
  const remainingTime = gameTimer.remainingTime;

  // Recovery watchdog: server-side game-end events (`endGame`, `timeUpdate(0)`,
  // `validatedScores`) can be missed on flaky connections, leaving the player
  // staring at a frozen 0:00 board. When the timer hits 0 after a previously-
  // active game and no result transition happens, force `waitingForResults`
  // and re-request results from the server's cached payload.
  useTimerZeroWatchdog({
    remainingTime,
    gameActive,
    waitingForResults,
    onTrigger: () => {
      logger.log('[PLAYER] Timer-zero watchdog: bootstrapping waiting state + requesting results');
      setWaitingForResults(true);
      socket?.emit('requestResults');
    },
  });

  // Stall watchdog: catches the "timer frozen mid-game" case where the
  // displayed value sticks (e.g. 2:00) while the server keeps ticking.
  // Root causes are varied (gameSessionId drift, buffered transport, server
  // clock never started) but the recovery is the same: ask the server to
  // re-emit `startGame` with the fresh `remainingTime` via `requestGameState`.
  useTimerStallWatchdog({
    remainingTime,
    gameActive,
    waitingForResults,
    onStall: () => {
      logger.log('[PLAYER] Timer-stall watchdog: remainingTime frozen — requesting fresh game state');
      addGameBreadcrumb('mp_timer_stall', {
        role: 'player',
        gameCode,
        remainingTime,
        gameMode,
      });
      socket?.emit('requestGameState');
    },
  });

  // Player roster is driven entirely by the initialPlayers prop (parent owns the
  // source of truth), so read it directly — no mirrored state/effect needed.
  const playersReady = initialPlayers;

  // Calculate human player count (exclude bots)
  const humanPlayerCount = playersReady.filter(p => !p.isBot && !p.disconnected).length;
  // Bot count — recorded on MP telemetry so the admin game log can report
  // human-vs-bot composition (previously never captured anywhere).
  const botPlayerCount = playersReady.filter(p => p.isBot).length;

  // Enable hints for single-player mode
  const hints = useHints({
    socket,
    playerCount: humanPlayerCount,
    gameActive,
  });

  // Lobby state (loading indicator, name change, ready-up)
  const { isGameLoading, handleNameChange, readyUsernames, isReady, toggleReady } = usePlayerLobby({
    socket,
    gameActive,
    showModeReveal,
    showStartAnimation,
    username,
    onUsernameChange,
  });

  // Authoritative game language lives in the Zustand store (written by
  // usePlayerGameEvents on the startGame socket event). usePlayerLobby's old
  // local `gameLanguage` useState was never set → in-game it stayed null →
  // useWordSubmission's `|| 'en'` fallback rejected valid Spanish accented
  // words (á é í ó ú ü ñ). Read the store; roomLanguage is the lobby fallback.
  const storeGameLanguage = useGameLanguage();
  const resolvedGameLanguage = storeGameLanguage || roomLanguage || null;

  // Avatar change handler — emits socket event so other players see the update
  const handleAvatarChange = useCallback((config: CustomAvatarConfig) => {
    socket?.emit('updateAvatar', { customAvatar: config });
  }, [socket]);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);

  // Exit handlers (confirmation, room leave, custom event listener)
  const { showExitConfirm, setShowExitConfirm, handleExitRoom, confirmExitRoom, leaving } = usePlayerExit({
    socket,
    gameCode,
    username,
    gameActive,
    setGameActive,
    intentionalExitRef,
    onExitToLobby,
  });


  // Navigation guard — intercept a phone back-gesture for the ENTIRE MP session,
  // not just active play. Since lobby auto-start was removed, players sit in the
  // pre-game waiting room until the host starts; a back-gesture there must also
  // confirm and return to the lobby instead of silently leaving. PlayerView only
  // mounts while the player is in a room, so guarding its whole lifetime is
  // correct. The confirm dialog + exit-to-lobby are wired in both sub-views.
  useNavigationGuard({
    enabled: true,
    leaving,
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

  // NOTE: the combo-window countdown (~10 Hz RAF) is owned by
  // `ComboDisplayConnected` so its state doesn't cascade through
  // PlayerInGameView → InGameScreen → PortraitLayout on every tick — that
  // cascade stole frame budget from drag-time grid rendering on mobile MP
  // classic ("UI feels stuck during selection"). Only `lastWordTime` (which
  // changes once per accepted word) is threaded down; the connected wrapper
  // computes `comboTimeRemaining` + `comboDanger` locally.

  // Tournament state
  const [tournamentData, _setTournamentData] = useState<TournamentData | null>(null);

  // CrazyGames SDK lifecycle (gameplayStart/Stop, happyTime) — required for full launch
  // roundKey resets the lifecycle between tournament rounds so each round emits SDK calls.
  useCrazyGamesLifecycle({
    isGameActive: gameActive,
    isGameOver: waitingForResults,
    score: leaderboard.find(p => p.username === username)?.score ?? 0,
    maxCombo: comboLevel,
    roundKey: tournamentData?.currentRound ?? 0,
  });

  // PostHog funnel parity: emit `growth:game_started` once when the player's
  // game becomes active. Pairs with the trackGameEnd in the results flow so
  // MP started→finished funnels become computable.
  useGameStartTelemetry({
    mode: gameMode ?? 'multiplayer',
    isGameActive: gameActive,
    ready: gameModeConfirmed,
    extras: {
      gameCode, role: 'player', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: gameMode ?? 'classic',
      playerCount: humanPlayerCount, botCount: botPlayerCount,
    },
  });

  // Paired MP end emit (game_completed) so the nightly job sees MP outcomes per
  // mode, not just starts. resultsShown = the player reached the results phase.
  const mpValidWords = useMemo(
    () => foundWords.filter(w => w.validated !== false),
    [foundWords],
  );
  useGameEndTelemetry({
    mode: gameMode ?? 'multiplayer',
    resultsShown: waitingForResults,
    score: mpValidWords.reduce((s, w) => s + (w.score ?? 0), 0),
    wordCount: mpValidWords.length,
    extras: {
      gameCode, role: 'player', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: gameMode ?? 'classic',
      playerCount: humanPlayerCount, botCount: botPlayerCount,
    },
  });
  const [tournamentStandings, _setTournamentStandings] = useState<TournamentStanding[]>([]);
  const [showTournamentStandings, setShowTournamentStandings] = useState<boolean>(false);

  // Word feedback state
  const [_showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [_wordToVote, setWordToVote] = useState<WordToVote | null>(null);

  // Earthquake/Fire Round state
  const [earthquakeState, setEarthquakeState] = useState<'idle' | 'warning' | 'shaking' | 'fire-round'>('idle');
  const [fireRoundActive, setFireRoundActive] = useState(false);
  const [fireRoundRemaining, setFireRoundRemaining] = useState(0);


  // First-time achievement tracking (only for new players)
  const { pendingAchievement, triggerAchievement, clearAchievement } = useFirstTimeAchievement();
  const isNewPlayerRef = useFirstTimeTracking(foundWords, comboLevel, gameActive, triggerAchievement);

  const totalGameTimeRef = useRef<number>(180); // Default 3 minutes, updated on game start

  // Music transitions: lobby → in-game → urgent → earthquake → results
  const { handleGameStartMusic } = usePlayerMusic({
    gameActive,
    remainingTime,
    waitingForResults,
    earthquakeState,
    totalGameTime: totalGameTimeRef.current,
  });

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
    onGameStart: handleGameStartMusic,
  });


  // Keep refs in sync with state for use in callbacks
  useEffect(() => {
    comboLevelRef.current = comboLevel;
  }, [comboLevel]);

  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);


  // Activate game when countdown animation completes
  useEffect(() => {
    if (!showModeReveal && !showStartAnimation && letterGrid && remainingTime && remainingTime > 0 && !gameActive && !waitingForResults) {
      logger.log('[PLAYER] Countdown animation complete, activating game');
      setGameActive(true);
      // Resume internal timer so local countdown ticks between server syncs.
      // reset() sets internalPaused=true (autoStart=false), and nothing else clears it.
      timerResume();
    }
  }, [showModeReveal, showStartAnimation, letterGrid, remainingTime, gameActive, waitingForResults, timerResume]);

  // Auto-dismiss mode reveal, then trigger countdown. Kept short (1.1s) so the
  // splash → 3-2-1 handoff reads as one quick flourish rather than two separate
  // full-screen "screens" — the laggy mid-start screen-switching players reported.
  // MP enters round same for first-time + returning players (no cozy fork).
  useEffect(() => {
    if (!showModeReveal) return;
    const timer = setTimeout(() => {
      dispatchReveal({ type: 'endReveal' });
    }, 1100);
    return () => clearTimeout(timer);
  }, [showModeReveal]);

  // Clear shuffling grid when game starts
  useEffect(() => {
    if (gameActive) {
      setShufflingGrid(null);
    }
  }, [gameActive, setShufflingGrid]);



  // Clear game state on mount and cleanup
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    setFoundWords([]);

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = null;
      }
    };
  }, [setFoundWords]);

  // Handle pending game start
  useEffect(() => {
    if (!pendingGameStart || !socket || !onGameStartConsumed) {
      return;
    }

    // A normal game start is also processed by usePlayerGameEvents.handleStartGame
    // (the socket listener), which does the store/timer/ack work and marks the
    // messageId. When that already ran, this effect only drives the PlayerView-
    // local reveal sequence — skip the redundant store setState, timer reset,
    // and startGameAck. The effect stays the sole handler only when the socket
    // listener is unmounted (player sitting on the results screen).
    if (wasStartGameHandled('PLAYER', pendingGameStart.messageId)) {
      const handledIsReconnect = !!(pendingGameStart as any).reconnect;
      if (!handledIsReconnect) {
        if (pendingGameStart.messageId) {
          pendingMessageIdRef.current = pendingGameStart.messageId;
        }
        // Skip if we've already driven the reveal for this messageId — server
        // retries startGame for unacked clients with the SAME id, and re-firing
        // setShowModeReveal(true) makes the countdown play a second time.
        if (revealedMessageIdRef.current !== (pendingGameStart.messageId ?? null)) {
          revealedMessageIdRef.current = pendingGameStart.messageId ?? null;
          setShowModeReveal(true);
        }
      }
      onGameStartConsumed();
      return;
    }

    const isReconnect = !!(pendingGameStart as any).reconnect;
    logger.log('[PLAYER] Processing pending game start:', isReconnect ? '(reconnect)' : '(new game)');

    // On reconnect, only restore grid/timer — do NOT reset words, replay animations, or re-ACK.
    // This prevents the "game restarted" visual glitch on brief network blips.
    if (isReconnect) {
      logger.log('[PLAYER] Reconnect restore — restoring grid and timer only');
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        timerSetTime(pendingGameStart.timerSeconds);
      }
      setMinWordLength(pendingGameStart.minWordLength ?? 2);
      // Reassert the authoritative language in the store on reconnect (in-game
      // validation reads the store via resolvedGameLanguage, not a local).
      if (pendingGameStart.language) useGameStore.setState({ gameLanguage: pendingGameStart.language });
      onGameStartConsumed();
      return;
    }

    setFoundWords([]);

    // Sync Zustand store with game start data.
    // When a non-ready player is on the results screen, usePlayerGameEvents isn't mounted
    // so its handleStartGame listener misses the startGame socket event.
    // This ensures all store fields are set regardless of mount timing.
    const data = pendingGameStart as any;
    const storeUpdates: Record<string, any> = {
      foundWords: [],
      achievements: [],
      showStartAnimation: !data.lateJoin,
    };
    if (data.letterGrid) storeUpdates.letterGrid = data.letterGrid;
    if (data.timerSeconds) {
      storeUpdates.remainingTime = data.timerSeconds;
      storeUpdates.gameDuration = data.timerSeconds;
    }
    if (data.language) storeUpdates.gameLanguage = data.language;
    storeUpdates.minWordLength = data.minWordLength ?? 2;
    if (data.boardTheme) storeUpdates.boardTheme = data.boardTheme;
    if (data.gameMode) {
      // Authoritative server mode (results-screen → next-round path, where
      // usePlayerGameEvents' listener isn't mounted). Confirm atomically so the
      // in-game view never renders a stale mode from the round that just ended.
      storeUpdates.gameMode = data.gameMode;
      storeUpdates.gameModeConfirmed = true;
    }
    if (data.blastTileOverlay) {
      storeUpdates.blastTileOverlay = data.blastTileOverlay;
      storeUpdates.blastMovesUsed = 0;
      if (data.blastSeed != null) storeUpdates.blastSeed = data.blastSeed;
    }
    if (data.wordHuntTargetLength != null && data.wordHuntTargetLength > 0) {
      storeUpdates.wordHuntTargetLength = data.wordHuntTargetLength;
      storeUpdates.wordHuntTargetCategory = data.wordHuntTargetCategory ?? null;
      storeUpdates.wordHuntMyLife = 100;
      storeUpdates.wordHuntPlayerLives = data.wordHuntPlayerLives || {};
      storeUpdates.wordHuntTargetAttempts = [];
      storeUpdates.wordHuntTargetFound = false;
      storeUpdates.wordHuntTargetFoundBy = null;
      storeUpdates.wordHuntEliminatedPlayers = data.wordHuntEliminatedPlayers || [];
      storeUpdates.wordHuntDiscoveryClues = [];
      storeUpdates.wordHuntKnownLetters = [];
    }
    if (data.lateJoin) {
      storeUpdates.gameActive = true;
    }
    useGameStore.setState(storeUpdates);

    // For late joins, show waiting screen briefly before starting animation
    // This gives visual confirmation that the player successfully joined the room
    const isLateJoin = pendingGameStart.messageId?.startsWith('late-join-');
    const delay = isLateJoin ? 1500 : 0; // 1.5 second delay for late joins to show room code

    // Game language already written to the store above (storeUpdates.gameLanguage);
    // the waiting + in-game views read it via resolvedGameLanguage.

    const startGame = () => {
      // Set game data and start animation
      if (pendingGameStart.letterGrid) setLetterGrid(pendingGameStart.letterGrid);
      if (pendingGameStart.timerSeconds) {
        totalGameTimeRef.current = pendingGameStart.timerSeconds;
        // Sync timer with pending game start
        timerReset();
        timerSetTime(pendingGameStart.timerSeconds);
      }
      setMinWordLength(pendingGameStart.minWordLength ?? 2);
      // Skip ModeRevealOverlay — mode is already visible in lobby; the splash
      // + GoRipplesAnimation read visually as two countdowns. Go straight to 3-2-1.
      revealedMessageIdRef.current = pendingGameStart.messageId ?? null;
      setShowStartAnimation(true);

      // Trigger music immediately for synchronization
      handleGameStartMusic();

      if (pendingGameStart.messageId) {
        pendingMessageIdRef.current = pendingGameStart.messageId;
        stashStartGameMessageId('PLAYER', pendingGameStart.messageId);
        // Mark handled so usePlayerGameEvents.handleStartGame's dedup guard
        // short-circuits when the socket event arrives — otherwise both
        // handlers set showStartAnimation=true at different times, GoRipples
        // unmounts/remounts, and the player sees the countdown twice.
        markStartGameHandled('PLAYER', pendingGameStart.messageId);
        socket.emit('startGameAck', { messageId: pendingGameStart.messageId });
        logger.log('[PLAYER] Sent startGameAck for pending game start, messageId:', pendingGameStart.messageId);
      }

      // Consume AFTER setup so dep change doesn't trigger cleanup that cancels
      // the delayed-start timeout (late-join path).
      onGameStartConsumed();
    };

    if (delay > 0) {
      // Late join - delay to show waiting screen briefly
      const startAnimationTimer = setTimeout(startGame, delay);
      return () => clearTimeout(startAnimationTimer);
    } else {
      // Normal game start - no delay
      startGame();
      return;
    }
  }, [pendingGameStart, socket, onGameStartConsumed, handleGameStartMusic, timerReset, timerSetTime, setFoundWords, setLetterGrid]);


  // Word submission handler - adds word with pending validation state
  // Uses WordDetail type from GameStateContext
  const handleWordSubmit = useCallback((formedWord: string, meta?: { inputMethod?: 'kb' | 'drag' }) => {
    setFoundWords(prev => [...prev, {
      word: formedWord,
      score: 0, // Will be updated when validated
      validated: false, // Pending validation - will be updated by usePlayerWordEvents
      isDuplicate: false,
      inputMethod: meta?.inputMethod ?? 'drag',
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
      inputMethod: w.inputMethod,
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

  // Map game mode to display label
  const modeRevealLabel = gameMode === 'blast' ? t('countdown.modeReveal.blast') : gameMode === 'word-hunt' ? t('countdown.modeReveal.wordHunt') : gameMode === 'wheel-rush' ? t('countdown.modeReveal.wheelRush') : t('countdown.modeReveal.classic');

  // The mode-reveal / countdown sequence always routes through the main
  // in-game-view return below, so GoRipplesAnimation (and ModeRevealOverlay)
  // mount from exactly one tree position — no unmount/remount that would
  // restart the countdown from 3.
  if (!showGameView && !waitingForResults && !showModeReveal && !showStartAnimation) {
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

    return (
      <PlayerWaitingView
          gameCode={gameCode}
          gameLanguage={resolvedGameLanguage}
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
          onAvatarChange={handleAvatarChange}
          readyUsernames={readyUsernames}
          isReady={isReady}
          onToggleReady={toggleReady}
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
          <div className="border-3 border-neo-black rounded-neo shadow-hard px-6 py-4 bg-linear-to-br from-neo-yellow to-neo-orange">
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
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('game.calculatingResults')}</span>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  return (
    <>
      {showModeReveal && (
        <ModeRevealOverlay
          modeLabel={modeRevealLabel}
          seriesRoundNumber={seriesRoundNumber}
          t={t}
          onIntroDismiss={() => dispatchReveal({ type: 'endReveal' })}
        />
      )}
      {coachMode && <ModeCoach mode={coachMode} />}
      {showStartAnimation && (
        <GoRipplesAnimation
          onComplete={() => {
            setShowStartAnimation(false);
            const id = pendingMessageIdRef.current ?? consumeStashedMessageId('PLAYER');
            pendingMessageIdRef.current = null;
            if (socket) sendCountdownComplete(socket, id, 'PLAYER');
          }}
          t={t}
          players={playersReady}
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
        showStartAnimation={showModeReveal || showStartAnimation}
        remainingTime={remainingTime}
        gameLanguage={resolvedGameLanguage}
        minWordLength={minWordLength}
        comboLevel={comboLevel}
        comboLevelRef={comboLevelRef}
        lastWordTime={lastWordTime}
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
        totalTime={totalGameTimeRef.current}
      />
    </>
  );
});

PlayerView.displayName = 'PlayerView';

export default PlayerView;
