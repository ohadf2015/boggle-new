// @vitest-environment jsdom
/**
 * AdventureGame Word Feedback Tests
 *
 * Tests that word submission uses the passed word/indices parameters
 * (not internal React selection state) so explicit word/indices
 * submissions work correctly.
 *
 * BUG: handleWordSubmit ignored _word and _indices params, using
 * currentWord from useAdventureSelection instead. When submitting
 * with explicit params, React selection is empty → submission silently aborted.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
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

vi.mock('@/contexts/LanguageContext', () => {
  const langValue = {
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  };
  return {
    useLanguage: () => langValue,
    useLanguageSafe: () => langValue,
  };
});

// Mock useAdventureGame to return "playing" state
const mockSubmitWordWithPath = vi.fn();
vi.mock('@/hooks/useAdventureGame', () => ({
  useAdventureGame: () => ({
    gameState: { score: 0, wordsFound: [], comboCount: 0, stars: 0, maxCombo: 0 },
    tiles: [
      [
        { letter: 'C', type: 'standard', isCleared: false },
        { letter: 'A', type: 'standard', isCleared: false },
        { letter: 'T', type: 'standard', isCleared: false },
        { letter: 'S', type: 'standard', isCleared: false },
      ],
      [
        { letter: 'D', type: 'standard', isCleared: false },
        { letter: 'O', type: 'standard', isCleared: false },
        { letter: 'G', type: 'standard', isCleared: false },
        { letter: 'E', type: 'standard', isCleared: false },
      ],
      [
        { letter: 'B', type: 'standard', isCleared: false },
        { letter: 'I', type: 'standard', isCleared: false },
        { letter: 'R', type: 'standard', isCleared: false },
        { letter: 'D', type: 'standard', isCleared: false },
      ],
      [
        { letter: 'F', type: 'standard', isCleared: false },
        { letter: 'I', type: 'standard', isCleared: false },
        { letter: 'S', type: 'standard', isCleared: false },
        { letter: 'H', type: 'standard', isCleared: false },
      ],
    ],
    tilesVersion: 1,
    objectives: [
      { type: 'wordCount', target: 5, current: 0, isPrimary: true, isComplete: false },
    ],
    timeRemaining: 120,
    canComplete: false,
    isPlaying: true,
    cascadeComplete: true,
    submitWordWithPath: mockSubmitWordWithPath,
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    completeLevel: vi.fn(),
    resetGame: vi.fn(),
    markCascadeComplete: vi.fn(),
    isCascading: false,
    cascadePhase: null,
    addTime: vi.fn(),
    regenerateGrid: vi.fn(),
  }),
}));

// Mock entry phase to be in "playing" state
vi.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    handleCascadeComplete: vi.fn(),
    handleObjectivesComplete: vi.fn(),
    handleTitleComplete: vi.fn(),
  }),
}));

// Track validateWord calls to verify submission reaches validation
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

// React selection hook returns EMPTY state (simulating external submission)
const mockSelectTile = vi.fn();
const mockClearSelection = vi.fn();
const mockGetPath = vi.fn().mockReturnValue([]);

vi.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    isSelecting: false,
    selectTile: mockSelectTile,
    clearSelection: mockClearSelection,
    getPath: mockGetPath,
    pathPoints: [],
  }),
}));

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    recordAttempt: vi.fn(),
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
}));

vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: {
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
    },
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: true,
    getHint: vi.fn(() => null),
    currentHint: null,
    clearCurrentHint: vi.fn(),
    recordActivity: vi.fn(),
    showAutoHint: false,
    dismissAutoHint: vi.fn(),
    isLoading: false,
    error: null,
    remainingHintWords: [],
    findPathForWord: vi.fn(() => null),
  }),
}));

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: () => ({ currentTrack: 1, stopMusic: vi.fn(), hasMusic: false }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: vi.fn(),
    playMusic: vi.fn(),
    pauseMusic: vi.fn(),
    resumeMusic: vi.fn(),
    isPlaying: false,
    currentTrack: null,
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: any, ref: any) =>
        React.createElement(element, { ...props, ref }, children)
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };
  const createMotionValue = (initial: any) => {
    let currentValue = initial;
    const listeners: ((v: any) => void)[] = [];
    return {
      get: () => currentValue,
      set: (v: any) => { currentValue = v; listeners.forEach(l => l(v)); },
      on: (_event: string, callback: (v: any) => void) => {
        listeners.push(callback);
        return () => { const idx = listeners.indexOf(callback); if (idx !== -1) listeners.splice(idx, 1); };
      },
      onChange: (callback: (v: any) => void) => {
        listeners.push(callback);
        return () => { const idx = listeners.indexOf(callback); if (idx !== -1) listeners.splice(idx, 1); };
      },
      current: initial,
    };
  };
  return {
    m: {
      div: createMockMotion('div'),
      button: createMockMotion('button'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
      span: createMockMotion('span'),
    },
    AnimatePresence: ({ children }: any) => children,
    useSpring: (initial: any) => createMotionValue(typeof initial === 'object' ? 0 : initial),
    useTransform: (motionValue: any, transformer: (v: any) => any) => createMotionValue(transformer(motionValue.get())),
  };
});

vi.mock('@/contexts/AdventureThemeContext', () => {
  const React = require('react');
  const MockAdventureThemeContext = React.createContext({
    worldId: 1,
    level: 1,
    theme: {
      worldId: 1,
      background: {
        baseColor: 'bg-neo-navy',
        layers: [],
        texture: { type: 'none', opacity: 0, blendMode: 'normal' },
        particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 },
      },
      tiles: {},
      ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' },
      chapters: [],
      containerClass: 'adventure-world-1',
    },
  });
  return {
    AdventureThemeContext: MockAdventureThemeContext,
    useAdventureTheme: () => ({
      theme: {
        worldId: 1,
        background: {
          baseColor: 'bg-neo-navy',
          layers: [],
          texture: { type: 'none', opacity: 0, blendMode: 'normal' },
          particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 },
        },
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
      chapter: { id: 1, name: 'Tutorial', levels: [1, 2], starThreshold: 0, accentColor: 'neo-lime' },
    }),
    AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
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
      warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: 'shadow-[0_0_12px_rgba(255,107,53,0.3)]' },
      danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
      critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
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

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playComboBreakSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playComboMilestoneSound: vi.fn(),
    playComboSavedSound: vi.fn(),
    setGameActive: vi.fn(),
    playAchievementSound: vi.fn(),
    playSound: vi.fn(),
    playWordSound: vi.fn(),
    playGameStartSound: vi.fn(),
    playGameEndSound: vi.fn(),
    playSoloGameSound: vi.fn(),
  }),
}));

// Mock heavy composite hooks to prevent OOM from deep import trees
vi.mock('../effects/hooks/useAdventureEffects', () => ({
  useAdventureEffects: () => ({
    screenShake: { isShaking: false, trigger: vi.fn() },
    particleBudget: { canSpawn: vi.fn(() => true), record: vi.fn() },
    lexiReaction: null,
    scorePopups: [],
    addScorePopup: vi.fn(),
    pendingExplosions: [],
    addExplosion: vi.fn(),
    clearExplosion: vi.fn(),
    particles: [],
    addParticles: vi.fn(),
    chainBursts: [],
    addChainBurst: vi.fn(),
    triggerWordEffect: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    showWorldUnlockCinematic: false,
    worldUnlockData: null,
    triggerVictory: vi.fn(),
    triggerDefeat: vi.fn(),
    triggerWorldUnlock: vi.fn(),
    dismissCinematic: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureGameInit', () => ({
  useAdventureGameInit: () => ({
    tier: 'normal',
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: vi.fn(),
    adjustedLevelConfig: {
      world: 1, level: 1, gridSize: 4, timerSeconds: 120,
      objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
      specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
    },
    intensityAdjustments: { hintEscalationRate: 1, difficultyScale: 1, comboDecayRate: 1 },
    flowState: 'normal',
    startAIDirector: vi.fn(),
    endAIDirector: vi.fn(),
    recordAIWord: vi.fn(),
    handleAITransition: vi.fn(),
    isAIBossBattle: false,
    totalXp: 0, currentLevel: 1, xpProgress: 0, awardXp: vi.fn(),
    gold: 0, upgrades: {}, addGold: vi.fn(), purchase: vi.fn(),
    getUpgradeEffect: vi.fn(() => 0),
    upgradeBonuses: { scoreBonus: 1, goldBonus: 1 },
    upgradeEffects: {
      bonusTimeSeconds: 0, bossDamageMultiplier: 1, blockFirstAttack: false,
      bossHealPerWord: 0, goldMultiplier: 1, longWordGoldBonus: 0,
      doubleFirstCompletionGold: false, comboDecayMultiplier: 1, comboScoreMultiplier: 1,
      failureGold: 0, retryScoreRetention: 0, freeRetriesPerWorld: 0,
      hintRechargeMultiplier: 1, hintsPerLevel: 1, freeStartHint: false,
      specialTileBoost: 0, guaranteedGoldTile: false, iceTileReduction: false,
      bombTimerInvert: false, scrambleImmunity: false, shuffleUsesPerLevel: 0,
      canDetonateWords: false, bonusHintsPerLevel: 0, timeFreezeSeconds: 0,
      freezeHighlightsWord: false,
    },
    skillEffects: { bossDamageMultiplier: 1 },
    handleEarnAchievement: vi.fn(),
    currentMilestone: null, checkMilestone: vi.fn(),
    adjustedInactivityThresholdMs: 15000,
    runeEffects: { scoreMultiplier: 1, goldMultiplier: 1, timeBonus: 0, comboDecay: 1, hintBonus: 0, bossDamage: 1 },
    streakMultiplier: 1,
    weeklyModifiers: [],
  }),
}));

vi.mock('../hooks/useAdventureLevelCompletion', () => ({
  useAdventureLevelCompletion: () => ({
    handleLevelComplete: vi.fn(),
    goldEarned: 0,
  }),
}));

vi.mock('../hooks/useAdventureBossOrchestration', () => ({
  useAdventureBossOrchestration: () => ({
    bossState: null,
    bossActions: { dealDamage: vi.fn(), takeDamage: vi.fn() },
    isBossFight: false,
    isBossActive: false,
    bossCurrentHP: 0,
    bossMaxHP: 0,
    bossConfig: null,
    bossHealthState: { phase: 'phase1' },
    playerHealthState: { currentHP: 100, maxHP: 100, isDead: false },
    gridEffectTrigger: null,
    triggerBossTaunt: vi.fn(),
    handleBossWordSubmit: vi.fn(),
    dealBossDamage: vi.fn(),
    healPlayer: vi.fn(),
    resetPlayerHealth: vi.fn(),
    endBossBattle: vi.fn(),
    showBossIntro: false,
    showBossFireworks: false,
    handleBossIntroStart: vi.fn(),
    handleBossIntroSkip: vi.fn(),
    defeatedBossTier: null,
    lockedTiles: [],
    bossEffectCallbacks: { onTileFreeze: vi.fn(), onTileShuffle: vi.fn() },
    bossDialogue: null,
    bossTelegraph: null,
    bossPhase: null,
    bossDefeated: false,
  }),
}));

vi.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({
    isStuck: false,
    stuckDuration: 0,
    resetOnGameAction: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGemDetectorHighlights', () => ({
  useGemDetectorHighlights: () => ({
    highlightedTiles: [],
  }),
}));

vi.mock('@/hooks/useFlashChallenge', () => ({
  useFlashChallenge: () => ({
    activeChallenge: null,
    startChallenge: vi.fn(),
    checkWord: vi.fn(),
    completeChallenge: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChapterQuests', () => ({
  useChapterQuests: () => ({
    quests: [],
    refreshQuests: vi.fn(),
    recordProgress: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({
  useCrazyGamesLifecycle: () => ({
    gameplayStart: vi.fn(),
    gameplayStop: vi.fn(),
    happyTime: vi.fn(),
    loadingStart: vi.fn(),
    loadingStop: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureGameCallbacks', () => ({
  useAdventureGameCallbacks: () => ({
    handlePause: vi.fn(),
    handleResume: vi.fn(),
    handleExit: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureQuestTracking', () => ({
  useAdventureQuestTracking: () => ({}),
}));

vi.mock('../hooks/useAdventureGridInteraction', () => ({
  useAdventureGridInteraction: () => ({
    handleTileSelect: vi.fn(),
    handleTileDragEnd: vi.fn(),
  }),
}));

vi.mock('../AdventureGameOverlays', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../AdventureTailOverlays', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => null,
}));

// Capture the onWordSubmit callback from GameGridArea
let capturedOnWordSubmit: ((word: string, indices: number[]) => void) | null = null;
let capturedGridProps: any = null;

vi.mock('../ui', () => {
  const React = require('react');
  return {
    PremiumCard: () => null,
    RollingNumber: () => null,
    DigitRoller: () => null,
    VictoryCelebration: () => null,
    EnhancedTimer: () => null,
    GameHeader: (props: any) => <div data-testid="game-header">{props.children}</div>,
    GameSidebar: (props: any) => <div data-testid="game-sidebar">{props.children}</div>,
    GameGridArea: (props: any) => {
      // Capture the onWordSubmit for testing
      capturedOnWordSubmit = props.onWordSubmit;
      capturedGridProps = props;
      return (
        <div data-testid="game-grid-area" role="grid">
          <div data-testid="feedback-word">{props.currentWord || ''}</div>
          <div data-testid="feedback-type">{props.wordFeedback?.type || ''}</div>
          <div data-testid="feedback-error">{props.validationError || ''}</div>
          <div data-testid="was-submitted">{String(props.wasWordSubmitted)}</div>
        </div>
      );
    },
    PauseOverlay: (props: any) =>
      props.isVisible ? <div data-testid="pause-overlay" /> : null,
    GameLiveRegion: () => null,
    GameLayout: ({ header, gridArea, sidebar, overlays }: any) => (
      <div>
        {header}
        {gridArea}
        {sidebar}
        {overlays}
      </div>
    ),
  };
});

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame Word Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    capturedOnWordSubmit = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper: advance past the entry sequence so the game is in "playing" state
   */
  function advancePastEntrySequence() {
    // Run timers to get past cascade + objectives + title phases
    for (let i = 0; i < 15; i++) {
      act(() => { jest.runOnlyPendingTimers(); });
    }
  }

  it('should call validateWord when word is submitted with explicit word/indices', async () => {
    // GIVEN — React selection hook returns empty (simulating external submission)
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });
    advancePastEntrySequence();

    // Verify we captured the onWordSubmit callback from GameGridArea mock
    expect(capturedOnWordSubmit).toBeTruthy();

    // WHEN — submitting a word with explicit word and indices
    // "CAT" = tiles at (0,0)=C, (0,1)=A, (0,2)=T → indices [0, 1, 2]
    await act(async () => {
      capturedOnWordSubmit!('CAT', [0, 1, 2]);
    });

    // THEN — validateWord should have been called with "CAT" and the correct path
    expect(mockValidateWord).toHaveBeenCalledWith(
      'CAT',
      expect.arrayContaining([
        expect.objectContaining({ row: 0, col: 0 }),
        expect.objectContaining({ row: 0, col: 1 }),
        expect.objectContaining({ row: 0, col: 2 }),
      ])
    );
  });

  it('should show accepted feedback when explicitly-submitted word is valid', async () => {
    // GIVEN
    mockValidateWord.mockResolvedValueOnce({ isValid: true, score: 30 });
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });
    advancePastEntrySequence();

    // WHEN — submitting "CAT" with explicit indices
    await act(async () => {
      capturedOnWordSubmit!('CAT', [0, 1, 2]);
    });

    // THEN — feedback should show accepted state
    await waitFor(() => {
      expect(screen.getByTestId('was-submitted').textContent).toBe('true');
    });
    expect(screen.getByTestId('feedback-type').textContent).toBe('accepted');
  });

  it('should show rejected feedback when explicitly-submitted word is invalid', async () => {
    // GIVEN
    mockValidateWord.mockResolvedValueOnce({ isValid: false, errorKey: 'adventure.errors.notInDictionary' });
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });
    advancePastEntrySequence();

    // WHEN — submitting an invalid word with explicit indices
    await act(async () => {
      capturedOnWordSubmit!('XYZ', [0, 1, 2]);
    });

    // THEN — feedback should show error
    await waitFor(() => {
      expect(screen.getByTestId('feedback-error').textContent).toBeTruthy();
    });
    expect(screen.getByTestId('feedback-type').textContent).toBe('rejected');
  });

  it('should not submit when word is shorter than minWordLength', async () => {
    // GIVEN
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });
    advancePastEntrySequence();

    // WHEN — submit a word with only 1 letter (minWordLength is typically 3)
    await act(async () => {
      capturedOnWordSubmit!('C', [0]);
    });

    // THEN — validateWord should NOT be called
    expect(mockValidateWord).not.toHaveBeenCalled();
  });

  it('should convert indices to path using gridSize for validation', async () => {
    // GIVEN — gridSize is 4, so index 5 = row 1, col 1 (5 / 4 = 1.25 → row=1, 5 % 4 = 1 → col=1)
    mockValidateWord.mockResolvedValueOnce({ isValid: true, score: 50 });
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });
    advancePastEntrySequence();

    // WHEN — submit "DOG" at indices [4, 5, 6] = (1,0), (1,1), (1,2)
    await act(async () => {
      capturedOnWordSubmit!('DOG', [4, 5, 6]);
    });

    // THEN — path should be correctly converted from indices
    expect(mockValidateWord).toHaveBeenCalledWith(
      'DOG',
      [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ]
    );
  });
});
