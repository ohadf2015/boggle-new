'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BookOpen, LogOut, Monitor, Zap, Check } from 'lucide-react';
import { useCrazyGamesInvite } from '../../hooks/useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useSocket } from '../../utils/SocketContext';
import { useGameActions, useGameMode, useHostSelectedGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import { EmoteTray } from '@/player/components/lobby/EmoteTray';
import { useLobbyEmotes } from '@/hooks/useLobbyEmotes';
import { useLobbyAdGate } from '@/hooks/useLobbyAdGate';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';

import { GAME_PRESETS } from './pre-game/PresetSelector';
import { StartButton } from './pre-game/StartButton';
import { MobileShareSection } from './pre-game/MobileShareSection';
import { SoloPlayPrompt } from './pre-game/SoloPlayPrompt';
import { shouldShowSoloPlayPrompt } from '@/lib/multiplayer/soloHostPrompt';
import { trackSoloPlayPrompt } from '@/utils/posthogEngagement';
import { PlayerRoster } from './pre-game/PlayerRoster';
import { BattleModeCard } from './pre-game/BattleModeCard';
import { AdvancedSettingsModal } from './pre-game/AdvancedSettingsModal';
import { LobbyAudioButton } from './pre-game/LobbyAudioButton';
import { DesktopLobbyLayout, InviteCard } from './pre-game/desktop';
import { GameInstructions } from './pre-game/GameInstructions';
import TvTutorialOverlay, { isTvTutorialComplete } from './tv-broadcast/TvTutorialOverlay';
import { ChatBubble } from './pre-game/ChatBubble';
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
  /**
   * Game mode the teacher chose in ClassroomGameLobby. Seeds the host's mode
   * selector so the choice actually applies (see initialMode below). Optional
   * for back-compat with older sessionStorage payloads.
   */
  gameMode?: GameModeOption;
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
  /**
   * Start the game DIRECTLY with bot opponents, bypassing the solo-confirm
   * popup. Used by the automatic rescue paths (passive alone-timer + Quick
   * Play countdown) where there is no user click to gate the modal on — an
   * abandoned host would never dismiss a popup, stranding the lobby. Falls
   * back to `onStartGame` when not provided.
   */
  onAutoStartWithBots?: () => void;
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

// ==================== Constants ====================

/**
 * Auto-fill bots timer: when a quickplay host is alone in the lobby,
 * trigger bot fill after this many seconds instead of requiring a click.
 * Configurable so it can be tuned based on UX feedback.
 */
export const QUICKPLAY_AUTO_FILL_SECONDS = 5;

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
  onAutoStartWithBots,
  onExitRoom,
  tournamentCreating,
  lessonData,
  onNameChange,
  onAvatarChange,
  isPrivate = false,
  isQuickPlay = false,
}: HostPreGameViewProps): React.ReactElement {
  const { socket } = useSocket();
  // Disable Start while any player (host or guest) is mid rewarded-ad — starting
  // would tear a watcher out of their ad and void the reward they're earning.
  const { anyAdActive } = useLobbyAdGate({ socket });
  const { isAdmin, isAuthenticated, updateProfile } = useAuth();
  // Blast is enabled for all players — the prior blast_access/admin gate was
  // removed once MP blast reached parity (shared-board clear ends room, bots
  // play the live board, blast-specific results screen). Kept as a constant so
  // the existing child props keep working without a wider refactor.
  const hasBlastAccess = true;
  const { isOnCrazyGamesPlatform: _isOnCrazyGamesPlatform } = useCrazyGames();


  // Avatar & name editing state (UI lives in PlayerRoster, modal lives here)
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
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

  // Lobby emotes — the host changes their OWN avatar's emotion (face-swap) and
  // the server echoes it to the whole room. Replaces the old floating-emoji FAB:
  // the expression lives ON the avatar, the same affordance every player has.
  const { sendEmote, cooldownActive } = useLobbyEmotes({ socket });

  // Self-only lobby action rendered beneath the roster avatars: an emote picker
  // that changes your avatar's emotion (server-echoed to the room). The rewarded
  // daily-avatar-part claim moved OUT of the lobby and INTO the avatar builder —
  // in-context, opt-in, and no longer competing with the emote for attention.
  const selfRosterActions = (
    <div className="flex flex-col items-center gap-2 pt-1">
      <EmoteTray onEmote={sendEmote} t={t} disabled={cooldownActive} compact />
    </div>
  );

  const [hasInitialized, setHasInitialized] = useState(false);
  const [showTvTutorial, setShowTvTutorial] = useState(false);
  // Source of truth for the host's intent is `hostSelectedGameMode` (preserved across
  // rounds). `gameMode` holds the resolved mode during gameplay and isn't a reliable
  // signal of intent post-round (a "random" pick gets replaced with the rolled value).
  const hostSelectedGameMode = useHostSelectedGameMode();
  // Classroom games carry the teacher's chosen mode on `lessonData.gameMode`.
  // It is authoritative for the initial selection (the teacher already picked
  // in the lobby) and takes precedence over the store default. Without this the
  // selector seeds from `hostSelectedGameMode` (default 'random'), the startGame
  // emit then carries 'random', and the backend silently rolls a random mode —
  // dropping the teacher's choice. The host can still change it before starting.
  const intendedMode: GameModeOption = lessonData?.gameMode ?? hostSelectedGameMode ?? 'random';
  const initialMode = (intendedMode === 'blast' && !isAdmin && !hasBlastAccess)
    ? 'random'
    : (intendedMode || 'random');
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
      const preset = GAME_PRESETS['fast'];
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
  // A host alone in the lobby may still press Start: clicking opens the solo
  // confirm dialog (Invite Friends vs Play with bots — see handleStartClick).
  // Only a missing timer / tournament-in-flight blocks it — never "no players
  // yet", which trapped new hosts behind a 40s wait.
  const isStartDisabled = !timerValue || tournamentCreating || anyAdActive;

  // Auto-fill bots countdown
  const [botCountdown, setBotCountdown] = useState<number | null>(null);

  // Held in refs, not the countdown effect's dep array: the parent re-creates
  // these callbacks on every render, and depending on them would tear down and
  // re-register the interval each time — the countdown would never reach 0.
  const onAutoStartWithBotsRef = useRef(onAutoStartWithBots);
  const onStartGameRef = useRef(onStartGame);
  onAutoStartWithBotsRef.current = onAutoStartWithBots;
  onStartGameRef.current = onStartGame;
  const aloneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (humanGuestCount === 0) {
      if (isQuickPlay) {
        // Quick Play: skip alone-timer, kick off ~5s "filling bots…" countdown.
        // The timer fires without user interaction — abandoned hosts never click dialogs.
        setBotCountdown(QUICKPLAY_AUTO_FILL_SECONDS);
      } else if (!isPrivate) {
        // Passive fallback for a PUBLIC-room host who never presses Start. A short
        // 15s alone-timer first absorbs the "is anyone joining?" window, then a
        // visible 20s "starting with bots…" countdown gives the host ample time to
        // read it and still invite a friend before bots fill in (bumped from 10s,
        // which felt abrupt). A human joining cancels this (the else-branch below).
        // Private (invite / classroom) rooms are excluded — that host is waiting
        // on specific humans and can still press Start to fill bots on demand.
        aloneTimerRef.current = setTimeout(() => {
          setBotCountdown(20);
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

  // Passive rescue for a solo host (alone-timer + Quick Play countdown).
  //
  // For a PUBLIC room this only FILLS the lobby with bots and deliberately never
  // starts: that host chose to open a room and may still be waiting on a friend,
  // so starting stays their explicit action.
  //
  // QUICK PLAY is the deliberate exception. A Quick Play tap means "give me a
  // game now" — the player never asked to host anything and has no idea the
  // Start button is theirs to press. Filling their lobby with bots and then
  // waiting stranded 9 of the 29 quick-play sessions whose lobby actually
  // auto-filled with bots (31%) in a populated lobby where nothing happened.
  // 93% of solo-prompt sessions overall are players in their first 24 hours.
  // See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
  useEffect(() => {
    if (botCountdown === null) return;
    if (botCountdown <= 0) {
      // Track auto-fill when timer expires (quickplay or alone-timer fallback).
      // Keep mp_solo_prompt_shown as the base event, add auto_filled property.
      trackSoloPlayPrompt({ event: 'shown', auto_filled: true });
      // setAutoFill is the backend's bot-fill primitive; the prior 'addBots'
      // event had no server handler so silently dropped (bots never spawned).
      // It adds bots and broadcasts the roster — it does NOT start the game.
      socket?.emit('setAutoFill', { enabled: true, targetCount: 3 });
      setBotCountdown(null);
      if (isQuickPlay) {
        (onAutoStartWithBotsRef.current ?? onStartGameRef.current)();
      }
      return;
    }
    countdownIntervalRef.current = setInterval(() => {
      setBotCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [botCountdown, socket, gameCode, isQuickPlay]);

  const handleRoomLanguageChange = useCallback((newLang: Language) => {
    socket?.emit('changeRoomLanguage', { gameCode, language: newLang });
  }, [socket, gameCode]);

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

  // Host pressed Start. We do NOT silently fill bots here: if they're alone,
  // onStartGame (→ startGame → setShowSoloConfirm) hands the decision to the
  // host via the SoloStartConfirmDialog (Invite Friends vs Play with bots). On
  // confirm, the server fills bots for the solo player — so pressing Start can no
  // longer add bots behind the host's back.
  const handleStartClick = useCallback(() => {
    // Hard guard (beyond the disabled button): never start while a player is
    // mid rewarded-ad — protects against any non-button start path too.
    if (anyAdActive) return;
    onStartGame();
  }, [anyAdActive, onStartGame]);

  // Solo-host rescue prompt: shown vs hidden is a single derived condition so the
  // render and the "shown" telemetry agree. Gated on !isPrivate to match the alone-
  // timer exclusion (a classroom/invite host waits on specific humans, not bots).
  const showSoloPrompt = shouldShowSoloPlayPrompt({
    humanGuestCount,
    gameState,
    botCountdownActive: botCountdown !== null,
    isPrivate,
  });

  // Fire `shown` once per host session the moment the prompt first appears — the
  // head of the shown→clicked→game_started funnel that lets us read whether it works.
  const soloPromptShownRef = useRef(false);
  useEffect(() => {
    if (showSoloPrompt && !soloPromptShownRef.current) {
      soloPromptShownRef.current = true;
      trackSoloPlayPrompt({ event: 'shown' });
    }
  }, [showSoloPrompt]);

  // The "Play vs Bots" rescue card IS the host's explicit consent, so it starts
  // straight away via the bots path (onAutoStartWithBots → confirmSoloStart) —
  // no redundant confirm dialog. The server fills the bots on solo start, mirroring
  // the dialog's own "Skip & Play with bots" action (neither emits client setAutoFill).
  const handleSoloPlayVsBots = useCallback(() => {
    if (anyAdActive) return;
    trackSoloPlayPrompt({ event: 'clicked' });
    (onAutoStartWithBots ?? onStartGame)();
  }, [anyAdActive, onAutoStartWithBots, onStartGame]);

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
          {t('hostView.noOneYet')} {t('hostView.addingBots')} {botCountdown}...
        </span>
        <button
          type="button"
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
            type="button"
            onClick={onCancelAutoStart}
            className="text-xs font-bold uppercase text-neo-lime border-2 border-neo-lime/60 rounded-lg px-3 py-1 hover:bg-neo-lime/10 transition-colors shrink-0"
          >
            {t('common.cancel')}
          </button>
        )}
      </m.div>
    );
  };

  // Solo-host rescue: a host alone in the lobby is the dominant MP pre-game drop.
  // Show an immediate, explicit "play vs bots" CTA in place of the silent dead-air
  // window — stands down once a bot-fill countdown is already running (its banner
  // then owns the messaging) or a human guest arrives.
  const renderSoloPrompt = (): React.ReactElement | null => {
    if (!showSoloPrompt) return null;
    return <SoloPlayPrompt onPlayVsBots={handleSoloPlayVsBots} t={t} />;
  };

  // Guests are ready: nudge the host to start manually (auto-start removed, so
  // the host is always the one who begins). Fires from the first ready player
  // through all-ready (`<=`) — at all-ready the existing "{count}/{total} ready
  // — start the game!" copy IS the affirmative "everyone's in, press Start" cue
  // that the removed auto-start banner used to provide.
  const readyCount = readyUsernames.length;
  const allReady = readyTotal > 0 && readyCount >= readyTotal;
  // Always-visible ready tally (whenever there are guests who can ready up) so the
  // host sees at a glance how many are set — goes loud (lime + wobble) the moment
  // everyone's in. Replaces the old count-only-when-nonzero yellow nudge.
  const readyChip = readyTotal > 0 ? (
    <div
      data-testid="host-ready-chip"
      role="status"
      aria-live="polite"
      className={cn(
        'mx-auto w-fit flex items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black px-3 py-1 mb-1.5 font-neo-display font-bold text-sm uppercase tracking-wide shadow-hard-sm',
        allReady ? 'bg-neo-lime text-neo-black animate-neo-wobble' : 'bg-neo-navy-light text-neo-cream',
      )}
    >
      <Check className="w-4 h-4 stroke-[3] shrink-0" />
      <span>{readyCount}/{readyTotal} {t('hostView.playersReady')}</span>
    </div>
  ) : null;

  // TV mode toggle — neo-brutalist pill with hard shadow. The caption beneath
  // surfaces the view-only consequence AT the decision point, so a host knows
  // before flipping it that they won't be playing in this mode.
  const tvModeToggle = (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => setHostPlaying(prev => !prev)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-neo-black transition-all text-[10px] font-bold uppercase tracking-wider shadow-hard-sm active:translate-y-0.5 active:shadow-none',
          !hostPlaying
            ? 'bg-neo-cyan/20 text-neo-cyan'
            : 'bg-white/5 text-neo-cream/50 hover:bg-white/10'
        )}
        aria-label={`${t('hostView.broadcastModeTitle')} — ${t('hostView.broadcastModeDesc')}`}
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
      <span className={cn(
        'text-[9px] font-bold uppercase tracking-wider transition-colors',
        !hostPlaying ? 'text-neo-cyan' : 'text-neo-cream/40'
      )}>
        {t('hostView.broadcastModeDesc')}
      </span>
    </div>
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
            <LobbyAudioButton />
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
              type="button"
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
                <AnimatePresence>{renderSoloPrompt()}</AnimatePresence>
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
                    selfActions={selfRosterActions}
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                  <BattleModeCard
                    selectedGameMode={selectedGameMode}
                    setSelectedGameMode={setSelectedGameMode}
                    t={t}
                    isAdmin={isAdmin}
                    language={roomLanguage}
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
            {readyChip}
            {anyAdActive && (
              <p role="status" className="text-center text-neo-cyan font-neo-body text-xs mb-1.5">
                {t('hostView.adWatchHold')}
              </p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1">
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
              <AnimatePresence>{renderSoloPrompt()}</AnimatePresence>
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
                selfActions={selfRosterActions}
              />
              <BattleModeCard
                selectedGameMode={selectedGameMode}
                setSelectedGameMode={setSelectedGameMode}
                t={t}
                isAdmin={isAdmin}
                    language={roomLanguage}
                hasBlastAccess={hasBlastAccess}
              />
              <GameInstructions selectedGameMode={selectedGameMode} t={t} defaultOpen={false} lang={roomLanguage} />
              {!isPrivate && <InviteCard gameCode={gameCode} t={t} />}
            </div>
          </div>
          {/* Sticky bottom start button — mobile */}
          <div className="shrink-0 px-5 short:px-3 py-3 short:py-1.5 border-t-3 border-neo-black bg-neo-navy/95" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
            {readyChip}
            {anyAdActive && (
              <p role="status" className="max-w-[600px] mx-auto text-center text-neo-cyan font-neo-body text-xs mb-1.5">
                {t('hostView.adWatchHold')}
              </p>
            )}
            <div className="max-w-[600px] mx-auto flex flex-col short:flex-row short:items-stretch gap-2">
              <div className="short:flex-1 short:min-w-0">
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
    </div>
  );
}

export default HostPreGameView;
