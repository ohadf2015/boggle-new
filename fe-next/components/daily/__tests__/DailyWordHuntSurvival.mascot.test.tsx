/** Daily Word Hunt drives the shared game mascot. */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyWordHuntSurvival from '../DailyWordHuntSurvival';
import type { LetterGrid } from '@/types';
import { _resetMascotBus, emitMascotEvent, subscribeMascotEvents } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

// Mock framer-motion to avoid matchMedia issues
// Reduced motion turns off the random comedy gags, so the reaction bubble is deterministic.
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
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

function renderHunt() {
  return render(
    <DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={vi.fn()} onQuit={vi.fn()} />,
  );
}

const type = (word: string) => {
  for (const ch of word) fireEvent.keyDown(document, { key: ch.toLowerCase() });
};

describe('DailyWordHuntSurvival mascot', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    localStorage.clear();
    _resetMascotBus();
    events = [];
  });

  it('tells the mascot when a word is turned down', async () => {
    renderHunt();
    subscribeMascotEvents((e) => events.push(e));
    type('ht');
    fireEvent.keyDown(document, { key: 'Enter' });
    await waitFor(() => expect(events.map((e) => e.kind)).toContain('word-rejected'));
  });

  it('mounts the mascot so a big word pops it in', () => {
    renderHunt();
    expect(screen.queryByTestId('blast-mascot-hud')).toBeNull();
    act(() => emitMascotEvent({ kind: 'word-submitted', wordLength: 6, gemLetterUsed: false }));
    expect(screen.getByTestId('blast-mascot-hud')).toBeInTheDocument();
  });
});
