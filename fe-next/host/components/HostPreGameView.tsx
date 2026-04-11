'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, LogOut, Pencil, Check, X, Monitor, Grid3X3, Zap, Crosshair, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import { hasConsentDecision } from '@/utils/cookieConsent';

import { GAME_PRESETS } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import { AdvancedSettingsModal } from './pre-game/AdvancedSettingsModal';
import { DesktopLobbyLayout, InviteCard } from './pre-game/desktop';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
import RoomChat from '../../components/RoomChat';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
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
  onNameChange?: (newName: string) => void;
  onAvatarChange?: (config: CustomAvatarConfig) => void;
}

// ==================== Component ====================

function HostPreGameView({
  gameCode,
  roomLanguage,
  username,
  t,
  timerValue,
  setTimerValue,
  setTimerDirection: _setTimerDirection,
  difficulty,
  setDifficulty,
  minWordLength,
  setMinWordLength,
  hostPlaying,
  setHostPlaying,
  playersReady,
  onStartGame,
  onExitRoom,
  tournamentCreating,
  lessonData,
  onNameChange,
  onAvatarChange,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  const { isAdmin, isAuthenticated, updateProfile, profile } = useAuth();
  const hasBlastAccess = !!profile?.blast_access;
  const { isOnCrazyGamesPlatform: _isOnCrazyGamesPlatform } = useCrazyGames();

  // Track whether cookie consent banner is visible (no decision yet)
  const [cookieConsentVisible, setCookieConsentVisible] = useState(false);
  useEffect(() => {
    setCookieConsentVisible(!hasConsentDecision());
  }, []);

  // Avatar & name editing state
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const currentAvatar = getOrCreateStoredCustomAvatar();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(username);

  const handleAvatarSave = useCallback(async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    await updateProfile({ avatar_config: config }).catch(() => {});
  }, [onAvatarChange, updateProfile]);

  const handleSaveName = useCallback(() => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== username) {
      onNameChange?.(trimmed);
    }
    setIsEditingName(false);
  }, [editNameValue, username, onNameChange]);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [showTvTutorial, setShowTvTutorial] = useState(false);
  const storeGameMode = useGameMode();
  const initialMode = (storeGameMode === 'blast' && !isAdmin && !hasBlastAccess) ? 'random' : (storeGameMode || 'random');
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(initialMode);
  const { setGameMode: setStoreGameMode } = useGameActions();

  useEffect(() => {
    setStoreGameMode(selectedGameMode || 'random');
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

  const handleRoomLanguageChange = useCallback((newLang: Language) => {
    socket?.emit('changeRoomLanguage', { gameCode, language: newLang });
  }, [socket, gameCode]);

  // ==================== Interactive Game Instructions ====================
  const [instructionStep, setInstructionStep] = useState(0);

  const GAME_INSTRUCTIONS: Record<string, { icon: React.ReactNode; barClass: string; iconBgClass: string; dotClass: string; steps: { titleKey: string; descKey: string }[] }> = {
    random: {
      icon: <Grid3X3 className="w-5 h-5" />,
      barClass: 'bg-neo-purple',
      iconBgClass: 'bg-neo-purple',
      dotClass: 'bg-neo-purple',
      steps: [
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
        { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
      ],
    },
    classic: {
      icon: <Grid3X3 className="w-5 h-5" />,
      barClass: 'bg-neo-cyan',
      iconBgClass: 'bg-neo-cyan',
      dotClass: 'bg-neo-cyan',
      steps: [
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
        { titleKey: 'howToPlay.steps.scoring.title', descKey: 'howToPlay.steps.scoring.description' },
      ],
    },
    blast: {
      icon: <Zap className="w-5 h-5" />,
      barClass: 'bg-neo-pink',
      iconBgClass: 'bg-neo-pink',
      dotClass: 'bg-neo-pink',
      steps: [
        { titleKey: 'gameModes.blast.name', descKey: 'gameModes.blast.description' },
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
      ],
    },
    'word-hunt': {
      icon: <Crosshair className="w-5 h-5" />,
      barClass: 'bg-neo-lime',
      iconBgClass: 'bg-neo-lime',
      dotClass: 'bg-neo-lime',
      steps: [
        { titleKey: 'gameModes.wordHunt.name', descKey: 'gameModes.wordHunt.description' },
        { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
        { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
      ],
    },
  };

  // Reset step when mode changes
  useEffect(() => {
    setInstructionStep(0);
  }, [selectedGameMode]);

  const renderGameInstructions = (): React.ReactElement | null => {
    const config = GAME_INSTRUCTIONS[selectedGameMode];
    if (!config) return null;
    const { icon, barClass, iconBgClass, dotClass, steps } = config;
    const step = steps[instructionStep] ?? steps[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
        className="rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard overflow-hidden"
      >
        <div className={cn('h-1', barClass)} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('w-8 h-8 rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm text-neo-black', iconBgClass)}>
              {icon}
            </div>
            <h3 className="text-sm font-black uppercase text-neo-cream flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-neo-yellow" />
              {t('help.howToPlay')}
            </h3>
          </div>

          {/* Interactive step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={instructionStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[48px] flex items-start gap-2 text-sm text-slate-300"
            >
              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
              <div>
                <p className="font-bold text-neo-cream text-xs uppercase mb-0.5">{t(step.titleKey)}</p>
                <p>{t(step.descKey)}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step navigation */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={() => setInstructionStep(s => Math.max(0, s - 1))}
              disabled={instructionStep === 0}
              className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
              aria-label={t('common.previous')}
            >
              <ChevronLeft className="w-4 h-4 text-neo-cream" />
            </button>
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setInstructionStep(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i === instructionStep ? dotClass : 'bg-neo-white/20'
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => setInstructionStep(s => Math.min(steps.length - 1, s + 1))}
              disabled={instructionStep === steps.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
              aria-label={t('common.next')}
            >
              <ChevronRight className="w-4 h-4 text-neo-cream" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

  const hostLabel = `${t('hostView.hostIs')} ${username}`;

  // Bot countdown banner
  const renderBotCountdown = (): React.ReactElement | null => {
    if (botCountdown === null) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="bg-neo-orange/20 border border-neo-orange/50 rounded-xl px-4 py-2 flex items-center justify-between"
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

  // TV mode toggle — full-width row, desktop only
  const tvModeToggle = (
    <div className="hidden lg:flex items-center justify-between px-3 py-2 rounded-neo border-2 border-neo-black/50 bg-slate-800/60">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-neo-cream/60" />
        <span className="text-xs font-bold uppercase tracking-widest text-neo-cream/60">
          {t('hostView.broadcastModeTitle')}
        </span>
      </div>
      <button
        onClick={() => setHostPlaying(prev => !prev)}
        className={cn(
          'relative w-11 h-6 rounded-full border-2 border-neo-black transition-colors',
          !hostPlaying ? 'bg-neo-lime' : 'bg-white/10'
        )}
        aria-label={t('hostView.broadcastModeTitle')}
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-neo-black"
          animate={{ x: !hostPlaying ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto w-full">
      {/* Lesson Mode Banner */}
      {lessonData && (
        <div className="shrink-0 px-3 py-2 bg-neo-purple/20 border-b-2 border-neo-purple/50">
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

      {/* Header — host identity with "WONDERHOST LEADER" label */}
      <header className="shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Clickable host avatar with prominent ring */}
            <button
              data-testid="host-edit-avatar-button"
              onClick={() => setIsAvatarBuilderOpen(true)}
              className="relative shrink-0 group"
            >
              <div className="w-11 h-11 rounded-full border-3 border-neo-black overflow-hidden shadow-hard ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy transition-transform group-hover:scale-105 group-active:scale-95">
                <Avatar
                  customAvatar={currentAvatar}
                  size="lg"
                  className="w-full h-full"
                />
              </div>
              <div className="absolute -bottom-0.5 -inset-e-0.5 w-5 h-5 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
                <Pencil className="w-2.5 h-2.5 text-neo-black" />
              </div>
            </button>

            {/* Host name + WONDERHOST LEADER label */}
            <div className="min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    data-testid="host-name-edit-input"
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    maxLength={20}
                    className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-2 py-1 text-sm font-black focus:outline-hidden focus:ring-2 focus:ring-neo-cyan w-full max-w-[150px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') { setIsEditingName(false); setEditNameValue(username); }
                    }}
                  />
                  <button
                    data-testid="host-name-save-button"
                    onClick={handleSaveName}
                    className="w-7 h-7 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-neo-black" />
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                    className="w-7 h-7 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-neo-cream" />
                  </button>
                </div>
              ) : (
                <button
                  data-testid="host-edit-name-button"
                  onClick={() => { setEditNameValue(username); setIsEditingName(true); }}
                  className="flex items-center gap-1.5 min-w-0 group"
                  {...(!isAuthenticated ? {} : { disabled: true })}
                >
                  <span className="text-base font-neo-display font-bold text-neo-cream leading-none truncate"
                    style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.15)' }}
                  >
                    {username}
                  </span>
                  {!isAuthenticated && (
                    <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              )}
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neo-lime/70 font-neo-display leading-none mt-0.5 block">
                {t('hostView.wonderhostLeader')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Player count badge */}
            <span className="hidden sm:flex px-2.5 py-1 rounded-neo border-2 border-neo-lime/30 bg-neo-lime/10 text-sm font-black text-neo-lime font-neo-display tracking-wider">
              {filteredPlayersForDisplay.length} / {maxPlayers}
            </span>
            <div className="lg:hidden">
              <MobileShareSection gameCode={gameCode} t={t} showHint={actualPlayerCount === 0} compact />
            </div>
            <AdvancedSettingsModal
              timerValue={timerValue}
              setTimerValue={setTimerValue}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              minWordLength={minWordLength}
              setMinWordLength={setMinWordLength}
              roomLanguage={roomLanguage}
              onRoomLanguageChange={handleRoomLanguageChange}
              t={t}
            />
            <button
              onClick={onExitRoom}
              className="w-8 h-8 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit')}
            >
              <LogOut className="w-3.5 h-3.5 text-neo-black rtl:scale-x-[-1]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <h1 className="sr-only">{t('hostView.lobbyTitle')}</h1>

        {/* Desktop Layout — two-column grid (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
                <StartButton
                  onStartGame={onStartGame}
                  disabled={isStartDisabled}
                  tournamentCreating={tournamentCreating}
                  playerCount={filteredPlayersForDisplay.length}
                  maxPlayers={maxPlayers}
                  t={t}
                />
                <div className="flex-1 min-h-0 flex flex-col items-center rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard p-4">
                  <PlayerRoster
                    players={filteredPlayersForDisplay}
                    username={username}
                    gameCode={gameCode}
                    maxPlayers={maxPlayers}
                    hostLabel={hostLabel}
                    t={t}
                  />
                </div>
                {tvModeToggle}
                <BattleModeCard
                  selectedGameMode={selectedGameMode}
                  setSelectedGameMode={setSelectedGameMode}
                  t={t}
                  isAdmin={isAdmin}
                  hasBlastAccess={hasBlastAccess}
                />
                {renderGameInstructions()}
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} />
                <div data-testid="desktop-chat-area" className="flex-1 min-h-0 rounded-neo-lg border-3 border-neo-black bg-slate-800/60 shadow-hard overflow-hidden">
                  <RoomChat gameCode={gameCode} username={username} isHost />
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout — single scroll (hidden on desktop) */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 gap-3 flex flex-col">
            <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
            <div className="flex-1 min-h-0 flex flex-col items-center">
              <PlayerRoster
                players={filteredPlayersForDisplay}
                username={username}
                gameCode={gameCode}
                maxPlayers={maxPlayers}
                hostLabel={hostLabel}
                t={t}
              />
            </div>
            {tvModeToggle}
            <BattleModeCard
              selectedGameMode={selectedGameMode}
              setSelectedGameMode={setSelectedGameMode}
              t={t}
              isAdmin={isAdmin}
              hasBlastAccess={hasBlastAccess}
            />
            {renderGameInstructions()}
            <InviteCard gameCode={gameCode} t={t} />
          </div>
          {/* Sticky Start Button — sits above cookie consent banner when visible */}
          <div className={cn('shrink-0 px-3 py-2 bg-neo-navy border-t-2 border-neo-black', cookieConsentVisible ? 'sm:mb-[140px]' : '')} style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <StartButton
              onStartGame={onStartGame}
              disabled={isStartDisabled}
              tournamentCreating={tournamentCreating}
              playerCount={filteredPlayersForDisplay.length}
              maxPlayers={maxPlayers}
              t={t}
              compact
            />
          </div>
        </div>
      </main>

      <TvTutorialOverlay onComplete={() => setShowTvTutorial(false)} onSkip={() => setShowTvTutorial(false)} t={t} forceShow={showTvTutorial} />
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={currentAvatar}
        premium={avatarPremium}
      />
    </div>
  );
}

export default HostPreGameView;
