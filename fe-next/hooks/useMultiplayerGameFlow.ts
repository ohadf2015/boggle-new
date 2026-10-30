import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { recordGameCompleted } from '@/utils/multiplayerProgressStorage';
import { markGameInactive } from '@/utils/abandonOnPagehide';
import { useGameStore } from '@/hooks/gameState/store';
import type { Language } from '@/shared/types/game';

export interface WordHuntSummary {
  targetWord: string;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
  playerAttempts?: Record<string, number>;
}

interface ResultsData {
  scores: Array<{
    username: string;
    score: number;
    words: string[];
  }>;
  letterGrid: string[][];
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
  gameSessionId?: number;
  wordHuntSummary?: WordHuntSummary;
  blastSummary?: { playerMoves?: Record<string, number>; playerStats?: Record<string, any> };
  wheelRushSummary?: { playerStats?: Record<string, any> };
  classroomSummary?: ClassroomSummary;
}

interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
  minWordLength?: number;
  messageId?: string;
}

interface UseMultiplayerGameFlowOptions {
  socketRef: React.RefObject<Socket | null>;
  gameCode: string;
  isAuthenticated: boolean;
  refreshProfile?: () => void;
}

interface UseMultiplayerGameFlowReturn {
  showResults: boolean;
  setShowResults: (value: boolean) => void;
  resultsData: ResultsData | null;
  setResultsData: (data: ResultsData | null) => void;
  isSpectator: boolean;
  setIsSpectator: (value: boolean) => void;
  spectators: Array<{ username: string; socketId: string; avatar: any }>;
  setSpectators: (value: Array<{ username: string; socketId: string; avatar: any }>) => void;
  pendingGameStart: GameStartData | null;
  setPendingGameStart: (data: GameStartData | null) => void;
  gameStartTime: number | null;
  setGameStartTime: (value: number | null) => void;
  gameDuration: number;
  handleShowResults: (data: unknown) => void;
  handleReturnToRoom: () => void;
  handleUpgradeToPlayer: () => void;
}

const DEFAULT_GAME_DURATION = 180;

/**
 * Manages multiplayer game flow state and transitions
 */
export function useMultiplayerGameFlow(
  options: UseMultiplayerGameFlowOptions
): UseMultiplayerGameFlowReturn {
  const {
    socketRef,
    gameCode,
    isAuthenticated,
    refreshProfile,
  } = options;

  const [showResults, setShowResults] = useState<boolean>(false);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [spectators, setSpectators] = useState<Array<{ username: string; socketId: string; avatar: any }>>(
    []
  );
  const [pendingGameStart, setPendingGameStartState] = useState<GameStartData | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  // The game view consumes (nulls) pendingGameStart long before results arrive.
  const roundTimerSecondsRef = useRef<number | null>(null);
  const setPendingGameStart = useCallback((data: GameStartData | null) => {
    if (data?.timerSeconds) roundTimerSecondsRef.current = data.timerSeconds;
    setPendingGameStartState(data);
  }, []);

  const [gameDuration, setGameDuration] = useState<number>(DEFAULT_GAME_DURATION);

  useEffect(() => {
    if (!showResults || !resultsData) return;
    const timerSeconds = roundTimerSecondsRef.current;
    if (gameStartTime && timerSeconds) {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      setGameDuration(Math.min(elapsed, timerSeconds));
    } else {
      setGameDuration(timerSeconds || DEFAULT_GAME_DURATION);
    }
  }, [showResults, resultsData, gameStartTime]);

  const handleShowResults = useCallback(
    (data: unknown) => {
      const rd = data as ResultsData;
      if (process.env.NODE_ENV === 'development') {
        console.log('[MP_RESULTS] handleShowResults called', {
          hasScores: !!rd?.scores,
          scoresLength: rd?.scores?.length,
          hasLetterGrid: !!rd?.letterGrid,
        });
      }
      // Seeing results ends the round, and THIS call is what unmounts the view
      // that would otherwise log the abandon. Clear the flag synchronously here,
      // before `setShowResults(true)` swaps the tree out.
      //
      // The two paths that used to clear it both resolve too late. `trackGameEnd`
      // is driven by `useGameEndTelemetry`, which watches `finalScores` /
      // `waitingForResults` — both set in the same handler as `onShowResults`
      // (`useHostGameEvents.ts:516-537`), so React batches them into one commit
      // and the host tree is gone before the effect sees the rising edge.
      // `ResultsMainContent`'s `results_viewed` (`growthTracking.ts:503`) lives
      // inside a `next/dynamic({ssr:false})` chunk, so on a cold chunk its mount
      // loses to `emitAbandonOnSpaNavigate`'s `setTimeout(0)`.
      //
      // Production 90d, AFTER the 2026-08-15 fix (5afa38b1b): 211 of classic's
      // 512 abandons still fired at 85-95s against a ~90s round. One chokepoint
      // covers all four MP modes instead of five results components staying in
      // step (Class 1 + Class 3 in `.claude/rules/60-recurring-pitfalls.md`).
      markGameInactive();

      setResultsData(rd);
      setShowResults(true);
      recordGameCompleted();

      if (isAuthenticated && refreshProfile) {
        refreshProfile();
      }
    },
    [isAuthenticated, refreshProfile]
  );

  const handleReturnToRoom = useCallback(() => {
    if (socketRef.current && gameCode) {
      socketRef.current.emit('confirmReadyForNextGame');
    }
    // Reset Zustand store to clear blast/word-hunt/leaderboard state from previous round
    useGameStore.getState().resetForNewRound();
    setShowResults(false);
    setResultsData(null);
    setPendingGameStart(null);
    setGameStartTime(null);
    roundTimerSecondsRef.current = null;
    setGameDuration(DEFAULT_GAME_DURATION);
  }, [socketRef, gameCode, setPendingGameStart]);

  const handleUpgradeToPlayer = useCallback(() => {
    if (!socketRef.current || !gameCode) {
      return;
    }

    socketRef.current.emit('upgradeToPlayer', { gameCode });
  }, [socketRef, gameCode]);

  return {
    showResults,
    setShowResults,
    resultsData,
    setResultsData,
    isSpectator,
    setIsSpectator,
    spectators,
    setSpectators,
    pendingGameStart,
    setPendingGameStart,
    gameStartTime,
    setGameStartTime,
    gameDuration,
    handleShowResults,
    handleReturnToRoom,
    handleUpgradeToPlayer,
  };
}
