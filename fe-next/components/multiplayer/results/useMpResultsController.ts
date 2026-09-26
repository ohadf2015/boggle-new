'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsGuest } from '@/hooks/useIsGuest';
import { useResultsSocketEvents } from '@/components/results/useResultsSocketEvents';
import { useResultsData } from '@/hooks/useResultsData';
import { useResultsSideEffects } from '@/hooks/useResultsSideEffects';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useMultiplayerSignupNudge } from '@/hooks/useMultiplayerSignupNudge';
import { useFirstWinCelebration } from '@/hooks/useFirstWinCelebration';
import { useGameKeyboardShortcuts } from '@/hooks/useGameKeyboardShortcuts';
import { useMpExit } from '@/hooks/useMpExit';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useGameMode, useGameModeConfirmed, useHostSelectedGameMode, useGameActions } from '@/hooks/gameState/store';
import { playedGameMode } from '@/lib/education/roundEndResultsRoute';
import { shouldShowDailyInvite } from '@/lib/results/shouldShowDailyInvite';
import { SERIES_TOTAL_GAMES } from '@/hooks/useSeriesTracker';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { ResultsPageProps } from '@/types/components';
import { useMpNextRound } from './useMpNextRound';

export type MpResultsProps = ResultsPageProps;

interface LessonGameData {
  lessonId: string;
  vocabularyWords: string[];
}

function readLessonGameData(): LessonGameData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('lessonGameData');
    return raw ? (JSON.parse(raw) as LessonGameData) : null;
  } catch {
    return null;
  }
}

/**
 * Everything the results screens DO (moved out of the 1516-line ResultsPage):
 * socket events, server-sourced data, side effects, next-round, exit. The
 * screens only lay it out. One controller for intermission AND final results,
 * so the two can never disagree on a number (pitfall class 3).
 */
export function useMpResultsController(props: MpResultsProps) {
  const {
    finalScores, gameCode, onReturnToRoom, username, socket, achievements, isHost = false,
    roomLanguage = 'en', gridSize = 4, gameDuration = 180, seriesRoundNumber, wordHuntSummary, classroomSummary,
    onResetSeries,
  } = props;
  const { t, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const isGuest = useIsGuest(isAuthenticated);
  const lessonGameData = useMemo(readLessonGameData, []);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // The mode the round that just ENDED was played in — NOT the raw store value,
  // which the host's (or a teacher's room-wide) next-round pick rewrites while
  // this screen is up. Gate on the server-confirmed flag and LATCH the last
  // confirmed mode so a correct card is never lost (see playedGameMode).
  const storeGameMode = useGameMode();
  const gameModeConfirmed = useGameModeConfirmed();
  const lastConfirmedMode = useRef<string | undefined>(undefined);
  const confirmedMode = playedGameMode({
    gameMode: storeGameMode,
    gameModeConfirmed,
  });
  if (confirmedMode) lastConfirmedMode.current = confirmedMode;
  const resolvedGameMode = lastConfirmedMode.current;

  // Host's next-round intent survives rounds ("random" stays random so each round re-rolls).
  const hostSelectedGameMode = useHostSelectedGameMode();
  const { setHostSelectedGameMode } = useGameActions();
  const [selectedGameMode, setSelectedGameModeLocal] = useState<GameModeOption>(
    (hostSelectedGameMode || resolvedGameMode || 'random') as GameModeOption,
  );
  const setSelectedGameMode = useCallback((mode: GameModeOption) => {
    setSelectedGameModeLocal(mode);
    setHostSelectedGameMode(mode);
  }, [setHostSelectedGameMode]);

  const socketEvents = useResultsSocketEvents({ socket, username });
  const reactions = useQuickReactions({ socket: socket ?? null, username: username || '' });

  const data = useResultsData({
    finalScores,
    username,
    gameDuration,
    gameMode: resolvedGameMode,
    wordHuntTargetFoundBy: wordHuntSummary?.targetFoundBy,
  });
  const { sortedScores, isCurrentUserWinner, currentPlayerRank, currentPlayerData, currentPlayerValidWords, normalizeUsername } = data;

  const marginToNext =
    currentPlayerRank > 1 && currentPlayerData && sortedScores[currentPlayerRank - 2]
      ? sortedScores[currentPlayerRank - 2].score - currentPlayerData.score
      : null;

  const sideEffects = useResultsSideEffects({
    currentPlayerData,
    currentPlayerValidWords,
    isCurrentUserWinner,
    currentPlayerRank,
    totalPlayers: sortedScores.length,
    sortedScores,
    username,
    gameCode,
    gameDuration,
    gridSize,
    achievements,
    showWordFeedback: socketEvents.showWordFeedback,
    normalizeUsername,
    gameMode: resolvedGameMode,
  });

  useCrazyGamesLifecycle({ isGameActive: false, isGameOver: true, isWinner: isCurrentUserWinner });
  const { submitLeaderboardScore } = useCrazyGames();
  useEffect(() => {
    if (currentPlayerData?.score != null && currentPlayerData.score > 0) submitLeaderboardScore(currentPlayerData.score);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  const nudge = useMultiplayerSignupNudge({ isAuthenticated, isResultsVisible: true });
  // Record once BOTH the room and the played mode are known (mount-only fired
  // before the mode hydrated → PostHog got 'multiplayer' for ~65% of games).
  const mpGameRecordedRef = useRef(false);
  const { recordMpGame } = nudge;
  useEffect(() => {
    if (mpGameRecordedRef.current || !gameCode || !resolvedGameMode) return;
    mpGameRecordedRef.current = true;
    recordMpGame(resolvedGameMode);
  }, [gameCode, resolvedGameMode, recordMpGame]);

  const guestStats = useMemo(() => getGuestStatsSummary(), []);
  useFirstWinCelebration({ isWinner: isCurrentUserWinner, gamesPlayed: guestStats.gamesPlayed, isMultiplayer: true });

  // Exit: the one way out of an MP screen (useMpExit → leaveRoom emit, session
  // clear, in-place reset, classroom hub). The lesson payload is this screen's.
  const mpExit = useMpExit();
  const requestExit = useCallback(() => setShowExitConfirm(true), []);
  const confirmExitRoom = useCallback(() => {
    setIsExiting(true);
    setShowExitConfirm(false);
    try {
      sessionStorage.removeItem('lessonGameData');
    } catch {
      /* storage blocked */
    }
    mpExit('leave-room');
  }, [mpExit]);

  const deferredFinalScores = useDeferredValue(finalScores);
  const allPlayerWords = useMemo(() => {
    const wordMap: Record<string, Array<Record<string, unknown> & { word: string; score: number; validated: boolean; isDuplicate: boolean }>> = {};
    for (const player of deferredFinalScores ?? []) {
      wordMap[player.username] = (player.allWords || []).map((w) => {
        const x = w as unknown as Record<string, unknown>;
        return {
          word: w.word,
          score: w.score ?? 0,
          validated: w.validated ?? false,
          isDuplicate: (x.isDuplicate as boolean | undefined) ?? false,
          comboBonus: x.comboBonus,
          fireRoundBonus: x.fireRoundBonus,
          isAiVerified: x.isAiVerified,
          isPendingValidation: x.isPendingValidation,
          potentialScore: x.potentialScore,
          invalidReason: x.invalidReason,
          aiReason: x.aiReason,
          timestamp: x.timestamp,
          timeSinceStart: x.timeSinceStart,
        };
      });
    }
    return wordMap;
  }, [deferredFinalScores]);

  const nextRound = useMpNextRound({ socket, isHost, gameCode, roomLanguage, selectedGameMode });
  const isSeriesComplete = (seriesRoundNumber ?? 0) >= SERIES_TOTAL_GAMES;
  const { handleStartGame } = nextRound;
  const handleNewSeries = useCallback(() => {
    onResetSeries?.();
    handleStartGame();
  }, [onResetSeries, handleStartGame]);

  const showDailyInvite = shouldShowDailyInvite({ isGuest, gameCode, isBotsOnlyGame: data.isBotsOnlyGame, isSeriesComplete });
  const isClassroom = !!lessonGameData || !!classroomSummary;

  useGameKeyboardShortcuts({
    onRematch: onReturnToRoom || undefined,
    onEscape: requestExit,
    enabled: true,
  });

  return {
    props,
    t,
    language,
    isAuthenticated,
    isGuest,
    userId: user?.id ?? null,
    lessonGameData,
    isClassroom,
    resolvedGameMode,
    selectedGameMode,
    setSelectedGameMode,
    socketEvents,
    reactions,
    data,
    marginToNext,
    sideEffects,
    nudge,
    showExitConfirm,
    setShowExitConfirm,
    requestExit,
    confirmExitRoom,
    isExiting,
    showShareModal,
    setShowShareModal,
    allPlayerWords,
    nextRound,
    isSeriesComplete,
    handleNewSeries,
    showDailyInvite,
  };
}

export type MpResultsController = ReturnType<typeof useMpResultsController>;
