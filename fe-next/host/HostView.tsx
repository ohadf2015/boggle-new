'use client';

import React, { useEffect, useState, useCallback, memo, useRef, useMemo } from 'react';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import '../style/animation.scss';
import { useSocket } from '../utils/SocketContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { DIFFICULTIES } from '../utils/consts';
import { usePresence } from '../hooks/usePresence';
import { useEarthquakeFireRound } from '../hooks/useEarthquakeFireRound';
import type { Language, PlayerResult } from '@/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { GameMode } from '@/shared/types/game';
import { setStoredUsername, setStoredCustomAvatar } from '@/utils/profileStorage';
import { useGameMode, useGameModeConfirmed, useHostSelectedGameMode } from '@/hooks/gameState/store';
import logger from '@/utils/logger';
import {
  sendCountdownComplete,
  stashStartGameMessageId,
  consumeStashedMessageId,
  wasStartGameHandled,
  markStartGameHandled,
} from '@/shared/utils/gameEventUtils';

// Extracted components
import HostPreGameView from './components/HostPreGameView';
import HostInGameView from './components/HostInGameView';
import TvBroadcastView from './components/TvBroadcastView';
import TvLobbyView from './components/tv-broadcast/TvLobbyView';
import { TvResultsView } from './components/tv-results';
import {
  QRCodeDialog,
  FinalScoresModal,
  ExitConfirmDialog,
  CancelTournamentDialog,
  SoloStartConfirmDialog,
} from './components/HostDialogs';

// Custom hooks
import {
  useHostViewState,
  useHostSocketEvents,
  useHostGameActions,
  useHostEffects,
  type Player,
} from './hooks';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useLobbyAutoStart } from '@/hooks/useLobbyAutoStart';
import { useGameStartTelemetry } from '@/hooks/useGameStartTelemetry';
import { useGameEndTelemetry } from '@/hooks/useGameEndTelemetry';
import { useTimerZeroWatchdog } from '../hooks/useTimerZeroWatchdog';
import { useTimerStallWatchdog } from '../hooks/useTimerStallWatchdog';
import { useTeacherPaused } from '../hooks/useTeacherPause';
import { addGameBreadcrumb } from '../utils/sentry';

// ==========================================
// Props
// ==========================================

interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
  minWordLength?: number;
  messageId?: string;
}

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  /** Teacher's chosen game mode from ClassroomGameLobby; seeds the host selector. */
  gameMode?: GameMode;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

interface HostViewProps {
  gameCode: string;
  roomLanguage?: Language;
  initialPlayers?: Player[];
  username: string;
  onShowResults: (data: unknown) => void;
  /** Pending game start data from page-level socket handler (for host returning from results) */
  pendingGameStart?: GameStartData | null;
  /** Callback when pending game start has been consumed */
  onGameStartConsumed?: () => void;
  /** Lesson data for vocabulary-based games started from teacher dashboard */
  lessonData?: LessonData | null;
  /** Callback when host changes their display name */
  onUsernameChange?: (newName: string) => void;
  /** Quick Play: auto-start solo game immediately after room join */
  autoStart?: boolean;
  /** Private rooms (Quick Play / classroom) hide invite + share affordances. */
  isPrivate?: boolean;
  /** Quick Play: auto-fill bots + start the moment the lobby mounts. */
  isQuickPlay?: boolean;
  /** SPA reset to lobby (no reload) — see useHostGameActions.onExitToLobby. */
  onExitToLobby?: () => void;
}

// ==========================================
// Component
// ==========================================

const HostView: React.FC<HostViewProps> = memo(({
  gameCode,
  roomLanguage: roomLanguageProp,
  initialPlayers = [],
  username,
  onShowResults,
  pendingGameStart,
  onGameStartConsumed,
  lessonData,
  onUsernameChange,
  autoStart = false,
  isPrivate = false,
  isQuickPlay = false,
  onExitToLobby,
}) => {
  const { t, language } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  // Enable presence tracking
  usePresence({ enabled: !!gameCode });
  const currentGameMode = useGameMode();
  // MP rolls `random` server-side; the resolved mode + confirmation land together
  // AFTER the game goes active. Gate game_started on confirmation so it captures the
  // resolved mode (matching game_completed); keep the host's intent as requestedMode.
  const gameModeConfirmed = useGameModeConfirmed();
  const hostSelectedGameMode = useHostSelectedGameMode();

  // Host name change handler
  const handleHostNameChange = useCallback((newName: string) => {
    setStoredUsername(newName);
    socket?.emit('updateGuestName', { newName });
  }, [socket]);

  // Listen for server confirmation of name change
  useEffect(() => {
    if (!socket) return;
    const handleNameUpdated = (data: { newName: string }) => {
      if (data?.newName) onUsernameChange?.(data.newName);
    };
    socket.on('guestNameUpdated', handleNameUpdated);
    return () => { socket.off('guestNameUpdated', handleNameUpdated); };
  }, [socket, onUsernameChange]);

  // Host avatar change handler — emits socket event so other players see the update
  const handleHostAvatarChange = useCallback((config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    socket?.emit('updateAvatar', { customAvatar: config });
  }, [socket]);

  // Consolidated state management
  const state = useHostViewState({
    initialPlayers,
    roomLanguage: roomLanguageProp,
    defaultLanguage: language as Language,
    hasLessonData: !!lessonData,
  });

  // Mode-specific state from Zustand store (for TV broadcast).
  // wordHunt overlay state subscribed inside TvBroadcastView so this view
  // doesn't re-render on word-hunt ticks when host isn't broadcasting.

  // Earthquake/Fire Round state (managed via socket events)
  const [earthquakeState, setEarthquakeState] = useState<'idle' | 'warning' | 'shaking' | 'fire-round'>('idle');
  const [fireRoundActive, setFireRoundActive] = useState(false);
  const [fireRoundRemaining, setFireRoundRemaining] = useState(0);

  // Players ready for next game state
  const [playersReadyData, setPlayersReadyData] = useState<{ readyCount: number; totalPlayers: number; readyUsernames?: string[] } | null>(null);

  // Music ref for earthquake
  const earthquakeMusicActiveRef = useRef<boolean>(false);

  // Socket event handling
  const { gameSessionId } = useHostSocketEvents({
    socket,
    t,
    hostPlaying: state.settings.hostPlaying,
    gameStarted: state.runtime.gameStarted,
    tableData: state.runtime.tableData,
    username,
    queueAchievement,
    playComboSound,
    onShowResults,
    setPlayersReady: state.setPlayersReady,
    setPlayerWordCounts: state.setPlayerWordCounts,
    setPlayerScores: state.setPlayerScores,
    setPlayerAchievements: state.setPlayerAchievements,
    setFinalScores: state.setFinalScores,
    setRemainingTime: state.setRemainingTime,
    setGameStarted: state.setGameStarted,
    setShowStartAnimation: state.setShowStartAnimation,
    setTableData: state.setTableData,
    setHostFoundWords: state.setHostFoundWords,
    setHostAchievements: state.setHostAchievements,
    setTournamentData: state.setTournamentData,
    setTournamentCreating: state.setTournamentCreating,
    setShufflingGrid: state.setShufflingGrid,
    setWordsForBoard: state.setWordsForBoard,
    setBoardTheme: state.setBoardTheme,
    setXpGainedData: state.setXpGainedData,
    setLevelUpData: state.setLevelUpData,
    setEarthquakeState: setEarthquakeState,
    setFireRoundActive: setFireRoundActive,
    setFireRoundRemaining: setFireRoundRemaining,
    setWaitingForResults: state.setWaitingForResults,
    comboLevelRef: state.comboRefs.levelRef,
    lastWordTimeRef: state.comboRefs.lastWordTimeRef,
    setComboLevel: state.setComboLevel,
    setLastWordTime: state.setLastWordTime,
    comboTimeoutRef: state.comboRefs.timeoutRef,
    tournamentTimeoutRef: state.refs.tournamentTimeoutRef,
    tournamentData: state.tournament.tournamentData,
    intentionalExitRef: state.refs.intentionalExitRef,
    onGameStart: () => {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      state.resetUrgentMusicRef();
    },
  });

  // Side effects (timer, music, animations)
  useHostEffects({
    socket,
    gameStarted: state.runtime.gameStarted,
    remainingTime: state.runtime.remainingTime,
    showStartAnimation: state.runtime.showStartAnimation,
    waitingForResults: state.runtime.waitingForResults,
    tableData: state.runtime.tableData,
    playersCount: state.players.playersReady.length,
    difficulty: state.settings.difficulty,
    roomLanguage: state.roomLanguage,
    language: language as Language,
    timerValue: state.settings.timerValue,
    setRemainingTime: state.setRemainingTime,
    setGameStarted: state.setGameStarted,
    setShufflingGrid: state.setShufflingGrid,
    setHighlightedCells: state.setHighlightedCells,
    setPlayersReady: state.setPlayersReady,
    fadeToTrack,
    stopMusic,
    playCountdownBeep,
    TRACKS,
    earthquakeState,
    hasTriggeredUrgentMusicRef: state.refs.hasTriggeredUrgentMusicRef,
    earthquakeMusicActiveRef,
    intentionalExitRef: state.refs.intentionalExitRef,
    initialPlayers,
  });

  // Defense-in-depth: if timeUpdate(0) or endGame are missed on the host (e.g.
  // brief network blip), this watchdog forces waitingForResults and pulls the
  // server's cached scoring payload 2s after the timer visually reaches 0.
  // The root fix (setRemainingTime before guard in useHostGameEvents) handles the
  // primary case; this catches the residual scenario where the event is lost entirely.
  useTimerZeroWatchdog({
    remainingTime: state.runtime.remainingTime,
    gameActive: state.runtime.gameStarted || (!!state.runtime.tableData && !!state.runtime.remainingTime && state.runtime.remainingTime > 0),
    waitingForResults: state.runtime.waitingForResults,
    onTrigger: () => {
      if (state.tournament.finalScores) return;
      logger.log('[HOST] Timer-zero watchdog: forcing waiting state + requesting results');
      state.setWaitingForResults(true);
      socket?.emit('requestResults');
    },
  });

  // Stall watchdog — see PlayerView for rationale. Host display can desync the
  // same way (server clock unstarted, gameSessionId drift); recovery emits
  // `requestGameState` to force a fresh `startGame` with current remainingTime.
  // A teacher pause is a frozen clock BY DESIGN — not a stall to recover from.
  const teacherPaused = useTeacherPaused();
  useTimerStallWatchdog({
    remainingTime: state.runtime.remainingTime,
    gameActive: !teacherPaused && (state.runtime.gameStarted || (!!state.runtime.tableData && !!state.runtime.remainingTime && state.runtime.remainingTime > 0)),
    waitingForResults: state.runtime.waitingForResults,
    onStall: () => {
      if (state.tournament.finalScores) return;
      logger.log('[HOST] Timer-stall watchdog: remainingTime frozen — requesting fresh game state');
      addGameBreadcrumb('mp_timer_stall', {
        role: 'host',
        gameCode,
        remainingTime: state.runtime.remainingTime,
      });
      socket?.emit('requestGameState');
    },
  });

  // Game actions
  const actions = useHostGameActions({
    socket,
    gameCode,
    username,
    t,
    difficulty: state.settings.difficulty,
    timerValue: state.settings.timerValue,
    minWordLength: state.settings.minWordLength,
    hostPlaying: state.settings.hostPlaying,
    gameType: state.settings.gameType,
    tournamentRounds: state.settings.tournamentRounds,
    roomLanguage: state.roomLanguage,
    wordsForBoard: state.wordsForBoard,
    boardTheme: state.boardTheme,
    playersCount: state.players.playersReady.length,
    tournamentData: state.tournament.tournamentData,
    setTableData: state.setTableData,
    setRemainingTime: (time) => state.setRemainingTime(time),
    setShowStartAnimation: state.setShowStartAnimation,
    setPlayerWordCounts: (counts) => state.setPlayerWordCounts(counts),
    setPlayerScores: (scores) => state.setPlayerScores(scores),
    setHostFoundWords: state.setHostFoundWords,
    setHostAchievements: (achievements) => state.setHostAchievements(achievements),
    setTournamentCreating: state.setTournamentCreating,
    setTournamentData: state.setTournamentData,
    setGameType: state.setGameType,
    setFinalScores: state.setFinalScores,
    setGameStarted: state.setGameStarted,
    setShowExitConfirm: state.setShowExitConfirm,
    setShowCancelTournamentDialog: state.setShowCancelTournamentDialog,
    setShowQR: state.setShowQR,
    setShowSoloConfirm: state.setShowSoloConfirm,
    intentionalExitRef: state.refs.intentionalExitRef,
    tournamentTimeoutRef: state.refs.tournamentTimeoutRef,
    onExitToLobby,
  });

  // Quick Play: auto-start solo game once room is joined and socket ready.
  // Ref-guarded so StrictMode double-mount or rerun only fires once per attempt.
  // If emit silently fails (e.g. transient socket glitch), ref clears after 3.5s
  // so a rerender retries. Success clears retry via gameStarted early-return.
  const autoStartFiredRef = useRef(false);
  useEffect(() => {
    if (!autoStart) return;
    if (state.runtime.gameStarted) return;
    if (autoStartFiredRef.current) return;
    if (!socket?.connected || !gameCode) return;
    logger.debug('[QUICK_PLAY autostart] firing', {
      gameCode,
      connected: socket?.connected,
      gameStarted: state.runtime.gameStarted,
    });
    autoStartFiredRef.current = true;
    actions.confirmSoloStart();
    const retryTimer = setTimeout(() => {
      autoStartFiredRef.current = false;
    }, 3500);
    return () => clearTimeout(retryTimer);
  }, [autoStart, socket, gameCode, state.runtime.gameStarted, actions]);

  // Destructure stable setters for useEffect dependencies
  const { setWordsForBoard } = state;
  const roomLanguage = state.roomLanguage;
  const difficulty = state.settings.difficulty;

  // Request words for board embedding
  // If lesson data is available, use vocabulary words from the lesson instead of random server words
  useEffect(() => {
    if (!socket) return;
    if (roomLanguage === 'ja') return;

    // If we have lesson vocabulary, use those words instead of requesting random ones
    if (lessonData?.vocabularyWords && lessonData.vocabularyWords.length > 0) {
      // Use lesson vocabulary for board embedding
      setWordsForBoard(lessonData.vocabularyWords.map(w => w.toUpperCase()));
      return;
    }

    // Otherwise request random themed words from server
    const difficultyConfig = DIFFICULTIES[difficulty];
    socket.emit('getWordsForBoard', {
      language: roomLanguage,
      boardSize: {
        rows: difficultyConfig.rows,
        cols: difficultyConfig.cols,
      },
    });
  }, [socket, difficulty, roomLanguage, lessonData, setWordsForBoard]);

  // Listen for players ready updates
  useEffect(() => {
    if (!socket) return;

    const handlePlayersReadyUpdate = (data: { readyCount: number; totalPlayers: number; readyUsernames?: string[] }) => {
      setPlayersReadyData(data);
    };

    // Reset ready count when game resets or starts
    const handleResetGame = () => {
      setPlayersReadyData(null);
    };

    socket.on('playersReadyUpdate', handlePlayersReadyUpdate);
    socket.on('resetGame', handleResetGame);
    // Note: startGame ready-state reset is handled inside useHostGameEvents.handleStartGame
    // to avoid a duplicate listener that fires on reconnect and clears state mid-game.

    return () => {
      socket.off('playersReadyUpdate', handlePlayersReadyUpdate);
      socket.off('resetGame', handleResetGame);
    };
  }, [socket]);

  // Server-owned lobby auto-start: when every guest is ready, the server runs a
  // short synced countdown and then tells the host to fire the normal start —
  // so a host who never clicks "Start" no longer strands a ready lobby.
  const lobbyAutoStart = useLobbyAutoStart({ socket, onFire: actions.startGame });

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
  const { runtime, settings, players, tournament, animation, ui, hostPlaying: hostPlayingState, combo } = state;

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

  // Detect when we have active game data (covers countdown and transition to active game)
  const hasActiveGameData = runtime.tableData && runtime.remainingTime !== null && runtime.remainingTime > 0;

  // Navigation hiding is managed by PageClient based on isActive/showResults

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy">
      {/* GO Animation */}
      {runtime.showStartAnimation && (
        <GoRipplesAnimation
          onComplete={() => {
            state.setShowStartAnimation(false);
            const id = consumeStashedMessageId('HOST');
            if (socket) sendCountdownComplete(socket, id, 'HOST');
          }}
          t={t}
          players={players.playersReady as unknown as React.ComponentProps<typeof GoRipplesAnimation>['players']}
        />
      )}

      {/* Dialogs */}
      {/* TV Results View - Full screen for broadcast mode (host NOT playing) */}
      {!!tournament.finalScores && !settings.hostPlaying && !runtime.waitingForResults && (
        <TvResultsView
          finalScores={(tournament.finalScores?.players ?? []) as unknown as PlayerResult[]}
          tournamentData={tournament.tournamentData as Parameters<typeof FinalScoresModal>[0]['tournamentData']}
          username={username}
          playersReady={playersReadyData}
          gameDuration={settings.timerValue * 60}
          onStartNewGame={() => {
            state.setFinalScores(null);
            actions.handleStartNewGame();
          }}
          onNextRound={() => {
            state.setFinalScores(null);
            actions.handleNextRound();
          }}
          onShowQR={() => state.setShowQR(true)}
          onClose={() => state.setFinalScores(null)}
          t={t}
          socket={socket}
          gameCode={gameCode}
          language={state.roomLanguage}
          isTeacher={!!lessonData}
          allWords={((tournament.finalScores?.players ?? []) as unknown as PlayerResult[]).flatMap((p) =>
            (p.allWords ?? []).map(w => ({ word: w.word, score: w.score ?? 0, foundBy: [p.username] }))
          )}
          gameMode={currentGameMode}
        />
      )}

      {/* Standard Results Modal - for when host IS playing */}
      <FinalScoresModal
        open={!!tournament.finalScores && settings.hostPlaying}
        onOpenChange={(open) => {
          if (!open) state.setFinalScores(null);
        }}
        finalScores={(tournament.finalScores?.players ?? []) as unknown as PlayerResult[]}
        tournamentData={tournament.tournamentData as Parameters<typeof FinalScoresModal>[0]['tournamentData']}
        username={username}
        t={t}
        onStartNewGame={actions.handleStartNewGame}
        onNextRound={actions.handleNextRound}
        socket={socket}
        playersReady={playersReadyData}
        wordHuntSummary={tournament.finalScores?.wordHuntSummary}
      />

      <QRCodeDialog
        open={ui.showQR}
        onOpenChange={state.setShowQR}
        gameCode={gameCode}
        t={t}
      />

      <CancelTournamentDialog
        open={ui.showCancelTournamentDialog}
        onOpenChange={state.setShowCancelTournamentDialog}
        onConfirm={actions.handleCancelTournament}
        t={t}
      />

      <ExitConfirmDialog
        open={ui.showExitConfirm}
        onOpenChange={state.setShowExitConfirm}
        onConfirm={actions.confirmExitRoom}
        t={t}
      />

      <SoloStartConfirmDialog
        open={ui.showSoloConfirm}
        onOpenChange={state.setShowSoloConfirm}
        onConfirm={actions.confirmSoloStart}
        t={t}
        gameCode={gameCode}
      />



      {/* Pre-Game View — phone lobby (host playing) */}
      {!runtime.gameStarted && !runtime.waitingForResults && !runtime.showStartAnimation && !hasActiveGameData && settings.hostPlaying && (
        <HostPreGameView
          gameCode={gameCode}
          roomLanguage={state.roomLanguage}
          language={language as Language}
          username={username}
          t={t}
          timerValue={settings.timerValue}
          setTimerValue={state.setTimerValue}
          timerDirection={settings.timerDirection}
          setTimerDirection={state.setTimerDirection}
          difficulty={settings.difficulty}
          setDifficulty={state.setDifficulty}
          minWordLength={settings.minWordLength}
          setMinWordLength={state.setMinWordLength}
          gameType={settings.gameType}
          setGameType={state.setGameType}
          tournamentRounds={settings.tournamentRounds}
          setTournamentRounds={state.setTournamentRounds}
          tournamentData={tournament.tournamentData}
          hostPlaying={settings.hostPlaying}
          setHostPlaying={state.setHostPlaying}
          playersReady={players.playersReady as any}
          readyUsernames={playersReadyData?.readyUsernames ?? []}
          readyTotal={playersReadyData?.totalPlayers ?? 0}
          autoStartSecondsLeft={lobbyAutoStart.secondsLeft}
          onCancelAutoStart={lobbyAutoStart.cancel}
          playerWordCounts={players.playerWordCounts}
          shufflingGrid={animation.shufflingGrid}
          highlightedCells={animation.highlightedCells}
          tableData={runtime.tableData}
          onStartGame={actions.startGame}
          onAutoStartWithBots={actions.confirmSoloStart}
          onExitRoom={actions.handleExitRoom}
          onCancelTournament={actions.handleCancelTournamentDialog}
          onRegenerateBoard={actions.regenerateBoard}
          tournamentCreating={tournament.tournamentCreating}
          lessonData={lessonData}
          onNameChange={handleHostNameChange}
          onAvatarChange={handleHostAvatarChange}
          isPrivate={isPrivate}
          isQuickPlay={isQuickPlay}
        />
      )}

      {/* Pre-Game View — TV lobby (host NOT playing / spectator mode) */}
      {!runtime.gameStarted && !runtime.waitingForResults && !runtime.showStartAnimation && !hasActiveGameData && !settings.hostPlaying && (
        <TvLobbyView
          gameCode={gameCode}
          roomLanguage={state.roomLanguage}
          username={username}
          t={t}
          playersReady={players.playersReady as any}
          timerValue={settings.timerValue}
          difficulty={settings.difficulty}
          onStartGame={actions.startGame}
          onExitRoom={actions.handleExitRoom}
          tournamentCreating={tournament.tournamentCreating}
          setHostPlaying={state.setHostPlaying}
          onStartSoloDemoWithBots={actions.startSoloDemoWithBots}
        />
      )}

      {/* In-Game View - Host Playing */}
      {((runtime.gameStarted || hasActiveGameData) && !runtime.waitingForResults && settings.hostPlaying && runtime.tableData) && (
        <HostInGameView
          gameCode={gameCode}
          username={username}
          roomLanguage={state.roomLanguage}
          t={t}
          tableData={runtime.tableData}
          remainingTime={runtime.remainingTime}
          timerValue={settings.timerValue}
          minWordLength={settings.minWordLength}
          comboLevel={combo.level}
          comboLevelRef={state.comboRefs.levelRef}
          hostPlaying={settings.hostPlaying}
          showStartAnimation={runtime.showStartAnimation}
          hostFoundWords={hostPlayingState.hostFoundWords}
          onWordSubmit={actions.handleHostWordSubmit}
          playersReady={players.playersReady as any}
          playerScores={players.playerScores}
          playerWordCounts={players.playerWordCounts}
          onStopGame={actions.stopGame}
          socket={socket}
          earthquakeState={earthquakeState}
          fireRoundActive={fireRoundActive}
          fireRoundRemaining={fireRoundRemaining}
          boardTheme={state.boardTheme}
          totalTime={settings.timerValue * 60}
        />
      )}

      {/* TV Broadcast View - Host NOT Playing (Spectator Mode) */}
      {((runtime.gameStarted || hasActiveGameData) && !runtime.waitingForResults && !settings.hostPlaying && runtime.tableData) && (
        <TvBroadcastView
          gameCode={gameCode}
          username={username}
          roomLanguage={state.roomLanguage}
          t={t}
          tableData={runtime.tableData}
          remainingTime={runtime.remainingTime}
          timerValue={settings.timerValue}
          playersReady={players.playersReady as any}
          playerScores={players.playerScores}
          playerWordCounts={players.playerWordCounts}
          socket={socket}
          earthquakeState={earthquakeState}
          fireRoundActive={fireRoundActive}
          fireRoundRemaining={fireRoundRemaining}
        />
      )}
    </div>
  );
});

HostView.displayName = 'HostView';

export default HostView;
