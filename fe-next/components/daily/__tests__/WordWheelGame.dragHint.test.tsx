/**
 * exp-wordwheel-drag-hint-v1: the drag-hint arm surfaces the shared stuck coach
 * after a short idle (the wheel rage-click root cause); control shows nothing.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGrowthEvent = vi.fn();
const trackExposure = vi.fn();
let variant: 'control' | 'drag-hint' = 'drag-hint';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant, trackExposure }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (k: string) => k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(), playWordAcceptedSound: vi.fn(), playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(), playLegendaryWordSound: vi.fn(), playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(), playBoardShuffleSound: vi.fn(), playButtonClickSound: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWordWheelKeyboard', () => ({ useWordWheelKeyboard: () => ({ keyboardFocused: false }) }));
vi.mock('../WordWheelPixiRing', () => ({ __esModule: true, default: () => <div data-testid="pixi-ring-stub" /> }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => <div data-testid="dynamic-stub" /> }));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({ isValidWordWheelWord: () => false }));
vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({ scoreWord: () => 0 }));

vi.mock('@/components/mascot/GameMascotReactions', () => ({ GameMascotReactions: () => null }));
import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle = {
  centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: ['CAB'], language: 'en',
} as unknown as WordWheelPuzzle;

const renderGame = (props: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) =>
  render(
    <WordWheelGame puzzle={puzzle} duration={60} onComplete={vi.fn()} onValidateWord={vi.fn().mockResolvedValue(false)} onEffect={vi.fn()} language="en" {...props} />,
  );

describe('WordWheelGame drag-hint experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    variant = 'drag-hint';
    try { window.localStorage.clear(); } catch { /* ignore */ }
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  });
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

  it('shows the stuck coach after idle in the drag-hint arm + tracks shown and dismissed', () => {
    renderGame();
    expect(screen.queryByTestId('mp-stuck-coach-card')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(7000); });
    expect(screen.getByTestId('mp-stuck-coach-card')).toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('wordwheel_drag_hint_shown', expect.any(Object));

    act(() => { screen.getByRole('button', { name: 'mpCoach.dismiss' }).click(); });
    expect(screen.queryByTestId('mp-stuck-coach-card')).not.toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('wordwheel_drag_hint_dismissed', expect.any(Object));
  });

  it('never shows the coach in the control arm', () => {
    variant = 'control';
    renderGame();
    act(() => { vi.advanceTimersByTime(15000); });
    expect(screen.queryByTestId('mp-stuck-coach-card')).not.toBeInTheDocument();
  });

  it('leaves practice to its practice tip', () => {
    renderGame({ practice: true });
    act(() => { vi.advanceTimersByTime(15000); });
    expect(screen.queryByTestId('mp-stuck-coach-card')).not.toBeInTheDocument();
  });

  it('still coaches a Quick Play practice round, where the practice tip is hidden', () => {
    renderGame({ practice: true, hideModeCoach: true });
    act(() => { vi.advanceTimersByTime(7000); });
    expect(screen.getByTestId('mp-stuck-coach-card')).toBeInTheDocument();
  });
});
