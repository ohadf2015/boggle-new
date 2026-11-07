import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyWordHuntSurvival from '../DailyWordHuntSurvival';
import type { LetterGrid } from '@/types';

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const { initial, animate, exit, whileHover, whileTap, transition, variants, layout, ...domProps } = props;
    return domProps;
  };
  const motion = {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...strip(props)}>{children}</div>,
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...strip(props)}>{children}</span>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...strip(props)}>{children}</button>,
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
    TRACKS: { BOSSA_ARCADE: 'bossa_arcade', MENU: 'menu', GAME: 'game' },
  }),
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

// Quick Play hands the hunt a 60-second round. The clock takes the life bar's
// row (a timed round has no life drain, so the bar would sit at 100 forever),
// the round ends when it runs out, and the rows that only held empty space
// give their height back to the board.
describe('DailyWordHuntSurvival - timed round (Quick Play)', () => {
  const renderHunt = (props: Partial<React.ComponentProps<typeof DailyWordHuntSurvival>> = {}) =>
    render(
      <DailyWordHuntSurvival
        grid={mockGrid}
        puzzleNumber={0}
        language="en"
        targetWord="HOUSE"
        practice
        onComplete={vi.fn()}
        onQuit={vi.fn()}
        {...props}
      />
    );

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a 1:00 clock in place of the life bar', () => {
    renderHunt({ timeLimitSec: 60 });
    expect(screen.getByTestId('hunt-round-clock-value').textContent).toBe('1:00');
    expect(screen.getByTestId('hunt-clock-row')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-life-row')).toBeNull();
  });

  it('gives the empty feedback and hint rows back to the board', () => {
    renderHunt({ timeLimitSec: 60 });
    expect(screen.queryByTestId('hunt-feedback-row')).toBeNull();
    expect(screen.queryByTestId('wordhunt-category-slot')).toBeNull();
    expect(screen.queryByTestId('wordhunt-example-slot')).toBeNull();
    // The found-words slot stays fixed so a found word never resizes the board.
    expect(screen.getByTestId('wordhunt-discovered-words-slot').className).toMatch(/(^|\s)h-\[64px\]/);
  });

  it('ends the round with "time\'s up" when the clock runs out', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    renderHunt({ timeLimitSec: 60 });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('hunt-round-clock-value').textContent).toBe('0:30');
    expect(screen.queryByTestId('hunt-finish')).toBeNull();
    act(() => { vi.advanceTimersByTime(31_000); });
    const finish = screen.getByTestId('hunt-finish');
    expect(finish.dataset.outcome).toBe('loss');
    expect(finish.textContent).toContain('wordWheel.gameOver');
  });

  it('keeps the daily challenge untimed: life bar, feedback and hint rows as before', () => {
    renderHunt({ practice: false });
    expect(screen.queryByTestId('hunt-round-clock')).toBeNull();
    expect(screen.getByTestId('hunt-life-row')).toBeInTheDocument();
    expect(screen.getByTestId('hunt-feedback-row')).toBeInTheDocument();
    expect(screen.getByTestId('wordhunt-category-slot')).toBeInTheDocument();
  });
});
