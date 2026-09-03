import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { getMinWordLength, getDefaultPreset, getPresetById } from './presetConfig';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding, markOnboardingComplete, hasPlayedBotsGame } from '@/utils/onboardingStorage';
import { getStoredUsername } from '@/utils/profileStorage';
import { useAuth } from '@/contexts/AuthContext';
import { trackReplayClicked, trackNextGameStarted } from '@/utils/posthogEngagement';
import posthog from '@/lib/analytics/lazyPosthog';
import { isFirstSessionPlayer } from '@/lib/retention/firstWin';
import { consumeMasteryPracticeRound } from '@/lib/wordMastery/practiceStorage';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';
import type {
  SinglePlayerMode,
  SinglePlayerPhase,
  SinglePlayerGameState,
  BotOpponent,
} from './SinglePlayerView';

// ==========================================
// Bot Configuration
// ==========================================

const DEFAULT_MEDIUM_BOT: BotOpponent = {
  id: 'default-medium-bot',
  name: 'WordBot',
  difficulty: 'medium',
  score: 0,
  wordsFound: [],
};

/**
 * First-win-fast (D1 lever): a brand-new player's first solo-bots round is an
 * EASY 60s board against ONE easy bot — a win-feeling moment inside a minute
 * instead of a 120s MEDIUM game vs a medium bot they usually lose.
 */
const FIRST_WIN_CONFIG = {
  difficulty: 'EASY' as DifficultyLevel,
  timerSeconds: 60,
  bots: 1,
  botDifficulty: 'easy' as const,
};

/** Apply the first-win config when this device has never completed a game. */
function firstWinConfigFor(fallback: {
  difficulty: DifficultyLevel;
  timerSeconds: number;
  bots: number;
  botDifficulty: 'easy' | 'medium' | 'hard';
}): { config: typeof fallback; isFirstWin: boolean } {
  if (isFirstSessionPlayer()) {
    return { config: { ...FIRST_WIN_CONFIG }, isFirstWin: true };
  }
  return { config: fallback, isFirstWin: false };
}

function trackFirstWinConfigApplied(entry: string): void {
  try {
    posthog.capture('first_win_config_applied', {
      entry,
      difficulty: FIRST_WIN_CONFIG.difficulty,
      timer_seconds: FIRST_WIN_CONFIG.timerSeconds,
      bots: FIRST_WIN_CONFIG.bots,
      bot_difficulty: FIRST_WIN_CONFIG.botDifficulty,
    });
  } catch {
    /* analytics best-effort */
  }
}

const BOT_NAMES = [
  'WordBot', 'LexiBot', 'AlphaBot', 'BrainBot', 'SpeedBot',
  'CleverBot', 'QuickBot', 'SmartBot', 'ProBot', 'MasterBot',
];

/**
 * Generate bot opponents for a preset
 */
export function generateBotsForPreset(count: number, difficulty: 'easy' | 'medium' | 'hard'): BotOpponent[] {
  const bots: BotOpponent[] = [];
  const availableNames = [...BOT_NAMES];

  for (let i = 0; i < count && availableNames.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    const botName = availableNames.splice(randomIndex, 1)[0];
    bots.push({
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: botName,
      difficulty,
      score: 0,
      wordsFound: [],
    });
  }
  return bots;
}

// ==========================================
// Hook
// ==========================================

interface UseSinglePlayerConfigOptions {
  searchParams: ReturnType<typeof import('next/navigation').useSearchParams>;
}

interface UseSinglePlayerConfigResult {
  phase: SinglePlayerPhase;
  setPhase: (phase: SinglePlayerPhase) => void;
  gameState: SinglePlayerGameState;
  setGameState: React.Dispatch<React.SetStateAction<SinglePlayerGameState>>;
  boardCode: string | null;
  handleTutorialComplete: () => void;
  handlePlayAgain: () => void;
  handleQuickRematch: () => void;
  handleBackToLobby: () => void;
  wasFirstTimerPracticeRef: React.MutableRefObject<boolean>;
}

export function useSinglePlayerConfig({ searchParams }: UseSinglePlayerConfigOptions): UseSinglePlayerConfigResult {
  const { language: uiLanguage } = useLanguage();
  const { unlockAudio } = useMusic();
  const router = useRouter();
  const { isAuthenticated, profile } = useAuth();

  const autoStart = searchParams?.get('autoStart') || null;
  const presetParam = searchParams?.get('preset') || null;
  const boardCode = searchParams?.get('boardCode') || null;
  const mpHandoff = searchParams?.get('mpHandoff') === '1';
  const masteryPractice = searchParams?.get('mastery') === '1';

  const [phase, setPhase] = useState<SinglePlayerPhase>(() => {
    const hasAutoStart = searchParams?.get('autoStart');
    const hasPreset = searchParams?.get('preset');
    if (hasAutoStart || hasPreset) return 'playing';
    const isNewPlayer = shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding();
    return isNewPlayer ? 'pre-game' : 'playing';
  });

  // Skip pre-game tutorial for authenticated returning players
  const hasSkippedForReturningRef = useRef(false);
  useEffect(() => {
    if (hasSkippedForReturningRef.current) return;
    if (phase === 'pre-game' && isAuthenticated && profile?.total_games && profile.total_games > 0) {
      hasSkippedForReturningRef.current = true;
      markGuidanceShown('firstPlayTutorialCompleted');
      setPhase('playing');
    }
  }, [phase, isAuthenticated, profile]);

  const [gameState, setGameState] = useState<SinglePlayerGameState>(() => ({
    mode: 'solo-bots',
    difficulty: 'MEDIUM',
    language: (uiLanguage as Language) || 'en',
    grid: null,
    timerSeconds: 120,
    bots: [DEFAULT_MEDIUM_BOT],
    minWordLength: 2,
  }));

  const hasAutoStartedRef = useRef(false);
  const wasFirstTimerPracticeRef = useRef(false);
  // CrazyGames "plays per session" counter — increments on every replay click.
  // Drives the next_game_started event which feeds CG's engagement metric.
  const sessionPlayCountRef = useRef(1);
  const hasRedirectedRef = useRef(false);

  // Returning-player gate: SP-vs-bots is FTUE-only. Once flag is set,
  // autoStart=bots / preset=bots entries redirect to multiplayer Quick Play.
  useEffect(() => {
    if (hasRedirectedRef.current) return;
    const isBotsEntry = autoStart === 'bots' || presetParam === 'bots';
    if (!isBotsEntry) return;
    if (!hasPlayedBotsGame()) return;
    hasRedirectedRef.current = true;
    hasAutoStartedRef.current = true; // suppress subsequent auto-start effects
    router.replace(`/${uiLanguage}/multiplayer?quickPlay=true`);
  }, [autoStart, presetParam, router, uiLanguage]);

  // Auto-start practice mode (autoStart=practice)
  useEffect(() => {
    if (autoStart === 'practice' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const practicePreset = getDefaultPreset('practice');
      if (practicePreset) {
        const minWordLength = getMinWordLength(uiLanguage, practicePreset.settings.difficulty);
        let seededGrid: LetterGrid | null = null;
        if (masteryPractice && typeof window !== 'undefined') {
          const round = consumeMasteryPracticeRound();
          if (round?.grid) seededGrid = round.grid as LetterGrid;
        }
        setGameState(prev => ({
          ...prev,
          mode: 'practice',
          difficulty: practicePreset.settings.difficulty,
          timerSeconds: practicePreset.settings.timerSeconds,
          bots: [],
          language: (uiLanguage as Language) || 'en',
          grid: seededGrid,
          minWordLength,
        }));
        setPhase('playing');
      }
    }
  }, [autoStart, uiLanguage, masteryPractice]);

  // Auto-start bot game (autoStart=bots)
  useEffect(() => {
    if (autoStart === 'bots' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const botsPreset = getDefaultPreset('solo-bots');
      if (botsPreset) {
        const { config, isFirstWin } = firstWinConfigFor(botsPreset.settings);
        if (isFirstWin) trackFirstWinConfigApplied('autoStart=bots');
        const bots = generateBotsForPreset(config.bots, config.botDifficulty);
        const minWordLength = getMinWordLength(uiLanguage, config.difficulty);
        setGameState({
          mode: 'solo-bots',
          difficulty: config.difficulty,
          timerSeconds: config.timerSeconds,
          bots,
          language: (uiLanguage as Language) || 'en',
          grid: null,
          minWordLength,
        });
        setPhase('playing');
      }
    }
  }, [autoStart, uiLanguage]);

  // Auto-start with preset param
  useEffect(() => {
    if (autoStart) return;
    if (!presetParam || hasAutoStartedRef.current) return;
    if (phase === 'playing') return;

    hasAutoStartedRef.current = true;

    if (presetParam === 'bots') {
      const botsPreset = getDefaultPreset('solo-bots');
      if (botsPreset) {
        const { config, isFirstWin } = firstWinConfigFor(botsPreset.settings);
        if (isFirstWin) trackFirstWinConfigApplied('preset=bots');
        const minWordLength = getMinWordLength(uiLanguage, config.difficulty);
        const bots = config.bots > 0
          ? generateBotsForPreset(config.bots, config.botDifficulty)
          : [];
        setGameState(prev => ({
          ...prev,
          mode: 'solo-bots',
          difficulty: config.difficulty,
          timerSeconds: config.timerSeconds,
          bots,
          language: (uiLanguage as Language) || 'en',
          grid: null,
          minWordLength,
        }));
        setPhase('playing');
      }
      return;
    }

    const preset = getPresetById(presetParam);
    if (preset) {
      let mode: SinglePlayerMode = 'solo-bots';
      if (preset.settings.bots === 0 && preset.settings.timerSeconds === 0) {
        mode = 'practice';
      } else if (preset.settings.bots === 0 && preset.settings.timerSeconds > 0) {
        mode = 'challenge';
      }

      const minWordLength = getMinWordLength(uiLanguage, preset.settings.difficulty);
      const bots = preset.settings.bots > 0
        ? generateBotsForPreset(preset.settings.bots, preset.settings.botDifficulty)
        : [];

      setGameState(prev => ({
        ...prev,
        mode,
        difficulty: preset.settings.difficulty,
        timerSeconds: preset.settings.timerSeconds,
        bots,
        language: (uiLanguage as Language) || 'en',
        grid: null,
        minWordLength,
      }));
      setPhase('playing');
    }
  }, [presetParam, autoStart, phase, uiLanguage]);

  // Auto-start async friend-challenge game (autoStart=challenge).
  // Both sides of the async flow land here: the challenger (config stashed under
  // `pendingAsyncChallenge` by the dialog) plays first to lock a target score,
  // and the accepting friend (`pendingFriendChallenge`) plays to beat it. We
  // launch a solo, no-bots, timed board using the stashed duration + language so
  // the player can actually COMPLETE the challenge. The producer hook in
  // SinglePlayerResults fires the POST/PUT on game-end.
  useEffect(() => {
    if (autoStart !== 'challenge' || hasAutoStartedRef.current) return;
    if (typeof window === 'undefined') return;
    hasAutoStartedRef.current = true;

    let durationSeconds = 120;
    let challengeLang: string = uiLanguage;
    try {
      const raw =
        sessionStorage.getItem('pendingAsyncChallenge') ||
        sessionStorage.getItem('pendingFriendChallenge');
      if (raw) {
        const cfg = JSON.parse(raw) as { durationSeconds?: number; language?: string };
        if (typeof cfg.durationSeconds === 'number' && cfg.durationSeconds > 0) {
          durationSeconds = cfg.durationSeconds;
        }
        if (typeof cfg.language === 'string' && cfg.language) {
          challengeLang = cfg.language;
        }
      }
    } catch {
      // Fall back to defaults if the stashed config is unreadable.
    }

    const minWordLength = getMinWordLength(challengeLang, 'MEDIUM');
    setGameState(prev => ({
      ...prev,
      mode: 'challenge',
      difficulty: 'MEDIUM',
      timerSeconds: durationSeconds,
      bots: [],
      language: challengeLang as Language,
      grid: null,
      minWordLength,
    }));
    setPhase('playing');
  }, [autoStart, uiLanguage]);

  // Auto-load MP handoff board (Phase 3.7) — same grid used in MP game
  useEffect(() => {
    if (!mpHandoff || hasAutoStartedRef.current) return;
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('mp_solo_handoff');
    if (!raw) return;
    hasAutoStartedRef.current = true;
    try {
      const { grid } = JSON.parse(raw) as { grid: LetterGrid; gameCode: string };
      sessionStorage.removeItem('mp_solo_handoff');
      if (!grid) return;
      setGameState(prev => ({ ...prev, mode: 'solo-bots', bots: [], grid, language: uiLanguage as Language }));
      setPhase('playing');
    } catch {
      sessionStorage.removeItem('mp_solo_handoff');
    }
  }, [mpHandoff, uiLanguage]);

  // Auto-load community board
  useEffect(() => {
    if (!boardCode || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    const loadCommunityBoard = async () => {
      try {
        const res = await fetch(`/api/ugc/boards/${boardCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const board = data.board;
        if (!board?.grid) return;

        const difficulty: DifficultyLevel = board.difficulty === 'EASY' ? 'EASY' : board.difficulty === 'HARD' ? 'HARD' : 'MEDIUM';
        const timerSeconds = board.timer_seconds || 120;
        const minWordLength = getMinWordLength(board.language || uiLanguage, difficulty);

        setGameState(prev => ({
          ...prev,
          mode: 'solo-bots',
          difficulty,
          timerSeconds,
          bots: [],
          language: (board.language || uiLanguage) as Language,
          grid: board.grid as LetterGrid,
          minWordLength,
        }));
        setPhase('playing');
      } catch {
        // Silently fall back to normal game
      }
    };

    loadCommunityBoard();
  }, [boardCode, uiLanguage]);

  // Handle pre-game tutorial completion — route to homepage so the player
  // chooses their own next step instead of being auto-funneled into practice.
  const handleTutorialComplete = useCallback(() => {
    markGuidanceShown('firstPlayTutorialCompleted');
    markOnboardingComplete({ avatarId: '', displayName: getStoredUsername() || '', selectedMode: 'single' });
    router.push(`/${uiLanguage}/`);
  }, [router, uiLanguage]);

  // Handle play again — replays the current mode
  const handlePlayAgain = useCallback(() => {
    wasFirstTimerPracticeRef.current = false;
    unlockAudio();
    sessionPlayCountRef.current += 1;
    trackReplayClicked({ mode: 'sp', fromScreen: 'results' });
    trackNextGameStarted({ mode: 'sp', gamesThisSession: sessionPlayCountRef.current });
    setGameState(prev => ({ ...prev, grid: null }));
    setPhase('playing');
  }, [unlockAudio]);

  // Quick rematch
  const handleQuickRematch = useCallback(() => {
    unlockAudio();
    sessionPlayCountRef.current += 1;
    trackReplayClicked({ mode: 'sp', fromScreen: 'quick_rematch' });
    trackNextGameStarted({ mode: 'sp', gamesThisSession: sessionPlayCountRef.current });
    setGameState(prev => ({ ...prev, grid: null }));
    setPhase('playing');
  }, [unlockAudio]);

  // Back to lobby
  const handleBackToLobby = useCallback(() => {
    router.push(`/${uiLanguage}/`);
  }, [router, uiLanguage]);

  return {
    phase,
    setPhase,
    gameState,
    setGameState,
    boardCode,
    handleTutorialComplete,
    handlePlayAgain,
    handleQuickRematch,
    handleBackToLobby,
    wasFirstTimerPracticeRef,
  };
}
