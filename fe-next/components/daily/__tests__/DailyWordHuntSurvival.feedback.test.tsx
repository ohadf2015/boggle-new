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

/**
 * Word Hunt feedback restored from before the redesign: the result of the last
 * word stays readable under the clues (the board stage only flashes it), and a
 * word as long as the target warns that it will spend a try.
 */
describe('DailyWordHuntSurvival word feedback', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  });

  it('Given a word that is not on the board, When submitted, Then its result stays in the feedback pill', async () => {
    renderHunt();
    type('ht');
    fireEvent.keyDown(document, { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('hunt-feedback-pill')).toBeInTheDocument());
    const pill = screen.getByTestId('hunt-feedback-pill');
    expect(pill.getAttribute('data-type')).toBe('not-on-board');
    expect(pill.textContent).toContain('wordHunt.feedback.notOnBoardPenalty');
  });

  it('Given no word submitted yet, Then the pill row is reserved but empty so the board never jumps', () => {
    renderHunt();
    expect(screen.getByTestId('hunt-feedback-row')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-feedback-pill')).toBeNull();
  });

  it('Given a word as long as the target is being typed, Then the clues warn it will spend a try', async () => {
    renderHunt();
    type('hous');
    expect(screen.queryByTestId('match-target-warning')).toBeNull();
    type('e');
    await waitFor(() => expect(screen.getByTestId('match-target-warning')).toBeInTheDocument());
  });

  it('Given the target is solved, When the board locks, Then the answer pops over it and a tap opens results at once', async () => {
    const onComplete = vi.fn();
    render(<DailyWordHuntSurvival grid={grid} puzzleNumber={1} language="en" targetWord="HOUSE" onComplete={onComplete} onQuit={vi.fn()} />);
    type('house');
    fireEvent.keyDown(document, { key: 'Enter' });
    const finish = await screen.findByTestId('hunt-finish');
    expect(finish).toHaveAttribute('data-outcome', 'win');
    expect(screen.getAllByTestId('hunt-finish-letter').map(el => el.textContent).join('')).toBe('HOUSE');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(finish);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
