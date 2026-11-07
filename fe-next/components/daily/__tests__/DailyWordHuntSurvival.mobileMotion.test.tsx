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


const perf = vi.hoisted(() => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => perf }));

const effects = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [effects.reduced, vi.fn()] }));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
  useIsDesktop: vi.fn(() => false),
}));

vi.mock('../WordHuntEffectsCanvas', () => ({ default: () => <div data-testid="hunt-fx-canvas" /> }));

const grid: LetterGrid = [
  ['H', 'O', 'U'],
  ['S', 'E', 'L'],
  ['T', 'A', 'P'],
];

function renderHunt() {
  return render(
    <DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={vi.fn()} onQuit={vi.fn()} />,
  );
}

/** The board and word stage drop every tile, ribbon and pill animation when calm. */
function calmFlags() {
  const board = screen.getByRole('grid', { hidden: true }).parentElement as HTMLElement;
  return { board: board.getAttribute('data-calm'), stage: screen.getByTestId('hunt-stage').getAttribute('data-calm') };
}

describe('Word Hunt motion on phones', () => {
  beforeEach(() => {
    Object.assign(perf, { isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false });
    effects.reduced = false;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  });

  it('Given a capable phone, Then the board and stage animate', () => {
    renderHunt();
    expect(calmFlags()).toEqual({ board: 'false', stage: 'false' });
  });

  // A phone in Low Power Mode or battery saver runs at 30fps and gets flagged low-end at
  // runtime; so do Data Saver and 2GB phones. That flag is for the particle layer, not for
  // the tile lift, path pop and word pill, which are cheap transform animations.
  it('Given a phone flagged low-end, Then the tiles and word pill still animate', () => {
    Object.assign(perf, { isLowEnd: true, enableComplexAnimations: false });
    renderHunt();
    expect(calmFlags()).toEqual({ board: 'false', stage: 'false' });
  });

  it('Given the player switched effects off, Then the board and stage are still', () => {
    effects.reduced = true;
    renderHunt();
    expect(calmFlags()).toEqual({ board: 'true', stage: 'true' });
  });

  it('Given the OS asks for reduced motion, Then the board and stage are still', () => {
    Object.assign(perf, { prefersReducedMotion: true, enableComplexAnimations: false });
    renderHunt();
    expect(calmFlags()).toEqual({ board: 'true', stage: 'true' });
  });

  describe('the particle layer', () => {
    let rect: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 390, height: 700, top: 0, left: 0, right: 390, bottom: 700, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    });
    afterEach(() => rect.mockRestore());

    it('Given a capable phone, Then the particle layer is mounted', async () => {
      renderHunt();
      expect(await screen.findByTestId('hunt-fx-canvas')).toBeInTheDocument();
    });

    it('Given a phone flagged low-end, Then the particle layer stays off while the board animates', () => {
      Object.assign(perf, { isLowEnd: true, enableComplexAnimations: false });
      renderHunt();
      expect(screen.queryByTestId('hunt-fx-canvas')).toBeNull();
      expect(calmFlags().board).toBe('false');
    });
  });
});
