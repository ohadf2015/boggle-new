'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, LogOut, Pencil, Check, X } from 'lucide-react';
import RoomChat from '../../components/RoomChat';
import { LobbyTutorialPanel } from '../../components/lobby/LobbyTutorialPanel';
import { LanguageSelector } from '../../components/join/LanguageSelector';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';

import { GAME_PRESETS, type PresetKey } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { PresetInfoDrawer } from './pre-game/PresetInfoDrawer';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import {
  DesktopLobbyLayout,
  InviteCard,
} from './pre-game/desktop';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { getOrCreateStoredCustomAvatar, setStoredCustomAvatar } from '@/utils/profileStorage';
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
  onNameChange,
  onAvatarChange,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  const { isAdmin, isAuthenticated, updateProfile } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

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
  // If stored mode is blast but user isn't admin, fall back to random
  const initialMode = (storeGameMode === 'blast' && !isAdmin) ? 'random' : (storeGameMode || 'random');
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(initialMode);
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

  // Handle host changing the room language
  const handleRoomLanguageChange = useCallback((newLang: import('@/shared/types/game').Language) => {
    socket?.emit('changeRoomLanguage', { gameCode, language: newLang });
  }, [socket, gameCode]);

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

  const hostLabel = `${t('hostView.hostIs')} ${username}`;

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

      {/* Header — compact with editable avatar & name */}
      <header className="flex-shrink-0 px-3 py-1.5 bg-neo-navy/95 border-b-2 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Clickable avatar */}
            <button
              data-testid="host-edit-avatar-button"
              onClick={() => setIsAvatarBuilderOpen(true)}
              className="relative flex-shrink-0 group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-neo-black overflow-hidden shadow-hard-sm ring-2 ring-neo-lime ring-offset-1 ring-offset-neo-navy transition-transform group-hover:scale-105 group-active:scale-95">
                <Avatar
                  customAvatar={currentAvatar}
                  size="lg"
                  className="w-full h-full"
                />
              </div>
              <div className="absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full bg-neo-cyan border-2 border-neo-black shadow-hard-sm flex items-center justify-center">
                <Pencil className="w-2.5 h-2.5 text-neo-black" />
              </div>
            </button>

            {/* Editable name */}
            {isEditingName ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  data-testid="host-name-edit-input"
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  maxLength={20}
                  className="bg-white/10 text-neo-cream border-2 border-neo-black rounded-neo px-2 py-1 text-sm font-black focus:outline-none focus:ring-2 focus:ring-neo-cyan w-full max-w-[150px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') { setIsEditingName(false); setEditNameValue(username); }
                  }}
                />
                <button
                  data-testid="host-name-save-button"
                  onClick={handleSaveName}
                  className="w-7 h-7 flex items-center justify-center bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-neo-black" />
                </button>
                <button
                  onClick={() => { setIsEditingName(false); setEditNameValue(username); }}
                  className="w-7 h-7 flex items-center justify-center bg-white/10 border-2 border-neo-black rounded-neo flex-shrink-0"
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
                  <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MobileShareSection gameCode={gameCode} t={t} showHint={actualPlayerCount === 0} compact />
            <button
              onClick={onExitRoom}
              className="w-8 h-8 flex items-center justify-center bg-neo-red border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-all rounded"
              aria-label={t('common.exit')}
            >
              <LogOut className="w-3.5 h-3.5 text-neo-black" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-neo-navy/95 flex flex-col">
        <h1 className="sr-only">{t('hostView.lobbyTitle')}</h1>
        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
                <StartButton onStartGame={onStartGame} disabled={isStartDisabled} tournamentCreating={tournamentCreating} playerCount={filteredPlayersForDisplay.length} t={t} />
                <PlayerRoster players={filteredPlayersForDisplay} username={username} gameCode={gameCode} maxPlayers={maxPlayers} hostLabel={hostLabel} t={t} />
                <BattleModeCard hostPlaying={hostPlaying} setHostPlaying={setHostPlaying} selectedGameMode={selectedGameMode} setSelectedGameMode={setSelectedGameMode} gameCode={gameCode} playersReady={playersReady} t={t} isAdmin={isAdmin}>
                  <div>
                    <label className="text-xs font-black uppercase text-neo-cream/70 mb-1.5 block">{t('hostView.gameLanguage')}</label>
                    <LanguageSelector selectedLanguage={roomLanguage} onLanguageChange={handleRoomLanguageChange} hideLabel />
                  </div>
                </BattleModeCard>
              </>
            }
            rightContent={
              <>
                <InviteCard gameCode={gameCode} t={t} desktop />
                <div data-testid="desktop-chat-area" className="flex-1 min-h-0 bg-neo-navy-light/50 rounded-neo-lg border-3 border-neo-white/10 overflow-hidden">
                  {isOnCrazyGamesPlatform ? (
                    <LobbyTutorialPanel t={t} />
                  ) : (
                    <RoomChat username="Host" isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
                  )}
                </div>
              </>
            }
          />
        </div>

        {/* Mobile Layout — scrollable content + sticky CTA at bottom */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-3 py-2 space-y-2">
            <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
            <PlayerRoster players={filteredPlayersForDisplay} username={username} gameCode={gameCode} maxPlayers={maxPlayers} hostLabel={hostLabel} t={t} />
            <BattleModeCard hostPlaying={hostPlaying} setHostPlaying={setHostPlaying} selectedGameMode={selectedGameMode} setSelectedGameMode={setSelectedGameMode} gameCode={gameCode} playersReady={playersReady} t={t} isAdmin={isAdmin}>
              <div>
                <label className="text-xs font-black uppercase text-neo-cream/70 mb-1.5 block">{t('hostView.gameLanguage')}</label>
                <LanguageSelector selectedLanguage={roomLanguage} onLanguageChange={handleRoomLanguageChange} hideLabel />
              </div>
            </BattleModeCard>

            {/* Chat or Tutorial (CrazyGames) */}
            <div className="bg-neo-navy-light/50 rounded-neo-lg border-2 border-neo-white/10 overflow-hidden h-64">
              {isOnCrazyGamesPlatform ? (
                <LobbyTutorialPanel t={t} />
              ) : (
                <RoomChat username="Host" isHost={true} gameCode={gameCode} className="h-full" onNewMessage={() => {}} variant="embedded" />
              )}
            </div>
          </div>

          {/* Sticky CTA at bottom */}
          <div className="flex-shrink-0 px-3 py-2 bg-neo-navy border-t-2 border-neo-black" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}>
            <StartButton onStartGame={onStartGame} disabled={isStartDisabled} tournamentCreating={tournamentCreating} playerCount={filteredPlayersForDisplay.length} maxPlayers={maxPlayers} t={t} compact />
          </div>
        </div>
      </main>

      <PresetInfoDrawer openPreset={presetInfoOpen} onClose={() => setPresetInfoOpen(null)} onSelectPreset={() => setPresetInfoOpen(null)} t={t} />
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
