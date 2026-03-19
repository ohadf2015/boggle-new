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
  onLevelComplete: jest.fn(),
  onExit: jest.fn(),
};

// ==============================================
// MOCKS
// ==============================================

jest.mock('@/contexts/LanguageContext', () => {
  const langValue = {
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  };
  return {
    useLanguage: () => langValue,
    useLanguageSafe: () => langValue,
  };
});

// Mock useAdventureGame to return "playing" state
const mockSubmitWordWithPath = jest.fn();
jest.mock('@/hooks/useAdventureGame', () => ({
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
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    completeLevel: jest.fn(),
    resetGame: jest.fn(),
    markCascadeComplete: jest.fn(),
    isCascading: false,
    cascadePhase: null,
    addTime: jest.fn(),
    regenerateGrid: jest.fn(),
  }),
}));

// Mock entry phase to be in "playing" state
jest.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    handleCascadeComplete: jest.fn(),
    handleObjectivesComplete: jest.fn(),
    handleTitleComplete: jest.fn(),
  }),
}));

// Track validateWord calls to verify submission reaches validation
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

// React selection hook returns EMPTY state (simulating external submission)
const mockSelectTile = jest.fn();
const mockClearSelection = jest.fn();
const mockGetPath = jest.fn().mockReturnValue([]);

jest.mock('@/hooks/useAdventureSelection', () => ({
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

jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    recordAttempt: jest.fn(),
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

jest.mock('@/hooks/useAdaptiveDifficulty', () => ({
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
    recordCompletion: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: true,
    getHint: jest.fn(() => null),
    currentHint: null,
    clearCurrentHint: jest.fn(),
    recordActivity: jest.fn(),
    showAutoHint: false,
    dismissAutoHint: jest.fn(),
    isLoading: false,
    error: null,
    remainingHintWords: [],
    findPathForWord: jest.fn(() => null),
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
    playMusic: jest.fn(),
    pauseMusic: jest.fn(),
    resumeMusic: jest.fn(),
    isPlaying: false,
    currentTrack: null,
  }),
}));

jest.mock('framer-motion', () => {
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
    motion: {
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

jest.mock('@/contexts/AdventureThemeContext', () => {
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
      setWorld: jest.fn(),
      setLevel: jest.fn(),
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

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playComboBreakSound: jest.fn(),
    playCountdownBeep: jest.fn(),
    playComboMilestoneSound: jest.fn(),
    playComboSavedSound: jest.fn(),
    setGameActive: jest.fn(),
    playAchievementSound: jest.fn(),
    playSound: jest.fn(),
    playWordSound: jest.fn(),
    playGameStartSound: jest.fn(),
    playGameEndSound: jest.fn(),
    playSoloGameSound: jest.fn(),
  }),
}));

// Capture the onWordSubmit callback from GameGridArea
let capturedOnWordSubmit: ((word: string, indices: number[]) => void) | null = null;
let capturedGridProps: any = null;

jest.mock('../ui', () => {
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

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame Word Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedOnWordSubmit = null;
  });

  afterEach(() => {
    jest.useRealTimers();
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
    render(<AdventureGame {...defaultProps} />);
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
    render(<AdventureGame {...defaultProps} />);
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
    render(<AdventureGame {...defaultProps} />);
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
    render(<AdventureGame {...defaultProps} />);
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
    render(<AdventureGame {...defaultProps} />);
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
