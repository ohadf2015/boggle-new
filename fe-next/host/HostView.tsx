'use client';

import React, { useEffect, useState, memo, useRef, useMemo } from 'react';
import { Button } from '../components/ui/button';
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
import { useGameMode } from '@/hooks/gameState/store';

// Extracted components
import HostPreGameView from './components/HostPreGameView';
import HostInGameView from './components/HostInGameView';
import TvBroadcastView from './components/TvBroadcastView';
import { TvResultsView } from './components/tv-results';
import {
  QRCodeDialog,
  FinalScoresModal,
  ExitConfirmDialog,
  CancelTournamentDialog,
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
import { useHideNavigation } from '../contexts/NavigationContext';

// ==========================================
// Props
// ==========================================

interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
}

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
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
}) => {
  const { t, language, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const setIsInGame = useHideNavigation();

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });
  const currentGameMode = useGameMode();

  // Consolidated state management
  const state = useHostViewState({
    initialPlayers,
    roomLanguage: roomLanguageProp,
    defaultLanguage: language as Language,
  });

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
    intentionalExitRef: state.refs.intentionalExitRef,
    tournamentTimeoutRef: state.refs.tournamentTimeoutRef,
  });

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
    socket.on('startGame', handleResetGame);

    return () => {
      socket.off('playersReadyUpdate', handlePlayersReadyUpdate);
      socket.off('resetGame', handleResetGame);
      socket.off('startGame', handleResetGame);
    };
  }, [socket]);

  // Handle pending game start (when host returns from results page)
  // The startGame event was captured at page level while HostView was unmounted
  // We need to initialize the game state with that data
  useEffect(() => {
    if (!pendingGameStart) return;

    // Initialize game state from pending data
    if (pendingGameStart.letterGrid) {
      state.setTableData(pendingGameStart.letterGrid);
    }
    if (pendingGameStart.timerSeconds !== undefined) {
      state.setRemainingTime(pendingGameStart.timerSeconds);
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

  // Navigation guard - prevent accidental navigation during active game
  // Enable for ALL hosts when game is running, whether playing or spectating
  // Hosts in spectator/broadcast mode still need confirmation before leaving
  useNavigationGuard({
    enabled: runtime.gameStarted,
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
      const { gameCode: requestedCode, username: requestedUsername, source } = event.detail;

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

  // Build leaderboard for waiting view — memoized to avoid re-sorting on every timer tick
  const leaderboard = useMemo(() => state.players.playersReady
    .map((player) => {
      const name = typeof player === 'string' ? player : player.username;
      return {
        username: name,
        score: state.players.playerScores[name] || 0,
        wordCount: state.players.playerWordCounts[name] || 0,
        avatar: typeof player === 'object' ? player.avatar : undefined,
        isHost: typeof player === 'object' ? (player as any).isHost : false,
      };
    })
    .filter(p => {
      // Filter out Host if they have 0 words (Broadcast Mode)
      if ((p.username === username || p.isHost) && p.wordCount === 0) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score),
  [state.players.playersReady, state.players.playerScores, state.players.playerWordCounts, username]);

  // Detect when we have active game data (covers countdown and transition to active game)
  const hasActiveGameData = runtime.tableData && runtime.remainingTime !== null && runtime.remainingTime > 0;

  // Hide bottom navigation during gameplay
  useEffect(() => {
    const isGameActive = runtime.showStartAnimation || ((runtime.gameStarted || hasActiveGameData) && !runtime.waitingForResults);
    setIsInGame(!!isGameActive);
    return () => setIsInGame(false);
  }, [runtime.showStartAnimation, runtime.gameStarted, hasActiveGameData, runtime.waitingForResults, setIsInGame]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy">
      {/* GO Animation */}
      {runtime.showStartAnimation && (
        <GoRipplesAnimation onComplete={() => state.setShowStartAnimation(false)} t={t} />
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



      {/* Pre-Game View */}
      {!runtime.gameStarted && !runtime.waitingForResults && !runtime.showStartAnimation && !hasActiveGameData && (
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
          playerWordCounts={players.playerWordCounts}
          shufflingGrid={animation.shufflingGrid}
          highlightedCells={animation.highlightedCells}
          tableData={runtime.tableData}
          onStartGame={actions.startGame}
          onExitRoom={actions.handleExitRoom}
          onCancelTournament={actions.handleCancelTournamentDialog}
          onRegenerateBoard={actions.regenerateBoard}
          tournamentCreating={tournament.tournamentCreating}
          lessonData={lessonData}
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
