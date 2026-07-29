/**
 * Host Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, validationComplete, resetGame
 */
import { useEffect, useCallback, useRef, useMemo, useState, type RefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, TOAST_ICONS } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';

import {
  sendStartGameAck,
  stashStartGameMessageId,
  wasStartGameHandled,
  markStartGameHandled,
  createRoomClosedDueToInactivityHandler,
  triggerGameOverCelebration,
  showGameCompleteToast,
} from '@/shared/utils/gameEventUtils';
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
import logger from '@/utils/logger';
import { addGameBreadcrumb } from '@/utils/sentry';
import type { StartGameBroadcast, XpGainedPayload, LevelUpPayload, PlayerResultPayload } from '@/shared/types/socket';
import type { BlastTileOverlay, LetterFeedback, BlastPlayerStats, WheelRushPlayerStats } from '@/shared/types/game';
import type { Player } from '@/hooks/useGameState';
import type { LetterGrid, Language } from '@/types';
import type { TournamentData } from '@/shared/types/view';
import { useGameStore } from '@/hooks/gameState/store';

interface StartGameBroadcastExt extends StartGameBroadcast {
  gameSessionId?: number;
  reconnect?: boolean;
  blastTileOverlay?: BlastTileOverlay[];
  blastSeed?: number | null;
  blastWave?: number;
  wordHuntTargetLength?: number;
  wordHuntTargetCategory?: string | null;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
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

interface ValidatedScoresPayload {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  gameMode?: string;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: BlastSummary;
  wheelRushSummary?: WheelRushSummary;
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
  users?: Player[];
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

export interface FinalScoresState {
  players: PlayerResultPayload[];
  gameCode: string;
  wordHuntSummary?: WordHuntSummary;
}

interface UseHostGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  gameStarted: boolean;
  username: string;
  hostPlaying: boolean;

  // State setters
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<React.SetStateAction<LetterGrid | null>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setFinalScores: React.Dispatch<React.SetStateAction<FinalScoresState | null>>;
  setPlayersReady?: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, unknown[]>>>;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<unknown[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<LetterGrid | null>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Earthquake/Fire round state setters
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs and setters (for reset)
  comboLevelRef: RefObject<number>;
  lastWordTimeRef: RefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: RefObject<NodeJS.Timeout | null>;

  // Exit ref
  intentionalExitRef: RefObject<boolean>;

  // Callbacks
  onShowResults?: (data: OnShowResultsData) => void;
  onGameStart?: () => void;
}

interface UseHostGameEventsReturn {
  gameSessionIdRef: RefObject<number>;
  gameSessionId: number;
}

/**
 * Hook for managing host game lifecycle socket events
 */
export function useHostGameEvents({
  socket,
  t,
  gameStarted,
  username,
  hostPlaying,
  setGameStarted,
  setShowStartAnimation,
  setTableData,
  setRemainingTime,
  setWaitingForResults,
  setFinalScores,
  setPlayerWordCounts,
  setPlayerScores,
  setPlayerAchievements,
  setHostFoundWords,
  setHostAchievements,
  setTournamentData,
  setTournamentCreating,
  setShufflingGrid,
  setXpGainedData,
  setLevelUpData,
  setEarthquakeState,
  setFireRoundActive,
  setFireRoundRemaining,
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,
  intentionalExitRef,
  onShowResults,
  onGameStart,
  setPlayersReady,
}: UseHostGameEventsProps): UseHostGameEventsReturn {
  // Use refs to avoid stale closure issues and prevent useEffect re-runs
  const onShowResultsRef = useRef(onShowResults);
  const onGameStartRef = useRef(onGameStart);
  const gameStartedRef = useRef(gameStarted);
  const hostPlayingRef = useRef(hostPlaying);
  const tableDataRef = useRef<LetterGrid | null>(null);

  useEffect(() => {
    onShowResultsRef.current = onShowResults;
  }, [onShowResults]);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);
  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);
  useEffect(() => {
    hostPlayingRef.current = hostPlaying;
  }, [hostPlaying]);

  // Track when we entered waiting state to prevent flickering
  const waitingStartTimeRef = useRef<number | null>(null);

  // Track which game session's results have been processed to prevent duplicates
  const hasProcessedResultsRef = useRef<number | null>(null);

  // Track game session ID to ignore stale events
  const gameSessionIdRef = useRef<number>(0);
  // State version for triggering re-renders when session changes
  const [gameSessionId, setGameSessionId] = useState<number>(0);

  // Fire round interval ref - persists across handler recreations
  // This is critical for ensuring the countdown continues even if useEffect re-runs
  const fireRoundIntervalRef = useRef<NodeJS.Timeout | null>(null);


  // Helper to reset combo state using shared utility
  const resetComboState = useCallback(() => {
    resetComboStateUtil(
      { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
      { setComboLevel, setLastWordTime }
    );
  }, [setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef]);

  // Room closed handler callback
  const handleRoomClosedDueToInactivity = useCallback((data: { message?: string }) => {
    if (!socket) return;
    const handler = createRoomClosedDueToInactivityHandler(socket, username, t, intentionalExitRef);
    handler(data);
  }, [socket, username, t, intentionalExitRef]);

  // Memoized earthquake handlers using shared utility
  // Note: fireRoundIntervalRef is intentionally NOT in deps - it's a stable ref
  const earthquakeHandlers = useMemo(() => createEarthquakeSocketHandlers({
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    setTableData,
    tableDataRef,
    gameSessionIdRef,
    fireRoundIntervalRef,
    role: 'HOST',
  }), [setEarthquakeState, setFireRoundActive, setFireRoundRemaining, setTableData]);

  useEffect(() => {
    if (!socket) return;

    const handleStartGame = (data: StartGameBroadcast) => {
      const extData = data as StartGameBroadcastExt;

      // Validate session ID - ignore stale startGame from previous sessions
      if (gameSessionIdRef.current !== null && extData.gameSessionId !== undefined &&
          extData.gameSessionId < gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale startGame from old session:', extData.gameSessionId);
        return;
      }

      // Self-dedup: if this messageId was already fully handled (either by
      // this listener firing twice via re-register/StrictMode, or by HostView's
      // pendingGameStart effect running first), skip the redundant
      // store/timer/animation/ack work — otherwise the player sees the
      // pre-game GoRipples countdown play twice.
      if (data.messageId && wasStartGameHandled('HOST', data.messageId)) {
        logger.log('[HOST] Ignoring duplicate startGame for messageId:', data.messageId);
        return;
      }

      const isReconnect = !!extData.reconnect;
      logger.log('[HOST] Received startGame event from server', isReconnect ? '(reconnect)' : '(new game)');

      // Detect retry of same session: server re-fires startGame to clients that
      // didn't ack. We must NOT clobber in-flight game state (life, attempts) on
      // retry — surfaced as "life didn't drain" for guests whose ack path lags.
      const prevSessionId = gameSessionIdRef.current;
      const isSameSessionRetry = prevSessionId !== null
        && extData.gameSessionId !== undefined
        && prevSessionId === extData.gameSessionId;

      // Track game session ID
      if (extData.gameSessionId !== undefined) {
        gameSessionIdRef.current = extData.gameSessionId;
        setGameSessionId(extData.gameSessionId);
      }

      if (data.letterGrid) {
        setTableData(data.letterGrid);
        tableDataRef.current = data.letterGrid;
      }
      if (data.timerSeconds !== undefined) {
        setRemainingTime(data.timerSeconds);
        useGameStore.getState().setGameDuration(data.timerSeconds);
      }

      // Sync language from server broadcast (mirrors player handler)
      if (data.language) {
        useGameStore.getState().setGameLanguage(data.language);
      }

      // Sync resolved game mode from server (handles random → actual mode) and open
      // the render gate atomically — tableData (set above) is now in place, so
      // HostInGameView mounts the correct mode on the first frame, no classic flash.
      if (extData.gameMode) {
        useGameStore.getState().confirmGameMode(extData.gameMode);
      }

      // Set blast tile overlay if present (mirrors player handler)
      if (extData.blastTileOverlay) {
        const store = useGameStore.getState();
        store.setBlastTileOverlay(extData.blastTileOverlay);
        if (extData.blastSeed != null) {
          store.setBlastSeed(extData.blastSeed);
        }
      }

      // Set word hunt target length if present (mirrors player handler).
      // Target length + category are immutable per session — apply unconditionally
      // so recovery/reconnect can heal a host that missed startGame (clue tiles bug).
      // isSameSessionRetry only gates resetting in-flight life/attempts below.
      if (extData.wordHuntTargetLength != null && extData.wordHuntTargetLength > 0) {
        const store = useGameStore.getState();
        store.setWordHuntTargetLength(extData.wordHuntTargetLength);
        store.setWordHuntTargetCategory(extData.wordHuntTargetCategory ?? null);
        if (!isSameSessionRetry) {
          const serverLife = extData.wordHuntPlayerLives?.[username];
          store.setWordHuntMyLife(typeof serverLife === 'number' ? serverLife : 100);
          store.setWordHuntPlayerLives(extData.wordHuntPlayerLives || {});
          store.setWordHuntTargetAttempts([]);
          store.setWordHuntTargetFound(false);
          store.setWordHuntEliminatedPlayers(extData.wordHuntEliminatedPlayers || []);
          useGameStore.setState({ wordHuntDiscoveryClues: [], wordHuntKnownLetters: [] });
        }
      }

      // On reconnect, only restore grid/timer state — do NOT reset scores or replay animations.
      // This prevents the "game restarted for no reason" bug when a brief network blip occurs.
      if (isReconnect) {
        logger.log('[HOST] Reconnect restore — skipping score reset and countdown animation');
        // Ensure game is marked as started (skips countdown)
        if (!gameStartedRef.current) {
          setGameStarted(true);
        }
        return;
      }

      // Reset state for new game
      hasProcessedResultsRef.current = null;
      setWaitingForResults(false);
      waitingStartTimeRef.current = null;
      setShowStartAnimation(true);
      setPlayerWordCounts({});
      setPlayerScores({});
      setHostFoundWords([]);
      setHostAchievements([]);
      resetComboState();
      setXpGainedData(null);
      setLevelUpData(null);

      // Stash messageId so the GoRipplesAnimation can emit `countdownComplete`
      // when it finishes — that's what now starts the server-side round timer.
      stashStartGameMessageId('HOST', data.messageId);
      // Mark handled so HostView's pendingGameStart effect skips its
      // redundant store/animation work — both handlers run for a normal
      // start, and double setShowStartAnimation(true) replays GoRipples.
      markStartGameHandled('HOST', data.messageId);

      // Send acknowledgment to server using shared utility
      sendStartGameAck(socket, data, 'HOST');

      // Trigger music
      onGameStartRef.current?.();
    };

    // Fallback timeout: if we enter waitingForResults but never get validationComplete,
    // request results from server after 15s. Prevents infinite loading screen.
    let resultsTimeoutId: NodeJS.Timeout | null = null;

    const startResultsTimeout = () => {
      if (resultsTimeoutId) clearTimeout(resultsTimeoutId);
      resultsTimeoutId = setTimeout(() => {
        // Only fire if we still haven't processed results for this session
        if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
          logger.log('[HOST] Results timeout — requesting results from server');
          socket.emit('requestResults');
          // Second fallback: if server also doesn't respond in 5 more seconds,
          // force-transition to results with whatever we have
          resultsTimeoutId = setTimeout(() => {
            if (hasProcessedResultsRef.current !== gameSessionIdRef.current) {
              logger.log('[HOST] Results fallback — forcing transition with empty results');
              hasProcessedResultsRef.current = gameSessionIdRef.current;
              setWaitingForResults(false);
              setFinalScores({ players: [], gameCode: '' });
              const currentOnShowResults = onShowResultsRef.current;
              if (hostPlayingRef.current && currentOnShowResults) {
                currentOnShowResults({ scores: [], letterGrid: tableDataRef.current });
              }
            }
          }, 5000);
        }
      }, 15000);
    };

    const handleTimeUpdate = (data: TimeUpdatePayload) => {
      // Only reject OLDER sessions (parity with player handler). Strict `!==`
      // also drops legitimate timeUpdates from a NEW session that arrive
      // before the corresponding `startGame` bumps the ref — seen on reconnect
      // snapshots and rolling deploys.
      if (data.gameSessionId !== undefined && data.gameSessionId < gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        addGameBreadcrumb('mp_timer_update_filtered', {
          role: 'host',
          incomingSessionId: data.gameSessionId,
          currentSessionId: gameSessionIdRef.current,
          remainingTime: data.remainingTime,
        });
        return;
      }

      // Always update the visual timer so hasActiveGameData stays accurate.
      // Moving this before the gameStartedRef guard ensures the timer counts
      // down and reaches 0 even when the countdown animation hasn't formally
      // completed yet (gameStartedRef.current still false). Without this, a
      // delayed countdown-complete leaves hasActiveGameData=true forever and
      // the game view never unmounts.
      setRemainingTime(data.remainingTime);

      // End the game unconditionally when the server timer reaches 0.
      // The session-ID guard above is the correct gating layer; we must not
      // also require gameStartedRef here because a delayed countdown-complete
      // (gameStartedRef still false) would block this block and leave the
      // host frozen on the game screen after the timer expires.
      if (data.remainingTime === 0) {
        setGameStarted(false);
        setShowStartAnimation(false);
        setWaitingForResults(true);
        startResultsTimeout();
        triggerGameOverCelebration();
        neoSuccessToast(t('hostView.gameOverCheckScores'), {
          icon: TOAST_ICONS.flag,
          duration: 5000,
        });
        return;
      }

      // Skip non-zero timer syncs while the 3-2-1-GO countdown is still playing
      // to avoid triggering game-state effects before the game UI is ready.
      if (!gameStartedRef.current) {
        return;
      }
    };

    const handleEndGame = () => {
      logger.log('[HOST] Received endGame event');
      if (gameStartedRef.current) {
        setGameStarted(false);
        setRemainingTime(0);
        setShowStartAnimation(false);
        setWaitingForResults(true);
        startResultsTimeout();
      }
    };

    const handleValidationComplete = (data: ValidatedScoresPayload) => {
      // Guard against duplicate validationComplete events using session ID
      if (hasProcessedResultsRef.current === gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring duplicate validationComplete - already processed for session:', gameSessionIdRef.current);
        return;
      }
      hasProcessedResultsRef.current = gameSessionIdRef.current;

      // Clear the results fallback timeout — we got real results
      if (resultsTimeoutId) { clearTimeout(resultsTimeoutId); resultsTimeoutId = null; }

      logger.log('[HOST] Received validationComplete event:', data);

      // Sync blast stats from server — overrides locally accumulated values
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
        // Note: blastMovesUsed removed (timer-era Blast tracks boardClears server-side)
        // blastSummary.playerMoves is available on server but not synced to client store
      }

      // Sync wheel rush stats from server for results screen
      if (data.wheelRushSummary?.playerStats) {
        useGameStore.getState().setWheelRushPlayerStats(data.wheelRushSummary.playerStats);
      }

      // Transition directly to results — no validation modal delay
      const currentOnShowResults = onShowResultsRef.current;
      const currentTableData = tableDataRef.current;

      // Ensure game state is fully transitioned (fallback if timeUpdate race missed these)
      setGameStarted(false);
      setWaitingForResults(false);
      waitingStartTimeRef.current = null;

      showGameCompleteToast(t);

      // Always set final scores (needed for TV broadcast mode)
      setFinalScores({
        players: data.scores,
        gameCode: '',
        wordHuntSummary: data.wordHuntSummary,
      });

      // Only call onShowResults if host is playing (not in broadcast mode).
      // Wheel-rush has no dedicated TV broadcast results view, so a desktop
      // host whose `hostPlaying` was previously toggled off (persisted via
      // `host_broadcast_mode_enabled` localStorage) would otherwise sit on the
      // game screen forever after the round ends. Bypass the gate for that
      // mode so the host always lands on the standard results page.
      const isWheelRush = data.gameMode === 'wheel-rush';
      const shouldShowResults = hostPlayingRef.current || isWheelRush;
      if (shouldShowResults && currentOnShowResults) {
        currentOnShowResults({
          scores: data.scores,
          letterGrid: currentTableData,
          duplicateRuleDisabled: data.duplicateRuleDisabled,
          playerCount: data.playerCount,
          wordHuntSummary: data.wordHuntSummary,
          blastSummary: data.blastSummary,
          wheelRushSummary: data.wheelRushSummary,
        });
      }
    };

    const handleResetGame = (data: ResetGamePayload) => {
      // Validate session - only process reset for current or newer session
      if (data.gameSessionId !== undefined && gameSessionIdRef.current !== null &&
          data.gameSessionId < gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale resetGame from old session');
        return;
      }
      logger.log('[HOST] Game reset received');

      if (data.gameSessionId !== undefined) {
        gameSessionIdRef.current = data.gameSessionId;
        setGameSessionId(data.gameSessionId);
      }

      setGameStarted(false);
      setRemainingTime(null);
      setWaitingForResults(false);
      setShowStartAnimation(false);
      setTableData(null);
      tableDataRef.current = null;
      setShufflingGrid(null);
      setHostFoundWords([]);
      setHostAchievements([]);
      setPlayerWordCounts({});
      setPlayerScores({});
      setPlayerAchievements({});
      setFinalScores(null);
      waitingStartTimeRef.current = null;
      resetComboState();
      setTournamentData(null);
      setTournamentCreating(false);
      setXpGainedData(null);
      setLevelUpData(null);

      // Reset word hunt state for next game
      const whStore = useGameStore.getState();
      whStore.setWordHuntEliminatedPlayers([]);
      whStore.setWordHuntTargetFound(false);
      whStore.setWordHuntTargetAttempts([]);
      whStore.setWordHuntPlayerLives({});
      whStore.setWordHuntMyLife(100);
      useGameStore.setState({ wordHuntDiscoveryClues: [], wordHuntKnownLetters: [] });

      // Reset blast mode state for next game
      whStore.setBlastTileOverlay([]);
      whStore.setBlastBoardClears(0);
      whStore.setBlastTotalTileBonus(0);
      whStore.setBlastTotalTilesCleared(0);
      whStore.setBlastSeed(null);
      whStore.setBlastComboSync(null);

      // Refresh player list from server data so host can start next game
      if (data.users && setPlayersReady) {
        setPlayersReady(data.users);
      }
    };

    // Word Hunt event handlers (mirrors usePlayerGameEvents)
    const handleWordHuntLifeUpdate = (data: { playerLives: Record<string, number>; eliminatedPlayers?: string[] }) => {
      logger.log('[HOST] Word hunt life update:', data);
      const store = useGameStore.getState();
      store.setWordHuntPlayerLives(data.playerLives);
      if (data.playerLives[username] !== undefined) {
        store.setWordHuntMyLife(data.playerLives[username]);
      }
      if (data.eliminatedPlayers) {
        store.setWordHuntEliminatedPlayers(data.eliminatedPlayers);
      }
    };

    const handleWordHuntTargetResult = (data: { guess: string; feedback: LetterFeedback[]; correct: boolean; isFirstFinder: boolean; bonus: number; livesRemaining: number; isDiscovery?: boolean }) => {
      logger.log('[HOST] Word hunt target result:', data);
      const store = useGameStore.getState();
      store.setWordHuntTargetAttempts((prev: Array<{ guess: string; feedback: LetterFeedback[]; isDiscovery?: boolean }>) => [...prev, { guess: data.guess, feedback: data.feedback, isDiscovery: data.isDiscovery || false }]);
      store.setWordHuntMyLife(data.livesRemaining);
      if (data.correct) {
        store.setWordHuntTargetFound(true);
      }
    };

    const handleWordHuntTargetFound = (data: { username: string; targetWord: string; isFirstFinder: boolean }) => {
      logger.log('[HOST] Word hunt target found by:', data.username);
      const store = useGameStore.getState();
      store.setWordHuntTargetFound(true);
      store.setWordHuntTargetFoundBy(data.username);
      neoSuccessToast(`${data.username} ${t('wordHunt.foundTarget')}!`, { icon: TOAST_ICONS.target, duration: 3000 });
    };

    const handleWordHuntEliminated = (data: { username: string }) => {
      logger.log('[HOST] Word hunt player eliminated:', data.username);
      const store = useGameStore.getState();
      store.setWordHuntEliminatedPlayers((prev: string[]) => [...prev, data.username]);
    };

    const handleWordHuntDiscoveryClues = (data: { word: string; greenPositions: Array<{ position: number; letter: string }>; knownLetters: string[] }) => {
      logger.log('[HOST] Word hunt discovery clues:', data);
      useGameStore.getState().addWordHuntDiscoveryClues(data.greenPositions, data.knownLetters);
    };

    // Register listeners
    socket.on('startGame', handleStartGame);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('endGame', handleEndGame);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('resetGame', handleResetGame);
    socket.on('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
    // Earthquake handlers from shared utility
    socket.on('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
    socket.on('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
    socket.on('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
    socket.on('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
    // Word Hunt handlers
    socket.on('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
    socket.on('wordHuntTargetResult', handleWordHuntTargetResult);
    socket.on('wordHuntTargetFound', handleWordHuntTargetFound);
    socket.on('wordHuntEliminated', handleWordHuntEliminated);
    socket.on('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);

    // Recovery: if socket reconnects after missing validationComplete, request from server
    const handleReconnectRecovery = () => {
      if (gameStartedRef.current === false && hasProcessedResultsRef.current !== gameSessionIdRef.current) {
        logger.log('[HOST] Socket reconnected — requesting missed results');
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
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('endGame', handleEndGame);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('resetGame', handleResetGame);
      socket.off('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
      // Earthquake handlers cleanup
      socket.off('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
      socket.off('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
      socket.off('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
      socket.off('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
      earthquakeHandlers.cleanup();
      // Word Hunt handlers cleanup
      socket.off('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
      socket.off('wordHuntTargetResult', handleWordHuntTargetResult);
      socket.off('wordHuntTargetFound', handleWordHuntTargetFound);
      socket.off('wordHuntEliminated', handleWordHuntEliminated);
      socket.off('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);
      socket.off('connect', handleReconnectRecovery);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket,
    t,
    // gameStarted and onGameStart accessed via refs to prevent effect re-registration
    setGameStarted,
    setShowStartAnimation,
    setTableData,
    setRemainingTime,
    setWaitingForResults,
    setFinalScores,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setHostFoundWords,
    setHostAchievements,
    setTournamentData,
    setTournamentCreating,
    setShufflingGrid,
    setXpGainedData,
    setLevelUpData,
    resetComboState,
    handleRoomClosedDueToInactivity,
    earthquakeHandlers,
    setPlayersReady,
  ]); // hostPlaying, onGameStart, gameStarted accessed via refs for event handlers

  return { gameSessionIdRef, gameSessionId };
}
