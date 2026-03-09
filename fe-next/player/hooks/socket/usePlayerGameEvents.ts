/**
 * Player Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, resetGame, results
 *
 * REFACTORED: Now uses GameStateContext instead of massive prop drilling
 * Reduced from 20+ state setter props to just a few local state props
 */
import { useEffect, useRef, useMemo, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';

import {
  sendStartGameAck,
  createHostLeftRoomClosingHandler,
} from '@/shared/utils/gameEventUtils';
import { useLetterGrid, useGameLanguage, useShowStartAnimation, useGameActions, useGameStore } from '@/hooks/gameState';
import type { BlastWordAcceptedPayload, BlastComboSyncPayload, StartGameBroadcast } from '@/shared/types/socket';
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
import logger from '@/utils/logger';
import type { GameTimerReturn } from '@/hooks/useGameTimer';

interface UsePlayerGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  username: string;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number; wordHuntSummary?: any; blastSummary?: any }) => void;

  // Local state (not in GameState context)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<any>>;
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs (TODO: refactor to use context actions)
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: MutableRefObject<number>;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

  // Music ref for tracking total game time
  totalGameTimeRef?: MutableRefObject<number>;

  // Timer for multiplayer sync
  gameTimer?: GameTimerReturn;

  // Callbacks
  onGameStart?: () => void;
}

interface UsePlayerGameEventsReturn {
  gameSessionIdRef: MutableRefObject<number>;
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
    setBlastMovesUsed,
    setBlastComboSync,
    setWordHuntMyLife,
    setWordHuntPlayerLives,
    setWordHuntTargetAttempts,
    setWordHuntTargetFound,
    setWordHuntEliminatedPlayers,
    addWordHuntDiscoveryClues,
  } = useGameActions();

  // Track if was in active game (TODO: move to GameState context)
  const setWasInActiveGame = useRef<(value: boolean) => void>(() => {});
  const wasInActiveGameValue = useRef(false);
  setWasInActiveGame.current = (value: boolean) => {
    wasInActiveGameValue.current = value;
  };
  // Use refs to avoid stale closure issues
  const onShowResultsRef = useRef(onShowResults);
  useEffect(() => {
    onShowResultsRef.current = onShowResults;
  }, [onShowResults]);

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
      // Validate session - ignore stale events
      if (gameSessionIdRef.current !== null && (data as any).gameSessionId !== undefined &&
          (data as any).gameSessionId < gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale startGame from old session');
        return;
      }

      setWasInActiveGame.current(true);
      wasInActiveGameRef.current = true;
      comboShieldsUsedRef.current = 0;

      if ((data as any).gameSessionId !== undefined) {
        gameSessionIdRef.current = (data as any).gameSessionId;
      }

      // Batch all Zustand store updates into a single setState call
      // This prevents cascading re-renders (was 15+ individual updates)
      const storeUpdates: Record<string, any> = {
        foundWords: [],
        achievements: [],
      };
      if (data.letterGrid) storeUpdates.letterGrid = data.letterGrid;
      if (data.timerSeconds) storeUpdates.remainingTime = data.timerSeconds;
      if (data.language) storeUpdates.gameLanguage = data.language;
      if (data.minWordLength) storeUpdates.minWordLength = data.minWordLength;
      if ((data as any).boardTheme) storeUpdates.boardTheme = (data as any).boardTheme;
      if (data.gameMode) storeUpdates.gameMode = data.gameMode;
      if ((data as any).blastTileOverlay) {
        storeUpdates.blastTileOverlay = (data as any).blastTileOverlay;
        storeUpdates.blastMovesUsed = 0;
        if ((data as any).blastSeed != null) storeUpdates.blastSeed = (data as any).blastSeed;
      }
      if ((data as any).wordHuntTargetLength != null && (data as any).wordHuntTargetLength > 0) {
        storeUpdates.wordHuntTargetLength = (data as any).wordHuntTargetLength;
        storeUpdates.wordHuntMyLife = 100;
        storeUpdates.wordHuntPlayerLives = (data as any).wordHuntPlayerLives || {};
        storeUpdates.wordHuntTargetAttempts = [];
        storeUpdates.wordHuntTargetFound = false;
        storeUpdates.wordHuntEliminatedPlayers = (data as any).wordHuntEliminatedPlayers || [];
      }
      if ((data as any).lateJoin) {
        storeUpdates.gameActive = true;
        gameActiveRef.current = true;
      } else {
        storeUpdates.showStartAnimation = true;
      }

      useGameStore.setState(storeUpdates);

      // Non-store operations (refs, timer, toast)
      if (data.timerSeconds) {
        if (totalGameTimeRef) totalGameTimeRef.current = data.timerSeconds;
        if (gameTimerRef.current) {
          gameTimerRef.current.reset();
          gameTimerRef.current.setTime(data.timerSeconds);
        }
      }

      sendStartGameAck(socket, data, 'PLAYER');
      onGameStart?.();

      const toastMessage = (data as any).lateJoin
        ? (t('common.joinedGame') || 'Joined game!')
        : t('common.gameStarted');
      neoSuccessToast(toastMessage, { id: 'game-started', icon: (data as any).lateJoin ? '🎮' : '🚀', duration: 3000 });
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
    };

    const handleTimeUpdate = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        return;
      }

      // CRITICAL: Sync timer with server time to prevent drift
      // The local timer counts down smoothly, but server updates keep it accurate
      // Use ref to get latest timer methods (avoids socket listener re-registration)
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

      const isGameActive = gameActiveRef.current;
      const hasGrid = letterGridRef.current || data.letterGrid;
      const isCountdownShowing = showStartAnimationRef.current;
      // Only activate game if:
      // 1. Game is not already active
      // 2. There's remaining time
      // 3. We have the grid
      // 4. Countdown animation has completed (not showing)
      // This prevents the timer from starting before the 3-2-1-GO countdown completes
      if (!isGameActive && data.remainingTime > 0 && hasGrid && !isCountdownShowing) {
        logger.log('[PLAYER] Timer started on server, activating game via timeUpdate (countdown complete)');
        setGameActive(true);
        gameActiveRef.current = true;
      }

      if (data.remainingTime <= 0) {
        setGameActive(false);
        gameActiveRef.current = false;
        setShowStartAnimation(false);
        setWaitingForResults(true);
      }
    };

    const handleValidatedScores = (data: any) => {
      if (!useGameStore.getState().waitingForResults) {
        logger.log('[PLAYER] Ignoring duplicate validatedScores - not waiting for results');
        return;
      }
      logger.log('[PLAYER] Received validatedScores event:', data);

      // Transition directly to results — no validation modal delay
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
        });
      }
    };

    const handleFinalScores = (data: any) => {
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

    const handleResetGame = (data: any) => {
      // Guard against stale reset from old session
      if (data.gameSessionId !== undefined && gameSessionIdRef.current !== null &&
          data.gameSessionId < gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale resetGame from old session');
        return;
      }
      setGameActive(false);
      gameActiveRef.current = false;
      setWasInActiveGame.current(false);
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

      // Reset word hunt state for next game
      setWordHuntEliminatedPlayers([]);
      setWordHuntTargetFound(false);
      setWordHuntTargetAttempts([]);
      setWordHuntPlayerLives({});
      setWordHuntMyLife(100);

      // Reset blast mode state for next game
      const blastResetStore = useGameStore.getState();
      blastResetStore.setBlastTileOverlay([]);
      blastResetStore.setBlastMovesUsed(0);
      blastResetStore.setBlastTotalTileBonus(0);
      blastResetStore.setBlastTotalTilesCleared(0);
      blastResetStore.setBlastSeed(null);
      blastResetStore.setBlastComboSync(null);

      neoSuccessToast(data.message || t('common.newGameReady'), { icon: '🔄', duration: 3000 });
    };

    // Handle blast word accepted (multiplayer blast mode)
    const handleBlastWordAccepted = (data: BlastWordAcceptedPayload) => {
      logger.log('[PLAYER] Blast word accepted:', data.word, 'bonus:', data.tileBonus, 'moves:', data.movesUsed);
      setBlastMovesUsed(data.movesUsed);
      // Accumulate tile bonus and tiles cleared for results display
      const store = useGameStore.getState();
      store.setBlastTotalTileBonus(prev => prev + (data.tileBonus || 0));
      store.setBlastTotalTilesCleared(prev => prev + (data.tilesCleared?.length || 0));
    };

    // Handle combo sync from another player — triggers BlastComboFlash overlay for spectators.
    // Only fires for other players' combos; local player sees their own flash immediately.
    const handleBlastComboSync = (data: BlastComboSyncPayload) => {
      logger.log('[PLAYER] Blast combo sync from:', data.username, 'combo:', data.comboType);
      // Only show flash for other players' combos (not our own)
      if (data.username !== username) {
        setBlastComboSync({ ...data, id: `combo-sync-${Date.now()}` });
      }
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

    const handleWordHuntTargetResult = (data: { guess: string; feedback: any[]; correct: boolean; isFirstFinder: boolean; bonus: number; livesRemaining: number; isDiscovery?: boolean }) => {
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
      // Show notification about who found it
      neoSuccessToast(`${data.username} ${t('wordHunt.foundTarget')}!`, { icon: '🎯', duration: 3000 });
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
    socket.on('finalScores', handleFinalScores);
    socket.on('resetGame', handleResetGame);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    // Earthquake handlers from shared utility
    socket.on('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
    socket.on('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
    socket.on('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
    socket.on('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
    socket.on('totalBoardWords', handleTotalBoardWords);
    socket.on('blastWordAccepted', handleBlastWordAccepted);
    socket.on('blastComboSync', handleBlastComboSync);
    socket.on('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
    socket.on('wordHuntTargetResult', handleWordHuntTargetResult);
    socket.on('wordHuntTargetFound', handleWordHuntTargetFound);
    socket.on('wordHuntEliminated', handleWordHuntEliminated);
    socket.on('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);

    return () => {
      // Clear fire round interval explicitly
      if (fireRoundIntervalRef.current) {
        clearInterval(fireRoundIntervalRef.current);
        fireRoundIntervalRef.current = null;
      }
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('finalScores', handleFinalScores);
      socket.off('resetGame', handleResetGame);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      // Earthquake handlers cleanup
      socket.off('earthquakeWarning', earthquakeHandlers.handleEarthquakeWarning);
      socket.off('earthquakeShake', earthquakeHandlers.handleEarthquakeShake);
      socket.off('fireRoundStart', earthquakeHandlers.handleFireRoundStart);
      socket.off('fireRoundEnd', earthquakeHandlers.handleFireRoundEnd);
      earthquakeHandlers.cleanup();
      socket.off('totalBoardWords', handleTotalBoardWords);
      socket.off('blastWordAccepted', handleBlastWordAccepted);
      socket.off('blastComboSync', handleBlastComboSync);
      socket.off('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
      socket.off('wordHuntTargetResult', handleWordHuntTargetResult);
      socket.off('wordHuntTargetFound', handleWordHuntTargetFound);
      socket.off('wordHuntEliminated', handleWordHuntEliminated);
      socket.off('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);
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
    onGameStart,
  ]);

  return { gameSessionIdRef };
}
