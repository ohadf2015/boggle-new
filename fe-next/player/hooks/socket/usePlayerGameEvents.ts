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
import { executeAfterMinimumWait } from '@/shared/utils/timingUtils';
import {
  sendStartGameAck,
  createHostLeftRoomClosingHandler,
} from '@/shared/utils/gameEventUtils';
import { useGameStateContext } from '@/contexts/GameStateContext';
import logger from '@/utils/logger';
import type { StartGameBroadcast } from '@/shared/types/socket';
import type { GameTimerReturn } from '@/hooks/useGameTimer';

interface UsePlayerGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  username: string;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number }) => void;

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
  // Get all game state and setters from context (no more massive prop drilling!)
  const {
    letterGrid,
    gameLanguage,
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
    setBoardTheme,
    setTotalBoardWords,
  } = useGameStateContext();

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

  // Use refs to avoid socket listener re-registration race conditions
  const gameActiveRef = useRef(false);
  const wasInActiveGameRef = useRef(false);

  // Track when we entered waiting state
  const waitingStartTimeRef = useRef<number | null>(null);

  // Track game session ID
  const gameSessionIdRef = useRef<number>(0);

  // Memoized room closed handler
  const handleHostLeftRoomClosing = useMemo(() => {
    if (!socket) return () => {};
    return createHostLeftRoomClosingHandler(socket, username, t, intentionalExitRef);
  }, [socket, username, t, intentionalExitRef]);

  useEffect(() => {
    if (!socket) return;

    const handleStartGame = (data: StartGameBroadcast) => {
      setWasInActiveGame.current(true);
      wasInActiveGameRef.current = true;
      setFoundWords([]);
      setAchievements([]);
      comboShieldsUsedRef.current = 0;

      if ((data as any).gameSessionId !== undefined) {
        gameSessionIdRef.current = (data as any).gameSessionId;
      }
      if (data.letterGrid) setLetterGrid(data.letterGrid);
      if (data.timerSeconds) {
        setRemainingTime(data.timerSeconds);
        if (totalGameTimeRef) totalGameTimeRef.current = data.timerSeconds;
        // Sync timer with game start time
        if (gameTimer) {
          gameTimer.reset();
          gameTimer.setTime(data.timerSeconds);
        }
      }
      if (data.language) setGameLanguage(data.language);
      if (data.minWordLength) setMinWordLength(data.minWordLength);
      if ((data as any).boardTheme) setBoardTheme((data as any).boardTheme);

      if ((data as any).lateJoin) {
        setGameActive(true);
        gameActiveRef.current = true;
      } else {
        setShowStartAnimation(true);
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
      // Always show validation screen when game ends, regardless of wasActive status
      // This ensures players see the AI validation phase even if they joined late
      logger.log('[PLAYER] Setting waitingForResults to true');
      if (!waitingStartTimeRef.current) {
        waitingStartTimeRef.current = Date.now();
      }
      setWaitingForResults(true);
    };

    const handleTimeUpdate = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        return;
      }

      // CRITICAL: Sync timer with server time to prevent drift
      // The local timer counts down smoothly, but server updates keep it accurate
      if (gameTimer && data.remainingTime !== undefined) {
        gameTimer.setTime(data.remainingTime);
      }
      setRemainingTime(data.remainingTime);

      if (data.letterGrid && !letterGrid) {
        logger.log('[PLAYER] Received letterGrid in timeUpdate - late join sync');
        setLetterGrid(data.letterGrid);
      }
      if (data.language && !gameLanguage) {
        setGameLanguage(data.language);
      }

      const isGameActive = gameActiveRef.current;
      const hasGrid = letterGrid || data.letterGrid;
      if (!isGameActive && data.remainingTime > 0 && hasGrid) {
        logger.log('[PLAYER] Timer started on server, activating game via timeUpdate');
        setGameActive(true);
        gameActiveRef.current = true;
      }

      if (data.remainingTime <= 0) {
        setGameActive(false);
        gameActiveRef.current = false;
        setShowStartAnimation(false);
        if (!waitingStartTimeRef.current) {
          waitingStartTimeRef.current = Date.now();
        }
        setWaitingForResults(true);
      }
    };

    const handleValidatedScores = (data: any) => {
      logger.log('[PLAYER] Received validatedScores event:', data);

      const showResults = () => {
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
          });
        }
      };

      executeAfterMinimumWait(waitingStartTimeRef.current, showResults);
    };

    const handleFinalScores = (data: any) => {
      logger.log('[PLAYER] Received legacy finalScores event:', data);

      const showResults = () => {
        setWaitingForResults(false);
        setShowWordFeedback(false);
        setWordToVote(null);
        waitingStartTimeRef.current = null;

        const currentOnShowResults = onShowResultsRef.current;
        if (currentOnShowResults) {
          currentOnShowResults({
            scores: data.scores,
            letterGrid: letterGrid,
          });
        }
      };

      executeAfterMinimumWait(waitingStartTimeRef.current, showResults);
    };

    const handleResetGame = (data: any) => {
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
      if (gameTimer) {
        gameTimer.reset();
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

      neoSuccessToast(data.message || t('common.newGameReady'), { icon: '🔄', duration: 3000 });
    };

    // Earthquake/Fire Round event handlers
    const handleEarthquakeWarning = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale earthquakeWarning from old session');
        return;
      }
      logger.log('[PLAYER] Earthquake warning received');
      setEarthquakeState('warning');
    };

    const handleEarthquakeShake = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale earthquakeShake from old session');
        return;
      }
      logger.log('[PLAYER] Earthquake shake received');
      setEarthquakeState('shaking');
    };

    const handleFireRoundStart = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale fireRoundStart from old session');
        return;
      }
      logger.log('[PLAYER] Fire round started - grid:', data.grid);

      // Update grid with new fire round grid
      if (data.grid) {
        setLetterGrid(data.grid);
      }

      setEarthquakeState('fire-round');
      setFireRoundActive(true);
      setFireRoundRemaining(data.duration || 15);

      // Start countdown
      let remaining = data.duration || 15;
      const countdownInterval = setInterval(() => {
        remaining -= 1;
        setFireRoundRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
    };

    const handleFireRoundEnd = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale fireRoundEnd from old session');
        return;
      }
      logger.log('[PLAYER] Fire round ended');
      setEarthquakeState('idle');
      setFireRoundActive(false);
      setFireRoundRemaining(0);
    };

    // Handle total board words count (for "words remaining" display)
    const handleTotalBoardWords = (data: { count: number }) => {
      logger.log('[PLAYER] Received totalBoardWords:', data.count);
      setTotalBoardWords(data.count);
    };

    // Register listeners
    socket.on('startGame', handleStartGame);
    socket.on('endGame', handleEndGame);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('validatedScores', handleValidatedScores);
    socket.on('finalScores', handleFinalScores);
    socket.on('resetGame', handleResetGame);
    socket.on('hostLeftRoomClosing', handleHostLeftRoomClosing);
    socket.on('earthquakeWarning', handleEarthquakeWarning);
    socket.on('earthquakeShake', handleEarthquakeShake);
    socket.on('fireRoundStart', handleFireRoundStart);
    socket.on('fireRoundEnd', handleFireRoundEnd);
    socket.on('totalBoardWords', handleTotalBoardWords);

    return () => {
      socket.off('startGame', handleStartGame);
      socket.off('endGame', handleEndGame);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('validatedScores', handleValidatedScores);
      socket.off('finalScores', handleFinalScores);
      socket.off('resetGame', handleResetGame);
      socket.off('hostLeftRoomClosing', handleHostLeftRoomClosing);
      socket.off('earthquakeWarning', handleEarthquakeWarning);
      socket.off('earthquakeShake', handleEarthquakeShake);
      socket.off('fireRoundStart', handleFireRoundStart);
      socket.off('fireRoundEnd', handleFireRoundEnd);
      socket.off('totalBoardWords', handleTotalBoardWords);
    };
    // Setters from context are stable (wrapped in useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket,
    t,
    letterGrid,
    gameLanguage,
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
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    gameTimer,
    handleHostLeftRoomClosing,
    onGameStart,
  ]);

  return { gameSessionIdRef };
}
