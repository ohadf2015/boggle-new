'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, Copy, LogOut } from 'lucide-react';
import RoomChat from '../../components/RoomChat';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode } from '@/hooks/gameState';

import { GAME_PRESETS, type PresetKey } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PresetInfoDrawer } from './pre-game/PresetInfoDrawer';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import { DJMascotWithEntrance } from '@/components/ui/DJMascot';
import {
  DesktopLobbyLayout,
  InviteCard,
} from './pre-game/desktop';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
import type { Language, LetterGrid, Avatar as AvatarType, PresenceStatus, DifficultyLevel } from '@/shared/types/game';
import type { GameModeOption } from '@/components/GameModeSelector';

// ==================== Types ====================

interface PlayerData {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
}

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: unknown[];
  isComplete?: boolean;
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

interface HostPreGameViewProps {
  gameCode: string;
  roomLanguage: Language;
  language: Language;
  username: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  timerDirection: number;
  setTimerDirection: React.Dispatch<React.SetStateAction<number>>;
  difficulty: DifficultyLevel;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  minWordLength: number;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  gameType: 'regular' | 'tournament';
  setGameType: React.Dispatch<React.SetStateAction<'regular' | 'tournament'>>;
  tournamentRounds: number;
  setTournamentRounds: React.Dispatch<React.SetStateAction<number>>;
  tournamentData: TournamentData | null;
  hostPlaying: boolean;
  setHostPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  playersReady: (string | PlayerData)[];
  playerWordCounts: Record<string, number>;
  shufflingGrid: LetterGrid | null;
  highlightedCells: { row: number; col: number }[];
  tableData: LetterGrid;
  onStartGame: () => void;
  onExitRoom: () => void;
  onCancelTournament: () => void;
  onRegenerateBoard?: () => void;
  tournamentCreating: boolean;
  lessonData?: LessonData | null;
}

// ==================== Component ====================

function HostPreGameView({
  gameCode,
  username,
  t,
  timerValue,
  setTimerValue,
  setTimerDirection,
  setDifficulty,
  setMinWordLength,
  hostPlaying,
  setHostPlaying,
  playersReady,
  onStartGame,
  onExitRoom,
  tournamentCreating,
  lessonData,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showTvTutorial, setShowTvTutorial] = useState(false);
  const storeGameMode = useGameMode();
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(storeGameMode || 'random');
  const { setGameMode: setStoreGameMode } = useGameActions();

  useEffect(() => {
    if (selectedGameMode !== 'random') {
      setStoreGameMode(selectedGameMode);
    } else {
      setStoreGameMode('random');
    }
  }, [selectedGameMode, setStoreGameMode]);

  // Apply default preset on mount
  useEffect(() => {
    if (!hasInitialized) {
      const preset = GAME_PRESETS['party'];
      setTimerValue(preset.timer);
      setDifficulty(preset.difficulty);
      setMinWordLength(2);
      setHasInitialized(true);
    }
  }, [hasInitialized, setTimerValue, setDifficulty, setMinWordLength]);

  // TV tutorial trigger on toggle
  const prevHostPlayingRef = useRef(hostPlaying);
  const [tvTutorialInitialized, setTvTutorialInitialized] = useState(false);

  useEffect(() => {
    if (!tvTutorialInitialized) {
      setTvTutorialInitialized(true);
      prevHostPlayingRef.current = hostPlaying;
      return;
    }

    const wasHostPlaying = prevHostPlayingRef.current;
    const isNowTvMode = !hostPlaying;

    if (wasHostPlaying && isNowTvMode && !isTvTutorialComplete()) {
      setShowTvTutorial(true);
    }

    prevHostPlayingRef.current = hostPlaying;
  }, [hostPlaying, tvTutorialInitialized]);

  // Preset info drawer for long-press info (still available)
  const [presetInfoOpen, setPresetInfoOpen] = useState<PresetKey | null>(null);

  // Filter out host when TV mode is enabled
  const filteredPlayersForDisplay = useMemo(() => {
    if (hostPlaying) return playersReady;
    return playersReady.filter(player => {
      const name = typeof player === 'string' ? player : player.username;
      const isHostPlayer = typeof player === 'object' ? player.isHost : false;
      return !isHostPlayer && name !== username;
    });
  }, [playersReady, hostPlaying, username]);

  // CrazyGames invite integration
  const maxPlayers = 8;
  const gameState: 'waiting' | 'playing' | 'ended' = 'waiting';

  const { showInviteButton, hideInviteButton, isInviteButtonVisible } = useCrazyGamesInvite({
    maxPlayers,
    currentPlayers: filteredPlayersForDisplay.length,
    gameState,
  });

  useEffect(() => {
    if (gameCode && gameState === 'waiting') {
      showInviteButton(gameCode);
    }
    return () => {
      if (isInviteButtonVisible) hideInviteButton();
    };
  }, [gameCode, gameState, showInviteButton, hideInviteButton, isInviteButtonVisible]);

  // Actual player count for start logic
  const actualPlayerCount = hostPlaying
    ? playersReady.length
    : playersReady.filter(p => {
        const isHostPlayer = typeof p === 'object' ? p.isHost : false;
        const name = typeof p === 'string' ? p : p.username;
        return !isHostPlayer && name !== username;
      }).length;
  const isStartDisabled = !timerValue || actualPlayerCount === 0 || tournamentCreating;

  // Auto-fill bots countdown
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const aloneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (actualPlayerCount === 0) {
      aloneTimerRef.current = setTimeout(() => {
        setBotCountdown(10);
      }, 30_000);
    } else {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setBotCountdown(null);
    }
    return () => {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    };
  }, [actualPlayerCount]);

  useEffect(() => {
    if (botCountdown === null) return;
    if (botCountdown <= 0) {
      socket?.emit('addBots', { gameCode, count: 2 });
      onStartGame();
      setBotCountdown(null);
      return;
    }
    countdownIntervalRef.current = setInterval(() => {
      setBotCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [botCountdown, socket, gameCode, onStartGame]);

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

  const hostLabel = `${t('hostView.hostIs')} ${username}`;

  // Staggered entrance animation
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    }),
  };

  // Bot countdown banner (shared between mobile and desktop)
  const renderBotCountdown = (): React.ReactElement | null => {
    if (botCountdown === null) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="bg-neo-orange/20 border border-neo-orange/50 rounded-xl px-4 py-3 flex items-center justify-between"
      >
        <span className="text-neo-orange font-bold text-sm">
          {t('hostView.noOneYet')} {t('hostView.startingWithBots')} {botCountdown}...
        </span>
        <button
          onClick={cancelBotCountdown}
          className="text-xs font-bold uppercase text-neo-orange border border-neo-orange/50 rounded-lg px-3 py-1 hover:bg-neo-orange/10 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto">
      {/* Lesson Mode Banner */}
      {lessonData && (
        <div className="flex-shrink-0 px-3 py-2 bg-neo-purple/20 border-b-2 border-neo-purple/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-neo-purple" />
            <span className="text-sm font-bold text-neo-purple">
              {t('hostView.lessonMode')}:
            </span>
            <span className="text-sm text-neo-cream">
              {lessonData.lessonName}
            </span>
            <span className="text-xs text-neo-cream/60">
              ({lessonData.vocabularyWords.length} {t('hostView.words')})
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DJMascotWithEntrance size="sm" delay={0.3} />
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">
                {t('roomCode.label')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-neo-display font-bold text-neo-cyan uppercase leading-none"
                  style={{ textShadow: '0 0 12px rgba(0, 255, 255, 0.6)' }}
                >
                  {gameCode}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(gameCode); }}
                  className="text-slate-400 hover:text-neo-white transition-colors p-1"
                  aria-label={t('roomCode.copy')}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-black/40 border-2 border-neo-black px-2 py-1 rounded-md flex items-center gap-1.5">
              <Users className="w-4 h-4 text-neo-cyan" />
              <span className="text-xs font-black text-neo-cream">
                {filteredPlayersForDisplay.length}/{maxPlayers}
              </span>
            </div>
            <button
              onClick={onExitRoom}
              className="w-9 h-9 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit')}
            >
              <LogOut className="w-4 h-4 text-neo-black" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-neo-navy/95 flex flex-col">
        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
                <StartButton onStartGame={onStartGame} disabled={isStartDisabled} tournamentCreating={tournamentCreating} playerCount={filteredPlayersForDisplay.length} t={t} />
                <PlayerRoster players={filteredPlayersForDisplay} username={username} gameCode={gameCode} maxPlayers={maxPlayers} hostLabel={hostLabel} t={t} />
                <BattleModeCard hostPlaying={hostPlaying} setHostPlaying={setHostPlaying} selectedGameMode={selectedGameMode} setSelectedGameMode={setSelectedGameMode} gameCode={gameCode} playersReady={playersReady} t={t} />
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} desktop />
                <div data-testid="desktop-chat-area" className="flex-1 min-h-0 bg-neo-navy-light/50 rounded-neo-lg border-3 border-neo-white/10 overflow-hidden">
                  <RoomChat username="Host" isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
            <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
            <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={0}>
              <StartButton onStartGame={onStartGame} disabled={isStartDisabled} tournamentCreating={tournamentCreating} playerCount={filteredPlayersForDisplay.length} maxPlayers={maxPlayers} t={t} />
            </motion.div>
            <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={1}>
              <PlayerRoster players={filteredPlayersForDisplay} username={username} gameCode={gameCode} maxPlayers={maxPlayers} hostLabel={hostLabel} t={t} />
            </motion.div>
            <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={2}>
              <BattleModeCard hostPlaying={hostPlaying} setHostPlaying={setHostPlaying} selectedGameMode={selectedGameMode} setSelectedGameMode={setSelectedGameMode} gameCode={gameCode} playersReady={playersReady} t={t} />
            </motion.div>
            <motion.div variants={sectionVariants} initial="hidden" animate="visible" custom={3}>
              <MobileShareSection gameCode={gameCode} t={t} />
            </motion.div>
            <motion.div className="pb-4" variants={sectionVariants} initial="hidden" animate="visible" custom={4}>
              <div className="bg-neo-navy-light/50 rounded-neo-lg border-2 border-neo-white/10 overflow-hidden h-64 sm:h-80">
                <RoomChat username="Host" isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <PresetInfoDrawer openPreset={presetInfoOpen} onClose={() => setPresetInfoOpen(null)} onSelectPreset={() => setPresetInfoOpen(null)} t={t} />
      <TvTutorialOverlay onComplete={() => setShowTvTutorial(false)} onSkip={() => setShowTvTutorial(false)} t={t} forceShow={showTvTutorial} />
    </div>
  );
}

export default HostPreGameView;
