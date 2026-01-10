/**
 * Host Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, validationComplete, resetGame
 */
import { useEffect, useCallback, useRef, useMemo, useState, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';
import { executeAfterMinimumWait, MINIMUM_WAITING_TIME_MS } from '@/shared/utils/timingUtils';
import {
  sendStartGameAck,
  createRoomClosedDueToInactivityHandler,
  triggerGameOverCelebration,
  showGameCompleteToast,
} from '@/shared/utils/gameEventUtils';
import logger from '@/utils/logger';
import type { StartGameBroadcast, XpGainedPayload, LevelUpPayload } from '@/shared/types/socket';

interface UseHostGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  gameStarted: boolean;
  username: string;
  hostPlaying: boolean;

  // State setters
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setFinalScores: React.Dispatch<React.SetStateAction<any>>;
  setPlayerWordCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPlayerAchievements: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<any>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setShufflingGrid: React.Dispatch<React.SetStateAction<any>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Earthquake/Fire round state setters
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs and setters (for reset)
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

  // Callbacks
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number }) => void;
  onGameStart?: () => void;
}

interface UseHostGameEventsReturn {
  gameSessionIdRef: MutableRefObject<number>;
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
}: UseHostGameEventsProps): UseHostGameEventsReturn {
  // Use refs to avoid stale closure issues
  const onShowResultsRef = useRef(onShowResults);
  const tableDataRef = useRef<any>(null);

  useEffect(() => {
    onShowResultsRef.current = onShowResults;
  }, [onShowResults]);

  // Track when we entered waiting state to prevent flickering
  const waitingStartTimeRef = useRef<number | null>(null);

  // Track game session ID to ignore stale events
  const gameSessionIdRef = useRef<number>(0);
  // State version for triggering re-renders when session changes
  const [gameSessionId, setGameSessionId] = useState<number>(0);

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

  useEffect(() => {
    if (!socket) return;

    const handleStartGame = (data: StartGameBroadcast) => {
      logger.log('[HOST] Received startGame event from server');

      // Track game session ID
      if ((data as any).gameSessionId !== undefined) {
        gameSessionIdRef.current = (data as any).gameSessionId;
        setGameSessionId((data as any).gameSessionId);
      }

      if (data.letterGrid) {
        setTableData(data.letterGrid);
        tableDataRef.current = data.letterGrid;
      }
      if (data.timerSeconds !== undefined) {
        setRemainingTime(data.timerSeconds);
      }

      // Reset state for new game
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

      // Send acknowledgment to server using shared utility
      sendStartGameAck(socket, data, 'HOST');

      // Trigger music
      onGameStart?.();
    };

    const handleTimeUpdate = (data: any) => {
      // Ignore stale events from previous sessions
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        return;
      }

      setRemainingTime(data.remainingTime);

      if (data.remainingTime === 0 && gameStarted) {
        setGameStarted(false);
        setShowStartAnimation(false);
        if (!waitingStartTimeRef.current) {
          waitingStartTimeRef.current = Date.now();
        }
        setWaitingForResults(true);
        triggerGameOverCelebration();
        neoSuccessToast(t('hostView.gameOverCheckScores'), {
          icon: '🏁',
          duration: 5000,
        });
      }
    };

    const handleEndGame = () => {
      logger.log('[HOST] Received endGame event');
      if (gameStarted) {
        setGameStarted(false);
        setRemainingTime(0);
        setShowStartAnimation(false);
        if (!waitingStartTimeRef.current) {
          waitingStartTimeRef.current = Date.now();
        }
        setWaitingForResults(true);
      }
    };

    const handleValidationComplete = (data: any) => {
      logger.log('[HOST] Received validationComplete event:', data);

      const showResults = () => {
        const currentOnShowResults = onShowResultsRef.current;
        const currentTableData = tableDataRef.current;

        setWaitingForResults(false);
        waitingStartTimeRef.current = null;

        showGameCompleteToast(t);

        // Always set final scores (needed for TV broadcast mode)
        // Wrap in expected structure with players property
        setFinalScores({
          players: data.scores,
          gameCode: ''
        });

        // Only call onShowResults if host is playing (not in broadcast mode)
        // In broadcast mode, we want to stay in HostView to show TvResultsView
        if (hostPlaying && currentOnShowResults) {
          currentOnShowResults({
            scores: data.scores,
            letterGrid: currentTableData,
            duplicateRuleDisabled: data.duplicateRuleDisabled,
            playerCount: data.playerCount,
          });
        }
      };

      executeAfterMinimumWait(waitingStartTimeRef.current, showResults);
    };

    const handleResetGame = (data: any) => {
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
    };

    // Earthquake/Fire Round event handlers
    const handleEarthquakeWarning = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale earthquakeWarning from old session');
        return;
      }
      logger.log('[HOST] Earthquake warning received');
      setEarthquakeState('warning');
    };

    const handleEarthquakeShake = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale earthquakeShake from old session');
        return;
      }
      logger.log('[HOST] Earthquake shake received');
      setEarthquakeState('shaking');
    };

    const handleFireRoundStart = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[HOST] Ignoring stale fireRoundStart from old session');
        return;
      }
      logger.log('[HOST] Fire round started - grid:', data.grid);

      // Update grid with new fire round grid
      if (data.grid) {
        setTableData(data.grid);
        tableDataRef.current = data.grid;
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
        logger.log('[HOST] Ignoring stale fireRoundEnd from old session');
        return;
      }
      logger.log('[HOST] Fire round ended');
      setEarthquakeState('idle');
      setFireRoundActive(false);
      setFireRoundRemaining(0);
    };

    // Register listeners
    socket.on('startGame', handleStartGame);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('endGame', handleEndGame);
    socket.on('validationComplete', handleValidationComplete);
    socket.on('resetGame', handleResetGame);
    socket.on('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
    socket.on('earthquakeWarning', handleEarthquakeWarning);
    socket.on('earthquakeShake', handleEarthquakeShake);
    socket.on('fireRoundStart', handleFireRoundStart);
    socket.on('fireRoundEnd', handleFireRoundEnd);

    return () => {
      socket.off('startGame', handleStartGame);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('endGame', handleEndGame);
      socket.off('validationComplete', handleValidationComplete);
      socket.off('resetGame', handleResetGame);
      socket.off('roomClosedDueToInactivity', handleRoomClosedDueToInactivity);
      socket.off('earthquakeWarning', handleEarthquakeWarning);
      socket.off('earthquakeShake', handleEarthquakeShake);
      socket.off('fireRoundStart', handleFireRoundStart);
      socket.off('fireRoundEnd', handleFireRoundEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket,
    t,
    gameStarted,
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
    resetComboState,
    handleRoomClosedDueToInactivity,
    onGameStart,
  ]); // hostPlaying accessed via hostPlayingRef for event handlers

  return { gameSessionIdRef, gameSessionId };
}
