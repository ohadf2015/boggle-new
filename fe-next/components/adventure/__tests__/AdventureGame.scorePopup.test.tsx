/**
 * AdventureGame - Score Popup Animation Tests
 *
 * Tests score popup integration with ScorePopupFly component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGame from '../AdventureGame';

// Mock all dependencies
jest.mock('@/hooks/useAdventureGame');
jest.mock('@/hooks/useAdventureWordValidation');
jest.mock('@/hooks/useAdventureSelection');
// Note: useDevicePerformance is mocked globally in jest.setup.js
jest.mock('@/contexts/LanguageContext', () => {
  const value = {
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  };
  return { useLanguage: () => value, useLanguageSafe: () => value };
});

// Mock useAdaptiveDifficulty hook
jest.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: {
      world: 1,
      level: 1,
      gridSize: 4,
      timerSeconds: 120,
      objectives: [{ type: 'scoreTarget', target: 100, isPrimary: true }],
      specialTiles: [],
      difficulty: 'MEDIUM',
      chapterNumber: 1,
      levelInChapter: 1,
      isBossLevel: false,
    },
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: jest.fn(),
  }),
}));

// Mock framer-motion
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

  // Mock MotionValue for useSpring/useTransform
  const createMotionValue = (initial: any) => {
    let currentValue = initial;
    const listeners: ((v: any) => void)[] = [];
    return {
      get: () => currentValue,
      set: (v: any) => {
        currentValue = v;
        listeners.forEach(l => l(v));
      },
      on: (_event: string, callback: (v: any) => void) => {
        listeners.push(callback);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx !== -1) listeners.splice(idx, 1);
        };
      },
      onChange: (callback: (v: any) => void) => {
        listeners.push(callback);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx !== -1) listeners.splice(idx, 1);
        };
      },
      current: initial,
    };
  };

  const useSpring = (initial: any) => createMotionValue(typeof initial === 'object' ? 0 : initial);
  const useTransform = (motionValue: any, transformer: (v: any) => any) => {
    const result = createMotionValue(transformer(motionValue.get()));
    return result;
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
    useSpring,
    useTransform,
  };
});

// Mock MusicContext - adventure mode stops global music when it starts
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

// Mock ProgressionContext - required by AdventureGame
jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: {
      userId: 'test-user',
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      playerLevel: 1,
      completions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
    completeLevel: jest.fn(),
    recordAttempt: jest.fn(),
    isWorldUnlocked: jest.fn(() => true),
    isLevelUnlocked: jest.fn(() => true),
    getWorldStars: jest.fn(() => 0),
    getLevelCompletion: jest.fn(() => undefined),
    getLevelAttempt: jest.fn(() => undefined),
    refreshProgression: jest.fn(),
    attempts: [],
  }),
  ProgressionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AdventureThemeContext
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

// Mock SoundEffectsContext
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

// Define the expected props type for ScorePopup
interface ScorePopupProps {
  score: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  comboMultiplier?: number;
  onComplete?: () => void;
}

// Mock ScorePopup to capture props
const mockScorePopup = jest.fn<null, [ScorePopupProps]>();
jest.mock('../juice/ScorePopup', () => ({
  ScorePopup: (props: ScorePopupProps) => {
    mockScorePopup(props);
    return <div data-testid="score-popup-fly">ScorePopup</div>;
  },
}));

// Mock child components
jest.mock('../AdventureGrid', () => {
  const React = require('react');
  const MockGrid = React.forwardRef(function AdventureGrid() {
    return React.createElement('div', { 'data-testid': 'adventure-grid' }, 'Grid');
  });
  MockGrid.displayName = 'AdventureGrid';
  return { __esModule: true, default: MockGrid };
});

jest.mock('../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="objectives">Objectives</div>,
}));

jest.mock('../AdventureTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="timer">Timer</div>,
}));

jest.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => <div data-testid="level-complete-modal">Modal</div>,
}));

jest.mock('../themed/WorldBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="world-background">Background</div>,
}));

jest.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="gameplay-background">Background</div>,
}));

// Minimal level config
const mockLevelConfig = {
  level: 1,
  world: 1,
  gridSize: 4 as const,
  timerSeconds: 120,
  objectives: [
    {
      type: 'scoreTarget' as const,
      target: 100,
      current: 0,
      isComplete: false,
    },
  ],
  specialTiles: [],
  difficulty: 'MEDIUM' as const,
  chapterNumber: 1 as const,
  levelInChapter: 1 as const,
  isBossLevel: false,
};

const mockInitialGrid = [
  ['H', 'E', 'L', 'L'],
  ['O', 'W', 'O', 'R'],
  ['L', 'D', 'T', 'E'],
  ['S', 'T', 'A', 'R'],
];

// Use global mock from jest.setup.js
 
const mockUseDevicePerformance = (global as any).mockUseDevicePerformance;

describe('AdventureGame - Score Popup Animation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock hooks with proper types
    const { useAdventureGame } = require('@/hooks/useAdventureGame');
    const { useAdventureWordValidation } = require('@/hooks/useAdventureWordValidation');
    const { useAdventureSelection } = require('@/hooks/useAdventureSelection');

    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableGlowEffects: true,
      enableComplexAnimations: true,
      targetFPS: 60,
      throttleMs: 16,
      reduceParticles: false,
      maxParticles: 20,
      isSlowConnection: false,
      isMobile: false,
    });

    useAdventureGame.mockReturnValue({
      gameState: {
        score: 0,
        wordsFound: [],
        comboCount: 1,
        stars: 0,
        isComplete: false,
        levelConfig: mockLevelConfig,
        tiles: [],
        objectives: mockLevelConfig.objectives,
        cascadeActive: false,
      },
      tiles: [
        [{ letter: 'H', type: 'normal' }, { letter: 'E', type: 'normal' }, { letter: 'L', type: 'normal' }, { letter: 'L', type: 'normal' }],
        [{ letter: 'O', type: 'normal' }, { letter: 'W', type: 'normal' }, { letter: 'O', type: 'normal' }, { letter: 'R', type: 'normal' }],
        [{ letter: 'L', type: 'normal' }, { letter: 'D', type: 'normal' }, { letter: 'T', type: 'normal' }, { letter: 'E', type: 'normal' }],
        [{ letter: 'S', type: 'normal' }, { letter: 'T', type: 'normal' }, { letter: 'A', type: 'normal' }, { letter: 'R', type: 'normal' }],
      ],
      tilesVersion: 1,
      objectives: mockLevelConfig.objectives,
      timeRemaining: 120,
      canComplete: false,
      isPlaying: true,
      cascadeComplete: true,
      submitWordWithPath: jest.fn(),
      startGame: jest.fn(),
      pauseGame: jest.fn(),
      completeLevel: jest.fn(),
      resetGame: jest.fn(),
      markCascadeComplete: jest.fn(),
      isCascading: false,
      cascadePhase: 'none',
      addTime: jest.fn(),
    });

    useAdventureWordValidation.mockReturnValue({
      validateWord: jest.fn(),
      isValidating: false,
    });

    useAdventureSelection.mockReturnValue({
      selectedIndices: [],
      currentWord: '',
      isSelecting: false,
      selectTile: jest.fn(),
      clearSelection: jest.fn(),
      getPath: jest.fn(() => []),
      pathPoints: [],
    });
  });


  test('score display has ref attached', () => {
    render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    const scoreDisplay = screen.getByTestId('score-display');
    expect(scoreDisplay).toBeInTheDocument();
  });



  // Note: Combo display UI has been removed per user request to reduce visual clutter
  // Combo mechanics still function internally but are no longer displayed
});
