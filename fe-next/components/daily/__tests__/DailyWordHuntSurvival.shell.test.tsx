import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyWordHuntSurvival from '../DailyWordHuntSurvival';
import type { LetterGrid } from '@/types';

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => {
  const motion = {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    li: ({ children, layout: _layout, transition: _transition, ...domProps }: React.PropsWithChildren<Record<string, unknown>>) => <li {...(domProps as object)}>{children}</li>,
  };
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>,
    domAnimation: {},
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

// Mock hooks and components
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  useLanguageSafe: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => vi.fn(),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playErrorSound: vi.fn(),
    setGameActive: vi.fn(),
    playSound: vi.fn(),
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    fadeToTrack: vi.fn(),
    isMuted: false,
    toggleMute: vi.fn(),
    TRACKS: {
      BOSSA_ARCADE: 'bossa_arcade',
      MENU: 'menu',
      GAME: 'game',
    },
  }),
}));


vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock useMediaQuery to simulate desktop view
const media = vi.hoisted(() => ({ shell: false }));
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn((query: string) => {
    if (query === '(min-width: 1024px) and (min-height: 600px)') return media.shell;
    return query === '(min-width: 768px)';
  }),
  useIsDesktop: vi.fn(() => true),
}));

const grid: LetterGrid = [
  ['H', 'O', 'U'],
  ['S', 'E', 'L'],
  ['T', 'A', 'P'],
];

function renderHunt(extra: Record<string, unknown> = {}) {
  return render(
    <DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={vi.fn()} onQuit={vi.fn()} {...extra} />,
  );
}

describe('DailyWordHuntSurvival in the desktop game shell', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  });

  it('given a daily puzzle, then the hunt renders one tree inside the shared shell (no separate desktop grid)', () => {
    renderHunt({ puzzleDate: '2026-10-10' });
    expect(screen.queryByTestId('desktop-grid')).toBeNull();
    expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('hunt');
    expect(within(screen.getByTestId('game-shell-stage')).getByRole('grid', { hidden: true })).toBeInTheDocument();
  });

  it('puts found words on the end rail and the hunt state + keys on the start rail', () => {
    renderHunt();
    expect(within(screen.getByTestId('game-shell-right')).getByTestId('shell-words')).toBeInTheDocument();
    const left = screen.getByTestId('game-shell-left');
    expect(within(left).getByTestId('shell-stat-tries')).toBeInTheDocument();
    expect(within(left).getByTestId('shell-keys')).toBeInTheDocument();
  });

  it('given quick-play rivals, then the start rail races them against the player', () => {
    renderHunt({ rivals: [{ username: 'Ada', score: 40 }] });
    const left = screen.getByTestId('game-shell-left');
    expect(within(left).getByTestId('shell-standing-me').getAttribute('data-me')).toBe('true');
    expect(within(left).getByText('Ada')).toBeInTheDocument();
  });

  describe('at the desktop shell size', () => {
    beforeEach(() => { media.shell = true; });
    afterEach(() => { media.shell = false; });

    it('given a desktop screen, then the life bar rides in the header row, once', () => {
      renderHunt({ puzzleDate: '2026-10-10' });
      const center = screen.getByTestId('survival-header-center');
      expect(within(center).getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getAllByRole('progressbar').filter((el) => el.closest('[data-testid=survival-header]'))).toHaveLength(1);
      expect(screen.queryByTestId('hunt-life-row')).toBeNull();
    });

    it('Given quick-play rivals on desktop, Then the standings show once, on the rail, not again in the header', () => {
      renderHunt({ rivals: [{ username: 'Ada', score: 40 }], practice: true });
      expect(within(screen.getByTestId('game-shell-left')).getByText('Ada')).toBeInTheDocument();
      expect(screen.queryByTestId('survival-rank-indicator')).toBeNull();
    });
  });

  it('given a phone, then the life bar keeps its own row under the clues', () => {
    renderHunt();
    expect(screen.queryByTestId('survival-header-center')).toBeNull();
    expect(within(screen.getByTestId('hunt-life-row')).getByRole('progressbar')).toBeInTheDocument();
  });

  it('Given quick-play rivals on a phone, Then the header keeps the live standing', () => {
    renderHunt({ rivals: [{ username: 'Ada', score: 40 }], practice: true });
    expect(screen.getByTestId('survival-rank-indicator')).toBeInTheDocument();
  });
});
