/**
 * AdventureGame Achievement Notification Tests
 *
 * Tests that achievements display non-intrusive toast notifications when earned.
 * Toast notifications appear at the top of the screen without blocking gameplay.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ==============================================
// TEST FIXTURES
// ==============================================

const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 120,
  objectives: [
    { type: 'wordCount', target: 5, isPrimary: true },
    { type: 'scoreTarget', target: 200, isPrimary: false },
  ],
  specialTiles: [],
  difficulty: 'EASY',
  chapterNumber: 1,
  levelInChapter: 1,
  isBossLevel: false,
  minWordLength: 3,
};

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['B', 'I', 'R', 'D'],
  ['F', 'I', 'S', 'H'],
];

const defaultProps = {
  levelConfig: mockLevelConfig,
  initialGrid: mockGrid,
  onLevelComplete: vi.fn(),
  onExit: vi.fn(),
};

// ==============================================
// MOCKS
// ==============================================

// Mock translations
const mockTranslations: Record<string, string> = {
  'adventure.game.objectives': 'Objectives',
  'adventure.game.combo': 'Combo',
  'adventure.game.paused': 'Paused',
  'adventure.level': 'Level',
  'common.resume': 'Resume',
  'common.exit': 'Exit',
  'common.continue': 'Continue',
  'common.validating': 'Checking...',
  'achievements.unlocked': 'Achievement Unlocked!',
  'achievements.upgraded': 'Achievement Upgraded!',
  'adventure.achievements.firstWord.name': 'First Word',
  'adventure.achievements.firstWord.desc': 'Find your first word',
  'adventure.achievements.longWord6.name': 'Wordsmith',
  'adventure.achievements.longWord6.desc': 'Find a 6+ letter word',
};

vi.mock('@/contexts/LanguageContext', () => {
  const value = {
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  };
  return { useLanguage: () => value, useLanguageSafe: () => value };
});

// Mock SoundEffectsContext for AchievementToast
const mockPlayAchievementSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playComboBreakSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playComboMilestoneSound: vi.fn(),
    playComboSavedSound: vi.fn(),
    setGameActive: vi.fn(),
    playAchievementSound: mockPlayAchievementSound,
    playSound: vi.fn(),
    playWordSound: vi.fn(),
    playGameStartSound: vi.fn(),
    playGameEndSound: vi.fn(),
    playSoloGameSound: vi.fn(),
    playBuzzWord: vi.fn(),
  }),
}));

// Mock AdventureThemeContext to avoid provider requirement
vi.mock('@/contexts/AdventureThemeContext', () => {
  const R = require('react');
  return {
    useAdventureTheme: () => ({
      theme: {
        worldId: 1,
        background: { baseColor: 'bg-neo-navy', layers: [], texture: { type: 'none', opacity: 0, blendMode: 'normal' }, particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 } },
        tiles: {},
        ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' },
        chapters: [],
        containerClass: 'adventure-world-1',
      },
      worldId: 1,
      level: 1,
      setWorld: vi.fn(),
      setLevel: vi.fn(),
      isTransitioning: false,
    }),
    AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    AdventureThemeContext: R.createContext({ worldId: 1 }),
    useHUDTheme: () => ({
      headerBg: 'bg-neo-navy/90',
      headerBorder: 'border-neo-black/40',
      sidebarBg: 'bg-neo-black/40',
      scoreAccent: 'text-neo-cyan',
      levelBadgeColor: 'bg-neo-black/40',
      levelBadgeText: 'text-neo-cyan',
      objectiveAccent: 'text-neo-lime',
      hintActiveColor: 'bg-neo-lime',
      hintActiveText: 'text-neo-black',
    }),
    useTimerTheme: () => ({
      normal: { bg: 'bg-neo-navy/80', text: 'text-neo-white', shadow: '' },
      warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: '' },
      danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: '' },
      critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: '' },
    }),
    useBossFightTheme: () => ({
      dialogueBg: 'bg-neo-navy/95',
      dialogueBorder: 'border-neo-white/20',
      bossNameColor: 'text-neo-red',
      hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
      telegraphColor: 'bg-neo-red/20',
      telegraphProgressColor: 'bg-neo-red',
      playerHealthNormal: 'bg-neo-lime',
      playerHealthLow: 'bg-neo-red',
      phaseColors: {
        phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
        phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
        enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
      },
      avatarGlow: 'rgba(239, 68, 68, 0.4)',
      victoryGlow: 'rgba(163, 230, 53, 0.6)',
      arenaEffect: 'none',
    }),
  };
});

// Mock confetti util
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

// Mock react-hot-toast to capture toast calls
const { mockToastCustom, mockToastDismiss } = vi.hoisted(() => ({
  mockToastCustom: vi.fn().mockReturnValue('mock-toast-id'),
  mockToastDismiss: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    custom: mockToastCustom,
    dismiss: mockToastDismiss,
  },
}));

// Mock word validation - always returns valid
const mockValidateWord = vi.fn().mockResolvedValue({
  isValid: true,
  score: 30,
});

vi.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: mockValidateWord,
    isValidating: false,
    lastValidationResult: null,
  }),
}));

// Selection state that simulates a selected word
let mockSelectedIndices = [0, 1, 2]; // C-A-T
let mockCurrentWord = 'CAT';
const mockSelectTile = vi.fn();
const mockClearSelection = vi.fn();
const mockGetPath = vi.fn(() => [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
]);

vi.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: mockSelectedIndices,
    currentWord: mockCurrentWord,
    isSelecting: false,
    selectTile: mockSelectTile,
    clearSelection: mockClearSelection,
    getPath: mockGetPath,
    pathPoints: [],
  }),
}));

// Mock ProgressionContext
const mockRecordAttempt = vi.fn();
vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    recordAttempt: mockRecordAttempt,
    getLevelAttempt: vi.fn(() => null),
    getLevelCompletion: vi.fn(() => undefined),
    progression: null,
    isLoading: false,
    error: null,
    refreshProgression: vi.fn(),
    completeLevel: vi.fn(),
    isWorldUnlocked: vi.fn(() => true),
    isLevelUnlocked: vi.fn(() => true),
    getWorldStars: vi.fn(() => 0),
    attempts: [],
  }),
  useProgressionData: () => ({
    progression: { xp: 0, gold: 0, upgrades: {} },
  }),
}));

// Mock useAdaptiveDifficulty
vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: mockLevelConfig,
    hintData: { level: 'none', highlightTiles: [] },
    powerUpCooldownMultiplier: 1,
    recordCompletion: vi.fn(),
  }),
}));

// Track achievement state - key mock for testing
let mockAchievementCounts: Record<string, number> = {};
const mockEarnAchievement = vi.fn().mockImplementation((id: string) => {
  const count = mockAchievementCounts[id] || 0;
  // Return true if this is the first earn (count was 0)
  const isNewOrUpgraded = count === 0;
  mockAchievementCounts[id] = count + 1;
  return isNewOrUpgraded;
});

const mockGetCount = vi.fn().mockImplementation((id: string) => {
  return mockAchievementCounts[id] || 0;
});

vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    achievementCounts: mockAchievementCounts,
    earnAchievement: mockEarnAchievement,
    isEarned: (id: string) => (mockAchievementCounts[id] || 0) > 0,
    getCount: mockGetCount,
    getTierInfo: vi.fn(() => ({
      count: 0,
      tier: null,
      progress: { current: 0, next: 1, percentToNext: 0 },
      display: null,
    })),
  }),
}));

// Mock game state with wordsFound tracking
let mockWordsFound: string[] = [];
let mockIsPlaying = true;

vi.mock('@/hooks/useAdventureGame', () => ({
  useAdventureGame: () => ({
    gameState: {
      wordsFound: mockWordsFound,
      comboCount: 0,
      score: 0,
      isComplete: false,
      stars: 0,
    },
    tiles: [
      [{ letter: 'C', type: 'normal', isCleared: false, isFrozen: false, isChained: false }],
      [{ letter: 'A', type: 'normal', isCleared: false, isFrozen: false, isChained: false }],
      [{ letter: 'T', type: 'normal', isCleared: false, isFrozen: false, isChained: false }],
      [{ letter: 'S', type: 'normal', isCleared: false, isFrozen: false, isChained: false }],
    ],
    objectives: [{ type: 'wordCount', target: 5, current: 0, isPrimary: true }],
    timeRemaining: 120,
    canComplete: false,
    isPlaying: mockIsPlaying,
    cascadeComplete: true,
    submitWordWithPath: vi.fn(),
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    completeLevel: vi.fn(),
    resetGame: vi.fn(),
    markCascadeComplete: vi.fn(),
    isCascading: false,
    cascadePhase: 'idle',
    addTime: vi.fn(),
  }),
}));

// Mock other hooks
vi.mock('@/hooks/useAdventureXp', () => ({
  useAdventureXp: () => ({
    totalXp: 0,
    currentLevel: 1,
    xpProgress: { current: 0, next: 100, percentToNext: 0 },
    awardXp: vi.fn(() => ({ leveledUp: false })),
    pendingUpdate: null,
    acknowledgePersistence: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdventureCurrency', () => ({
  useAdventureCurrency: () => ({
    gold: 0,
    upgrades: {},
    addGold: vi.fn(),
    purchase: vi.fn(() => true),
    getUpgradeEffect: vi.fn(() => ({ multiplier: 1 })),
    pendingUpdate: null,
    acknowledgePersistence: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSkillPoints', () => ({
  useSkillPoints: () => ({
    skillPoints: 0,
    addSkillPoints: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSkillEffects', () => ({
  useSkillEffects: () => ({
    bossDamageMultiplier: 1,
    getLongWordDamageMultiplier: () => 1,
    comboMultiplierBonus: 0,
  }),
}));

vi.mock('@/hooks/useComboMilestone', () => ({
  useComboMilestone: () => ({
    currentMilestone: null,
    checkMilestone: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAIDirector', () => ({
  useAIDirector: () => ({
    intensityAdjustments: { hintEscalationRate: 1 },
    flowState: 'neutral',
    startSession: vi.fn(),
    endSession: vi.fn(),
    recordWord: vi.fn(),
    handleTransition: vi.fn(),
    isBossBattle: false,
  }),
}));

vi.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({
    resetOnGameAction: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: false,
    getHint: vi.fn(),
    currentHint: null,
    clearCurrentHint: vi.fn(),
    recordActivity: vi.fn(),
    showAutoHint: false,
    dismissAutoHint: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    cinematicComplete: true,
    showVictory: vi.fn(),
    showDefeat: vi.fn(),
    handleCinematicComplete: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    advanceToObjectives: vi.fn(),
    advanceToTitle: vi.fn(),
    advanceToPlaying: vi.fn(),
  }),
}));

vi.mock('../effects/hooks/useAdventureEffects', () => ({
  useAdventureEffects: () => ({
    shakeRef: { current: null },
    scoreDisplayRef: { current: null },
    currentPopup: null,
    handlePopupComplete: vi.fn(),
    addScorePopup: vi.fn(),
    chainBurstConfig: null,
    setChainBurstConfig: vi.fn(),
    particleConfig: null,
    setParticleConfig: vi.fn(),
    pendingExplosions: [],
    addExplosion: vi.fn(),
    removeExplosion: vi.fn(),
    shake: vi.fn(),
    reaction: null,
    dismissReaction: vi.fn(),
  }),
}));

// Mock remaining components
vi.mock('@/lib/adventure/abilities', () => ({
  registerAllAbilities: vi.fn(),
}));

// Mock AdventureGrid with ability to trigger word submission - inline to avoid hoisting issues
vi.mock('../AdventureGrid', () => {
  const React = require('react');
  const MockAdventureGrid = React.forwardRef(
    function MockAdventureGrid(
      props: { onWordSubmit?: (word: string, indices: number[]) => void },
      ref: React.Ref<HTMLDivElement>
    ) {
      return (
        <div ref={ref} data-testid="adventure-grid">
          <button
            data-testid="submit-word-btn"
            onClick={() => props.onWordSubmit?.('CAT', [0, 1, 2])}
          >
            Submit Word
          </button>
        </div>
      );
    }
  );
  return {
    __esModule: true,
    default: MockAdventureGrid,
  };
});

// Mock AdventureObjectives - inline to avoid hoisting issues
vi.mock('../AdventureObjectives', () => {
  const React = require('react');
  function MockAdventureObjectives({ onSlideInComplete }: { onSlideInComplete?: () => void }) {
    React.useEffect(() => {
      onSlideInComplete?.();
    }, [onSlideInComplete]);
    return <div data-testid="adventure-objectives">Mock Objectives</div>;
  }
  return {
    __esModule: true,
    default: MockAdventureObjectives,
  };
});

vi.mock('../AdventureTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-timer">Mock Timer</div>,
}));

vi.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../LevelEntryOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../LexiReaction', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../boss', () => ({
  BossOverlay: () => null,
  PlayerHealthBar: () => null,
}));

vi.mock('../ComboMilestoneOverlay', () => ({
  ComboMilestoneOverlay: () => null,
}));

vi.mock('../cinematics', () => ({
  VictoryCinematic: () => null,
  VICTORY_DURATION_FRAMES: 90,
  DefeatCinematic: () => null,
  DEFEAT_DURATION_FRAMES: 90,
}));

vi.mock('../boss/cinematics/CinematicPlayer', () => ({
  CinematicPlayer: () => null,
}));

vi.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../HintMessage', () => ({
  HintMessage: () => null,
}));

vi.mock('../effects/AdventureEffectsLayer', () => ({
  __esModule: true,
  default: () => null,
  AdventureEffectsLayer: () => null,
}));

vi.mock('@/components/animations/ComboTierBadge', () => ({
  ComboTierBadge: () => null,
}));

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: () => ({ currentTrack: 1, stopMusic: vi.fn(), hasMusic: false }),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame Achievement Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockAchievementCounts = {};
    mockWordsFound = [];
    mockIsPlaying = true;
    mockSelectedIndices = [0, 1, 2];
    mockCurrentWord = 'CAT';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Achievement Toast Display', () => {
    it('should show achievement toast when first word achievement is earned', async () => {
      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      // Verify the game renders
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

      // Submit a word by clicking the mock button which triggers onWordSubmit
      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        // Allow async validation to complete
        await Promise.resolve();
      });

      // Verify toast.custom was called to show achievement
      expect(mockToastCustom).toHaveBeenCalled();

      // Verify the toast was called with correct options (3000ms duration)
      const toastOptions = mockToastCustom.mock.calls[0][1];
      expect(toastOptions.duration).toBe(3000);
      expect(toastOptions.position).toBe('top-center');
    });

    it('should NOT show toast if achievement was already earned', async () => {
      // Pre-populate achievement as already earned
      mockAchievementCounts = { FIRST_WORD: 1 };

      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      // Submit a word
      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        await Promise.resolve();
      });

      // earnAchievement returns false for already-earned one-time achievement
      // so toast should NOT be called
      expect(mockToastCustom).not.toHaveBeenCalled();
    });

    it('should call earnAchievement with correct achievement ID', async () => {
      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      // Submit a word to trigger achievement
      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        await Promise.resolve();
      });

      // Verify earnAchievement was called with FIRST_WORD (since wordsFound is empty)
      expect(mockEarnAchievement).toHaveBeenCalledWith('FIRST_WORD');
    });

    it('should show toast with auto-dismiss duration of 3000ms', async () => {
      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        await Promise.resolve();
      });

      // Verify toast was called with 3000ms duration
      expect(mockToastCustom).toHaveBeenCalled();
      const toastCall = mockToastCustom.mock.calls[0];
      expect(toastCall[1].duration).toBe(3000);
    });
  });

  describe('Achievement Toast Non-Blocking Behavior', () => {
    it('should render game grid while toast is shown', async () => {
      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        await Promise.resolve();
      });

      // Toast is shown
      expect(mockToastCustom).toHaveBeenCalled();

      // Game grid should still be visible and accessible
      expect(screen.getByTestId('adventure-grid')).toBeInTheDocument();
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
    });

    it('should position toast at top-center to not block game grid', async () => {
      render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

      const submitBtn = screen.getByTestId('submit-word-btn');

      await act(async () => {
        fireEvent.click(submitBtn);
        await Promise.resolve();
      });

      // Verify toast position is top-center (not covering the grid)
      const toastOptions = mockToastCustom.mock.calls[0][1];
      expect(toastOptions.position).toBe('top-center');
    });
  });
});
