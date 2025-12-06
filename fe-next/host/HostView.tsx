'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { Button } from '../components/ui/button';
import { neoSuccessToast, neoErrorToast, neoInfoToast } from '../components/NeoToast';
import GoRipplesAnimation from '../components/GoRipplesAnimation';
import '../style/animation.scss';
import { generateRandomTable } from '../utils/utils';
import { useSocket } from '../utils/SocketContext';
import { clearSessionPreservingUsername } from '../utils/session';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useAchievementQueue } from '../components/achievements';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_MIN_WORD_LENGTH } from '../utils/consts';
import { usePresence } from '../hooks/usePresence';
import logger from '@/utils/logger';
import type { LetterGrid, Language, DifficultyLevel, Avatar, WordDetail, LeaderboardEntry } from '@/types';

// Extracted components
import HostPreGameView from './components/HostPreGameView';
import HostInGameView from './components/HostInGameView';
import PlayerWaitingResultsView from '../player/components/PlayerWaitingResultsView';
import {
  QRCodeDialog,
  FinalScoresModal,
  ExitConfirmDialog,
  CancelTournamentDialog
} from './components/HostDialogs';

// Custom hooks
import useHostSocketEvents from './hooks/useHostSocketEvents';

// ==========================================
// Type Definitions
// ==========================================

interface Player {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

interface TournamentData {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: 'created' | 'in-progress' | 'completed' | 'cancelled';
}

interface FinalScoresData {
  players: Array<{
    username: string;
    score: number;
    wordsFound: number;
    avatar?: Avatar;
  }>;
  gameCode: string;
}

interface XpGainedData {
  totalXp: number;
  breakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
}

interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  newTitles: string[];
}

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
  onShowResults
}) => {
  const { t, language, dir } = useLanguage();
  const { socket } = useSocket();
  const { fadeToTrack, stopMusic, TRACKS } = useMusic();
  const { playComboSound, playCountdownBeep } = useSoundEffects();
  const { queueAchievement } = useAchievementQueue();
  const intentionalExitRef = useRef<boolean>(false);

  // Enable presence tracking
  usePresence({ enabled: !!gameCode });

  // Game settings state
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const [minWordLength, setMinWordLength] = useState<number>(DEFAULT_MIN_WORD_LENGTH);
  const [tableData, setTableData] = useState<LetterGrid>(generateRandomTable());
  const [timerValue, setTimerValue] = useState<number>(1);
  const [timerDirection, setTimerDirection] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [roomLanguage] = useState<Language>((roomLanguageProp || language) as Language);

  // Player state
  const [playersReady, setPlayersReady] = useState<Player[]>(initialPlayers);
  const [playerWordCounts, setPlayerWordCounts] = useState<Record<string, number>>({});
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [playerAchievements, setPlayerAchievements] = useState<Record<string, string[]>>({});

  // Scores state
  const [finalScores, setFinalScores] = useState<FinalScoresData | null>(null);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showStartAnimation, setShowStartAnimation] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showCancelTournamentDialog, setShowCancelTournamentDialog] = useState<boolean>(false);
  const [waitingForResults, setWaitingForResults] = useState<boolean>(false);

  // Host playing state
  const [hostPlaying, setHostPlaying] = useState<boolean>(true);
  const [hostFoundWords, setHostFoundWords] = useState<string[]>([]);
  const [hostAchievements, setHostAchievements] = useState<string[]>([]);

  // Tournament state
  const [gameType, setGameType] = useState<'regular' | 'tournament'>('regular');
  const [tournamentRounds, setTournamentRounds] = useState<number>(3);
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [tournamentCreating, setTournamentCreating] = useState<boolean>(false);
  const tournamentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation state
  const [shufflingGrid, setShufflingGrid] = useState<LetterGrid | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<Array<{ row: number; col: number }>>([]);

  // Combo system state
  const [comboLevel, setComboLevel] = useState<number>(0);
  const [lastWordTime, setLastWordTime] = useState<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const comboLevelRef = useRef<number>(0);
  const lastWordTimeRef = useRef<number | null>(null);

  // Words for board embedding
  const [wordsForBoard, setWordsForBoard] = useState<string[]>([]);

  // XP and Level state
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // Urgent music ref
  const hasTriggeredUrgentMusicRef = useRef<boolean>(false);

  // Use custom hook for socket events
  useHostSocketEvents({
    socket,
    t,
    hostPlaying,
    gameStarted,
    tableData,
    username,
    queueAchievement,
    playComboSound,
    onShowResults,
    setPlayersReady,
    setPlayerWordCounts,
    setPlayerScores,
    setPlayerAchievements,
    setFinalScores,
    setRemainingTime,
    setGameStarted,
    setShowStartAnimation,
    setTableData,
    setHostFoundWords,
    setHostAchievements,
    setTournamentData,
    setTournamentCreating,
    setWordsForBoard,
    setXpGainedData,
    setLevelUpData,
    setWaitingForResults,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
    tournamentTimeoutRef,
    tournamentData,
    intentionalExitRef,
  });

  // Music effects
  useEffect(() => {
    if (gameStarted) {
      fadeToTrack(TRACKS.IN_GAME, 800, 800);
      hasTriggeredUrgentMusicRef.current = false;
    }
  }, [gameStarted, fadeToTrack, TRACKS]);

  useEffect(() => {
    if (gameStarted && remainingTime !== null && remainingTime <= 20 && remainingTime > 0 && !hasTriggeredUrgentMusicRef.current) {
      hasTriggeredUrgentMusicRef.current = true;
      fadeToTrack(TRACKS.ALMOST_OUT_OF_TIME, 500, 500);
    }
    if (remainingTime === 0) {
      stopMusic(1500);
    }
  }, [remainingTime, gameStarted, fadeToTrack, stopMusic, TRACKS]);

  useEffect(() => {
    if (gameStarted && remainingTime !== null && remainingTime <= 3 && remainingTime > 0) {
      playCountdownBeep(remainingTime);
    }
  }, [remainingTime, gameStarted, playCountdownBeep]);

  // Client-side countdown timer
  useEffect(() => {
    if (!gameStarted || remainingTime === null || remainingTime <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(intervalId);
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameStarted, remainingTime === null, remainingTime <= 0]);

  // Update players list from props
  useEffect(() => {
    setPlayersReady(initialPlayers);
  }, [initialPlayers]);

  // Activate game when countdown animation completes
  useEffect(() => {
    if (!showStartAnimation && tableData && remainingTime && remainingTime > 0 && !gameStarted && !waitingForResults) {
      logger.log('[HOST] Countdown animation complete, activating game');
      setGameStarted(true);
    }
  }, [showStartAnimation, tableData, remainingTime, gameStarted, waitingForResults]);

  // Request words for board embedding
  useEffect(() => {
    if (!socket) return;
    if (roomLanguage === 'ja') return;

    const difficultyConfig = DIFFICULTIES[difficulty];
    socket.emit('getWordsForBoard', {
      language: roomLanguage,
      boardSize: {
        rows: difficultyConfig.rows,
        cols: difficultyConfig.cols
      }
    });
  }, [socket, difficulty, roomLanguage]);

  // Pre-game shuffling animation
  useEffect(() => {
    if (gameStarted) {
      setShufflingGrid(null);
      setHighlightedCells([]);
      return;
    }

    const currentLang = roomLanguage || language;
    const rows = DIFFICULTIES[difficulty].rows;
    const cols = DIFFICULTIES[difficulty].cols;

    const interval = setInterval(() => {
      const randomGrid = generateRandomTable(rows, cols, currentLang as Language);
      setShufflingGrid(randomGrid);
      setHighlightedCells([]);

      if (socket) {
        socket.emit('broadcastShufflingGrid', {
          grid: randomGrid,
          highlightedCells: []
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [gameStarted, difficulty, roomLanguage, language, playersReady, socket]);

  // Prevent accidental page refresh
  useEffect(() => {
    const shouldWarn = playersReady.length > 0 || gameStarted;
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (intentionalExitRef.current) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [playersReady.length, gameStarted]);

  // Game actions
  const startGame = useCallback(() => {
    if (playersReady.length === 0) return;

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

    if (gameType === 'tournament' && tournamentData) {
      socket?.emit('startTournamentRound');
      return;
    }

    const difficultyConfig = DIFFICULTIES[difficulty];
    const embedWords = roomLanguage !== 'ja' ? wordsForBoard : [];
    const newTable = generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, roomLanguage, embedWords);
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
      minWordLength: minWordLength
    });

    neoSuccessToast(t('common.gameStarted'), {
      icon: '🎮',
      duration: 3000,
    });
  }, [playersReady, gameType, tournamentData, socket, t, timerValue, difficulty, roomLanguage, wordsForBoard, hostPlaying, minWordLength, tournamentRounds]);

  const stopGame = useCallback(() => {
    socket?.emit('endGame', { gameCode });
    setRemainingTime(null);
    setGameStarted(false);
    neoInfoToast(t('hostView.gameStopped'), { icon: '⏹️' });
  }, [socket, gameCode, t]);

  const handleExitRoom = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const confirmExitRoom = useCallback(() => {
    intentionalExitRef.current = true;
    clearSessionPreservingUsername(username);
    socket?.emit('closeRoom', { gameCode });
    setTimeout(() => {
      socket?.disconnect();
      window.location.reload();
    }, 100);
  }, [socket, gameCode, username]);

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
  }, [socket, tournamentData, t]);

  const handleHostWordSubmit = useCallback((formedWord: string) => {
    setHostFoundWords(prev => [...prev, formedWord]);
  }, []);

  const handleStartNewGame = useCallback(() => {
    socket?.emit('resetGame');
    setFinalScores(null);
    setGameStarted(false);
    setWaitingForResults(false);
    setRemainingTime(null);
    setTournamentData(null);
    setGameType('regular');
    setPlayerWordCounts({});
    setPlayerScores({});
    setHostFoundWords([]);
    setHostAchievements([]);
    setTimerValue(1);

    neoSuccessToast(`${t('common.newGameReady')}`, {
      icon: '🔄',
      duration: 2000,
    });
  }, [socket, t]);

  const handleNextRound = useCallback(() => {
    setFinalScores(null);
    socket?.emit('startTournamentRound');
  }, [socket]);

  const handleShowQR = useCallback(() => setShowQR(true), []);
  const handleCancelTournamentDialog = useCallback(() => setShowCancelTournamentDialog(true), []);

  // Build leaderboard for waiting view
  const leaderboard = playersReady
    .map(player => {
      const name = typeof player === 'string' ? player : player.username;
      return {
        username: name,
        score: playerScores[name] || 0,
        wordCount: playerWordCounts[name] || 0,
        avatar: typeof player === 'object' ? player.avatar : undefined,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 overflow-auto transition-colors duration-300">

      {/* GO Animation */}
      {showStartAnimation && (
        <GoRipplesAnimation onComplete={() => setShowStartAnimation(false)} />
      )}

      {/* Dialogs */}
      <FinalScoresModal
        open={!!finalScores}
        onOpenChange={() => setFinalScores(null)}
        finalScores={finalScores}
        tournamentData={tournamentData}
        username={username}
        t={t}
        onStartNewGame={handleStartNewGame}
        onNextRound={handleNextRound}
        socket={socket}
      />

      <QRCodeDialog
        open={showQR}
        onOpenChange={setShowQR}
        gameCode={gameCode}
        t={t}
      />

      <CancelTournamentDialog
        open={showCancelTournamentDialog}
        onOpenChange={setShowCancelTournamentDialog}
        onConfirm={handleCancelTournament}
        t={t}
      />

      <ExitConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        onConfirm={confirmExitRoom}
        t={t}
      />

      {/* Top Bar with Exit Button */}
      {!waitingForResults && (
        <div className="w-full max-w-6xl flex justify-end mb-4">
          <Button
            onClick={handleExitRoom}
            size="sm"
            className="shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600 border border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <FaSignOutAlt className="mr-2" />
            {t('hostView.exitRoom')}
          </Button>
        </div>
      )}

      {/* Waiting for Results View */}
      {waitingForResults && (
        <PlayerWaitingResultsView
          username={username}
          gameCode={gameCode}
          t={t}
          dir={dir}
          leaderboard={leaderboard}
          foundWords={hostFoundWords}
          showExitConfirm={showExitConfirm}
          setShowExitConfirm={setShowExitConfirm}
          onExitRoom={handleExitRoom}
          onConfirmExit={confirmExitRoom}
          isHost={true}
        />
      )}

      {/* Pre-Game View */}
      {!gameStarted && !waitingForResults && !showStartAnimation && (
        <HostPreGameView
          gameCode={gameCode}
          roomLanguage={roomLanguage}
          language={language as Language}
          username={username}
          t={t}
          timerValue={timerValue}
          setTimerValue={setTimerValue}
          timerDirection={timerDirection}
          setTimerDirection={setTimerDirection}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          minWordLength={minWordLength}
          setMinWordLength={setMinWordLength}
          gameType={gameType}
          setGameType={setGameType}
          tournamentRounds={tournamentRounds}
          setTournamentRounds={setTournamentRounds}
          tournamentData={tournamentData}
          hostPlaying={hostPlaying}
          setHostPlaying={setHostPlaying}
          playersReady={playersReady}
          playerWordCounts={playerWordCounts}
          shufflingGrid={shufflingGrid}
          highlightedCells={highlightedCells}
          tableData={tableData}
          onStartGame={startGame}
          onShowQR={handleShowQR}
          onExitRoom={handleExitRoom}
          onCancelTournament={handleCancelTournamentDialog}
          tournamentCreating={tournamentCreating}
        />
      )}

      {/* In-Game View */}
      {gameStarted && !waitingForResults && (
        <HostInGameView
          gameCode={gameCode}
          username={username}
          roomLanguage={roomLanguage}
          t={t}
          tableData={tableData}
          remainingTime={remainingTime}
          timerValue={timerValue}
          minWordLength={minWordLength}
          comboLevel={comboLevel}
          comboLevelRef={comboLevelRef}
          hostPlaying={hostPlaying}
          showStartAnimation={showStartAnimation}
          hostFoundWords={hostFoundWords}
          onWordSubmit={handleHostWordSubmit}
          playersReady={playersReady}
          playerScores={playerScores}
          playerWordCounts={playerWordCounts}
          onStopGame={stopGame}
          socket={socket}
        />
      )}
    </div>
  );
});

HostView.displayName = 'HostView';

export default HostView;
