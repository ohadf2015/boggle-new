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
  onLevelComplete: jest.fn(),
  onExit: jest.fn(),
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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  }),
}));

// Mock SoundEffectsContext for AchievementToast
const mockPlayAchievementSound = jest.fn();
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playComboBreakSound: jest.fn(),
    playCountdownBeep: jest.fn(),
    playComboMilestoneSound: jest.fn(),
    playComboSavedSound: jest.fn(),
    setGameActive: jest.fn(),
    playAchievementSound: mockPlayAchievementSound,
    playSound: jest.fn(),
    playWordSound: jest.fn(),
    playGameStartSound: jest.fn(),
    playGameEndSound: jest.fn(),
    playSoloGameSound: jest.fn(),
    playBuzzWord: jest.fn(),
  }),
}));

// Mock AdventureThemeContext to avoid provider requirement
jest.mock('@/contexts/AdventureThemeContext', () => {
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
      setWorld: jest.fn(),
      setLevel: jest.fn(),
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
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock react-hot-toast to capture toast calls
// Must be declared before jest.mock to avoid hoisting issues
jest.mock('react-hot-toast', () => {
  const mockCustom = jest.fn().mockReturnValue('mock-toast-id');
  const mockDismiss = jest.fn();
  return {
    __esModule: true,
    default: {
      custom: mockCustom,
      dismiss: mockDismiss,
    },
    // Export for test assertions
    mockCustom,
    mockDismiss,
  };
});

// Get the mock functions after the module is mocked
const toastModule = jest.requireMock('react-hot-toast') as { mockCustom: jest.Mock; mockDismiss: jest.Mock };
const mockToastCustom = toastModule.mockCustom;
const mockToastDismiss = toastModule.mockDismiss;

// Mock word validation - always returns valid
const mockValidateWord = jest.fn().mockResolvedValue({
  isValid: true,
  score: 30,
});

jest.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: mockValidateWord,
    isValidating: false,
    lastValidationResult: null,
  }),
}));

// Selection state that simulates a selected word
let mockSelectedIndices = [0, 1, 2]; // C-A-T
let mockCurrentWord = 'CAT';
const mockSelectTile = jest.fn();
const mockClearSelection = jest.fn();
const mockGetPath = jest.fn(() => [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
]);

jest.mock('@/hooks/useAdventureSelection', () => ({
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
const mockRecordAttempt = jest.fn();
jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    recordAttempt: mockRecordAttempt,
    getLevelAttempt: jest.fn(() => null),
    getLevelCompletion: jest.fn(() => undefined),
    progression: null,
    isLoading: false,
    error: null,
    refreshProgression: jest.fn(),
    completeLevel: jest.fn(),
    isWorldUnlocked: jest.fn(() => true),
    isLevelUnlocked: jest.fn(() => true),
    getWorldStars: jest.fn(() => 0),
    attempts: [],
  }),
}));

// Mock useAdaptiveDifficulty
jest.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: mockLevelConfig,
    hintData: { level: 'none', highlightTiles: [] },
    powerUpCooldownMultiplier: 1,
    recordCompletion: jest.fn(),
  }),
}));

// Track achievement state - key mock for testing
let mockAchievementCounts: Record<string, number> = {};
const mockEarnAchievement = jest.fn().mockImplementation((id: string) => {
  const count = mockAchievementCounts[id] || 0;
  // Return true if this is the first earn (count was 0)
  const isNewOrUpgraded = count === 0;
  mockAchievementCounts[id] = count + 1;
  return isNewOrUpgraded;
});

const mockGetCount = jest.fn().mockImplementation((id: string) => {
  return mockAchievementCounts[id] || 0;
});

jest.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    achievementCounts: mockAchievementCounts,
    earnAchievement: mockEarnAchievement,
    isEarned: (id: string) => (mockAchievementCounts[id] || 0) > 0,
    getCount: mockGetCount,
    getTierInfo: jest.fn(() => ({
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

jest.mock('@/hooks/useAdventureGame', () => ({
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
    submitWordWithPath: jest.fn(),
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    completeLevel: jest.fn(),
    resetGame: jest.fn(),
    markCascadeComplete: jest.fn(),
    isCascading: false,
    cascadePhase: 'idle',
    addTime: jest.fn(),
  }),
}));

// Mock other hooks
jest.mock('@/hooks/useAdventureXp', () => ({
  useAdventureXp: () => ({
    totalXp: 0,
    currentLevel: 1,
    xpProgress: { current: 0, next: 100, percentToNext: 0 },
    awardXp: jest.fn(() => ({ leveledUp: false })),
    pendingUpdate: null,
    acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureCurrency', () => ({
  useAdventureCurrency: () => ({
    gold: 0,
    upgrades: {},
    addGold: jest.fn(),
    purchase: jest.fn(() => true),
    getUpgradeEffect: jest.fn(() => ({ multiplier: 1 })),
    pendingUpdate: null,
    acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSkillPoints', () => ({
  useSkillPoints: () => ({
    skillPoints: 0,
    addSkillPoints: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSkillEffects', () => ({
  useSkillEffects: () => ({
    bossDamageMultiplier: 1,
    getLongWordDamageMultiplier: () => 1,
    comboMultiplierBonus: 0,
  }),
}));

jest.mock('@/hooks/useComboMilestone', () => ({
  useComboMilestone: () => ({
    currentMilestone: null,
    checkMilestone: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAIDirector', () => ({
  useAIDirector: () => ({
    intensityAdjustments: { hintEscalationRate: 1 },
    flowState: 'neutral',
    startSession: jest.fn(),
    endSession: jest.fn(),
    recordWord: jest.fn(),
    handleTransition: jest.fn(),
    isBossBattle: false,
  }),
}));

jest.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({
    resetOnGameAction: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: false,
    getHint: jest.fn(),
    currentHint: null,
    clearCurrentHint: jest.fn(),
    recordActivity: jest.fn(),
    showAutoHint: false,
    dismissAutoHint: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    cinematicComplete: true,
    showVictory: jest.fn(),
    showDefeat: jest.fn(),
    handleCinematicComplete: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    advanceToObjectives: jest.fn(),
    advanceToTitle: jest.fn(),
    advanceToPlaying: jest.fn(),
  }),
}));

jest.mock('../effects/hooks/useAdventureEffects', () => ({
  useAdventureEffects: () => ({
    shakeRef: { current: null },
    scoreDisplayRef: { current: null },
    currentPopup: null,
    handlePopupComplete: jest.fn(),
    addScorePopup: jest.fn(),
    chainBurstConfig: null,
    setChainBurstConfig: jest.fn(),
    particleConfig: null,
    setParticleConfig: jest.fn(),
    pendingExplosions: [],
    addExplosion: jest.fn(),
    removeExplosion: jest.fn(),
    shake: jest.fn(),
    reaction: null,
    dismissReaction: jest.fn(),
  }),
}));

// Mock remaining components
jest.mock('@/lib/adventure/abilities', () => ({
  registerAllAbilities: jest.fn(),
}));

// Mock AdventureGrid with ability to trigger word submission - inline to avoid hoisting issues
jest.mock('../AdventureGrid', () => {
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
jest.mock('../AdventureObjectives', () => {
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

jest.mock('../AdventureTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-timer">Mock Timer</div>,
}));

jest.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../LevelEntryOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../LexiReaction', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../boss', () => ({
  BossOverlay: () => null,
  PlayerHealthBar: () => null,
}));

jest.mock('../ComboMilestoneOverlay', () => ({
  ComboMilestoneOverlay: () => null,
}));

jest.mock('../cinematics', () => ({
  VictoryCinematic: () => null,
  VICTORY_DURATION_FRAMES: 90,
  DefeatCinematic: () => null,
  DEFEAT_DURATION_FRAMES: 90,
}));

jest.mock('../boss/cinematics/CinematicPlayer', () => ({
  CinematicPlayer: () => null,
}));

jest.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../HintMessage', () => ({
  HintMessage: () => null,
}));

jest.mock('../effects/AdventureEffectsLayer', () => ({
  __esModule: true,
  default: () => null,
  AdventureEffectsLayer: () => null,
}));

jest.mock('@/components/animations/ComboTierBadge', () => ({
  ComboTierBadge: () => null,
}));

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame Achievement Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAchievementCounts = {};
    mockWordsFound = [];
    mockIsPlaying = true;
    mockSelectedIndices = [0, 1, 2];
    mockCurrentWord = 'CAT';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Achievement Toast Display', () => {
    it('should show achievement toast when first word achievement is earned', async () => {
      render(<AdventureGame {...defaultProps} />);

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

      render(<AdventureGame {...defaultProps} />);

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
      render(<AdventureGame {...defaultProps} />);

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
      render(<AdventureGame {...defaultProps} />);

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
      render(<AdventureGame {...defaultProps} />);

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
      render(<AdventureGame {...defaultProps} />);

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
