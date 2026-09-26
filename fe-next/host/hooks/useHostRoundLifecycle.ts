'use client';

/**
 * Host round lifecycle: the pending-start handoff from the results screen,
 * CrazyGames lifecycle + start/end telemetry, the navigation guard, the logo
 * exit request and the earthquake/fire round. Split out of HostView
 * (FOUNDATION 2026-09-26); code moved verbatim.
 */

import { useEffect, useRef, useMemo } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useEarthquakeFireRound } from '@/hooks/useEarthquakeFireRound';
import type { PlayerResult } from '@/types';
import { useGameMode, useHostSelectedGameMode } from '@/hooks/gameState/store';
import { stashStartGameMessageId, wasStartGameHandled, markStartGameHandled } from '@/shared/utils/gameEventUtils';

// Custom hooks
import { useHostViewState, useHostSocketEvents, useHostGameActions } from './index';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';
import type { GameStartData } from '../hostViewTypes';

type HostState = ReturnType<typeof useHostViewState>;
type HostActions = ReturnType<typeof useHostGameActions>;
type MusicApi = ReturnType<typeof useMusic>;

export interface HostRoundLifecycleInput {
  pendingGameStart?: GameStartData | null;
  onGameStartConsumed?: () => void;
  state: HostState;
  actions: HostActions;
  fadeToTrack: MusicApi['fadeToTrack'];
  TRACKS: MusicApi['TRACKS'];
  username: string;
  gameCode: string;
  currentGameMode: ReturnType<typeof useGameMode>;
  gameModeConfirmed: boolean;
  hostSelectedGameMode: ReturnType<typeof useHostSelectedGameMode>;
  t: ReturnType<typeof useLanguage>['t'];
  socket: ReturnType<typeof useSocket>['socket'];
  gameSessionId: ReturnType<typeof useHostSocketEvents>['gameSessionId'];
}

export function useHostRoundLifecycle({
  pendingGameStart, onGameStartConsumed, state, actions, fadeToTrack, TRACKS, username, gameCode,
  currentGameMode, gameModeConfirmed, hostSelectedGameMode, t, socket, gameSessionId,
}: HostRoundLifecycleInput): void {
  // Handle pending game start (when host returns from results page)
  // The startGame event was captured at page level while HostView was unmounted
  // We need to initialize the game state with that data
  useEffect(() => {
    if (!pendingGameStart) return;

    // Skip if useHostGameEvents.handleStartGame already drove the start for
    // this messageId — both handlers run for a normal start, and double
    // setShowStartAnimation(true) makes GoRipples unmount/remount and play
    // the countdown twice.
    if (wasStartGameHandled('HOST', pendingGameStart.messageId)) {
      onGameStartConsumed?.();
      return;
    }

    // Initialize game state from pending data
    if (pendingGameStart.letterGrid) {
      state.setTableData(pendingGameStart.letterGrid);
    }
    if (pendingGameStart.timerSeconds !== undefined) {
      state.setRemainingTime(pendingGameStart.timerSeconds);
    }

    // Stash so the GoRipplesAnimation can emit `countdownComplete` once it
    // finishes — server gates the round timer on that signal.
    if (pendingGameStart.messageId) {
      stashStartGameMessageId('HOST', pendingGameStart.messageId);
      markStartGameHandled('HOST', pendingGameStart.messageId);
    }

    // Reset states for new game and trigger animation
    state.setWaitingForResults(false);
    state.setShowStartAnimation(true);
    state.setPlayerWordCounts({});
    state.setPlayerScores({});
    state.setHostFoundWords([]);
    state.setHostAchievements([]);
    state.setFinalScores(null);

    // Trigger music change for game start
    fadeToTrack(TRACKS.IN_GAME, 800, 800);

    // Mark pending game start as consumed
    onGameStartConsumed?.();
  }, [pendingGameStart, onGameStartConsumed, state, fadeToTrack, TRACKS.IN_GAME]);

  // Destructure for cleaner JSX
  const { runtime, players, tournament, combo } = state;

  // CrazyGames SDK lifecycle (gameplayStart/Stop, happyTime) — required for full launch.
  // Hosts in MP rooms (whether playing or broadcasting) must emit lifecycle events for
  // CrazyGames QA detection. roundKey resets between tournament rounds.
  useCrazyGamesLifecycle({
    isGameActive: runtime.gameStarted && !runtime.waitingForResults,
    isGameOver: runtime.waitingForResults,
    score: players.playerScores[username] ?? 0,
    maxCombo: combo.level ?? 0,
    roundKey: tournament.tournamentData?.currentRound ?? 0,
  });

  // Bot count for the admin game log's human-vs-bot composition (forward capture).
  const botPlayerCount = useMemo(() => {
    const rows = (tournament.finalScores?.players ?? []) as unknown as PlayerResult[];
    return rows.filter(p => p.isBot).length;
  }, [tournament.finalScores]);

  // PostHog funnel parity: emit `growth:game_started` once when the host's
  // game becomes active. Without this, MP `game_completed` events have no
  // matching `game_started`, blinding started→finished funnels.
  useGameStartTelemetry({
    mode: currentGameMode ?? 'multiplayer',
    isGameActive: runtime.gameStarted && !runtime.waitingForResults,
    ready: gameModeConfirmed,
    extras: {
      gameCode, role: 'host', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: currentGameMode ?? 'classic',
      requestedMode: hostSelectedGameMode ?? 'random',
      playerCount: tournament.finalScores?.players?.length ?? 0,
      botCount: botPlayerCount,
    },
  });

  // Paired MP end emit (game_completed) so the nightly job sees MP outcomes per mode.
  const hostResultRow = useMemo(() => {
    const rows = (tournament.finalScores?.players ?? []) as unknown as PlayerResult[];
    return rows.find(p => p.isHost) ?? null;
  }, [tournament.finalScores]);
  useGameEndTelemetry({
    mode: currentGameMode ?? 'multiplayer',
    resultsShown: !!tournament.finalScores,
    // Same gate the start hook uses — otherwise a `random` room completes under
    // the unresolved mode and never matches its own start.
    ready: gameModeConfirmed,
    score: hostResultRow?.score ?? 0,
    wordCount: hostResultRow?.wordsFoundCount ?? 0,
    extras: {
      gameCode, role: 'host', isMultiplayer: true,
      engineMode: 'multiplayer', gameMode: currentGameMode ?? 'classic',
      requestedMode: hostSelectedGameMode ?? 'random',
      playerCount: tournament.finalScores?.players?.length ?? 0,
      botCount: botPlayerCount,
    },
  });

  // Navigation guard - prevent accidental navigation during active game
  // Enable for ALL hosts when game is running, whether playing or spectating
  // Hosts in spectator/broadcast mode still need confirmation before leaving
  useNavigationGuard({
    enabled: runtime.gameStarted,
    leaving: actions.leaving,
    message: t('playerView.exitWarning'),
    onNavigationAttempt: () => {
      // Show the exit confirmation dialog
      state.setShowExitConfirm(true);
      return false; // Block navigation, let modal handle it
    },
  });

  // Handle logo click exit request
  // Use refs to access latest values without re-registering the event listener
  const runtimeRef = useRef(runtime);
  const actionsRef = useRef(actions);
  const stateRef = useRef(state);

  useEffect(() => {
    runtimeRef.current = runtime;
    actionsRef.current = actions;
    stateRef.current = state;
  });

  useEffect(() => {
    const handleRoomExitRequest = (event: CustomEvent) => {
      const { gameCode: requestedCode, username: requestedUsername } = event.detail;

      // Verify the request is for this game session
      if (requestedCode === gameCode && requestedUsername === username) {
        // If game hasn't started (waiting state), auto-exit without confirmation
        if (!runtimeRef.current.gameStarted) {
          actionsRef.current.confirmExitRoom();
        } else {
          // Game is active - show confirmation modal
          stateRef.current.setShowExitConfirm(true);
        }
      }
    };

    window.addEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    return () => {
      window.removeEventListener('requestRoomExit', handleRoomExitRequest as EventListener);
    };
  }, [gameCode, username]);

  // Earthquake/Fire Round feature for multiplayer (only for triggering, state managed via socket events)
  useEarthquakeFireRound({
    enabled: runtime.gameStarted && !runtime.waitingForResults && (!currentGameMode || currentGameMode === 'classic'),
    gameDurationSeconds: state.settings.timerValue * 60,
    currentTimeSeconds: runtime.remainingTime || 0,
    language: state.roomLanguage,
    difficulty: state.settings.difficulty,
    mode: 'multiplayer',
    isHost: true,
    socket: socket,
    gameSessionId: gameSessionId,
    onGridRegenerate: () => {
      // Grid regeneration handled by socket event (fireRoundStart)
    },
    onEarthquakeStart: () => {
      // State updates handled by socket events
    },
    onEarthquakeShake: () => {
      // State updates handled by socket events
    },
    onFireRoundStart: () => {
      // State updates handled by socket events
    },
    onFireRoundEnd: () => {
      // State updates handled by socket events
    },
  });
}
