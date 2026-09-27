'use client';

/**
 * Joiner round telemetry: the CrazyGames SDK lifecycle (gameplayStart/Stop,
 * happyTime) and the paired MP `game_started` / `game_completed` emits. Split
 * out of PlayerView (FOUNDATION 2026-09-26); code moved verbatim.
 */
import { useMemo } from 'react';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';
import type { useFoundWords, useLeaderboard, useGameMode } from '@/hooks/gameState';
import type { ViewTournamentData as TournamentData } from '@/shared/types/view';

export interface PlayerRoundTelemetryInput {
  gameActive: boolean;
  waitingForResults: boolean;
  leaderboard: ReturnType<typeof useLeaderboard>;
  username: string;
  comboLevel: number;
  tournamentData: TournamentData | null;
  gameMode: ReturnType<typeof useGameMode>;
  gameModeConfirmed: boolean;
  gameCode: string;
  humanPlayerCount: number;
  botPlayerCount: number;
  foundWords: ReturnType<typeof useFoundWords>;
}

export function usePlayerRoundTelemetry({
  gameActive, waitingForResults, leaderboard, username, comboLevel, tournamentData, gameMode,
  gameModeConfirmed, gameCode, humanPlayerCount, botPlayerCount, foundWords,
}: PlayerRoundTelemetryInput): void {
  // CrazyGames SDK lifecycle (gameplayStart/Stop, happyTime) — required for full launch
  // roundKey resets the lifecycle between tournament rounds so each round emits SDK calls.
  useCrazyGamesLifecycle({
    isGameActive: gameActive,
    isGameOver: waitingForResults,
    score: leaderboard.find(p => p.username === username)?.score ?? 0,
    maxCombo: comboLevel,
    roundKey: tournamentData?.currentRound ?? 0,
  });

  // PostHog funnel parity: emit `growth:game_started` once when the player's
  // game becomes active. Pairs with the trackGameEnd in the results flow so
  // MP started→finished funnels become computable.
  useGameStartTelemetry({
    mode: gameMode ?? 'multiplayer',
    isGameActive: gameActive,
    ready: gameModeConfirmed,
    extras: {
      gameCode, role: 'player', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: gameMode ?? 'classic',
      playerCount: humanPlayerCount, botCount: botPlayerCount,
    },
  });

  // Paired MP end emit (game_completed) so the nightly job sees MP outcomes per
  // mode, not just starts. resultsShown = the player reached the results phase.
  const mpValidWords = useMemo(
    () => foundWords.filter(w => w.validated !== false),
    [foundWords],
  );
  useGameEndTelemetry({
    mode: gameMode ?? 'multiplayer',
    resultsShown: waitingForResults,
    // Same gate the start hook uses — otherwise a `random` room completes under
    // the unresolved mode and never matches its own start.
    ready: gameModeConfirmed,
    score: mpValidWords.reduce((s, w) => s + (w.score ?? 0), 0),
    wordCount: mpValidWords.length,
    extras: {
      gameCode, role: 'player', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: gameMode ?? 'classic',
      playerCount: humanPlayerCount, botCount: botPlayerCount,
    },
  });
}
