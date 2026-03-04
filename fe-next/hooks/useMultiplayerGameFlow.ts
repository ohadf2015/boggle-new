/**
 * Game flow orchestration for multiplayer
 * Manages results display and spectator state
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { recordGameCompleted } from '@/utils/multiplayerProgressStorage';
import type { Language } from '@/shared/types/game';

interface ResultsData {
  scores: Array<{
    username: string;
    score: number;
    words: string[];
  }>;
  letterGrid: string[][];
  duplicateRuleDisabled?: boolean;
  playerCount?: number;
}

interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
}

interface UseMultiplayerGameFlowOptions {
  isActive: boolean;
  showResults: boolean;
  socket: Socket | null;
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
  handleUpgradeToPlayer: (username: string) => void;
}

/**
 * Manages multiplayer game flow state and transitions
 */
export function useMultiplayerGameFlow(
  options: UseMultiplayerGameFlowOptions
): UseMultiplayerGameFlowReturn {
  const {
    isActive,
    showResults: externalShowResults,
    socket,
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

  // Store calculated game duration when results are shown
  const gameDurationRef = useRef<number | null>(null);

  // Calculate and store game duration when results are first shown
  useEffect(() => {
    if (showResults && resultsData && gameDurationRef.current === null) {
      if (gameStartTime && pendingGameStart?.timerSeconds) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        gameDurationRef.current = Math.min(elapsed, pendingGameStart.timerSeconds);
      } else {
        gameDurationRef.current = pendingGameStart?.timerSeconds || 180;
      }
    }
  }, [showResults, resultsData, gameStartTime, pendingGameStart]);

  // Memoized game duration - uses ref value calculated in effect
  // Fallback to configured duration if ref not set yet
  const gameDuration = useMemo(() => {
    return gameDurationRef.current ?? pendingGameStart?.timerSeconds ?? 180;
  }, [pendingGameStart?.timerSeconds]);

  const handleShowResults = useCallback(
    (data: unknown) => {
      setResultsData(data as ResultsData);
      setShowResults(true);
      recordGameCompleted();

      if (isAuthenticated && refreshProfile) {
        refreshProfile();
      }
    },
    [isAuthenticated, refreshProfile]
  );

  const handleReturnToRoom = useCallback(() => {
    if (socket && gameCode) {
      socket.emit('confirmReadyForNextGame');
    }
    setShowResults(false);
    setResultsData(null);
    setPendingGameStart(null);
    setGameStartTime(null);
    gameDurationRef.current = null;
  }, [socket, gameCode]);

  const handleUpgradeToPlayer = useCallback(
    (username: string) => {
      if (!socket || !gameCode) {
        return;
      }

      socket.emit('upgradeToPlayer', { gameCode });
    },
    [socket, gameCode]
  );

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
