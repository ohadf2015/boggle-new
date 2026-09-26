'use client';

/**
 * useHostLobby — every behaviour of the host's pre-game lobby, with no markup.
 *
 * Moved verbatim out of HostPreGameView (889 lines → router + this hook) so the
 * screen can be rebuilt without touching the rescue timers that the
 * `HostPreGameView.*` guard tests pin:
 *   - Quick Play: 5s "filling bots…" countdown, then fill + start.
 *   - Public room alone: 15s alone-timer → 20s visible countdown → fill only,
 *     then a grace window before the auto-start.
 *   - Private/classroom: never force-fills.
 *   - Start: in-flight lock (rage-click), never while a player is mid-ad.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useGameActions, useHostSelectedGameMode } from '@/hooks/gameState';
import { useAuth } from '@/contexts/AuthContext';
import { useLobbyAdGate } from '@/hooks/useLobbyAdGate';
import { useCrazyGamesInvite } from '@/hooks/useCrazyGamesInvite';
import { GAME_PRESETS } from '@/host/components/pre-game/PresetSelector';
import { classroomHostPreset } from '@/lib/education/classroomHostPreset';
import {
  shouldShowSoloPlayPrompt,
  shouldAutoStartAfterBotFill,
  PUBLIC_ROOM_BOT_START_GRACE_SECONDS,
} from '@/lib/multiplayer/soloHostPrompt';
import { trackSoloPlayPrompt } from '@/utils/posthogEngagement';
import { isTvTutorialComplete } from '@/host/components/tv-broadcast/TvTutorialOverlay';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { Avatar as AvatarType, DifficultyLevel, Language, PresenceStatus } from '@/shared/types/game';

export interface HostLobbyPlayer {
  username: string;
  avatar?: AvatarType | null;
  isHost?: boolean;
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  isBot?: boolean;
}

export interface HostLobbyLessonData {
  lessonName: string;
  vocabularyWords: string[];
  gameMode?: GameModeOption;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

export interface UseHostLobbyArgs {
  gameCode: string;
  username: string;
  hostPlaying: boolean;
  playersReady: (string | HostLobbyPlayer)[];
  timerValue: number;
  setTimerValue: React.Dispatch<React.SetStateAction<number>>;
  setDifficulty: React.Dispatch<React.SetStateAction<DifficultyLevel>>;
  setMinWordLength: React.Dispatch<React.SetStateAction<number>>;
  tournamentCreating: boolean;
  lessonData?: HostLobbyLessonData | null;
  isPrivate: boolean;
  isQuickPlay: boolean;
  onStartGame: () => void;
  onAutoStartWithBots?: () => void;
}

/**
 * Auto-fill bots timer: when a quickplay host is alone in the lobby,
 * trigger bot fill after this many seconds instead of requiring a click.
 */
export const QUICKPLAY_AUTO_FILL_SECONDS = 5;
export const LOBBY_MAX_PLAYERS = 8;

const nameOf = (p: string | HostLobbyPlayer) => (typeof p === 'string' ? p : p.username);
const isHostRecord = (p: string | HostLobbyPlayer) => (typeof p === 'object' ? !!p.isHost : false);

export function useHostLobby({
  gameCode,
  username,
  hostPlaying,
  playersReady,
  timerValue,
  setTimerValue,
  setDifficulty,
  setMinWordLength,
  tournamentCreating,
  lessonData,
  isPrivate,
  isQuickPlay,
  onStartGame,
  onAutoStartWithBots,
}: UseHostLobbyArgs) {
  const { socket } = useSocket();
  // Disable Start while any player (host or guest) is mid rewarded-ad — starting
  // would tear a watcher out of their ad and void the reward they're earning.
  const { anyAdActive } = useLobbyAdGate({ socket });
  const { isAdmin } = useAuth();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [showTvTutorial, setShowTvTutorial] = useState(false);
  const [startGameInFlight, setStartGameInFlight] = useState(false);

  // Source of truth for the host's intent is `hostSelectedGameMode` (preserved
  // across rounds). A classroom teacher's `lessonData.gameMode` is authoritative
  // for the initial selection — without it the emit carries 'random' and the
  // backend silently rolls a random mode, dropping the teacher's choice.
  const hostSelectedGameMode = useHostSelectedGameMode();
  const initialMode: GameModeOption = lessonData?.gameMode ?? hostSelectedGameMode ?? 'random';
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(initialMode || 'random');
  const { setGameMode: setStoreGameMode, setHostSelectedGameMode } = useGameActions();

  useEffect(() => {
    const mode = selectedGameMode || 'random';
    setStoreGameMode(mode);
    setHostSelectedGameMode(mode);
  }, [selectedGameMode, setStoreGameMode, setHostSelectedGameMode]);

  // Default preset on mount. A classroom teacher already answered these in the
  // setup wizard, so the 'fast' preset must not overwrite them.
  useEffect(() => {
    if (hasInitialized) return;
    const classroomPreset = classroomHostPreset(lessonData?.templateSettings);
    if (classroomPreset) {
      setTimerValue(classroomPreset.timerMinutes);
      setDifficulty(classroomPreset.difficulty);
      setMinWordLength(classroomPreset.minWordLength);
    } else {
      const preset = GAME_PRESETS['fast'];
      setTimerValue(preset.timer);
      setDifficulty(preset.difficulty);
      setMinWordLength(2);
    }
    setHasInitialized(true);
  }, [hasInitialized, lessonData, setTimerValue, setDifficulty, setMinWordLength]);

  // TV tutorial: only when the host actively flips to TV mode (never on mount).
  const prevHostPlayingRef = useRef(hostPlaying);
  const [tvTutorialInitialized, setTvTutorialInitialized] = useState(false);
  useEffect(() => {
    if (!tvTutorialInitialized) {
      setTvTutorialInitialized(true);
      prevHostPlayingRef.current = hostPlaying;
      return;
    }
    if (prevHostPlayingRef.current && !hostPlaying && !isTvTutorialComplete()) {
      setShowTvTutorial(true);
    }
    prevHostPlayingRef.current = hostPlaying;
  }, [hostPlaying, tvTutorialInitialized]);

  // TV mode = the host is the screen, not a seat.
  const seatedPlayers = useMemo(() => {
    if (hostPlaying) return playersReady;
    return playersReady.filter((p) => !isHostRecord(p) && nameOf(p) !== username);
  }, [playersReady, hostPlaying, username]);

  // CrazyGames invite chip. Private rooms (Quick Play / classroom) suppress it.
  const gameState: 'waiting' | 'playing' | 'ended' = 'waiting';
  const { showInviteButton, hideInviteButton, isInviteButtonVisible } = useCrazyGamesInvite({
    maxPlayers: LOBBY_MAX_PLAYERS,
    currentPlayers: seatedPlayers.length,
    gameState,
  });
  useEffect(() => {
    if (isPrivate) {
      if (isInviteButtonVisible) hideInviteButton();
      return;
    }
    if (gameCode && gameState === 'waiting') showInviteButton(gameCode);
    return () => {
      if (isInviteButtonVisible) hideInviteButton();
    };
  }, [gameCode, gameState, showInviteButton, hideInviteButton, isInviteButtonVisible, isPrivate]);

  // Human opponents (excludes the host + self). This — NOT a raw player count —
  // drives bot-fill and the alone timer: a host-inclusive count hid the case
  // where hostPlaying is forced true, so a solo host counted as 1.
  const humanGuestCount = playersReady.filter((p) => !isHostRecord(p) && nameOf(p) !== username).length;

  // Alone is never a reason to block Start (the solo dialog handles it); only a
  // missing timer, a tournament in flight, an ad, or an in-flight emit.
  const isStartDisabled = !timerValue || tournamentCreating || anyAdActive || startGameInFlight;

  const [botCountdown, setBotCountdown] = useState<number | null>(null);

  // Refs, not deps: the parent re-creates these every render, and depending on
  // them would re-register the interval each time — it would never reach 0.
  const onAutoStartWithBotsRef = useRef(onAutoStartWithBots);
  const onStartGameRef = useRef(onStartGame);
  onAutoStartWithBotsRef.current = onAutoStartWithBots;
  onStartGameRef.current = onStartGame;
  const aloneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const postFillStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The post-fill auto-start fires 20s after it is scheduled — re-read the live
  // signals at FIRE time, not schedule time.
  const autoStartSignalsRef = useRef({ isQuickPlay, isPrivate, humanGuestCount, gameState });
  autoStartSignalsRef.current = { isQuickPlay, isPrivate, humanGuestCount, gameState };

  useEffect(() => {
    if (humanGuestCount === 0) {
      if (isQuickPlay) {
        // Quick Play: no alone-timer — abandoned hosts never click dialogs.
        setBotCountdown(QUICKPLAY_AUTO_FILL_SECONDS);
      } else if (!isPrivate) {
        // Public room: 15s alone window, then a visible 20s countdown the host
        // can read and still invite a friend before bots fill in.
        aloneTimerRef.current = setTimeout(() => {
          setBotCountdown(20);
        }, 15_000);
      }
    } else {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      // A real human turned up — cancel any pending bots-only auto-start.
      if (postFillStartRef.current) {
        clearTimeout(postFillStartRef.current);
        postFillStartRef.current = null;
      }
      setBotCountdown(null);
    }
    return () => {
      if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    };
  }, [humanGuestCount, isQuickPlay, isPrivate]);

  // Never leave a queued auto-start behind on unmount.
  useEffect(() => () => {
    if (postFillStartRef.current) clearTimeout(postFillStartRef.current);
  }, []);

  useEffect(() => {
    if (gameState !== 'waiting' && startGameInFlight) setStartGameInFlight(false);
  }, [gameState, startGameInFlight]);

  // Passive rescue. Public rooms only FILL (starting stays the host's call, then
  // a grace window); Quick Play fills AND starts — 31% of auto-filled quick-play
  // lobbies otherwise sat populated with nobody pressing Start.
  useEffect(() => {
    if (botCountdown === null) return;
    if (botCountdown <= 0) {
      trackSoloPlayPrompt({ event: 'shown', auto_filled: true });
      // setAutoFill is the backend's bot-fill primitive (the old 'addBots' had
      // no server handler). It adds bots and broadcasts the roster only.
      socket?.emit('setAutoFill', { enabled: true, targetCount: 3 });
      setBotCountdown(null);
      if (isQuickPlay) {
        (onAutoStartWithBotsRef.current ?? onStartGameRef.current)();
      } else if (shouldAutoStartAfterBotFill({ isQuickPlay, isPrivate, humanGuestCount, gameState })) {
        postFillStartRef.current = setTimeout(() => {
          postFillStartRef.current = null;
          if (!shouldAutoStartAfterBotFill(autoStartSignalsRef.current)) return;
          (onAutoStartWithBotsRef.current ?? onStartGameRef.current)();
        }, PUBLIC_ROOM_BOT_START_GRACE_SECONDS * 1000);
      }
      return;
    }
    countdownIntervalRef.current = setInterval(() => {
      setBotCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [botCountdown, socket, gameCode, isQuickPlay, isPrivate, humanGuestCount, gameState]);

  const handleRoomLanguageChange = useCallback((newLang: Language) => {
    socket?.emit('changeRoomLanguage', { gameCode, language: newLang });
  }, [socket, gameCode]);

  const cancelBotCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (aloneTimerRef.current) clearTimeout(aloneTimerRef.current);
    setBotCountdown(null);
  }, []);

  // Host pressed Start. Never silently fill bots here: alone → onStartGame opens
  // the solo confirm dialog, which hands the decision to the host.
  const handleStartClick = useCallback(() => {
    if (anyAdActive) return;
    // Visible in-flight state immediately (rage-click); 3s failsafe release.
    setStartGameInFlight(true);
    setTimeout(() => setStartGameInFlight(false), 3000);
    onStartGame();
  }, [anyAdActive, onStartGame]);

  // Solo-host rescue prompt: one derived condition so render + telemetry agree.
  const showSoloPrompt = shouldShowSoloPlayPrompt({
    humanGuestCount,
    gameState,
    botCountdownActive: botCountdown !== null,
    isPrivate,
  });
  const soloPromptShownRef = useRef(false);
  useEffect(() => {
    if (showSoloPrompt && !soloPromptShownRef.current) {
      soloPromptShownRef.current = true;
      trackSoloPlayPrompt({ event: 'shown' });
    }
  }, [showSoloPrompt]);

  // The "Play vs Bots" CTA IS the consent: start straight away via the bots
  // path — no redundant confirm dialog, no client setAutoFill.
  const handleSoloPlayVsBots = useCallback(() => {
    if (anyAdActive) return;
    trackSoloPlayPrompt({ event: 'clicked' });
    (onAutoStartWithBots ?? onStartGame)();
  }, [anyAdActive, onAutoStartWithBots, onStartGame]);

  return {
    socket,
    isAdmin,
    anyAdActive,
    selectedGameMode,
    setSelectedGameMode,
    showTvTutorial,
    closeTvTutorial: useCallback(() => setShowTvTutorial(false), []),
    seatedPlayers,
    humanGuestCount,
    isStartDisabled,
    botCountdown,
    cancelBotCountdown,
    handleStartClick,
    showSoloPrompt,
    handleSoloPlayVsBots,
    handleRoomLanguageChange,
  };
}
