import { useEffect, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { recordGameCompleted } from '@/utils/multiplayerProgressStorage';
import { useGameStore } from '@/hooks/gameState/store';
import type { Language } from '@/shared/types/game';

export interface WordHuntSummary {
  targetWord: string;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  targetFoundBy: string | null;
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
  const [pendingGameStart, setPendingGameStart] = useState<GameStartData | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);

  // Calculated game duration — stored in state so it's reactive
  const [gameDuration, setGameDuration] = useState<number>(180);

  // Calculate game duration when results are first shown
  useEffect(() => {
    if (showResults && resultsData) {
      if (gameStartTime && pendingGameStart?.timerSeconds) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        setGameDuration(Math.min(elapsed, pendingGameStart.timerSeconds));
      } else {
        setGameDuration(pendingGameStart?.timerSeconds || 180);
      }
    }
  }, [showResults, resultsData, gameStartTime, pendingGameStart]);

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
    setGameDuration(180);
  }, [socketRef, gameCode]);

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
