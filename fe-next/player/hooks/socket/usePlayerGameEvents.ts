/**
 * Player Game Events Hook
 * Handles core game lifecycle socket events: startGame, endGame, timeUpdate, resetGame, results
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
import logger from '@/utils/logger';
import type { Language } from '@/types';
import type { XpGainedPayload, LevelUpPayload, StartGameBroadcast } from '@/shared/types/socket';

interface FoundWord {
  word: string;
  isValid?: boolean | null;
  timestamp?: number;
}

interface UsePlayerGameEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  letterGrid: any;
  gameLanguage: Language | null;
  username: string;
  onShowResults?: (data: { scores: any; letterGrid: any; duplicateRuleDisabled?: boolean; playerCount?: number }) => void;

  // State setters
  setWasInActiveGame: React.Dispatch<React.SetStateAction<boolean>>;
  setFoundWords: React.Dispatch<React.SetStateAction<FoundWord[]>>;
  setAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  setLetterGrid: React.Dispatch<React.SetStateAction<any>>;
  setRemainingTime: React.Dispatch<React.SetStateAction<number | null>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  setGameLanguage: React.Dispatch<React.SetStateAction<Language | null>>;
  setGameActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setWaitingForResults: React.Dispatch<React.SetStateAction<boolean>>;
  setLeaderboard: React.Dispatch<React.SetStateAction<any[]>>;
  setTournamentData: React.Dispatch<React.SetStateAction<any>>;
  setTournamentStandings: React.Dispatch<React.SetStateAction<any[]>>;
  setShowTournamentStandings: React.Dispatch<React.SetStateAction<boolean>>;

  // Word feedback state setters
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<any>>;

  // XP state setters
  setXpGainedData: React.Dispatch<React.SetStateAction<XpGainedPayload | null>>;
  setLevelUpData: React.Dispatch<React.SetStateAction<LevelUpPayload | null>>;

  // Earthquake/Fire Round state setters
  setEarthquakeState: React.Dispatch<React.SetStateAction<'idle' | 'warning' | 'shaking' | 'fire-round'>>;
  setFireRoundActive: React.Dispatch<React.SetStateAction<boolean>>;
  setFireRoundRemaining: React.Dispatch<React.SetStateAction<number>>;

  // Combo refs (for reset)
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: MutableRefObject<number>;

  // Exit ref
  intentionalExitRef: MutableRefObject<boolean>;

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
  letterGrid,
  gameLanguage,
  username,
  onShowResults,
  setWasInActiveGame,
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
  setTournamentData,
  setTournamentStandings,
  setShowTournamentStandings,
  setShowWordFeedback,
  setWordToVote,
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
  comboShieldsUsedRef,
  intentionalExitRef,
  onGameStart,
}: UsePlayerGameEventsProps): UsePlayerGameEventsReturn {
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
      setWasInActiveGame(true);
      wasInActiveGameRef.current = true;
      setFoundWords([]);
      setAchievements([]);
      comboShieldsUsedRef.current = 0;

      if ((data as any).gameSessionId !== undefined) {
        gameSessionIdRef.current = (data as any).gameSessionId;
      }
      if (data.letterGrid) setLetterGrid(data.letterGrid);
      if (data.timerSeconds) setRemainingTime(data.timerSeconds);
      if (data.language) setGameLanguage(data.language);
      if (data.minWordLength) setMinWordLength(data.minWordLength);

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
      if (wasActive) {
        logger.log('[PLAYER] Setting waitingForResults to true');
        if (!waitingStartTimeRef.current) {
          waitingStartTimeRef.current = Date.now();
        }
        setWaitingForResults(true);
      }
    };

    const handleTimeUpdate = (data: any) => {
      if (data.gameSessionId !== undefined && data.gameSessionId !== gameSessionIdRef.current) {
        logger.log('[PLAYER] Ignoring stale timeUpdate from old session:', data.gameSessionId);
        return;
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
      setWasInActiveGame(false);
      wasInActiveGameRef.current = false;
      setFoundWords([]);
      setAchievements([]);
      setLeaderboard([]);
      setRemainingTime(null);
      setWaitingForResults(false);
      setLetterGrid(null);
      setShowStartAnimation(false);
      waitingStartTimeRef.current = null;

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
    };
  }, [
    socket,
    t,
    letterGrid,
    gameLanguage,
    setWasInActiveGame,
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
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setShowWordFeedback,
    setWordToVote,
    setXpGainedData,
    setLevelUpData,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    comboShieldsUsedRef,
    setEarthquakeState,
    setFireRoundActive,
    setFireRoundRemaining,
    handleHostLeftRoomClosing,
    onGameStart,
  ]);

  return { gameSessionIdRef };
}
