/**
 * useHostGameActions - Game action handlers for HostView
 *
 * Encapsulates all game lifecycle actions:
 * - Start game / tournament
 * - Stop game
 * - Exit room
 * - Reset game
 * - Cancel tournament
 */

import React, { useCallback, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast } from '@/components/NeoToast';
import { clearSessionPreservingUsername } from '@/utils/session';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import logger from '@/utils/logger';
import type { Language, LetterGrid, DifficultyLevel } from '@/types';
import type { TournamentData } from './useHostViewState';

interface UseHostGameActionsOptions {
  socket: Socket | null;
  gameCode: string;
  username: string;
  t: (key: string) => string;

  // Settings
  difficulty: DifficultyLevel;
  timerValue: number;
  minWordLength: number;
  hostPlaying: boolean;
  gameType: 'regular' | 'tournament';
  tournamentRounds: number;
  roomLanguage: Language;
  wordsForBoard: string[];

  // State
  playersCount: number;
  tournamentData: TournamentData | null;

  // State setters
  setTableData: React.Dispatch<React.SetStateAction<LetterGrid>>;
  setRemainingTime: (time: number | null) => void;
  setShowStartAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayerWordCounts: (counts: Record<string, number>) => void;
  setPlayerScores: (scores: Record<string, number>) => void;
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setHostAchievements: (achievements: string[]) => void;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  setFinalScores: React.Dispatch<React.SetStateAction<any>>;
  setGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExitConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCancelTournamentDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQR: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs
  intentionalExitRef: MutableRefObject<boolean>;
  tournamentTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
}

export interface UseHostGameActionsReturn {
  startGame: () => void;
  stopGame: () => void;
  handleExitRoom: () => void;
  confirmExitRoom: () => void;
  handleCancelTournament: () => void;
  handleStartNewGame: () => void;
  handleNextRound: () => void;
  handleShowQR: () => void;
  handleCancelTournamentDialog: () => void;
  handleHostWordSubmit: (word: string) => void;
}

export function useHostGameActions(options: UseHostGameActionsOptions): UseHostGameActionsReturn {
  const {
    socket,
    gameCode,
    username,
    t,
    difficulty,
    timerValue,
    minWordLength,
    hostPlaying,
    gameType,
    tournamentRounds,
    roomLanguage,
    wordsForBoard,
    playersCount,
    tournamentData,
    setTableData,
    setRemainingTime,
    setShowStartAnimation,
    setPlayerWordCounts,
    setPlayerScores,
    setHostFoundWords,
    setHostAchievements,
    setTournamentCreating,
    setTournamentData,
    setGameType,
    setFinalScores,
    setGameStarted,
    setShowExitConfirm,
    setShowCancelTournamentDialog,
    setShowQR,
    intentionalExitRef,
    tournamentTimeoutRef,
  } = options;

  const startGame = useCallback(() => {
    if (playersCount === 0) return;

    // Tournament creation
    if (gameType === 'tournament' && !tournamentData) {
      setTournamentCreating(true);
      socket?.emit('createTournament', {
        name: 'Tournament',
        totalRounds: tournamentRounds,
        timerSeconds: timerValue * 60,
        difficulty: difficulty,
        language: roomLanguage,
      });

      tournamentTimeoutRef.current = setTimeout(() => {
        if (!tournamentData) {
          setTournamentCreating(false);
          neoErrorToast(t('hostView.tournamentCreateFailed'), {
            icon: '❌',
            duration: 5000,
          });
        }
      }, 5000);
      return;
    }

    // Tournament round
    if (gameType === 'tournament' && tournamentData) {
      socket?.emit('startTournamentRound');
      return;
    }

    // Regular game
    const difficultyConfig = DIFFICULTIES[difficulty];
    const embedWords = roomLanguage !== 'ja' ? wordsForBoard : [];
    const newTable = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      roomLanguage,
      embedWords
    );

    setTableData(newTable);
    const seconds = timerValue * 60;
    setRemainingTime(seconds);
    setShowStartAnimation(true);
    setPlayerWordCounts({});
    setPlayerScores({});
    setHostFoundWords([]);
    setHostAchievements([]);

    socket?.emit('startGame', {
      letterGrid: newTable,
      timerSeconds: seconds,
      language: roomLanguage,
      hostPlaying: hostPlaying,
      minWordLength: minWordLength,
      difficulty: difficulty,
    });

    neoSuccessToast(t('common.gameStarted'), {
      icon: '🎮',
      duration: 3000,
    });
  }, [
    playersCount,
    gameType,
    tournamentData,
    socket,
    t,
    timerValue,
    difficulty,
    roomLanguage,
    wordsForBoard,
    hostPlaying,
    minWordLength,
    tournamentRounds,
    setTableData,
    setRemainingTime,
    setShowStartAnimation,
    setPlayerWordCounts,
    setPlayerScores,
    setHostFoundWords,
    setHostAchievements,
    setTournamentCreating,
    tournamentTimeoutRef,
  ]);

  const stopGame = useCallback(() => {
    socket?.emit('endGame', { gameCode });
    setRemainingTime(null);
    setGameStarted(false);
    neoInfoToast(t('hostView.gameStopped'), { icon: '⏹️' });
  }, [socket, gameCode, t, setRemainingTime, setGameStarted]);

  const handleExitRoom = useCallback(() => {
    setShowExitConfirm(true);
  }, [setShowExitConfirm]);

  const confirmExitRoom = useCallback(() => {
    intentionalExitRef.current = true;
    clearSessionPreservingUsername(username);
    socket?.emit('closeRoom', { gameCode });
    setTimeout(() => {
      socket?.disconnect();
      window.location.reload();
    }, 100);
  }, [socket, gameCode, username, intentionalExitRef]);

  const handleCancelTournament = useCallback(() => {
    if (!socket || !tournamentData) return;
    socket.emit('cancelTournament');
    setShowCancelTournamentDialog(false);
    setTournamentData(null);
    setGameType('regular');
    neoErrorToast(t('hostView.tournamentCancelled') || 'Tournament cancelled', {
      icon: '❌',
      duration: 3000,
    });
  }, [socket, tournamentData, t, setShowCancelTournamentDialog, setTournamentData, setGameType]);

  const handleStartNewGame = useCallback(() => {
    socket?.emit('resetGame', {}, (response: { success: boolean; error?: string; gameState?: string }) => {
      if (response?.success) {
        setFinalScores(null);
        setGameType('regular');
        neoSuccessToast(t('common.newGameReady'), {
          icon: '🔄',
          duration: 2000,
        });
        logger.log('[HOST] Game reset confirmed by server, state:', response.gameState);
      } else {
        neoErrorToast(t('hostView.resetFailed') || 'Failed to reset game', {
          icon: '❌',
          duration: 3000,
        });
        logger.error('[HOST] Game reset failed:', response?.error);
      }
    });
  }, [socket, t, setFinalScores, setGameType]);

  const handleNextRound = useCallback(() => {
    setFinalScores(null);
    socket?.emit('startTournamentRound');
  }, [socket, setFinalScores]);

  const handleShowQR = useCallback(() => setShowQR(true), [setShowQR]);

  const handleCancelTournamentDialog = useCallback(() => {
    setShowCancelTournamentDialog(true);
  }, [setShowCancelTournamentDialog]);

  const handleHostWordSubmit = useCallback((formedWord: string) => {
    setHostFoundWords((prev: string[]) => [...prev, formedWord]);
  }, [setHostFoundWords]);

  return {
    startGame,
    stopGame,
    handleExitRoom,
    confirmExitRoom,
    handleCancelTournament,
    handleStartNewGame,
    handleNextRound,
    handleShowQR,
    handleCancelTournamentDialog,
    handleHostWordSubmit,
  };
}

export default useHostGameActions;
