/**
 * exp-wordwheel-drag-hint-v1: the drag-hint arm surfaces the "swipe to spell"
 * coachmark after a short idle (the wheel rage-click root cause); control shows
 * nothing. Auto-suppresses via useMPFTUEIdle once a word is found.
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
vi.mock('@/components/multiplayer/MPDragCoachmark', () => ({
  MPDragCoachmark: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="drag-coachmark"><button onClick={onDismiss}>x</button></div>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
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

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle = {
  centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: ['CAB'], language: 'en',
} as unknown as WordWheelPuzzle;

const renderGame = () =>
  render(
    <WordWheelGame puzzle={puzzle} duration={60} onComplete={vi.fn()} onValidateWord={vi.fn().mockResolvedValue(false)} onEffect={vi.fn()} language="en" />,
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

  it('shows the drag coachmark after idle in the drag-hint arm + tracks shown', () => {
    renderGame();
    expect(screen.queryByTestId('drag-coachmark')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(7000); });
    expect(screen.getByTestId('drag-coachmark')).toBeInTheDocument();
    expect(trackGrowthEvent).toHaveBeenCalledWith('wordwheel_drag_hint_shown', expect.any(Object));
  });

  it('never shows the coachmark in the control arm', () => {
    variant = 'control';
    renderGame();
    act(() => { vi.advanceTimersByTime(15000); });
    expect(screen.queryByTestId('drag-coachmark')).not.toBeInTheDocument();
  });
});
