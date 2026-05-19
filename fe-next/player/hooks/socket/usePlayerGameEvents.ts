/**
 * Player Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, resetGame, results
 *
 * REFACTORED: Now uses GameStateContext instead of massive prop drilling
 * Reduced from 20+ state setter props to just a few local state props
 */
import { useEffect, useRef, useMemo, type RefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, TOAST_ICONS } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';

import {
  sendStartGameAck,
  stashStartGameMessageId,
  markStartGameHandled,
  wasStartGameHandled,
  createHostLeftRoomClosingHandler,
} from '@/shared/utils/gameEventUtils';
import { useLetterGrid, useGameLanguage, useShowStartAnimation, useGameActions, useGameStore } from '@/hooks/gameState';
import type { BlastComboSyncPayload, StartGameBroadcast, PlayerResultPayload } from '@/shared/types/socket';
import type { BlastTileState } from '@/shared/types/blast';
import type { BlastTileOverlay, LetterFeedback, BlastPlayerStats, WheelRushPlayerStats } from '@/shared/types/game';
import type { LetterGrid, Language } from '@/types';
import type { WordToVote } from '@/player/types';
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
import logger from '@/utils/logger';
import { addGameBreadcrumb } from '@/utils/sentry';
import type { GameTimerReturn } from '@/hooks/useGameTimer';

interface StartGameBroadcastExt extends StartGameBroadcast {
  gameSessionId?: number;
  boardTheme?: string;
  blastTileOverlay?: BlastTileOverlay[];
  blastPlayerMoves?: Record<string, number>;
  blastSeed?: number | null;
  blastGrid?: string[][];
  blastTileStates?: BlastTileState[][];
  wordHuntTargetLength?: number;
  wordHuntTargetCategory?: string | null;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
  /** Reconnect-only: player's own found-word list, for UI replay */
  myFoundWords?: string[];
}

interface ValidatedScoresPayload {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  gameMode?: string;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: BlastSummary;
  wheelRushSummary?: WheelRushSummary;
  tvMode?: boolean;
}

interface WordHuntSummary {
  targetWord: string;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
  foundTarget: boolean;
  survivalTime: number;
  discoveryWords: number;
}

interface BlastSummary {
  playerMoves: Record<string, number>;
  playerStats: Record<string, BlastPlayerStats>;
}

interface WheelRushSummary {
  playerStats: Record<string, WheelRushPlayerStats>;
}

interface TimeUpdatePayload {
  remainingTime: number;
  letterGrid?: LetterGrid;
  language?: Language;
  gameSessionId?: number;
}

interface ResetGamePayload {
  gameSessionId?: number;
  message?: string;
}

interface FinalScoresPayload {
  scores: PlayerResultPayload[];
}

export interface OnShowResultsData {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: BlastSummary;
  wheelRushSummary?: WheelRushSummary;
}

interface UsePlayerGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  username: string;
  onShowResults?: (data: OnShowResultsData) => void;

  // Local state (not in GameState context)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs (TODO: refactor to use context actions)
  comboLevelRef: RefObject<number>;
  lastWordTimeRef: RefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: RefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: RefObject<number>;

  // Exit ref
  intentionalExitRef: RefObject<boolean>;

  // Music ref for tracking total game time
  totalGameTimeRef?: RefObject<number>;

  // Timer for multiplayer sync
  gameTimer?: GameTimerReturn;

  // Callbacks
  onGameStart?: () => void;
}

interface UsePlayerGameEventsReturn {
  gameSessionIdRef: RefObject<number>;
}

/**
 * Hook for managing player game lifecycle socket events
 */
export function usePlayerGameEvents({
  socket,
  t,
  username,
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
  gameTimer,
  onGameStart,
}: UsePlayerGameEventsProps): UsePlayerGameEventsReturn {
  // Get state values from Zustand store (selective subscriptions for performance)
  const letterGrid = useLetterGrid();
  const gameLanguage = useGameLanguage();
  const showStartAnimation = useShowStartAnimation();

  // Refs to access current values without causing useEffect re-registration
  // CRITICAL: letterGrid and gameLanguage are used inside socket handlers
  // but should NOT be in useEffect deps - changing them would clear fire round countdown
  const letterGridRef = useRef(letterGrid);
  const gameLanguageRef = useRef(gameLanguage);
  // Track showStartAnimation to prevent activating game during countdown
  const showStartAnimationRef = useRef(showStartAnimation);
  useEffect(() => {
    letterGridRef.current = letterGrid;
  }, [letterGrid]);
  useEffect(() => {
    gameLanguageRef.current = gameLanguage;
  }, [gameLanguage]);
  useEffect(() => {
    showStartAnimationRef.current = showStartAnimation;
  }, [showStartAnimation]);

  // Get all setters from Zustand store (actions never trigger re-renders)
  const {
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
    setShufflingGrid,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setXpGainedData,
    setLevelUpData,
    setTotalBoardWords,
    setBlastComboSync,
    setBlastBoardUpdate,
    setWordHuntMyLife,
    setWordHuntPlayerLives,
    setWordHuntTargetAttempts,
    setWordHuntTargetFound,
    setWordHuntTargetFoundBy,
    setWordHuntEliminatedPlayers,
    addWordHuntDiscoveryClues,
  } = useGameActions();

  // Use refs to avoid stale closure issues
  const onShowResultsRef = useRef(onShowResults);
  useEffect(() => {
    onShowResultsRef.current = onShowResults;
  }, [onShowResults]);

  // Mirror host pattern: keep onGameStart in a ref so the socket-listener effect
  // doesn't re-register every time the parent's callback identity changes
  // (which would otherwise cause the startGame handler to register twice and
  // fire twice on the same event — the "MP game starts twice" symptom).
  const onGameStartRef = useRef(onGameStart);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);

  // CRITICAL: Store gameTimer in a ref to avoid socket listener re-registration
  // The gameTimer object is new on every render, but its methods (setTime, reset) are stable
  // By using a ref, we prevent the useEffect from re-running on every render
  const gameTimerRef = useRef(gameTimer);
  useEffect(() => {
    gameTimerRef.current = gameTimer;
  }, [gameTimer]);

  // Use refs to avoid socket listener re-registration race conditions
  const gameActiveRef = useRef(false);
  const wasInActiveGameRef = useRef(false);

  // Track when we entered waiting state
  const waitingStartTimeRef = useRef<number | null>(null);

  // Track game session ID
  const gameSessionIdRef = useRef<number>(0);

  // Track whether results have already been processed for this game session
  // Prevents true duplicates without blocking the initial event (fixes race condition
  // where validatedScores can arrive before endGame sets waitingForResults=true)
  const hasProcessedResultsRef = useRef<number | null>(null);

  // Fire round interval ref - persists across handler recreations
  // This is critical for ensuring the countdown continues even if useEffect re-runs
  const fireRoundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized room closed handler
  const handleHostLeftRoomClosing = useMemo(() => {
    if (!socket) return () => {};
    return createHostLeftRoomClosingHandler(socket, username, t, intentionalExitRef);
  }, [socket, username, t, intentionalExitRef]);

  // Memoized earthquake handlers using shared utility
  // Note: fireRoundIntervalRef is intentionally NOT in deps - it's a stable ref
  const earthquakeHandlers = useMemo(() => createEarthquakeSocketHandlers({
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    setLetterGrid,
    gameSessionIdRef,
    fireRoundIntervalRef,
    role: 'PLAYER',
  }), [setEarthquakeState, setFireRoundActive, setFireRoundRemaining, setLetterGrid]);

  useEffect(() => {
    if (!socket) return;

    const handleStartGame = (data: StartGameBroadcast) => {
      const ext = data as StartGameBroadcastExt;
      // Validate session - ignore stale events
      if (gameSessionIdRef.current !== null && ext.gameSessionId !== undefined &&
          ext.gameSessionId < gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale startGame from old session');
        return;
      }

      // Self-dedup: if this exact messageId was already fully handled (either
      // by this listener firing twice, or by PlayerView's pendingGameStart
      // effect running first), skip the redundant store/timer/music/ack work.
      // This kills the "MP game starts twice" symptom regardless of cause —
      // server re-emit, listener re-register, or React StrictMode double-mount.
      if (data.messageId && wasStartGameHandled('PLAYER', data.messageId)) {
        logger.log('[PLAYER] Ignoring duplicate startGame for messageId:', data.messageId);
        return;
      }

      wasInActiveGameRef.current = true;
      comboShieldsUsedRef.current = 0;

      // Detect retry of same session: server re-fires startGame to clients that
      // didn't ack. We must NOT clobber in-flight game state (life, attempts) on
      // retry — surfaced as "life didn't drain" for guests whose ack path lags.
      const prevSessionId = gameSessionIdRef.current;
      const isSameSessionRetry = prevSessionId !== null
        && ext.gameSessionId !== undefined
        && prevSessionId === ext.gameSessionId;

      if (ext.gameSessionId !== undefined) {
        gameSessionIdRef.current = ext.gameSessionId;
      }

      // Batch all Zustand store updates into a single setState call
      // This prevents cascading re-renders (was 15+ individual updates)
      const isReconnect = data.reconnect === true;
      const storeUpdates: Record<string, unknown> = {};
      if (!isReconnect) {
        // Fresh game: clear words + achievements
        storeUpdates.foundWords = [];
        storeUpdates.achievements = [];
      } else if (ext.myFoundWords && ext.myFoundWords.length > 0) {
        // Reconnect snapshot: replay player's own words. Per-word score is not
        // persisted server-side (only the string list); total score is restored
        // separately via updateLeaderboard. score:0 is a UX placeholder.
        storeUpdates.foundWords = ext.myFoundWords.map((word) => ({
          word,
          score: 0,
          validated: true,
          isDuplicate: false,
        }));
      }
      if (data.letterGrid) storeUpdates.letterGrid = data.letterGrid;
      if (data.timerSeconds) {
        storeUpdates.remainingTime = data.timerSeconds;
        storeUpdates.gameDuration = data.timerSeconds;
      }
      if (data.language) storeUpdates.gameLanguage = data.language;
      storeUpdates.minWordLength = data.minWordLength ?? 2;
      if (ext.boardTheme) storeUpdates.boardTheme = ext.boardTheme;
      if (data.gameMode) storeUpdates.gameMode = data.gameMode;
      if (ext.blastTileOverlay) {
        storeUpdates.blastTileOverlay = ext.blastTileOverlay;
        const reconnectMoves = ext.blastPlayerMoves;
        const myMoves = reconnectMoves?.[username] ?? 0;
        if (ext.blastSeed != null) storeUpdates.blastSeed = ext.blastSeed;
        // Reconnect/late-join: apply current server board state if available
        if (ext.blastGrid && ext.blastTileStates) {
          storeUpdates.blastBoardUpdate = {
            grid: ext.blastGrid,
            tileStates: ext.blastTileStates,
            clearedBy: '__server_reconnect__',
            word: '',
            clearedCount: 0,
            totalMoves: myMoves,
          };
        }
      }
      if (ext.wordHuntTargetLength != null && ext.wordHuntTargetLength > 0) {
        // Target length + category are immutable per session — apply unconditionally
        // so recovery/reconnect/late-join can heal a client that missed the original
        // startGame (was: clue tiles missing). isSameSessionRetry only gates resetting
        // in-flight state below.
        storeUpdates.wordHuntTargetLength = ext.wordHuntTargetLength;
        storeUpdates.wordHuntTargetCategory = ext.wordHuntTargetCategory ?? null;
        if (!isSameSessionRetry) {
          const serverLife = ext.wordHuntPlayerLives?.[username];
          storeUpdates.wordHuntMyLife = typeof serverLife === 'number' ? serverLife : 100;
          storeUpdates.wordHuntPlayerLives = ext.wordHuntPlayerLives || {};
          storeUpdates.wordHuntTargetAttempts = [];
          storeUpdates.wordHuntTargetFound = false;
          storeUpdates.wordHuntTargetFoundBy = null;
          storeUpdates.wordHuntEliminatedPlayers = ext.wordHuntEliminatedPlayers || [];
          storeUpdates.wordHuntDiscoveryClues = [];
          storeUpdates.wordHuntKnownLetters = [];
        }
      }
      if (data.lateJoin) {
        storeUpdates.gameActive = true;
        gameActiveRef.current = true;
      } else {
        storeUpdates.showStartAnimation = true;
      }

      useGameStore.setState(storeUpdates);

      // Non-store operations (refs, timer, toast)
      // Set the timer to the correct initial value. The timer is paused (isPaused: !gameActive)
      // so it won't tick until the countdown animation completes and gameActive becomes true.
      if (data.timerSeconds) {
        if (totalGameTimeRef) totalGameTimeRef.current = data.timerSeconds;
        if (gameTimerRef.current) {
          gameTimerRef.current.reset();
          gameTimerRef.current.setTime(data.timerSeconds);
        }
      }

      stashStartGameMessageId('PLAYER', data.messageId);
      // Record this messageId so PlayerView's pendingGameStart effect skips
      // its redundant store/timer/ack work — it stays the sole handler only
      // when this socket listener is unmounted (player on results screen).
      markStartGameHandled('PLAYER', data.messageId);
      sendStartGameAck(socket, data, 'PLAYER');
      onGameStartRef.current?.();

      const toastMessage = data.lateJoin
        ? (t('common.joinedGame') || 'Joined game!')
        : t('common.gameStarted');
      neoSuccessToast(toastMessage, { id: 'game-started', icon: data.lateJoin ? TOAST_ICONS.gamepad : TOAST_ICONS.rocket, duration: 3000 });
    };

    // Fallback timeout: if we enter waitingForResults but never get validatedScores,
    // request results from server after 15s. Prevents infinite loading screen.
    let resultsTimeoutId: NodeJS.Timeout | null = null;

    const startResultsTimeout = () => {
      if (resultsTimeoutId) clearTimeout(resultsTimeoutId);
      resultsTimeoutId = setTimeout(() => {
        if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
          logger.log('[PLAYER] Results timeout — requesting results from server');
          socket.emit('requestResults');
          // Second fallback: force-transition after 5 more seconds
          resultsTimeoutId = setTimeout(() => {
            if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
              logger.log('[PLAYER] Results fallback — forcing transition with empty results');
              hasProcessedResultsRef.current = gameSessionIdRef.current;
              setWaitingForResults(false);
              const currentOnShowResults = onShowResultsRef.current;
              if (currentOnShowResults) {
                currentOnShowResults({ scores: [], letterGrid: null });
              }
            }
          }, 5000);
        }
      }, 15000);
    };

    const handleEndGame = () => {
      const wasActive = wasInActiveGameRef.current;
      logger.log('[PLAYER] Received endGame event, wasInActiveGame:', wasActive);
      setGameActive(false);
      gameActiveRef.current = false;
      setRemainingTime(0);
      setShowStartAnimation(false);
      // Mark waiting so UI knows game ended (but no validation modal is shown)
      setWaitingForResults(true);
      startResultsTimeout();
    };

    const handleTimeUpdate = (data: TimeUpdatePayload) => {
      // Only reject OLDER sessions. Strict !== drops legitimate timeUpdates
      // from a NEW session that arrive before the corresponding startGame
      // updates the ref (rare reorder; happens on reconnect snapshots).
      if (data.gameSessionId !== undefined && data.gameSessionId < gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        // Telemetry: pairs with `mp_timer_stall` breadcrumb. If the stall
        // watchdog fires, this trail explains why timeUpdate emits never
        // moved the display.
        addGameBreadcrumb('mp_timer_update_filtered', {
          role: 'player',
          incomingSessionId: data.gameSessionId,
          currentSessionId: gameSessionIdRef.current,
          remainingTime: data.remainingTime,
        });
        return;
      }

      // ALWAYS sync timer with server time — even during countdown animation.
      // The timer is paused (isPaused: !gameActive) during countdown so it won't
      // visually tick, but storing the correct value ensures the timer starts from
      // the accurate server time when the countdown ends and the game activates.
      if (gameTimerRef.current && data.remainingTime !== undefined) {
        gameTimerRef.current.setTime(data.remainingTime);
      }
      setRemainingTime(data.remainingTime);

      // Use refs to access current values without causing effect re-registration
      if (data.letterGrid && !letterGridRef.current) {
        logger.log('[PLAYER] Received letterGrid in timeUpdate - late join sync');
        setLetterGrid(data.letterGrid);
      }
      if (data.language && !gameLanguageRef.current) {
        setGameLanguage(data.language);
      }

      // Game-end signal must run regardless of countdown-animation state — if
      // the server says 0 remaining, the round IS over and the player needs the
      // waiting-for-results UI plus the fallback timeout. Previously this branch
      // sat below the showStartAnimation early-return, so a `timeUpdate(0)` that
      // arrived while the 3-2-1 ripple was still on screen was silently dropped.
      if (data.remainingTime <= 0) {
        setGameActive(false);
        gameActiveRef.current = false;
        setShowStartAnimation(false);
        setWaitingForResults(true);
        startResultsTimeout();
        return;
      }

      // During countdown animation, sync the timer (above) but don't activate the game
      if (showStartAnimationRef.current) {
        return;
      }

      const isGameActive = gameActiveRef.current;
      const hasGrid = letterGridRef.current || data.letterGrid;
      if (!isGameActive && data.remainingTime > 0 && hasGrid) {
        logger.log('[PLAYER] Timer started on server, activating game via timeUpdate (countdown complete)');
        setGameActive(true);
        gameActiveRef.current = true;
        setShowStartAnimation(false);
      }
    };

    // --- TV mode sync: defer results until host reveals on TV ---
    let tvRevealTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const pendingTvResultsRef: { current: ValidatedScoresPayload | null } = { current: null };
    let tvRevealedBeforeData = false;

    const showResultsFromData = (data: ValidatedScoresPayload) => {
      // Sync blast stats from server
      if (data.blastSummary) {
        const store = useGameStore.getState();
        if (data.blastSummary.playerStats) {
          store.setBlastPlayerStats(data.blastSummary.playerStats);
          const myStats = data.blastSummary.playerStats[username];
          if (myStats) {
            store.setBlastTotalTilesCleared(myStats.tilesCleared || 0);
            store.setBlastTotalTileBonus(myStats.totalTileBonus || 0);
          }
        }
      }

      // Sync wheel rush stats from server for results screen
      if (data.wheelRushSummary?.playerStats) {
        useGameStore.getState().setWheelRushPlayerStats(data.wheelRushSummary.playerStats);
      }

      // Transition to results
      setGameActive(false);
      gameActiveRef.current = false;
      setWaitingForResults(false);
      setShowWordFeedback(false);
      setWordToVote(null);
      waitingStartTimeRef.current = null;

      const currentOnShowResults = onShowResultsRef.current;
      if (currentOnShowResults) {
        currentOnShowResults({
          scores: data.scores,
          letterGrid: data.letterGrid,
          duplicateRuleDisabled: data.duplicateRuleDisabled,
          playerCount: data.playerCount,
          wordHuntSummary: data.wordHuntSummary,
          blastSummary: data.blastSummary,
          wheelRushSummary: data.wheelRushSummary,
        });
      }
    };

    const handleResultsRevealed = () => {
      if (tvRevealTimeoutId) { clearTimeout(tvRevealTimeoutId); tvRevealTimeoutId = null; }
      const pending = pendingTvResultsRef.current;
      if (!pending) {
        // resultsRevealed arrived before validatedScores — flag it so data shows immediately
        tvRevealedBeforeData = true;
        return;
      }
      pendingTvResultsRef.current = null;
      logger.log('[PLAYER] TV reveal received — showing results');
      showResultsFromData(pending);
    };

    const handleValidatedScores = (data: ValidatedScoresPayload) => {
      // Deduplicate by game session — prevents processing results twice for the same game
      if (hasProcessedResultsRef.current === gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring duplicate validatedScores - already processed for session', gameSessionIdRef.current);
        return;
      }
      hasProcessedResultsRef.current = gameSessionIdRef.current;

      // Clear the results fallback timeout — we got real results
      if (resultsTimeoutId) { clearTimeout(resultsTimeoutId); resultsTimeoutId = null; }

      logger.log('[PLAYER] Received validatedScores event:', data);

      // If TV mode active, defer showing results until host signals reveal is done
      if (data.tvMode && !tvRevealedBeforeData) {
        pendingTvResultsRef.current = data;
        // Mark game inactive immediately so UI stops gameplay
        setGameActive(false);
        gameActiveRef.current = false;
        setWaitingForResults(true);
        // 25s fallback — if host never reveals (disconnect, etc), show results anyway
        tvRevealTimeoutId = setTimeout(() => {
          if (pendingTvResultsRef.current) {
            logger.log('[PLAYER] TV reveal timeout — showing results anyway');
            pendingTvResultsRef.current = null;
            showResultsFromData(data);
          }
        }, 25000);
        return;
      }

      showResultsFromData(data);
    };

    const handleFinalScores = (data: FinalScoresPayload) => {
      logger.log('[PLAYER] Received legacy finalScores event:', data);

      // Transition directly to results — no validation modal delay
      setWaitingForResults(false);
      setShowWordFeedback(false);
      setWordToVote(null);
      waitingStartTimeRef.current = null;

      const currentOnShowResults = onShowResultsRef.current;
      if (currentOnShowResults) {
        currentOnShowResults({
          scores: data.scores,
          letterGrid: letterGridRef.current,
        });
      }
    };

    const handleResetGame = (data: ResetGamePayload) => {
      // Guard against stale reset from old session
      if (data.gameSessionId !== undefined && gameSessionIdRef.current !== null &&
          data.gameSessionId < gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale resetGame from old session');
        return;
      }
      setGameActive(false);
      gameActiveRef.current = false;
      wasInActiveGameRef.current = false;
      setFoundWords([]);
      setAchievements([]);
      setLeaderboard([]);
      setRemainingTime(null);
      setWaitingForResults(false);
      setLetterGrid(null);
      setShufflingGrid(null);
      setShowStartAnimation(false);
      waitingStartTimeRef.current = null;
      hasProcessedResultsRef.current = null;

      // Reset timer for next game
      // Use ref to get latest timer methods (avoids socket listener re-registration)
      if (gameTimerRef.current) {
        gameTimerRef.current.reset();
      }

      // Reset combo state using shared utility
      resetComboStateUtil(
        { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
        { setComboLevel, setLastWordTime }
      );
      comboShieldsUsedRef.current = 0;

      if (data.gameSessionId !== undefined) {
        gameSessionIdRef.current = data.gameSessionId;
      }

      setShowWordFeedback(false);
      setWordToVote(null);
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      setXpGainedData(null);
      setLevelUpData(null);
      setTotalBoardWords(null);

      // Reset earthquake/fire-round state for next game
      setEarthquakeState('idle');
      setFireRoundActive(false);
      setFireRoundRemaining(0);
      if (fireRoundIntervalRef.current) {
        clearInterval(fireRoundIntervalRef.current);
        fireRoundIntervalRef.current = null;
      }

      // Reset word hunt state for next game
      setWordHuntEliminatedPlayers([]);
      setWordHuntTargetFound(false);
      setWordHuntTargetAttempts([]);
      setWordHuntPlayerLives({});
      setWordHuntMyLife(100);
      useGameStore.setState({ wordHuntDiscoveryClues: [], wordHuntKnownLetters: [] });

      // Reset blast mode state for next game
      const blastResetStore = useGameStore.getState();
      blastResetStore.setBlastTileOverlay([]);
      blastResetStore.setBlastTotalTileBonus(0);
      blastResetStore.setBlastTotalTilesCleared(0);
      blastResetStore.setBlastSeed(null);
      blastResetStore.setBlastComboSync(null);
      useGameStore.setState({ blastOpponentActivity: [] });

      neoSuccessToast(data.message || t('common.newGameReady'), { icon: TOAST_ICONS.refresh, duration: 3000 });
    };

    // Handle combo sync from another player — triggers BlastComboFlash overlay for spectators.
    // Only fires for other players' combos; local player sees their own flash immediately.
    const handleBlastComboSync = (data: BlastComboSyncPayload) => {
      logger.log('[PLAYER] Blast combo sync from:', data.username, 'combo:', data.comboType);
      // Only show flash for other players' combos (not our own)
      if (data.username !== username) {
        setBlastComboSync({ ...data, id: `combo-sync-${Date.now()}` });
        // Also push to opponent activity feed
        useGameStore.getState().pushBlastOpponentActivity({
          id: `combo-${Date.now()}`,
          username: data.username,
          type: 'combo',
          message: data.comboType,
        });
      }
    };

    // Handle playerFoundWord broadcast — shows opponent word activity in blast MP feed
    const handlePlayerFoundWord = (data: { username: string; word: string; score: number; comboLevel: number; wordCount: number; comboSync?: { comboType: string; username: string } }) => {
      // Handle merged comboSync (Fix 2) — extract from playerFoundWord instead of separate event
      if (data.comboSync && data.comboSync.username !== username) {
        setBlastComboSync({ ...data.comboSync, id: `combo-sync-${Date.now()}` });
        useGameStore.getState().pushBlastOpponentActivity({
          id: `combo-${Date.now()}`,
          username: data.comboSync.username,
          type: 'combo',
          message: data.comboSync.comboType,
        });
      }

      if (data.username === username) return; // Skip own words
      const store = useGameStore.getState();
      store.pushBlastOpponentActivity({
        id: `word-${Date.now()}-${data.username}`,
        username: data.username,
        type: 'word',
        word: data.word,
        score: data.score,
        comboLevel: data.comboLevel,
      });
      // Milestone alerts at score thresholds
      if (data.score > 0 && data.score % 500 < 50 && data.score >= 500) {
        store.pushBlastOpponentActivity({
          id: `milestone-${Date.now()}-${data.username}`,
          username: data.username,
          type: 'milestone',
          score: data.score,
          message: `${data.score}+ pts!`,
        });
      }
    };

    // Handle server-authoritative blast board update (MP board sync)
    // A full board-clear regenerate carries optional overlay + seed for lock-step sync.
    // Regular per-word updates omit these fields.
    const handleBlastBoardUpdate = (data: {
      grid: string[][];
      tileStates: BlastTileState[][];
      clearedBy: string;
      word: string;
      clearedCount: number;
      totalMoves: number;
      overlay?: BlastTileOverlay[];
      seed?: number;
    }) => {
      logger.log('[PLAYER] Blast board update from', data.clearedBy, '- word:', data.word, 'cleared:', data.clearedCount);
      // A full board-clear regenerates the overlay server-side; apply it so the
      // client board stays in lock-step. Regular per-word updates omit overlay/seed.
      if (data.overlay && typeof data.seed === 'number') {
        useGameStore.setState({
          blastTileOverlay: data.overlay,
          blastSeed: data.seed,
        });
      }
      setBlastBoardUpdate(data);
    };


    // Handle total board words count (for "words remaining" display)
    const handleTotalBoardWords = (data: { count: number }) => {
      logger.log('[PLAYER] Received totalBoardWords:', data.count);
      setTotalBoardWords(data.count);
    };

    // Word Hunt event handlers
    const handleWordHuntLifeUpdate = (data: { playerLives: Record<string, number>; eliminatedPlayers?: string[] }) => {
      logger.log('[PLAYER] Word hunt life update:', data);
      setWordHuntPlayerLives(data.playerLives);
      if (data.playerLives[username] !== undefined) {
        setWordHuntMyLife(data.playerLives[username]);
      }
      // Reconcile eliminatedPlayers from server (handles reconnect and missed events)
      if (data.eliminatedPlayers) {
        setWordHuntEliminatedPlayers(data.eliminatedPlayers);
      }
    };

    const handleWordHuntTargetResult = (data: { guess: string; feedback: LetterFeedback[]; correct: boolean; isFirstFinder: boolean; bonus: number; livesRemaining: number; isDiscovery?: boolean }) => {
      logger.log('[PLAYER] Word hunt target result:', data);
      setWordHuntTargetAttempts((prev) => [...prev, { guess: data.guess, feedback: data.feedback, isDiscovery: data.isDiscovery || false }]);
      setWordHuntMyLife(data.livesRemaining);
      if (data.correct) {
        setWordHuntTargetFound(true);
      }
    };

    const handleWordHuntTargetFound = (data: { username: string; targetWord: string; isFirstFinder: boolean }) => {
      logger.log('[PLAYER] Word hunt target found by:', data.username);
      // Mark target as found for all players (disables input for non-finders too)
      setWordHuntTargetFound(true);
      // Store WHO found it so the overlay can distinguish "I found it" vs "someone else found it"
      setWordHuntTargetFoundBy(data.username);
      // Show notification about who found it
      neoSuccessToast(`${data.username} ${t('wordHunt.foundTarget')}!`, { icon: TOAST_ICONS.target, duration: 3000 });
    };

    const handleWordHuntEliminated = (data: { username: string }) => {
      logger.log('[PLAYER] Word hunt player eliminated:', data.username);
      setWordHuntEliminatedPlayers((prev) => [...prev, data.username]);
    };

    const handleWordHuntDiscoveryClues = (data: { word: string; greenPositions: Array<{ position: number; letter: string }>; knownLetters: string[] }) => {
      logger.log('[PLAYER] Word hunt discovery clues:', data);
      addWordHuntDiscoveryClues(data.greenPositions, data.knownLetters);
    };

    // Register listeners
    socket.on('startGame', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('validatedScores', handleValidatedScores);
    socket.on('resultsRevealed', handleResultsRevealed);
    socket.on('finalScores', handleFinalScores);
    socket.on('resetGame', handleResetGame);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    // Earthquake handlers from shared utility
    socket.on('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
    socket.on('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
    socket.on('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
    socket.on('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
    socket.on('totalBoardWords', handleTotalBoardWords);
    socket.on('blastComboSync', handleBlastComboSync);
    socket.on('playerFoundWord', handlePlayerFoundWord);
    socket.on('blastBoardUpdate', handleBlastBoardUpdate);
    socket.on('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
    socket.on('wordHuntTargetResult', handleWordHuntTargetResult);
    socket.on('wordHuntTargetFound', handleWordHuntTargetFound);
    socket.on('wordHuntEliminated', handleWordHuntEliminated);
    socket.on('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);

    // Recovery: if socket reconnects after missing validatedScores, request them from server.
    // This handles the case where a brief disconnect during game-end causes the client
    // to miss the fire-and-forget broadcast.
    const handleReconnectRecovery = () => {
      // Only request if we were in an active game and haven't processed results yet
      if (wasInActiveGameRef.current && hasProcessedResultsRef.current !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Socket reconnected — requesting missed results');
        socket.emit('requestResults');
      }
    };
    socket.on('connect', handleReconnectRecovery);

    return () => {
      // Clear results fallback timeout
      if (resultsTimeoutId) { clearTimeout(resultsTimeoutId); resultsTimeoutId = null; }
      // Clear fire round interval explicitly
      if (fireRoundIntervalRef.current) {
        clearInterval(fireRoundIntervalRef.current);
        fireRoundIntervalRef.current = null;
      }
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('resultsRevealed', handleResultsRevealed);
      socket.off('finalScores', handleFinalScores);
      if (tvRevealTimeoutId) { clearTimeout(tvRevealTimeoutId); tvRevealTimeoutId = null; }
      socket.off('resetGame', handleResetGame);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      // Earthquake handlers cleanup
      socket.off('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
      socket.off('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
      socket.off('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
      socket.off('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
      earthquakeHandlers.cleanup();
      socket.off('totalBoardWords', handleTotalBoardWords);
      socket.off('blastComboSync', handleBlastComboSync);
      socket.off('playerFoundWord', handlePlayerFoundWord);
      socket.off('blastBoardUpdate', handleBlastBoardUpdate);
      socket.off('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
      socket.off('wordHuntTargetResult', handleWordHuntTargetResult);
      socket.off('wordHuntTargetFound', handleWordHuntTargetFound);
      socket.off('wordHuntEliminated', handleWordHuntEliminated);
      socket.off('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);
      socket.off('connect', handleReconnectRecovery);
    };
    // Setters from context are stable (wrapped in useCallback)
    // NOTE: letterGrid and gameLanguage are accessed via refs (letterGridRef, gameLanguageRef)
    // to avoid re-registering socket listeners when they change. This is critical because
    // fireRoundStart changes the grid, and re-registering would clear the fire round countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket,
    t,
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
    setShufflingGrid,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setShowWordFeedback,
    setWordToVote,
    setXpGainedData,
    setLevelUpData,
    setTotalBoardWords,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    // NOTE: gameTimer is intentionally NOT in deps - we use gameTimerRef to access it
    // This prevents socket listener re-registration on every render
    // NOTE: earthquakeHandlers is memoized so it's safe to include
    earthquakeHandlers,
    handleHostLeftRoomClosing,
    // NOTE: onGameStart accessed via onGameStartRef to prevent socket listener
    // re-registration when the parent's callback identity changes.
  ]);

  return { gameSessionIdRef };
}
