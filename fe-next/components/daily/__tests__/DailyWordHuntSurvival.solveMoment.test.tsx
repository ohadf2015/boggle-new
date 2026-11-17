import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyWordHuntSurvival from '../DailyWordHuntSurvival';
import type { LetterGrid } from '@/types';

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, layout, ...domProps } = props as Record<string, unknown>;
      return React.createElement(tag, domProps, children as React.ReactNode);
    },
  });
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

const nav = vi.hoisted(() => ({ setIsInGame: vi.fn() }));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => nav.setIsInGame,
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

const type = (word: string) => {
  for (const ch of word) fireEvent.keyDown(document, { key: ch.toLowerCase() });
};

async function solve() {
  render(<DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={vi.fn()} onQuit={vi.fn()} />);
  type('house');
  fireEvent.keyDown(document, { key: 'Enter' });
  return screen.findByTestId('hunt-finish');
}

describe('DailyWordHuntSurvival solve moment', () => {
  beforeEach(() => {
    nav.setIsInGame.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  });

  it('Given the hidden word is found, Then the clue boxes fill with it and the board names the solve instead of praising a word', async () => {
    await solve();
    expect(screen.getAllByTestId('hunt-solved-letter').map((el) => el.textContent).join('')).toBe('HOUSE');
    expect(screen.getByTestId('hunt-finish-headline')).toHaveTextContent('wordHunt.survival.solved.title');
    expect(screen.queryByTestId('hunt-feedback-pill')).toBeNull();
    expect(screen.queryByTestId('hunt-finish-letter')).toBeNull();
  });

  it('Given the solve is being celebrated, Then the site navigation stays hidden until results take over', async () => {
    await solve();
    await waitFor(() => expect(nav.setIsInGame).toHaveBeenCalled());
    expect(nav.setIsInGame.mock.calls.at(-1)?.[0]).toBe(true);
  });
});
