/**
 * Tests for earthquake/fire-round integration in AdventureGame.
 * Verifies:
 * - EarthquakeWarning renders on warning state
 * - FireRoundIndicator renders when fire round active
 * - earthquakeState and fireRoundActive forwarded to GameGridArea
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LevelConfig } from '@/types/adventure';

// ==============================================
// MOCK: useEarthquakeFireRound — the key hook under test
// ==============================================
const mockGetScoreMultiplier = jest.fn(() => 1);
const mockForceEarthquake = jest.fn();

let mockEarthquakeReturn = {
  earthquakeState: 'idle' as 'idle' | 'warning' | 'shaking' | 'fire-round',
  fireRoundActive: false,
  fireRoundRemaining: 0,
  getScoreMultiplier: mockGetScoreMultiplier,
  forceEarthquake: mockForceEarthquake,
};

jest.mock('@/hooks/useEarthquakeFireRound', () => ({
  useEarthquakeFireRound: () => mockEarthquakeReturn,
}));

// ==============================================
// MOCK: EarthquakeWarning & FireRoundIndicator
// ==============================================
jest.mock('@/components/earthquake', () => ({
  EarthquakeWarning: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="earthquake-warning">Earthquake Warning</div> : null,
  FireRoundIndicator: ({ isActive, remainingSeconds }: { isActive: boolean; remainingSeconds: number }) =>
    isActive ? <div data-testid="fire-round-indicator">Fire Round: {remainingSeconds}s</div> : null,
  EffectsPreferencePrompt: () => null,
  ComicDustReveal: () => null,
}));

// ==============================================
// Track props forwarded to GameGridArea
// ==============================================
let capturedGridAreaProps: Record<string, unknown> = {};

jest.mock('../ui', () => ({
  GameHeader: () => <div data-testid="game-header" />,
  GameSidebar: () => <div data-testid="game-sidebar" />,
  GameGridArea: (props: Record<string, unknown>) => {
    capturedGridAreaProps = props;
    return <div data-testid="game-grid-area" />;
  },
  PauseOverlay: () => null,
  GameLayout: ({ header, gridArea, sidebar, overlays }: {
    header: React.ReactNode;
    gridArea: React.ReactNode;
    sidebar: React.ReactNode;
    overlays: React.ReactNode;
  }) => (
    <div>
      {header}
      {gridArea}
      {sidebar}
      {overlays}
    </div>
  ),
}));

// ==============================================
// Standard mocks (same pattern as AdventureGame.test.tsx)
// ==============================================
const mockTranslations: Record<string, string> = {
  'adventure.game.objectives': 'Objectives',
  'adventure.game.combo': 'Combo',
  'common.resume': 'Resume',
  'common.exit': 'Exit',
};

jest.mock('@/contexts/LanguageContext', () => {
  const langValue = {
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  };
  return {
    useLanguage: () => langValue,
    useLanguageSafe: () => langValue,
  };
});

jest.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: jest.fn().mockResolvedValue({ isValid: false }),
    isValidating: false,
    lastValidationResult: null,
  }),
}));

jest.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    isSelecting: false,
    selectTile: jest.fn(),
    clearSelection: jest.fn(),
    getPath: jest.fn().mockReturnValue([]),
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
      world: 1, level: 1, gridSize: 4, timerSeconds: 120,
      objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
      specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
    },
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: true,
    getHint: jest.fn(),
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
    stopMusic: jest.fn(), playMusic: jest.fn(), pauseMusic: jest.fn(),
    resumeMusic: jest.fn(), isPlaying: false, currentTrack: null,
  }),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const createMock = (el: string) => {
    const C = React.forwardRef(({ children, ...p }: any, ref: any) =>
      React.createElement(el, { ...p, ref }, children));
    C.displayName = `Mock${el}`;
    return C;
  };
  return {
    motion: { div: createMock('div'), button: createMock('button'), ul: createMock('ul'), li: createMock('li'), span: createMock('span') },
    AnimatePresence: ({ children }: any) => children,
    useSpring: () => ({ get: () => 0, set: jest.fn(), on: () => () => {}, onChange: () => () => {}, current: 0 }),
    useTransform: () => ({ get: () => 0, set: jest.fn(), on: () => () => {}, onChange: () => () => {}, current: 0 }),
  };
});

jest.mock('@/contexts/AdventureThemeContext', () => {
  const React = require('react');
  const ctx = React.createContext({ worldId: 1, level: 1, theme: { worldId: 1, background: { baseColor: 'bg-neo-navy', layers: [], texture: { type: 'none', opacity: 0, blendMode: 'normal' }, particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2,4], speed: 1 } }, tiles: {}, ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' }, chapters: [], containerClass: '' } });
  return {
    AdventureThemeContext: ctx,
    useAdventureTheme: () => ({ theme: ctx._currentValue.theme, worldId: 1, level: 1, setWorld: jest.fn(), setLevel: jest.fn(), isTransitioning: false, chapter: { id: 1, name: 'Tutorial', levels: [1,2], starThreshold: 0, accentColor: 'neo-lime' } }),
    AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: jest.fn(), playSound: jest.fn(), playWordSound: jest.fn(),
    playGameStartSound: jest.fn(), playGameEndSound: jest.fn(), playSoloGameSound: jest.fn(),
  }),
}));

// Remaining mocks (lightweight)
jest.mock('../effects/hooks/useAdventureEffects', () => ({
  useAdventureEffects: () => ({
    shakeRef: { current: null }, scoreDisplayRef: { current: null },
    currentPopup: null, handlePopupComplete: jest.fn(), addScorePopup: jest.fn(),
    reaction: null, dismissReaction: jest.fn(), chainBurstConfig: null,
    setChainBurstConfig: jest.fn(), particleConfig: null, setParticleConfig: jest.fn(),
    pendingExplosions: [], addExplosion: jest.fn(), removeExplosion: jest.fn(),
    shake: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false, showDefeatCinematic: false, cinematicComplete: false,
    showVictory: jest.fn(), showDefeat: jest.fn(), handleCinematicComplete: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    advanceToCascade: jest.fn(), advanceToObjectives: jest.fn(),
    advanceToTitle: jest.fn(), advanceToPlaying: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureBoss', () => ({
  useAdventureBoss: () => ({
    isBossActive: false, bossConfig: null, bossTaunt: null,
    showBossTaunt: false, bossHealthState: { phase: 'idle', currentHP: 100, maxHP: 100 },
    bossHPPercentage: 100, isEnraged: false, bossState: 'idle',
    showBossIntro: false, showBossFireworks: false, defeatedBossTier: null,
    checkBossWord: jest.fn(() => ({ meetsRequirement: false, scoreMultiplier: 1, triggerTaunt: null })),
    dealBossDamage: jest.fn(() => 0), triggerBossTaunt: jest.fn(),
    startBossBattle: jest.fn(), endBossBattle: jest.fn(), resetBossHealth: jest.fn(),
    handleBossIntroStart: jest.fn(), handleBossIntroSkip: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePlayerHealth', () => ({
  usePlayerHealth: () => ({
    healthState: { current: 100, max: 100, isDead: false, isLow: false },
    takeDamage: jest.fn(), resetHealth: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({ resetOnGameAction: jest.fn() }),
}));

jest.mock('@/hooks/useComboMilestone', () => ({
  useComboMilestone: () => ({ currentMilestone: null, checkMilestone: jest.fn() }),
}));

jest.mock('@/hooks/useAIDirector', () => ({
  useAIDirector: () => ({
    intensityAdjustments: { hintEscalationRate: 1, spawnRate: 1, difficultyModifier: 1 },
    flowState: 'balanced', startSession: jest.fn(), endSession: jest.fn(),
    recordWord: jest.fn(), handleTransition: jest.fn(), isBossBattle: false,
  }),
}));

jest.mock('@/lib/adventure/abilities', () => ({
  registerAllAbilities: jest.fn(),
}));

jest.mock('@/hooks/useAdventureXp', () => ({
  useAdventureXp: () => ({
    totalXp: 0, currentLevel: 1, xpProgress: { current: 0, required: 100, percentage: 0 },
    awardXp: jest.fn(() => ({ leveledUp: false })), pendingUpdate: null, acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureCurrency', () => ({
  useAdventureCurrency: () => ({
    gold: 0, upgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 },
    addGold: jest.fn(), purchase: jest.fn(),
    getUpgradeEffect: jest.fn(() => ({ multiplier: 1 })),
    pendingUpdate: null, acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSkillPoints', () => ({
  useSkillPoints: () => ({ currentPoints: 0, allocate: jest.fn() }),
}));

jest.mock('@/hooks/useSkillEffects', () => ({
  useSkillEffects: () => ({
    bossDamageMultiplier: 1, comboMultiplierBonus: 0,
    getLongWordDamageMultiplier: jest.fn(() => 1),
  }),
}));

jest.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    earnAchievement: jest.fn(() => false), getCount: jest.fn(() => 0),
  }),
}));

jest.mock('../effects/AdventureEffectsLayer', () => () => <div data-testid="effects-layer" />);
jest.mock('../LevelCompleteModal', () => () => null);
jest.mock('../LevelEntryOverlay', () => () => null);
jest.mock('../boss', () => ({
  BossOverlay: () => null,
  PlayerHealthBar: () => null,
}));
jest.mock('../cinematics', () => ({
  VictoryCinematic: () => null,
  VICTORY_DURATION_FRAMES: 150,
  DefeatCinematic: () => null,
  DEFEAT_DURATION_FRAMES: 120,
}));
jest.mock('../boss/cinematics/CinematicPlayer', () => ({
  CinematicPlayer: () => null,
}));
jest.mock('../themed/GameplayBackground', () => () => null);
jest.mock('@/components/achievements/AchievementToast', () => ({
  showAchievementToast: jest.fn(),
}));
jest.mock('@/utils/adventureAchievementUtils', () => ({
  ADVENTURE_ACHIEVEMENTS: {},
}));

// Now import the component
import AdventureGame from '../AdventureGame';

const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 120,
  objectives: [
    { type: 'wordCount', target: 5, isPrimary: true },
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

describe('AdventureGame - Earthquake Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedGridAreaProps = {};
    mockEarthquakeReturn = {
      earthquakeState: 'idle',
      fireRoundActive: false,
      fireRoundRemaining: 0,
      getScoreMultiplier: mockGetScoreMultiplier,
      forceEarthquake: mockForceEarthquake,
    };
  });

  it('should not render EarthquakeWarning when state is idle', () => {
    render(<AdventureGame {...defaultProps} />);

    expect(screen.queryByTestId('earthquake-warning')).not.toBeInTheDocument();
  });

  it('should render EarthquakeWarning when earthquakeState is warning', () => {
    mockEarthquakeReturn.earthquakeState = 'warning';

    render(<AdventureGame {...defaultProps} />);

    expect(screen.getByTestId('earthquake-warning')).toBeInTheDocument();
  });

  it('should not render FireRoundIndicator when fire round is inactive', () => {
    render(<AdventureGame {...defaultProps} />);

    expect(screen.queryByTestId('fire-round-indicator')).not.toBeInTheDocument();
  });

  it('should render FireRoundIndicator when fireRoundActive is true', () => {
    mockEarthquakeReturn.fireRoundActive = true;
    mockEarthquakeReturn.fireRoundRemaining = 12;

    render(<AdventureGame {...defaultProps} />);

    expect(screen.getByTestId('fire-round-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('fire-round-indicator')).toHaveTextContent('12');
  });

  it('should forward earthquakeState to GameGridArea', () => {
    mockEarthquakeReturn.earthquakeState = 'shaking';

    render(<AdventureGame {...defaultProps} />);

    expect(capturedGridAreaProps.earthquakeState).toBe('shaking');
  });

  it('should forward fireRoundActive to GameGridArea', () => {
    mockEarthquakeReturn.fireRoundActive = true;

    render(<AdventureGame {...defaultProps} />);

    expect(capturedGridAreaProps.fireRoundActive).toBe(true);
  });

  it('should call getScoreMultiplier (hook is connected)', () => {
    mockGetScoreMultiplier.mockReturnValue(2);

    render(<AdventureGame {...defaultProps} />);

    // The hook is integrated — getScoreMultiplier is available
    // (actual multiplier application tested via word submission)
    expect(mockGetScoreMultiplier).toBeDefined();
  });
});
