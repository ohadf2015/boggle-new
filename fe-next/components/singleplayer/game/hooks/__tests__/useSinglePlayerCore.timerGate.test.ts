/**
 * First-15-seconds fix: the round timer must NOT tick down while the board
 * itself is still loading (grid === null). Today useGameTimer is only gated
 * on isPaused / mode==='practice' / earthquake / gift-modal / reward-ad — the
 * async grid fetch (POST /api/themed-words -> dictionary lookup -> client
 * board generation) runs unguarded, so a slow network burns real seconds off
 * a 60s round before the player has ever seen a tile.
 *
 * This test asserts the CONTRACT: useGameTimer must be invoked with
 * isExternallyPaused=true whenever grid is null, and the gate must clear
 * (fall back to the other externally-paused sources, all false here) once
 * the grid has loaded.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock setup (follows useSinglePlayerCore.cacheLatency.test.ts pattern) ───

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
  trackDeadTime: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => false,
  useSuppressTimerUrgency: () => false,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playEarthquakeRumble: vi.fn(),
    playEarthquakeShake: vi.fn(),
    playFireRoundStart: vi.fn(),
    startFireCrackleLoop: vi.fn(),
    stopFireCrackleLoop: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => ({ startMusic: vi.fn(), stopMusic: vi.fn() }),
}));

vi.mock('@/hooks/useEarthquakeFireRound', () => ({
  useEarthquakeFireRound: () => ({
    earthquakeState: null,
    isEarthquakeActive: false,
    fireRoundActive: false,
    fireRoundRemaining: 0,
    getScoreMultiplier: () => 1,
  }),
}));

vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboLevelRef: { current: 0 },
    maxCombo: 0,
    validWordCount: 0,
    isDangerState: false,
    incrementCombo: vi.fn().mockReturnValue(1),
    resetCombo: vi.fn(),
    forceResetCombo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

vi.mock('@/hooks/useDesktopLayout', () => ({
  useDesktopLayout: () => ({ isDesktop: false, isTv: false }),
}));

// THE KEY mock — a real vi.fn() so we can inspect what it was called with,
// instead of the cacheLatency test's static stub.
const mockUseGameTimer = vi.fn(() => ({
  remainingTime: 60,
  remainingTimeRef: { current: 60 },
  isRunning: false,
  pause: vi.fn(),
  resume: vi.fn(),
  togglePause: vi.fn(),
  reset: vi.fn(),
  setTime: vi.fn(),
}));
vi.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: (...args: unknown[]) => mockUseGameTimer(...args),
}));

vi.mock('@/hooks/useWordPace', () => ({
  useWordPace: () => ({ recordWord: vi.fn() }),
}));

vi.mock('@/hooks/useAutoScrollOnGameStart', () => ({
  useAutoScrollOnGameStart: () => ({}),
}));

vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: () => ({}),
}));

vi.mock('@/hooks/useGiftModalPause', () => ({
  useGiftModalPause: () => false,
}));

vi.mock('@/hooks/useRewardAdPause', () => ({
  useRewardAdPause: () => false,
}));

vi.mock('@/components/GameAnnouncer', () => ({
  useAnnouncer: () => ({
    announceWordResult: vi.fn(),
    announceCombo: vi.fn(),
    announceTimer: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({ guidance: null }),
}));

vi.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({ showTutorial: false }),
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: () => ({}),
}));

vi.mock('@/hooks/useTrainingAnalysis', () => ({
  useTrainingAnalysis: () => ({ trackValidWord: vi.fn() }),
}));

vi.mock('@/hooks/useTrainingProgress', () => ({
  useTrainingProgress: () => ({
    completedSkills: new Set(),
    completedSkillsRef: { current: new Set() },
    justUnlocked: null,
    isComplete: false,
    clearJustUnlocked: vi.fn(),
    updateProgress: vi.fn(),
    trackPath: vi.fn(),
    trackValidWord: vi.fn(),
  }),
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({ isTypingMode: false }),
}));

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: vi.fn(),
  hapticError: vi.fn(),
}));

vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotInDictionary: vi.fn(),
}));

vi.mock('@/utils/singlePlayerAchievements', () => ({
  checkLiveAchievements: () => [],
  createAchievementState: () => ({}),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboBonus: () => 0,
  calculateWordScore: () => 5,
}));

vi.mock('@/lib/cosy/cosyGameplay', () => ({
  shouldPlayCountdownBeep: () => false,
}));

vi.mock('../useBotSimulation', () => ({
  useBotSimulation: () => ({
    botScores: {},
    botWords: {},
    resetBots: vi.fn(),
    initializeBotUsedWords: vi.fn(),
  }),
}));

vi.mock('../useSpamDetection', () => ({
  useSpamDetection: () => ({
    checkSubmission: () => ({ allowed: true, isWarning: false, isCooldown: false }),
    resetSpamDetection: vi.fn(),
  }),
}));

vi.mock('../useSinglePlayerEffects', () => ({
  useSinglePlayerEffects: () => ({
    gameStartTimeRef: { current: Date.now() },
    lastWordFoundTimeRef: { current: Date.now() },
  }),
}));

vi.mock('../buildGameResults', () => ({
  buildGameResults: () => ({}),
  buildFallbackResults: () => ({}),
  emitSinglePlayerGameEnd: vi.fn(),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: vi.fn(() => false),
    isLoaded: false,
    isLoading: false,
    wordCount: 0,
    error: null,
  }),
}));

// Import AFTER mocks
import { useSinglePlayerCore } from '../useSinglePlayerCore';
import type { SinglePlayerGameState } from '@/components/singleplayer/SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';

describe('useSinglePlayerCore — timer gated on board load', () => {
  const mockGrid: LetterGrid = [
    ['T', 'E', 'S', 'T'],
    ['W', 'O', 'R', 'D'],
    ['H', 'E', 'L', 'L'],
    ['O', 'W', 'R', 'L'],
  ];

  const defaultSettings: SinglePlayerGameState = {
    mode: 'solo-bots',
    difficulty: 'MEDIUM',
    language: 'en',
    minWordLength: 2,
    timerSeconds: 60,
    grid: null,
    bots: [],
  } as unknown as SinglePlayerGameState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGameTimer.mockReturnValue({
      remainingTime: 60,
      remainingTimeRef: { current: 60 },
      isRunning: false,
      pause: vi.fn(),
      resume: vi.fn(),
      togglePause: vi.fn(),
      reset: vi.fn(),
      setTime: vi.fn(),
    });
    // Grid fetch never resolves — simulates real network dead time so the
    // grid state stays null for the life of the test.
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  it('RED: passes isExternallyPaused=true to useGameTimer while grid is still null', () => {
    renderHook(() =>
      useSinglePlayerCore({
        settings: defaultSettings,
        targetHighScore: null,
        onGameEnd: vi.fn(),
        onQuit: vi.fn(),
      })
    );

    expect(mockUseGameTimer).toHaveBeenCalled();
    const lastCall = mockUseGameTimer.mock.calls[mockUseGameTimer.mock.calls.length - 1][0] as {
      isExternallyPaused: boolean;
    };
    // The round clock must be held while there is no board to play on.
    expect(lastCall.isExternallyPaused).toBe(true);
  });

  it('clears the gate once the grid has loaded (no other external pause active)', async () => {
    const { rerender } = renderHook(
      (props: { settings: SinglePlayerGameState }) =>
        useSinglePlayerCore({
          settings: props.settings,
          targetHighScore: null,
          onGameEnd: vi.fn(),
          onQuit: vi.fn(),
        }),
      { initialProps: { settings: { ...defaultSettings, grid: mockGrid } } }
    );

    // settings.grid is provided up front, so the init effect sets it
    // synchronously (no fetch) instead of waiting on the network.
    await act(async () => {
      await Promise.resolve();
    });

    rerender({ settings: { ...defaultSettings, grid: mockGrid } });

    const lastCall = mockUseGameTimer.mock.calls[mockUseGameTimer.mock.calls.length - 1][0] as {
      isExternallyPaused: boolean;
    };
    expect(lastCall.isExternallyPaused).toBe(false);
  });
});
