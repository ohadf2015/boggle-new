'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BookOpen, LogOut, Monitor, Zap } from 'lucide-react';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode, useHostSelectedGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import { BoostButton } from '@/components/boosts/BoostButton';
import { BoostPicker } from '@/components/boosts/BoostPicker';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';

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
import { LobbyReactions } from '@/components/lobby/LobbyReactions';
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
  /** Usernames the server reports as lobby-ready (non-host). */
  readyUsernames?: string[];
  /** Total non-host humans the server is tracking for readiness. */
  readyTotal?: number;
  /** Server-owned lobby auto-start countdown (seconds), or null when idle. */
  autoStartSecondsLeft?: number | null;
  /** Cancel the lobby auto-start countdown. */
  onCancelAutoStart?: () => void;
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
  /** When true (Quick Play / classroom), hide invite + share affordances. */
  isPrivate?: boolean;
  /** Quick Play: skip 30s alone-timer, auto-fill bots + start immediately. */
  isQuickPlay?: boolean;
}

// ==================== Component ====================

function HostPreGameView({
  gameCode,
  roomLanguage,
  language,
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
  readyUsernames = [],
  readyTotal = 0,
  autoStartSecondsLeft = null,
  onCancelAutoStart,
  onStartGame,
  onExitRoom,
  tournamentCreating,
  lessonData,
  onNameChange,
  onAvatarChange,
  isPrivate = false,
  isQuickPlay = false,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  const { isAdmin, isAuthenticated, updateProfile } = useAuth();
  // Blast is enabled for all players — the prior blast_access/admin gate was
  // removed once MP blast reached parity (shared-board clear ends room, bots
  // play the live board, blast-specific results screen). Kept as a constant so
  // the existing child props keep working without a wider refactor.
  const hasBlastAccess = true;
  const { isOnCrazyGamesPlatform: _isOnCrazyGamesPlatform } = useCrazyGames();


  // Avatar & name editing state (UI lives in PlayerRoster, modal lives here)
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  // Lifted boost-picker state — single picker mounts at view root so picker UI
  // survives mobile↔desktop layout swaps on device rotation (see audit UX-CRIT-5).
  const [isBoostPickerOpen, setIsBoostPickerOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const [currentAvatar, setCurrentAvatar] = useState<CustomAvatarConfig>(() => getOrCreateStoredCustomAvatar());

  const handleAvatarSave = useCallback(async (config: CustomAvatarConfig) => {
    setStoredCustomAvatar(config);
    setCurrentAvatar(config);
    onAvatarChange?.(config);
    setIsAvatarBuilderOpen(false);
    await updateProfile({ avatar_config: config }).catch(() => {});
  }, [onAvatarChange, updateProfile]);

  const handleSelfNameChange = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== username) onNameChange?.(trimmed);
  }, [username, onNameChange]);

  const handleOpenAvatarBuilder = useCallback(() => setIsAvatarBuilderOpen(true), []);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [showTvTutorial, setShowTvTutorial] = useState(false);
  // Source of truth for the host's intent is `hostSelectedGameMode` (preserved across
  // rounds). `gameMode` holds the resolved mode during gameplay and isn't a reliable
  // signal of intent post-round (a "random" pick gets replaced with the rolled value).
  const hostSelectedGameMode = useHostSelectedGameMode();
  const initialMode = (hostSelectedGameMode === 'blast' && !isAdmin && !hasBlastAccess)
    ? 'random'
    : (hostSelectedGameMode || 'random');
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(initialMode);
  const { setGameMode: setStoreGameMode, setHostSelectedGameMode } = useGameActions();

  useEffect(() => {
    const mode = selectedGameMode || 'random';
    setStoreGameMode(mode);
    setHostSelectedGameMode(mode);
  }, [selectedGameMode, setStoreGameMode, setHostSelectedGameMode]);

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
    // Private rooms (Quick Play / classroom) intentionally suppress the
    // CrazyGames invite chip — these flows aren't designed for friend invites.
    if (isPrivate) {
      if (isInviteButtonVisible) hideInviteButton();
      return;
    }
    if (gameCode && gameState === 'waiting') {
      showInviteButton(gameCode);
    }
    return () => {
      if (isInviteButtonVisible) hideInviteButton();
    };
  }, [gameCode, gameState, showInviteButton, hideInviteButton, isInviteButtonVisible, isPrivate]);

  // Human opponents in the room (excludes the host + self). This — NOT a raw
  // player count — drives bot-fill and the alone timer: a host is "alone" when
  // no human opponents are present, whether or not the host is also playing. A
  // host-inclusive count hid the mobile case where hostPlaying is forced true,
  // so a solo host counted as 1 and started an opponent-less game with no bots.
  const humanGuestCount = playersReady.filter(p => {
    const isHostPlayer = typeof p === 'object' ? p.isHost : false;
    const name = typeof p === 'string' ? p : p.username;
    return !isHostPlayer && name !== username;
  }).length;
  // A host alone in the lobby may still press Start: clicking fills bots + starts
  // immediately (see handleStartClick). Only a missing timer / tournament-in-flight
  // blocks it — never "no players yet", which trapped new hosts behind a 40s wait.
  const isStartDisabled = !timerValue || tournamentCreating;

  // Auto-fill bots countdown
  const [botCountdown, setBotCountdown] = useState<number | null>(null);
  const aloneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (humanGuestCount === 0) {
      if (isQuickPlay) {
        // Quick Play: skip alone-timer, kick off short "filling bots…" countdown.
        setBotCountdown(3);
      } else if (!isPrivate) {
        // Passive fallback for a PUBLIC-room host who never presses Start. Halved
        // from 30s → 15s to shrink the dead lobby wait that drove new-host
        // abandonment. A human joining cancels this (the else-branch below).
        // Private (invite / classroom) rooms are excluded — that host is waiting
        // on specific humans and can still press Start to fill bots on demand.
        aloneTimerRef.current = setTimeout(() => {
          setBotCountdown(10);
        }, 15_000);
      }
    } else {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setBotCountdown(null);
    }
    return () => {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    };
  }, [humanGuestCount, isQuickPlay, isPrivate]);

  useEffect(() => {
    if (botCountdown === null) return;
    if (botCountdown <= 0) {
      // setAutoFill is the backend's bot-fill primitive; the prior 'addBots'
      // event had no server handler so silently dropped (bots never spawned).
      socket?.emit('setAutoFill', { enabled: true, targetCount: 3 });
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

  // Host pressed Start. If they're alone (no human guests), fill bots first so the
  // game has opponents — mirrors the passive bot-countdown path (setAutoFill →
  // onStartGame) but on demand, so an impatient new host needn't wait out the timer.
  const handleStartClick = useCallback(() => {
    if (humanGuestCount === 0) {
      socket?.emit('setAutoFill', { enabled: true, targetCount: 3 });
    }
    onStartGame();
  }, [humanGuestCount, socket, onStartGame]);

  // Bot countdown banner
  const renderBotCountdown = (): React.ReactElement | null => {
    if (botCountdown === null) return null;
    return (
      <m.div
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
      </m.div>
    );
  };

  // Everyone's ready → loud server-synced auto-start banner with a Cancel escape.
  const renderAutoStartBanner = (): React.ReactElement | null => {
    if (autoStartSecondsLeft === null) return null;
    return (
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="bg-neo-lime/20 border-3 border-neo-lime rounded-neo-lg px-4 py-2.5 flex items-center justify-between shadow-hard"
        role="status"
        aria-live="polite"
      >
        <span className="text-neo-lime font-neo-display font-bold text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 shrink-0" />
          {t('hostView.allReadyAutoStart', { seconds: autoStartSecondsLeft })}
        </span>
        {onCancelAutoStart && (
          <button
            onClick={onCancelAutoStart}
            className="text-xs font-bold uppercase text-neo-lime border-2 border-neo-lime/60 rounded-lg px-3 py-1 hover:bg-neo-lime/10 transition-colors shrink-0"
          >
            {t('common.cancel')}
          </button>
        )}
      </m.div>
    );
  };

  // Some — but not all — guests are ready: nudge the host to start (no auto-fire).
  const readyCount = readyUsernames.length;
  const showWaitingNudge =
    autoStartSecondsLeft === null && readyCount > 0 && readyTotal > 0 && readyCount < readyTotal;

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
      <div className="w-full h-1 bg-linear-to-r from-neo-cyan via-neo-pink to-neo-lime shrink-0 z-20" />
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
      <header className="shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 short:py-0.5 bg-neo-navy/95 border-b-3 border-neo-black sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          {/* Game language chip — prominent so hosts see the board language before starting */}
          <div
            data-testid="lobby-language-chip"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-neo border-2 border-neo-lime/70 bg-neo-navy-light shadow-hard-sm"
            aria-label={t('joinView.selectLanguage')}
          >
            <span className="text-base leading-none" aria-hidden>
              {({ en: '🇺🇸', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸' } as Record<Language, string>)[roomLanguage]}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neo-lime short:max-sm:hidden">
              {t(`joinView.${
                ({ en: 'english', he: 'hebrew', sv: 'swedish', ja: 'japanese', es: 'spanish' } as Record<Language, string>)[roomLanguage]
              }`)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isPrivate && (
              <div className="min-[720px]:hidden">
                <MobileShareSection gameCode={gameCode} t={t} showHint={humanGuestCount === 0} compact />
              </div>
            )}
            {/* UI-language switcher — only show when UI language differs from room/board language.
                When they match (same flag on both chips), the chip is redundant clutter (visual audit 2026-05-14). */}
            {language !== roomLanguage && <QuickLanguageSwitcher compact />}
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

        {/* Desktop Layout — two-column grid. Triggers at 720px so tablet-portrait (744px) gets side-by-side instead of stacking with wasted width. */}
        <div className="hidden min-[720px]:flex min-[720px]:flex-col flex-1 min-h-0">
          <DesktopLobbyLayout
            leftContent={
              <>
                <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
                <AnimatePresence>{renderAutoStartBanner()}</AnimatePresence>
                <div className="animate-fade-in-up shrink-0 rounded-neo-lg border-3 border-neo-black bg-slate-800/80 shadow-hard px-4 pt-2.5 pb-3 overflow-visible">
                  <PlayerRoster
                    players={filteredPlayersForDisplay}
                    username={username}
                    gameCode={gameCode}
                    maxPlayers={maxPlayers}
                    hostLabel={t('hostView.wonderhostLeader')}
                    readyUsernames={readyUsernames}
                    t={t}
                    onSelfAvatarClick={handleOpenAvatarBuilder}
                    onSelfNameChange={handleSelfNameChange}
                    canEditSelfName={!isAuthenticated}
                    headerExtra={tvModeToggle}
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
                {!isPrivate && (
                  <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
                    <InviteCard gameCode={gameCode} t={t} />
                  </div>
                )}
                <div className="animate-fade-in-up" style={{ animationDelay: '140ms' }}>
                  <GameInstructions selectedGameMode={selectedGameMode} t={t} lang={roomLanguage} />
                </div>
              </div>
            }
          />
          {/* Sticky bottom start button — desktop */}
          <div className="shrink-0 px-6 py-3 short:py-1.5 desktop-short:lg:py-1 desktop-medium-short:lg:py-2 border-t-3 border-neo-black bg-neo-navy/95">
            {showWaitingNudge && (
              <p className="text-center text-neo-yellow font-neo-display font-bold text-xs uppercase tracking-wide mb-1.5 animate-neo-wobble">
                {t('hostView.playersWaitingNudge', { count: readyCount, total: readyTotal })}
              </p>
            )}
            <div className="flex items-center gap-3">
              <BoostButton mode="mp" sessionId={gameCode} open={isBoostPickerOpen} onOpenChange={setIsBoostPickerOpen} />
              <div className={cn('flex-1', showWaitingNudge && 'animate-pulse')}>
                <StartButton
                  onStartGame={handleStartClick}
                  disabled={isStartDisabled}
                  tournamentCreating={tournamentCreating}
                  playerCount={filteredPlayersForDisplay.length}
                  maxPlayers={maxPlayers}
                  t={t}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout — single scroll + sticky bottom start. Below 720px (phone portrait/landscape). */}
        <div className="min-[720px]:hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
            <div className="max-w-[600px] mx-auto px-4 py-3 gap-3 flex flex-col pb-3">
              <AnimatePresence>{renderBotCountdown()}</AnimatePresence>
              <AnimatePresence>{renderAutoStartBanner()}</AnimatePresence>
              <PlayerRoster
                players={filteredPlayersForDisplay}
                username={username}
                gameCode={gameCode}
                maxPlayers={maxPlayers}
                hostLabel={t('hostView.wonderhostLeader')}
                readyUsernames={readyUsernames}
                t={t}
                compact
                onSelfAvatarClick={handleOpenAvatarBuilder}
                onSelfNameChange={handleSelfNameChange}
                canEditSelfName={!isAuthenticated}
              />
              <BattleModeCard
                selectedGameMode={selectedGameMode}
                setSelectedGameMode={setSelectedGameMode}
                t={t}
                isAdmin={isAdmin}
                hasBlastAccess={hasBlastAccess}
              />
              <GameInstructions selectedGameMode={selectedGameMode} t={t} defaultOpen={false} lang={roomLanguage} />
              {!isPrivate && <InviteCard gameCode={gameCode} t={t} />}
            </div>
          </div>
          {/* Sticky bottom start button — mobile */}
          <div className="shrink-0 px-5 short:px-3 py-3 short:py-1.5 border-t-3 border-neo-black bg-neo-navy/95" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
            {showWaitingNudge && (
              <p className="max-w-[600px] mx-auto text-center text-neo-yellow font-neo-display font-bold text-xs uppercase tracking-wide mb-1.5 animate-neo-wobble">
                {t('hostView.playersWaitingNudge', { count: readyCount, total: readyTotal })}
              </p>
            )}
            <div className="max-w-[600px] mx-auto flex flex-col short:flex-row short:items-stretch gap-2">
              <div className="short:shrink-0 short:w-auto">
                <BoostButton mode="mp" sessionId={gameCode} open={isBoostPickerOpen} onOpenChange={setIsBoostPickerOpen} />
              </div>
              <div className={cn('short:flex-1 short:min-w-0', showWaitingNudge && 'animate-pulse')}>
                <StartButton
                  onStartGame={handleStartClick}
                  disabled={isStartDisabled}
                  tournamentCreating={tournamentCreating}
                  playerCount={filteredPlayersForDisplay.length}
                  maxPlayers={maxPlayers}
                  t={t}
                />
              </div>
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
      {/* The host is a present person on their own device (true cast-to-TV is the
          separate tv-broadcast/ components), so they can fling emoji whether they
          play or just run the scoreboard — same ambient delight as every player. */}
      <LobbyReactions username={username} />
      {/* Single boost picker mount — survives layout tree swaps. Lazy-mounted
          so the picker's hooks (useBoostStatus, useBoostClaim → AdMobProvider)
          don't run until needed; HostPreGameView root keeps the open flag so
          the picker reopens at the same state on viewport changes. */}
      {isBoostPickerOpen && (
        <BoostPicker
          open={isBoostPickerOpen}
          mode="mp"
          sessionId={gameCode}
          onClose={() => setIsBoostPickerOpen(false)}
        />
      )}
    </div>
  );
}

export default HostPreGameView;
