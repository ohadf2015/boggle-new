/**
 * Quick Play must never block a round with ModeCoach FTUE.
 * Adapter drives the real prop contract; each embedded game must receive
 * hideModeCoach so the coach gate stays closed for the arcade loop.
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const classicProps: Record<string, unknown>[] = [];
const huntProps: Record<string, unknown>[] = [];
const wheelProps: Record<string, unknown>[] = [];
const blastProps: Record<string, unknown>[] = [];

vi.mock('../QuickClassicBoard', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    classicProps.push(props);
    return <div data-testid="mock-classic" />;
  },
}));

vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    huntProps.push(props);
    return <div data-testid="mock-hunt" data-hide-coach={String(props.hideModeCoach)} />;
  },
}));

vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    wheelProps.push(props);
    return <div data-testid="mock-wheel" data-hide-coach={String(props.hideModeCoach)} />;
  },
}));

vi.mock('../BlastQuickRound', () => ({
  BlastQuickRound: (props: Record<string, unknown>) => {
    blastProps.push(props);
    return <div data-testid="mock-blast" data-hide-coach={String(props.hideModeCoach)} />;
  },
}));

const base = {
  seed: 's-coach',
  language: 'en',
  durationSec: 60,
  grid: [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ],
  totalWords: 10,
  perfectScore: 100,
} as const;

function config(mode: QuickRoundConfig['mode'], extra: Partial<QuickRoundConfig> = {}): QuickRoundConfig {
  return { mode, ...base, ...extra } as QuickRoundConfig;
}

describe('QuickModeAdapter — ModeCoach suppress for quick play', () => {
  beforeEach(() => {
    classicProps.length = 0;
    huntProps.length = 0;
    wheelProps.length = 0;
    blastProps.length = 0;
  });

  it('classic renders the MP board (InGameScreen has no ModeCoach to block the round)', async () => {
    render(
      <QuickModeAdapter
        config={config('classic')}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await screen.findByTestId('mock-classic');
    expect(classicProps).toHaveLength(1);
  });

  it('word-hunt passes hideModeCoach (practice alone still shows PracticeCoachTip)', async () => {
    render(
      <QuickModeAdapter
        config={config('word-hunt', { targetWord: 'TEST' })}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await screen.findByTestId('mock-hunt');
    expect(huntProps[0]?.hideModeCoach).toBe(true);
    // Keep practice for life-drain suppress — but coach must still be hard-off.
    expect(huntProps[0]?.practice).toBe(true);
  });

  it('wheel-rush passes hideModeCoach without practice (practice kills the timer)', async () => {
    render(
      <QuickModeAdapter
        config={config('wheel-rush', {
          words: ['cab'],
          wheel: {
            centerLetter: 'A',
            outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
            allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
            puzzleDate: '2026-07-08',
            language: 'en',
            puzzleNumber: 1,
          },
        })}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    await screen.findByTestId('mock-wheel');
    expect(wheelProps[0]?.hideModeCoach).toBe(true);
    expect(wheelProps[0]?.practice).not.toBe(true);
  });

  it('blast path receives hideModeCoach for parity (BlastGame has no coach; prop is harmless)', async () => {
    render(
      <QuickModeAdapter config={config('blast')} onDone={vi.fn()} onQuit={vi.fn()} />
    );
    await waitFor(() => expect(blastProps.length).toBeGreaterThan(0));
    expect(blastProps[0]?.hideModeCoach).toBe(true);
  });
});
