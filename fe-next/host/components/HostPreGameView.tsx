'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, LogOut, Pencil, Check, X, Monitor } from 'lucide-react';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';

import { GAME_PRESETS } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import { AdvancedSettingsModal } from './pre-game/AdvancedSettingsModal';
import { DesktopLobbyLayout, InviteCard } from './pre-game/desktop';
import { GameInstructions } from './pre-game/GameInstructions';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
import { ChatBubble } from './pre-game/ChatBubble';
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

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

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

  // TV mode toggle — neo-brutalist pill with hard shadow
  const tvModeToggle = (
    <button
      onClick={() => setHostPlaying(prev => !prev)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-neo-black transition-all text-[10px] font-bold uppercase tracking-wider shadow-hard-sm active:translate-y-0.5 active:shadow-none',
        !hostPlaying
          ? 'bg-neo-cyan/20 text-neo-cyan'
          : 'bg-white/5 text-neo-cream/50 hover:bg-white/10'
      )}
      aria-label={t('hostView.broadcastModeTitle')}
    >
      <Monitor className="w-3.5 h-3.5" />
      <span>{t('hostView.broadcastModeTitle')}</span>
      <span className={cn(
        'w-7 h-4 rounded-full border-2 border-neo-black relative transition-colors',
        !hostPlaying ? 'bg-neo-cyan' : 'bg-white/10'
      )}>
        <span className={cn(
          'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-neo-black transition-all duration-200',
          !hostPlaying ? 'inset-inline-end-0.5' : 'inset-inline-start-0.5'
        )} />
      </span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy lg:max-w-7xl lg:mx-auto w-full relative">
      {/* Dot-grid background texture */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      {/* Top gradient accent bar */}
      <div className="w-full h-1 bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-lime shrink-0 z-20" />
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

      {/* Header */}
      <header className="shrink-0 px-3 py-2 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Clickable host avatar */}
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

            {/* Host name + label */}
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

        {/* Desktop Layout — two-column grid */}
        <div className="hidden lg:flex lg:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
                <div className="animate-fade-in-up flex-1 min-h-0 flex flex-col rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard p-4">
                  <div className="flex justify-end mb-2">{tvModeToggle}</div>
                  <PlayerRoster
                    players={filteredPlayersForDisplay}
                    username={username}
                    gameCode={gameCode}
                    maxPlayers={maxPlayers}
                    hostLabel={t('hostView.wonderhostLeader')}
                    t={t}
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                  <BattleModeCard
                    selectedGameMode={selectedGameMode}
                    setSelectedGameMode={setSelectedGameMode}
                    t={t}
                    isAdmin={isAdmin}
                    hasBlastAccess={hasBlastAccess}
                  />
                </div>
              </>
            }
            rightContent={
              <div data-testid="desktop-chat-area">
                <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
                  <InviteCard gameCode={gameCode} t={t} />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '140ms' }}>
                  <GameInstructions selectedGameMode={selectedGameMode} t={t} />
                </div>
              </div>
            }
          />
          {/* Sticky bottom start button — desktop */}
          <div className="shrink-0 px-6 py-3 border-t-3 border-neo-black bg-neo-navy/95">
            <StartButton
              onStartGame={onStartGame}
              disabled={isStartDisabled}
              tournamentCreating={tournamentCreating}
              playerCount={filteredPlayersForDisplay.length}
              maxPlayers={maxPlayers}
              t={t}
            />
          </div>
        </div>

        {/* Mobile Layout — single scroll + sticky bottom start */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
            <div className="max-w-[600px] mx-auto px-5 py-4 gap-4 flex flex-col pb-4">
              <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
              <PlayerRoster
                players={filteredPlayersForDisplay}
                username={username}
                gameCode={gameCode}
                maxPlayers={maxPlayers}
                t={t}
                compact
              />
              <BattleModeCard
                selectedGameMode={selectedGameMode}
                setSelectedGameMode={setSelectedGameMode}
                t={t}
                isAdmin={isAdmin}
                hasBlastAccess={hasBlastAccess}
              />
              <GameInstructions selectedGameMode={selectedGameMode} t={t} />
              <InviteCard gameCode={gameCode} t={t} />
            </div>
          </div>
          {/* Sticky bottom start button — mobile */}
          <div className="shrink-0 px-5 py-3 border-t-3 border-neo-black bg-neo-navy/95" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
            <div className="max-w-[600px] mx-auto">
              <StartButton
                onStartGame={onStartGame}
                disabled={isStartDisabled}
                tournamentCreating={tournamentCreating}
                playerCount={filteredPlayersForDisplay.length}
                maxPlayers={maxPlayers}
                t={t}
              />
            </div>
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
      <ChatBubble gameCode={gameCode} username={username} isHost t={t} />
    </div>
  );
}

export default HostPreGameView;
