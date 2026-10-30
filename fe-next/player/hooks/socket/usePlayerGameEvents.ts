/**
 * Player Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, resetGame, results
 *
 * REFACTORED: Now uses GameStateContext instead of massive prop drilling
 * Reduced from 20+ state setter props to just a few local state props
 */
import { useCallback, useEffect, useRef, useMemo, type RefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, TOAST_ICONS } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';

import {
  sendStartGameAck,
  sendCountdownComplete,
  stashStartGameMessageId,
  markStartGameHandled,
  registerStartGameHandler,
  wasStartGameHandled,
} from '@/shared/utils/gameEventUtils';
import { useLetterGrid, useGameLanguage, useShowStartAnimation, useGameActions, useGameStore } from '@/hooks/gameState';
import type { StartGameBroadcast } from '@/shared/types/socket';
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
import logger from '@/utils/logger';
import { addGameBreadcrumb } from '@/utils/sentry';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';
import type {
  StartGameBroadcastExt, TimeUpdatePayload, ResetGamePayload, UsePlayerGameEventsProps, UsePlayerGameEventsReturn,
} from './playerGameEventTypes';
import { createPlayerResultsHandlers } from './playerResultsHandlers';
import { buildStartGameStoreUpdates, resetRoundStoreForNewGame } from './playerRoundLifecycle';
import { usePlayerRoundFeedEvents } from './usePlayerRoundFeedEvents';

export type { OnShowResultsData } from './playerGameEventTypes';

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
  const storeActions = useGameActions();
  const { setLetterGrid, setRemainingTime, setGameLanguage, setGameActive, setShowStartAnimation, setWaitingForResults } = storeActions;

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
  /** Session whose results actually REACHED the screen (not merely arrived). */
  const resultsDisplayedRef = useRef<number | null>(null);
  // Tracks the session whose results were only ever shown via the EMPTY
  // safety fallback (no real scores arrived in time). A later REAL
  // validatedScores for that session must be allowed to supersede the empty
  // screen instead of being dropped by the duplicate guard above — otherwise
  // a player who finished early (common in Blast, where the board can be
  // cleared/dead-ended well before the shared timer) stays stuck on an empty
  // "Calculating results" screen forever even though correct results arrived.
  const emptyResultsFallbackRef = useRef<number | null>(null);

  // Fire round interval ref - persists across handler recreations
  // This is critical for ensuring the countdown continues even if useEffect re-runs
  const fireRoundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized room closed handler
  // The page-level banner owns the message and the exit; a reload here would cut its countdown short.
  const handleHostLeftRoomClosing = useCallback(() => {
    intentionalExitRef.current = true;
  }, [intentionalExitRef]);

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
      // Validate session - ignore stale events.
      //
      // EXCEPTION: reconnect/recovery/late-join emits (reconnect === true) always
      // carry the server's authoritative CURRENT state. After a server restart or
      // instance switch the room's gameSessionId resets backwards, so the client's
      // ref runs ahead of the live server value — and the stale filter would then
      // silently drop the very recovery startGame that requestGameState fetched to
      // unstick the player. Letting recovery emits through re-syncs the ref
      // downward (set below) so subsequent timeUpdates stop being filtered too.
      const isRecoveryEmit = data.reconnect === true;
      if (!isRecoveryEmit &&
          gameSessionIdRef.current !== null && ext.gameSessionId !== undefined &&
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

      // The room language is first known here — start the dictionary fetch NOW
      // (fire-and-forget, shared loading-promise dedupe) so a blast board does
      // not mount into a cold cache on heavy game paths, where the hook itself
      // defers the network (the MP "Generating grid..." hang, t_67330c55).
      if (data.language) {
        void prewarmDictionary(data.language);
      }

      // Detect retry of same session: server re-fires startGame to clients that
      // didn't ack. We must NOT clobber in-flight game state (life, attempts) on
      // retry — surfaced as "life didn't drain" for guests whose ack path lags.
      const prevSessionId = gameSessionIdRef.current;
      const isSameSessionRetry = prevSessionId !== null
        && ext.gameSessionId !== undefined
        && prevSessionId === ext.gameSessionId;

      // Results-skip race: a NEW round is starting, but we never processed
      // results for the PREVIOUS session. The player was stuck on "calculating
      // results" (validatedScores lost or beaten by this startGame) and is about
      // to be pulled straight into the next round without ever seeing results.
      // Best-effort recover the cached payload — the server only re-sends while
      // still 'finished', so this wins only the slow-results (non-advanced) case
      // — and always leave a breadcrumb so the race is visible in Sentry. We do
      // NOT block the round; the server controls round flow.
      // gameSessionIdRef inits to 0 (sentinel for "no game yet"), so a non-zero
      // prevSessionId means a real prior round actually ran.
      const isNewSession = prevSessionId !== 0
        && ext.gameSessionId !== undefined
        && ext.gameSessionId !== prevSessionId;
      if (isNewSession && hasProcessedResultsRef.current !== prevSessionId) {
        logger.log('[PLAYER] New round started before results were shown — recovering', {
          prevSessionId, newSessionId: ext.gameSessionId,
        });
        socket.emit('requestResults');
        addGameBreadcrumb('mp_results_skipped_by_next_round', {
          role: 'player',
          prevSessionId,
          newSessionId: ext.gameSessionId,
          processedSessionId: hasProcessedResultsRef.current,
        });
      }

      if (ext.gameSessionId !== undefined) {
        gameSessionIdRef.current = ext.gameSessionId;
      }

      const { storeUpdates, isReconnect } = buildStartGameStoreUpdates(data, ext, username, isSameSessionRetry);
      if (data.lateJoin || isReconnect) {
        // Late-join AND reconnect/recovery RESUME the in-progress game directly.
        // They must NOT replay the 3-2-1 countdown: the requestGameState recovery
        // re-emits startGame with reconnect:true + a fresh `recovery-<ts>`
        // messageId (which bypasses the messageId dedup), so without this the
        // countdown re-ran mid-game and yanked the player back ("game starts more
        // than once with the countdown" / "auto-resume"). Only a genuinely fresh
        // start (below) shows the countdown.
        storeUpdates.gameActive = true;
        gameActiveRef.current = true;
        // Because we skip GoRipplesAnimation here, it can't emit countdownComplete.
        // Report it directly so a player who reconnects DURING the pre-game
        // countdown window doesn't stall the room's timer-start until the 8s
        // fallback. Safe no-op when the timer is already running (the coordinator
        // guards on messageId match + timerStarted + expectedPlayers).
        sendCountdownComplete(socket, data.messageId, 'PLAYER');
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

      // A fresh start's GO moment is the countdown stage — no toast on top of it
      // (it repeated the countdown's GO). Reconnect/recovery resumes silently.
      // A late joiner skips the countdown, so "Joined game!" is their only cue.
      if (data.lateJoin) {
        neoSuccessToast(t('common.joinedGame', 'Joined game!'), { id: 'game-started', icon: TOAST_ICONS.gamepad, duration: 3000 });
      }
    };

    const { startResultsTimeout, clearResultsTimeout, handleValidatedScores, handleFinalScores, tvGate } = createPlayerResultsHandlers({
      socket, username, gameSessionIdRef, hasProcessedResultsRef, resultsDisplayedRef, emptyResultsFallbackRef,
      waitingStartTimeRef, gameActiveRef, letterGridRef, onShowResultsRef, setGameActive, setWaitingForResults,
      setShowWordFeedback, setWordToVote,
    });

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
      resetRoundStoreForNewGame(storeActions);
      waitingStartTimeRef.current = null;
      hasProcessedResultsRef.current = null;
      emptyResultsFallbackRef.current = null;
      resultsDisplayedRef.current = null;

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

      // Reset earthquake/fire-round state for next game
      setEarthquakeState('idle');
      setFireRoundActive(false);
      setFireRoundRemaining(0);
      if (fireRoundIntervalRef.current) {
        clearInterval(fireRoundIntervalRef.current);
        fireRoundIntervalRef.current = null;
      }

      neoSuccessToast(data.message || t('common.newGameReady'), { icon: TOAST_ICONS.refresh, duration: 3000 });
    };

    // Register listeners
    socket.on('startGame', handleStartGame);
    const unregisterStartGame = registerStartGameHandler('PLAYER', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('validatedScores', handleValidatedScores);
    socket.on('resultsRevealed', tvGate.revealed);
    socket.on('finalScores', handleFinalScores);
    socket.on('resetGame', handleResetGame);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    // Earthquake handlers from shared utility
    socket.on('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
    socket.on('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
    socket.on('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
    socket.on('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);

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
      clearResultsTimeout();
      // Clear fire round interval explicitly
      if (fireRoundIntervalRef.current) {
        clearInterval(fireRoundIntervalRef.current);
        fireRoundIntervalRef.current = null;
      }
      socket.off('startGame', handleStartGame);
      unregisterStartGame();
      socket.off('endGame', handleEndGame);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('resultsRevealed', tvGate.revealed);
      socket.off('finalScores', handleFinalScores);
      tvGate.dispose();
      socket.off('resetGame', handleResetGame);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      // Earthquake handlers cleanup
      socket.off('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
      socket.off('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
      socket.off('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
      socket.off('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
      earthquakeHandlers.cleanup();
      socket.off('connect', handleReconnectRecovery);
    };
    // Setters from context are stable (wrapped in useCallback)
    // NOTE: letterGrid and gameLanguage are accessed via refs (letterGridRef, gameLanguageRef)
    // to avoid re-registering socket listeners when they change. This is critical because
    // fireRoundStart changes the grid, and re-registering would clear the fire round countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket, t, storeActions, setShowWordFeedback, setWordToVote, comboLevelRef, lastWordTimeRef, setComboLevel,
    setLastWordTime, comboTimeoutRef, comboShieldsUsedRef, earthquakeHandlers, handleHostLeftRoomClosing,
    // gameTimer and the start callback are read through refs, so their identity never re-registers listeners.
  ]);

  usePlayerRoundFeedEvents({ socket, t, username });

  return { gameSessionIdRef };
}
