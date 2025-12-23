'use client';

import React, { useEffect, useState, memo } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
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

// Extracted components
import HostPreGameView from './components/HostPreGameView';
import HostInGameView from './components/HostInGameView';
import PlayerWaitingResultsView from '../player/components/PlayerWaitingResultsView';
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

// ==========================================
// Props
// ==========================================

interface HostViewProps {
  gameCode: string;
  roomLanguage?: Language;
  initialPlayers?: Player[];
  username: string;
  onShowResults: (data: unknown) => void;
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
}) => {
  const { t, language, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

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

  // Socket event handling
  useHostSocketEvents({
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
    setWordsForBoard: state.setWordsForBoard,
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
    setRemainingTime: state.setRemainingTime,
    setGameStarted: state.setGameStarted,
    setShufflingGrid: state.setShufflingGrid,
    setHighlightedCells: state.setHighlightedCells,
    setPlayersReady: state.setPlayersReady,
    fadeToTrack,
    stopMusic,
    playCountdownBeep,
    TRACKS,
    hasTriggeredUrgentMusicRef: state.refs.hasTriggeredUrgentMusicRef,
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

  // Request words for board embedding
  useEffect(() => {
    if (!socket) return;
    if (state.roomLanguage === 'ja') return;

    const difficultyConfig = DIFFICULTIES[state.settings.difficulty];
    socket.emit('getWordsForBoard', {
      language: state.roomLanguage,
      boardSize: {
        rows: difficultyConfig.rows,
        cols: difficultyConfig.cols,
      },
    });
  }, [socket, state.settings.difficulty, state.roomLanguage]);

  // Destructure for cleaner JSX
  const { runtime, settings, players, tournament, animation, ui, hostPlaying: hostPlayingState, combo } = state;

  // Earthquake/Fire Round feature for multiplayer (only for triggering, state managed via socket events)
  useEarthquakeFireRound({
    enabled: runtime.gameStarted && !runtime.waitingForResults,
    gameDurationSeconds: state.settings.timerValue * 60,
    currentTimeSeconds: runtime.remainingTime || 0,
    language: state.roomLanguage,
    difficulty: state.settings.difficulty,
    mode: 'multiplayer',
    isHost: true,
    socket: socket,
    gameSessionId: gameCode,
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

  // Build leaderboard for waiting view
  const leaderboard = state.players.playersReady
    .map((player) => {
      const name = typeof player === 'string' ? player : player.username;
      return {
        username: name,
        score: state.players.playerScores[name] || 0,
        wordCount: state.players.playerWordCounts[name] || 0,
        avatar: typeof player === 'object' ? player.avatar : undefined,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Detect when we have active game data (covers countdown and transition to active game)
  const hasActiveGameData = runtime.tableData && runtime.remainingTime !== null && runtime.remainingTime > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">
      {/* GO Animation */}
      {runtime.showStartAnimation && (
        <GoRipplesAnimation onComplete={() => state.setShowStartAnimation(false)} />
      )}

      {/* Dialogs */}
      <FinalScoresModal
        open={!!tournament.finalScores}
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

      {/* Top Bar with Exit Button */}
      {!runtime.waitingForResults && (
        <div className="w-full max-w-6xl flex justify-end mb-4">
          <Button
            onClick={actions.handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <FaSignOutAlt className="mr-2" />
            {t('hostView.exitRoom')}
          </Button>
        </div>
      )}

      {/* Waiting for Results View */}
      {runtime.waitingForResults && (
        <PlayerWaitingResultsView
          username={username}
          gameCode={gameCode}
          t={t}
          dir={dir}
          leaderboard={leaderboard}
          foundWords={hostPlayingState.hostFoundWords}
          showExitConfirm={ui.showExitConfirm}
          setShowExitConfirm={state.setShowExitConfirm}
          onExitRoom={actions.handleExitRoom}
          onConfirmExit={actions.confirmExitRoom}
          isHost={true}
        />
      )}

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
          onShowQR={actions.handleShowQR}
          onExitRoom={actions.handleExitRoom}
          onCancelTournament={actions.handleCancelTournamentDialog}
          tournamentCreating={tournament.tournamentCreating}
        />
      )}

      {/* In-Game View */}
      {((runtime.gameStarted || hasActiveGameData) && !runtime.waitingForResults) && (
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
        />
      )}
    </div>
  );
});

HostView.displayName = 'HostView';

export default HostView;
