'use client';

/**
 * All state and effects behind PlayerView (the joiner's phase router): store
 * subscriptions, reveal/countdown state, server-synced timer + watchdogs,
 * lobby/exit/combo/telemetry/music/socket wiring, and the pending-start
 * handoff (usePendingGameStart). Split out of PlayerView (FOUNDATION
 * 2026-09-26); code moved verbatim.
 */

import { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePlayerMusic } from './usePlayerMusic';
import { useFirstTimeTracking } from './useFirstTimeTracking';
import { usePlayerExit } from './usePlayerExit';
import { usePlayerLobby } from './usePlayerLobby';
import { useAchievementQueue } from '@/components/achievements';
import { usePresence } from '@/hooks/usePresence';
import { useHints } from '@/hooks/useHints';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useTimerZeroWatchdog } from '@/hooks/useTimerZeroWatchdog';
import { useTimerStallWatchdog } from '@/hooks/useTimerStallWatchdog';
import { useTeacherPaused } from '@/hooks/useTeacherPause';
import { addGameBreadcrumb } from '@/utils/sentry';
import logger from '@/utils/logger';
import type { TournamentStanding } from '@/types';
import type { ViewTournamentData as TournamentData } from '@/shared/types/view';

import { useFirstTimeAchievement } from '@/components/game/FirstTimeAchievement';

import usePlayerSocketEvents from './usePlayerSocketEvents';
import { usePublishGameActive } from './usePublishGameActive';
import { resetComboState } from '@/shared/utils/comboUtils';
import { useFoundWords, useBoardTheme, useTotalBoardWords, useWaitingForResults, useLetterGrid, useShufflingGrid, useLeaderboard, useGameActions, useGameMode, useGameModeConfirmed, useGameLanguage } from '@/hooks/gameState';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { usePlayerRoundTelemetry } from './usePlayerRoundTelemetry';

import type { WordToVote, PlayerViewProps } from '../types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { usePendingGameStart } from './usePendingGameStart';

export function usePlayerPhase({
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
  isClassroomMode,
  classroomGameMode,
}: PlayerViewProps) {
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
  usePublishGameActive(gameActive); // the page's banner reads the store
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
  // Teacher live controls: a paused classroom round freezes the local tick too.
  const teacherPaused = useTeacherPaused();
  const gameTimer = useGameTimer({
    initialTime: 180, // Default, will be updated on game start
    isPaused: !gameActive || teacherPaused, // not active, or frozen by the teacher
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
    // A teacher pause is a frozen clock BY DESIGN — not a stall to recover from.
    gameActive: gameActive && !teacherPaused,
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
  const { isGameLoading, handleNameChange, readyUsernames, isReady, toggleReady, readyInFlight } = usePlayerLobby({
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

  // CrazyGames lifecycle + MP start/end telemetry (usePlayerRoundTelemetry).
  usePlayerRoundTelemetry({
    gameActive, waitingForResults, leaderboard, username, comboLevel, tournamentData, gameMode,
    gameModeConfirmed, gameCode, humanPlayerCount, botPlayerCount, foundWords,
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

  // Handle pending game start (results screen → next round, or reconnect)
  usePendingGameStart({
    pendingGameStart, socket, onGameStartConsumed, handleGameStartMusic, timerReset, timerSetTime,
    setFoundWords, setLetterGrid, setMinWordLength, setShowModeReveal, setShowStartAnimation,
    pendingMessageIdRef, revealedMessageIdRef, totalGameTimeRef,
  });


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

  return {
    t, dir, socket, waitingForResults, letterGrid, remainingTime, gameActive, showModeReveal, showStartAnimation,
    dispatchReveal, setShowStartAnimation, pendingMessageIdRef, isGameLoading, resolvedGameLanguage, playersReady,
    showQR, setShowQR, showExitConfirm, setShowExitConfirm, handleExitRoom, confirmExitRoom, handleNameChange,
    handleAvatarChange, readyUsernames, isReady, toggleReady, readyInFlight, leaderboard, foundWords, gameMode,
    isNewPlayerRef, pendingAchievement, clearAchievement, shufflingGrid, minWordLength, comboLevel,
    comboLevelRef, lastWordTime, mappedFoundWords, totalBoardWords, tournamentData, tournamentStandings,
    showTournamentStandings, setShowTournamentStandings, handleWordSubmit, handleResetCombo, hints, earthquakeState,
    fireRoundActive, fireRoundRemaining, boardTheme, totalGameTimeRef,
  };
}
