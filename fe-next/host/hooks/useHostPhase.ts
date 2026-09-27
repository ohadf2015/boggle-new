'use client';

/**
 * All state and effects behind HostView (the host's phase router): room state,
 * socket events, timers + watchdogs, actions, quick-play auto-start, board
 * words, ready-ups and lobby auto-start; the round lifecycle is in
 * useHostRoundLifecycle. Split out of HostView (FOUNDATION 2026-09-26); code
 * moved verbatim.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAchievementQueue } from '@/components/achievements';
import { DIFFICULTIES } from '@/utils/consts';
import { usePresence } from '@/hooks/usePresence';
import type { Language } from '@/types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { setStoredUsername, setStoredCustomAvatar } from '@/utils/profileStorage';
import { useGameMode, useGameModeConfirmed, useHostSelectedGameMode } from '@/hooks/gameState/store';
import logger from '@/utils/logger';

import { useIsVocabQuizRoom } from '@/components/education/vocabQuiz/useIsVocabQuizRoom';

// Custom hooks
import { useHostViewState, useHostSocketEvents, useHostGameActions, useHostEffects } from './index';
import { useLobbyAutoStart } from '@/hooks/useLobbyAutoStart';
import { useTimerZeroWatchdog } from '@/hooks/useTimerZeroWatchdog';
import { useTimerStallWatchdog } from '@/hooks/useTimerStallWatchdog';
import { useTeacherPaused } from '@/hooks/useTeacherPause';
import { addGameBreadcrumb } from '@/utils/sentry';
import { useHostRoundLifecycle } from './useHostRoundLifecycle';
import type { HostViewProps } from '../hostViewTypes';

export function useHostPhase({
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
  onExitToLobby,
  classroomGameMode,
}: HostViewProps) {
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

  // Two sources, either of which can be the only one present: the live-game
  // record (every client, but 404s until Redis has the room) and the teacher's
  // own sessionStorage copy (host only, available immediately). Same precedence
  // ClassroomModeBanner uses.
  const resolvedClassroomGameMode: ClassroomGameMode | undefined =
    (lessonData?.gameMode as ClassroomGameMode | undefined) ?? classroomGameMode;

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

  useHostRoundLifecycle({
    pendingGameStart, onGameStartConsumed, state, actions, fadeToTrack, TRACKS, username, gameCode,
    currentGameMode, gameModeConfirmed, hostSelectedGameMode, t, socket, gameSessionId,
  });

  // Destructure for cleaner JSX
  const { runtime, settings, players, tournament, animation, ui, hostPlaying: hostPlayingState, combo } = state;

  // Detect when we have active game data (covers countdown and transition to active game)
  const hasActiveGameData = runtime.tableData && runtime.remainingTime !== null && runtime.remainingTime > 0;
  const isVocabQuizRoom = useIsVocabQuizRoom(socket);

  return {
    t, language, socket, state, runtime, settings, players, tournament, animation, ui, hostPlayingState, combo,
    actions, lobbyAutoStart, playersReadyData, currentGameMode, earthquakeState, fireRoundActive,
    fireRoundRemaining, hasActiveGameData, resolvedClassroomGameMode, isVocabQuizRoom,
    handleHostNameChange, handleHostAvatarChange,
  };
}
