/**
 * Host Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, validationComplete, resetGame
 */
import { useEffect, useCallback, useRef, useMemo, useState, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast } from '../../../components/NeoToast';
import { resetComboState as resetComboStateUtil } from '@/shared/utils/comboUtils';

import {
  sendStartGameAck,
  createRoomClosedDueToInactivityHandler,
  triggerGameOverCelebration,
  showGameCompleteToast,
} from '@/shared/utils/gameEventUtils';
import { createEarthquakeSocketHandlers } from '@/shared/utils/earthquakeSocketHandlers';
import logger from '@/utils/logger';
import type { StartGameBroadcast, XpGainedPayload, LevelUpPayload } from '@/shared/types/socket';
import { useGameStore } from '@/hooks/gameState/store';

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
  setPlayersReady?: React.Dispatch<React.SetStateAction<any[]>>;
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
  setPlayersReady,
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

      // Sync language from server broadcast (mirrors player handler)
      if (data.language) {
        useGameStore.getState().setGameLanguage(data.language);
      }

      // Sync resolved game mode from server (handles random → actual mode)
      if ((data as any).gameMode) {
        useGameStore.getState().setGameMode((data as any).gameMode);
      }

      // Set blast tile overlay if present (mirrors player handler)
      if ((data as any).blastTileOverlay) {
        useGameStore.getState().setBlastTileOverlay((data as any).blastTileOverlay);
      }

      // Set word hunt target length if present (mirrors player handler)
      if ((data as any).wordHuntTargetLength != null && (data as any).wordHuntTargetLength > 0) {
        const store = useGameStore.getState();
        store.setWordHuntTargetLength((data as any).wordHuntTargetLength);
        store.setWordHuntMyLife(100);
        store.setWordHuntTargetAttempts([]);
        store.setWordHuntTargetFound(false);
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
        setWaitingForResults(true);
      }
    };

    const handleValidationComplete = (data: any) => {
      logger.log('[HOST] Received validationComplete event:', data);

      // Transition directly to results — no validation modal delay
      const currentOnShowResults = onShowResultsRef.current;
      const currentTableData = tableDataRef.current;

      setWaitingForResults(false);
      waitingStartTimeRef.current = null;

      showGameCompleteToast(t);

      // Always set final scores (needed for TV broadcast mode)
      setFinalScores({
        players: data.scores,
        gameCode: ''
      });

      // Only call onShowResults if host is playing (not in broadcast mode)
      if (hostPlaying && currentOnShowResults) {
        currentOnShowResults({
          scores: data.scores,
          letterGrid: currentTableData,
          duplicateRuleDisabled: data.duplicateRuleDisabled,
          playerCount: data.playerCount,
        });
      }
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

      // Refresh player list from server data so host can start next game
      if (data.users && setPlayersReady) {
        setPlayersReady(data.users);
      }
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

    return () => {
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
    resetComboState,
    handleRoomClosedDueToInactivity,
    earthquakeHandlers,
    onGameStart,
    setPlayersReady,
  ]); // hostPlaying accessed via hostPlayingRef for event handlers

  return { gameSessionIdRef, gameSessionId };
}
