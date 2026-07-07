import React from 'react';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
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
    TRACKS: { BOSSA_ARCADE: 'bossa_arcade', MENU: 'menu', GAME: 'game' },
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

const mockGrid: LetterGrid = [
  ['H', 'O', 'U'],
  ['S', 'E', 'L'],
  ['T', 'A', 'P'],
];

// Regression test for the Class-5 layout-shift pitfall: the category hint,
// example hint, and discovered-words list all mount conditionally mid-round.
// Without a reserved slot, unlocking a hint or finding the first word shifts
// the grid below/above it. These wrappers must exist from first render,
// before any hint is unlocked or word found — proving the slot is reserved
// up front rather than appearing only once content exists.
describe('DailyWordHuntSurvival - reserved layout slots (no CLS)', () => {
  const mockOnComplete = vi.fn();
  const mockOnQuit = vi.fn();

  it('reserves the category hint slot before any hint is unlocked', () => {
    render(
      <DailyWordHuntSurvival
        grid={mockGrid}
        puzzleNumber={1}
        language="en"
        targetWord="HOUSE"
        onComplete={mockOnComplete}
        onQuit={mockOnQuit}
      />
    );
    expect(screen.getByTestId('wordhunt-category-slot')).toBeInTheDocument();
  });

  it('reserves the example hint slot before any hint is unlocked', () => {
    render(
      <DailyWordHuntSurvival
        grid={mockGrid}
        puzzleNumber={1}
        language="en"
        targetWord="HOUSE"
        onComplete={mockOnComplete}
        onQuit={mockOnQuit}
      />
    );
    expect(screen.getByTestId('wordhunt-example-slot')).toBeInTheDocument();
  });

  it('reserves the discovered-words slot before any word is found', () => {
    render(
      <DailyWordHuntSurvival
        grid={mockGrid}
        puzzleNumber={1}
        language="en"
        targetWord="HOUSE"
        onComplete={mockOnComplete}
        onQuit={mockOnQuit}
      />
    );
    const slot = screen.getByTestId('wordhunt-discovered-words-slot');
    expect(slot).toBeInTheDocument();
    expect(slot.className).toMatch(/min-h-\[64px\]/);
  });
});
