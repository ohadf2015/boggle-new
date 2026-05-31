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

import React, { useCallback, useRef, type RefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast, TOAST_ICONS } from '@/components/NeoToast';
import { clearSessionPreservingUsername } from '@/utils/session';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import logger from '@/utils/logger';
import { BOOST_TOKEN_STORAGE_KEY } from '@/hooks/useBoostClaim';
import type { Language, LetterGrid, DifficultyLevel } from '@/types';
import type { TournamentData } from './useHostViewState';
import type { BoardTheme } from '@/shared/types/socket';
import { useGameMode, useHostSelectedGameMode } from '@/hooks/gameState';
import { WHEEL_RUSH_DURATION_SEC } from '@/shared/constants/wheelRushConstants';

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
  boardTheme: BoardTheme | null;

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
  setShowSoloConfirm: React.Dispatch<React.SetStateAction<boolean>>;

  // Refs
  intentionalExitRef: RefObject<boolean>;
  tournamentTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

export interface UseHostGameActionsReturn {
  startGame: () => void;
  confirmSoloStart: () => void;
  stopGame: () => void;
  handleExitRoom: () => void;
  confirmExitRoom: () => void;
  handleCancelTournament: () => void;
  handleStartNewGame: () => void;
  handleNextRound: () => void;
  handleShowQR: () => void;
  handleCancelTournamentDialog: () => void;
  handleHostWordSubmit: (word: string) => void;
  regenerateBoard: () => void;
}

export function useHostGameActions(options: UseHostGameActionsOptions): UseHostGameActionsReturn {
  const gameMode = useGameMode();
  // Send the host's persistent intent (can be 'random'), not the resolved gameMode
  // — otherwise a "random" pick locks to the rolled result on subsequent rounds.
  const hostSelectedGameMode = useHostSelectedGameMode();
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
    boardTheme,
    playersCount,
    tournamentData,
    setTableData,
    setRemainingTime,
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
    setShowSoloConfirm,
    intentionalExitRef,
    tournamentTimeoutRef,
  } = options;

  const startGameLockRef = useRef(false);

  /** Core game-start logic shared by startGame and confirmSoloStart */
  const executeStartGame = useCallback(() => {
    // Debounce: prevent double-click from emitting startGame twice
    if (startGameLockRef.current) {
      logger.warn('[HOST] Start game already in progress, ignoring duplicate');
      return;
    }

    // Validate socket connection BEFORE taking the lock so a transient
    // disconnect doesn't jam retries for the 3s debounce window.
    if (!socket || !socket.connected) {
      logger.warn('[HOST] Cannot start game: socket not connected');
      neoErrorToast(t('hostView.connectionLost') || 'Connection lost. Please refresh.', { icon: TOAST_ICONS.plug, duration: 4000 });
      return;
    }

    startGameLockRef.current = true;
    setTimeout(() => { startGameLockRef.current = false; }, 3000);

    // Tournament creation
    if (gameType === 'tournament' && !tournamentData) {
      setTournamentCreating(true);
      socket.emit('createTournament', {
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
            icon: TOAST_ICONS.xCircle,
            duration: 5000,
          });
        }
      }, 5000);
      return;
    }

    // Tournament round
    if (gameType === 'tournament' && tournamentData) {
      socket.emit('startTournamentRound');
      return;
    }

    // Regular game — blast mode always uses 6x6 grid
    const difficultyConfig = DIFFICULTIES[difficulty] ?? DIFFICULTIES.MEDIUM;
    const rows = gameMode === 'blast' ? 6 : difficultyConfig.rows;
    const cols = gameMode === 'blast' ? 6 : difficultyConfig.cols;
    const embedWords = roomLanguage !== 'ja' ? wordsForBoard : [];
    const newTable = generateRandomTable(rows, cols, roomLanguage, embedWords);

    if (!newTable || !Array.isArray(newTable) || newTable.length === 0) {
      logger.error('[HOST] Failed to generate letter grid', { difficulty, gameMode, rows, cols });
      return;
    }

    setTableData(newTable);
    // Wheel-rush is design-locked to its 1-minute default (WHEEL_RUSH_DURATION_SEC).
    const seconds = (hostSelectedGameMode === 'wheel-rush')
      ? WHEEL_RUSH_DURATION_SEC
      : timerValue * 60;
    setRemainingTime(seconds);
    // NOTE: Do NOT trigger the start animation optimistically here. The host's
    // 3-2-1-GO countdown is driven by the server `startGame` broadcast (see
    // useHostGameEvents.handleStartGame) — the exact same trigger players use.
    // Starting it on click put the host a full network round-trip ahead of the
    // players, so the game appeared to start at different times. Letting the
    // broadcast drive both keeps host and players in sync.
    setPlayerWordCounts({});
    setPlayerScores({});
    setHostFoundWords([]);
    setHostAchievements([]);

    // Read cached boost token BEFORE emit so the server registers the boost
    // atomically with state transition. The prior separate `boost:apply` emit
    // raced submitWord — first words could land before the boost was stashed.
    let boostToken: string | undefined;
    const rawBoost = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY(gameCode))
      : null;
    if (rawBoost) {
      try {
        const parsed = JSON.parse(rawBoost) as { token?: string };
        if (parsed?.token) boostToken = parsed.token;
      } catch {
        // Ignore parsing errors — startGame proceeds without a boost.
      }
    }

    logger.info('[HOST] Starting game with', playersCount, 'players');
    socket.emit('startGame', {
      letterGrid: newTable,
      timerSeconds: seconds,
      language: roomLanguage,
      hostPlaying: hostPlaying,
      minWordLength: minWordLength,
      difficulty: difficulty,
      boardTheme: boardTheme,
      gameMode: hostSelectedGameMode || 'random',
      tvMode: !hostPlaying,
      ...(boostToken ? { boostToken } : {}),
    });

    neoSuccessToast(t('common.gameStarted'), {
      icon: TOAST_ICONS.gamepad,
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
    boardTheme,
    tournamentRounds,
    setTableData,
    setRemainingTime,
    setPlayerWordCounts,
    setPlayerScores,
    setHostFoundWords,
    setHostAchievements,
    setTournamentCreating,
    tournamentTimeoutRef,
    gameMode,
    hostSelectedGameMode,
    gameCode,
  ]);

  /** Public startGame — shows solo confirmation if host is alone */
  const startGame = useCallback(() => {
    // playersCount includes the host, so subtract 1 when host is playing
    const otherPlayers = hostPlaying ? playersCount - 1 : playersCount;

    // No players at all (host not playing and nobody joined)
    if (otherPlayers <= 0 && !hostPlaying) {
      logger.warn('[HOST] Cannot start game: no players');
      neoErrorToast(t('hostView.noPlayers') || 'No players in lobby', { icon: TOAST_ICONS.alertTriangle, duration: 3000 });
      return;
    }

    // Solo host with no other players — ask for confirmation
    if (otherPlayers <= 0 && hostPlaying) {
      setShowSoloConfirm(true);
      return;
    }

    executeStartGame();
  }, [playersCount, hostPlaying, t, executeStartGame, setShowSoloConfirm]);

  /** Called when user confirms they want to play solo with bots */
  const confirmSoloStart = useCallback(() => {
    setShowSoloConfirm(false);
    executeStartGame();
  }, [executeStartGame, setShowSoloConfirm]);

  const stopGame = useCallback(() => {
    socket?.emit('endGame', { gameCode });
    setRemainingTime(null);
    setGameStarted(false);
    // Host pressed X — do not auto-advance to the next game on the results page.
    // StickyReadyBar reads this flag on mount to keep its 35s countdown cancelled.
    try { sessionStorage.setItem('mp-auto-advance-cancelled', '1'); } catch {}
    neoInfoToast(t('hostView.gameStopped'), { icon: TOAST_ICONS.stopCircle });
  }, [socket, gameCode, t, setRemainingTime, setGameStarted]);

  const handleExitRoom = useCallback(() => {
    setShowExitConfirm(true);
  }, [setShowExitConfirm]);

  const confirmExitRoom = useCallback(() => {
    intentionalExitRef.current = true;

    // Disable navigation guard BEFORE navigation to prevent native browser prompt
    setGameStarted(false);

    clearSessionPreservingUsername(username);
    // Persist the intentional-exit flag in sessionStorage so the post-reload
    // boot path skips auto-rejoin. The ref alone is gone after reload.
    try { sessionStorage.setItem('boggle_intentional_exit', '1'); } catch { /* blocked */ }
    socket?.emit('closeRoom', { gameCode });
    setTimeout(() => {
      socket?.disconnect();
      window.location.reload();
    }, 100);
  }, [socket, gameCode, username, intentionalExitRef, setGameStarted]);

  const handleCancelTournament = useCallback(() => {
    if (!socket || !tournamentData) return;
    socket.emit('cancelTournament');
    setShowCancelTournamentDialog(false);
    setTournamentData(null);
    setGameType('regular');
    neoErrorToast(t('hostView.tournamentCancelled') || 'Tournament cancelled', {
      icon: TOAST_ICONS.xCircle,
      duration: 3000,
    });
  }, [socket, tournamentData, t, setShowCancelTournamentDialog, setTournamentData, setGameType]);

  const handleStartNewGame = useCallback(() => {
    // Reuse the same lock as startGame to prevent duplicate emissions
    if (startGameLockRef.current) {
      logger.warn('[HOST] handleStartNewGame already in progress, ignoring duplicate');
      return;
    }
    startGameLockRef.current = true;
    setTimeout(() => { startGameLockRef.current = false; }, 3000);

    socket?.emit('resetGame', { gameCode }, (response: { success: boolean; error?: string; gameState?: string }) => {
      if (response?.success) {
        setFinalScores(null);
        setGameType('regular');
        logger.log('[HOST] Game reset confirmed by server, state:', response.gameState);

        // Immediately start a new game - skip the waiting room
        // This includes all current players and any waiting room players
        const difficultyConfig = DIFFICULTIES[difficulty] ?? DIFFICULTIES.MEDIUM;
        const rows = gameMode === 'blast' ? 6 : difficultyConfig.rows;
        const cols = gameMode === 'blast' ? 6 : difficultyConfig.cols;
        const embedWords = roomLanguage !== 'ja' ? wordsForBoard : [];
        const newTable = generateRandomTable(rows, cols, roomLanguage, embedWords);

        if (!newTable || !Array.isArray(newTable) || newTable.length === 0) {
          logger.error('[HOST] Failed to generate letter grid on restart', { difficulty, gameMode });
          return;
        }

        setTableData(newTable);
        const seconds = (hostSelectedGameMode === 'wheel-rush')
          ? WHEEL_RUSH_DURATION_SEC
          : timerValue * 60;
        setRemainingTime(seconds);
        // Animation is driven by the server `startGame` broadcast (same as
        // players) — see the sync note in executeStartGame. Don't start it
        // optimistically or the host runs ahead of the players.
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
          boardTheme: boardTheme,
          gameMode: hostSelectedGameMode || 'random',
          tvMode: !hostPlaying,
        });

        neoSuccessToast(t('common.gameStarted'), {
          icon: TOAST_ICONS.gamepad,
          duration: 3000,
        });
      } else {
        neoErrorToast(t('hostView.resetFailed') || 'Failed to reset game', {
          icon: TOAST_ICONS.xCircle,
          duration: 3000,
        });
        logger.debug('[HOST] Game reset failed:', response?.error);
      }
    });
  }, [
    socket, t, setFinalScores, setGameType, difficulty, timerValue, roomLanguage,
    wordsForBoard, hostPlaying, minWordLength, boardTheme, gameMode, hostSelectedGameMode, gameCode,
    setTableData, setRemainingTime,
    setPlayerWordCounts, setPlayerScores, setHostFoundWords, setHostAchievements
  ]);

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

  /**
   * Regenerate the board with new words
   * This allows the host to get a fresh board before starting the game
   */
  const regenerateBoard = useCallback(() => {
    if (!socket) return;

    // Request new words from server — blast mode always uses 6x6
    const difficultyConfig = DIFFICULTIES[difficulty];
    const rows = gameMode === 'blast' ? 6 : difficultyConfig.rows;
    const cols = gameMode === 'blast' ? 6 : difficultyConfig.cols;
    socket.emit('getWordsForBoard', {
      language: roomLanguage,
      boardSize: { rows, cols },
    });

    // The new words will be received via socket event and stored in wordsForBoard
    // Generate a new board immediately with current words (will be updated when new words arrive)
    const embedWords = roomLanguage !== 'ja' ? wordsForBoard : [];
    const newTable = generateRandomTable(rows, cols, roomLanguage, embedWords);

    setTableData(newTable);

    neoInfoToast(t('hostView.boardRegenerated') || 'Board regenerated!', {
      duration: 2000,
    });
  }, [socket, difficulty, roomLanguage, wordsForBoard, t, setTableData, gameMode]);

  return {
    startGame,
    confirmSoloStart,
    stopGame,
    handleExitRoom,
    confirmExitRoom,
    handleCancelTournament,
    handleStartNewGame,
    handleNextRound,
    handleShowQR,
    handleCancelTournamentDialog,
    handleHostWordSubmit,
    regenerateBoard,
  };
}

export default useHostGameActions;
