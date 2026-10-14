import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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


const grid: LetterGrid = [
  ['H', 'O', 'U'],
  ['S', 'E', 'L'],
  ['T', 'A', 'P'],
];

function play() {
  return render(
    <DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={vi.fn()} onQuit={vi.fn()} />,
  );
}

const type = (word: string) => {
  for (const ch of word) fireEvent.keyDown(document, { key: ch });
};

describe('DailyWordHuntSurvival - same-length guess warning', () => {
  it('given the typed word is as long as the hidden word, then the clue card warns that submitting uses a try', async () => {
    play();
    type('house');
    await waitFor(() => expect(screen.getByTestId('match-target-warning')).toBeInTheDocument());
    // Phones hide the clue-card warning row (cramped), so the stage carries it too.
    expect(screen.getByTestId('hunt-stage-guess')).toBeInTheDocument();
  });

  it('given a shorter word, then there is no warning', async () => {
    play();
    type('hous');
    await waitFor(() => expect(screen.getByTestId('hunt-live-word').textContent).toBe('HOUS'));
    expect(screen.queryByTestId('match-target-warning')).toBeNull();
    expect(screen.queryByTestId('hunt-stage-guess')).toBeNull();
  });
});
