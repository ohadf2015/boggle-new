// @vitest-environment jsdom
/**
 * AdventureView Timer Performance Tests
 *
 * Verifies that AdventureView does NOT hold gameTimerState in React state
 * (which would cause full re-renders every ~5s during gameplay).
 *
 * After the fix:
 * - AdventureView passes `enabled: false` to useAdventureMusic during gameplay
 * - AdventureGame (memo-wrapped) handles music internally
 * - AdventureView no longer passes `onTimerStateChange` to AdventureGame
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ==============================================
// MOCKS
// ==============================================

const mockUseAdventureMusic = vi.fn().mockReturnValue({
  currentTrack: 1,
  stopMusic: vi.fn(),
  hasMusic: true,
});

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: (props: unknown) => mockUseAdventureMusic(props),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (el: string) => {
    const C = React.forwardRef(({ children, ...props }: any, ref: any) => {
      const filtered: any = {};
      for (const [k, v] of Object.entries(props)) {
        if (!['initial','animate','exit','transition','whileHover','whileTap','variants','custom','onAnimationComplete'].includes(k)) {
          filtered[k] = v;
        }
      }
      return React.createElement(el, { ...filtered, ref }, children);
    });
    C.displayName = `Motion_${el}`;
    return C;
  };
  const mv = { get: () => 0, set: vi.fn(), onChange: vi.fn(), on: vi.fn(() => vi.fn()), current: 0 };
  return {
    m: { div: createMockMotion('div'), button: createMockMotion('button'), span: createMockMotion('span'), p: createMockMotion('p') },
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: () => mv,
    useTransform: () => mv,
    useSpring: () => mv,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...p }: any) => React.createElement('a', { href, ...p }, children),
}));

vi.mock('next/dynamic', async () => {
  const adventureMod = await import('../AdventureGame');
  return {
    default: (_fn: any, _opts?: any) => {
      const Comp = (adventureMod as any).default || adventureMod;
      const D = (props: any) => React.createElement(Comp, props);
      D.displayName = 'NextDynamic';
      return D;
    },
  };
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...p }: any) => React.createElement('img', { src, alt, ...p }),
}));

vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({ x: { get: () => 0 }, y: { get: () => 0 }, isGyroActive: false }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', locale: 'en', language: 'en' }),
  useLanguageSafe: () => ({ t: (k: string) => k, dir: 'ltr', locale: 'en', language: 'en' }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
  NavigationProvider: ({ children }: any) => children,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ stopMusic: vi.fn(), volume: 0.5, isMuted: false }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), playComboSound: vi.fn(), setGameActive: vi.fn(), playCountdownBeep: vi.fn() }),
}));

vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({ enabled: true, setEnabled: vi.fn() }),
}));

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: {
      userId: 'u1', xp: 0, currentWorld: 1, currentLevel: 1,
      createdAt: '', updatedAt: '', totalStars: 6, playerLevel: 1,
      gold: 0, upgrades: {}, skillPoints: 0, skillTree: {}, runeFragments: 0,
      runes: [], completions: [
        { world: 1, level: 1, stars: 3, bestScore: 100, bestWords: 5, completedAt: '' },
        { world: 1, level: 2, stars: 3, bestScore: 100, bestWords: 5, completedAt: '' },
      ],
    },
    isLoading: false, error: null, completeLevel: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/contexts/AdventureThemeContext', () => ({
  AdventureThemeProvider: ({ children }: any) => children,
  useAdventureTheme: () => ({
    worldId: 1, currentLevel: 1,
    theme: {
      background: { baseColor: '#000', gradient: '', layers: [], texture: { type: 'none', opacity: 0, blendMode: 'normal' }, particles: { type: 'none', count: 0, colors: [], speed: 1, sizeRange: [1,2] }, ambientColor: '#000', ambientIntensity: 0 },
      containerClass: '', colors: { primary: '#000', secondary: '#fff', accent: '#f00' },
    },
    isTransitioning: false, setWorld: vi.fn(), setLevel: vi.fn(),
    getTileConfig: vi.fn(), getChapter: vi.fn(), isBoss: vi.fn(() => false), getLevelPosition: vi.fn(() => 1),
  }),
  useHUDTheme: () => ({ headerBg: '', headerBorder: '', sidebarBg: '', scoreAccent: '', levelBadgeColor: '', levelBadgeText: '', objectiveAccent: '', hintActiveColor: '', hintActiveText: '' }),
  useTimerTheme: () => ({
    normal: { bg: '', text: '', shadow: '' },
    warning: { bg: '', text: '', shadow: '' },
    danger: { bg: '', text: '', shadow: '' },
    critical: { bg: '', text: '', shadow: '' },
  }),
  useBossFightTheme: () => ({}),
}));

vi.mock('@/lib/adventure', () => ({
  WORLD_CONFIGS: [], LEVELS_PER_WORLD: 7, WORLDS_COUNT: 10,
  getWorldConfig: (w: number) => ({ id: w, name: `W${w}`, description: '', world: w, levels: 7, requiredStars: 0, theme: 'forest' }),
  getLevelConfig: () => ({
    world: 1, level: 1, gridSize: 4, timeLimit: 120, timerSeconds: 120,
    objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
    specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
  }),
  generateAdventureGrid: () => [['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],
  getLevelSeed: () => 'seed', getGridSize: () => 4, WORLDS: [{ id: 1, name: 'W1', requiredStars: 0 }],
  applyGemDetectorBoost: (_tiles: any) => _tiles,
}));

vi.mock('@/lib/adventure/weeklyChallenge', () => ({
  getWeeklyChallengeConfig: () => ({ weekId: 'w', grid: [['A']], gridSize: 4, timerSeconds: 120, resetMs: 0 }),
  getCurrentWeekId: () => 'w',
}));


vi.mock('../AdventureHub', () => ({
  default: ({ onOpenWorldMap }: any) => (
    <div data-testid="hub">
      <button data-testid="hub-map" onClick={onOpenWorldMap}>Map</button>
    </div>
  ),
}));

vi.mock('../WorldMap', () => ({
  default: ({ onWorldSelect }: any) => (
    <div data-testid="world-map">
      <button data-testid="w1" onClick={() => onWorldSelect(1)}>W1</button>
    </div>
  ),
}));

vi.mock('../LevelGrid', () => ({
  default: ({ onLevelSelect }: any) => (
    <div data-testid="level-grid">
      <button data-testid="lvl1" onClick={() => onLevelSelect(1, 1)}>L1</button>
    </div>
  ),
}));

// AdventureGame mock: captures props for assertion
const mockAdventureGameRender = vi.fn();
vi.mock('../AdventureGame', () => ({
  default: (props: any) => {
    mockAdventureGameRender(props);
    return <div data-testid="game"><button onClick={props.onExit}>Exit</button></div>;
  },
}));

vi.mock('../WordAlbumPanel', () => ({ default: () => null }));
vi.mock('../WeeklyChallengePanel', () => ({ default: () => null }));

// ==============================================
// IMPORT UNDER TEST
// ==============================================

import AdventureView from '../AdventureView';

// ==============================================
// TESTS
// ==============================================

describe('AdventureView timer performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT pass onTimerStateChange to AdventureGame (timer state lifted out)', () => {
    render(<AdventureView />);
    // Returning players start at hub, navigate to worldMap first
    fireEvent.click(screen.getByTestId('hub-map'));
    fireEvent.click(screen.getByTestId('w1'));
    fireEvent.click(screen.getByTestId('lvl1'));

    expect(screen.getAllByTestId('game').length).toBeGreaterThan(0);
    const lastProps = mockAdventureGameRender.mock.calls[mockAdventureGameRender.mock.calls.length - 1][0];
    // onTimerStateChange must NOT be passed — AdventureGame manages music directly
    expect(lastProps.onTimerStateChange).toBeUndefined();
  });

  it('useAdventureMusic is disabled during gameplay so timer ticks stay isolated to AdventureGame', () => {
    render(<AdventureView />);
    // Returning players start at hub, navigate to worldMap first
    fireEvent.click(screen.getByTestId('hub-map'));
    fireEvent.click(screen.getByTestId('w1'));
    mockUseAdventureMusic.mockClear();
    fireEvent.click(screen.getByTestId('lvl1'));

    const calls = mockUseAdventureMusic.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastArgs = calls[calls.length - 1][0];
    expect(lastArgs.enabled).toBe(false);
  });

  it('useAdventureMusic is enabled in ambient mode (non-gameplay)', () => {
    render(<AdventureView />);
    // Returning players start at hub, navigate to worldMap first
    fireEvent.click(screen.getByTestId('hub-map'));
    fireEvent.click(screen.getByTestId('w1'));

    const calls = mockUseAdventureMusic.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastArgs = calls[calls.length - 1][0];
    expect(lastArgs.enabled).toBe(true);
  });
});
