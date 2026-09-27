/**
 * Dictionary Cache Latency Fix: Verify that valid words with cache hits
 * produce feedback SYNCHRONOUSLY (before fetch completes).
 *
 * This test ensures the optimization resolves the asymmetry where rejected
 * words snap back instantly but accepted words wait for network latency.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mock setup (follows useSinglePlayerCore.quitTracking.test.ts pattern) ───

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
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
  useGameMusic: () => ({ startMusic: vi.fn(), stopMusic: vi.fn() })
}));

vi.mock('@/hooks/useEarthquakeFireRound', () => ({
  useEarthquakeFireRound: () => ({
    earthquakeState: null,
    isEarthquakeActive: false,
    fireRoundActive: false,
    fireRoundRemaining: 0,
    getScoreMultiplier: () => 1,
  })
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
  useDevicePerformance: () => ({ isLowEnd: false })
}));

vi.mock('@/hooks/useDesktopLayout', () => ({
  useDesktopLayout: () => ({ isDesktop: false, isTv: false })
}));

vi.mock('@/hooks/useGameTimer', () => ({
  useGameTimer: () => ({
    timeRemaining: 180,
    totalTime: 180,
    isTimeOver: false,
    timerRunning: true,
  }),
}));

vi.mock('@/hooks/useWordPace', () => ({
  useWordPace: () => ({ recordWord: vi.fn() })
}));

vi.mock('@/hooks/useAutoScrollOnGameStart', () => ({
  useAutoScrollOnGameStart: () => ({})
}));

vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: () => ({})
}));

vi.mock('@/hooks/useGiftModalPause', () => ({
  useGiftModalPause: () => false
}));

vi.mock('@/hooks/useRewardAdPause', () => ({
  useRewardAdPause: () => false
}));

vi.mock('@/components/GameAnnouncer', () => ({
  useAnnouncer: () => ({
    announceWordResult: vi.fn(),
    announceCombo: vi.fn(),
    announceTimer: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDirectionPatternGuidance', () => ({
  useDirectionPatternGuidance: () => ({ guidance: null })
}));

vi.mock('@/hooks/useFirstPlayTutorial', () => ({
  useFirstPlayTutorial: () => ({ showTutorial: false })
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: () => ({})
}));

vi.mock('@/hooks/useTrainingAnalysis', () => ({
  useTrainingAnalysis: () => ({ trackValidWord: vi.fn() })
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
  })
}));

vi.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({ isTypingMode: false })
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
  shouldPlayCountdownBeep: () => false
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

// Dictionary cache mock — THE KEY fixture for testing the latency fix
const mockCheckWord = vi.fn().mockReturnValue(false);
const mockDictionaryCacheState = {
  isLoaded: false,
  isLoading: false,
  wordCount: 0,
  error: null,
};

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: mockCheckWord,
    ...mockDictionaryCacheState,
  }),
}));

// Import AFTER mocks
import { useSinglePlayerCore } from '../useSinglePlayerCore';
import type { SinglePlayerGameState } from '@/components/singleplayer/SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';

describe('useSinglePlayerCore — Dictionary Cache Latency', () => {
  const mockGrid: LetterGrid = [
    ['T', 'E', 'S', 'T'],
    ['W', 'O', 'R', 'D'],
    ['H', 'E', 'L', 'L'],
    ['O', 'W', 'R', 'L'],
  ];

  const defaultSettings: SinglePlayerGameState = {
    mode: 'challenge',
    difficulty: 'MEDIUM',
    language: 'en',
    minWordLength: 2,
    timerSeconds: 180,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckWord.mockReturnValue(false);
    mockDictionaryCacheState.isLoaded = false;

    // Mock fetch to NEVER RESOLVE — if test passes, feedback must be synchronous
    global.fetch = vi.fn(() => new Promise(() => {
      // Intentionally never resolves
    }));
  });

  it('RED TEST: should set accepted feedback SYNCHRONOUSLY when cache HIT (no await on fetch)', () => {
    // SETUP: Dictionary cache is loaded and HAS the word
    mockDictionaryCacheState.isLoaded = true;
    mockCheckWord.mockReturnValue(true);

    const { result } = renderHook(() =>
      useSinglePlayerCore({
        settings: { ...defaultSettings, grid: mockGrid },
        targetHighScore: null,
        onGameEnd: vi.fn(),
        onQuit: vi.fn(),
      })
    );

    // Initially no feedback
    expect(result.current.currentFeedback).toBeNull();

    // Submit valid word that is on board
    // This should SHORT-CIRCUIT the cache and NOT wait for fetch
    act(() => {
      result.current.handleWordSubmit('test');
    });

    // CRITICAL: Assert feedback is IMMEDIATE (synchronous, no await)
    // If feedback appears, the cache short-circuit worked.
    // If this test hangs or times out, the fetch is blocking the feedback.
    expect(result.current.currentFeedback).not.toBeNull();
    expect(result.current.currentFeedback?.type).toBe('accepted');
    expect(result.current.currentFeedback?.word).toBe('TEST');
  });

  it('should still call fetch when cache MISSES (word not in cache)', () => {
    // SETUP: Cache is loaded but does NOT have the word
    mockDictionaryCacheState.isLoaded = true;
    mockCheckWord.mockReturnValue(false);

    const { result } = renderHook(() =>
      useSinglePlayerCore({
        settings: { ...defaultSettings, grid: mockGrid },
        targetHighScore: null,
        onGameEnd: vi.fn(),
        onQuit: vi.fn(),
      })
    );

    // Submit valid word that is on board but NOT in cache
    act(() => {
      result.current.handleWordSubmit('test');
    });

    // Should NOT have synchronous accepted feedback (cache miss)
    // The feedback will only appear when fetch resolves (which it won't in this test)
    expect(result.current.currentFeedback?.type).not.toBe('accepted');

    // But fetch MUST be called to verify with server
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/dictionary/check',
      expect.objectContaining({ method: 'POST' })
    );
  });

});
