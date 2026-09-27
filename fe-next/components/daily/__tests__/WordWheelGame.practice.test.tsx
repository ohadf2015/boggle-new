/**
 * Practice mode: WordWheelGame must NOT auto-complete via the countdown timer
 * when `practice` is true. Player should explore at their own pace and finish
 * via the "End practice" CTA which fires `onComplete` immediately.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => false,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 0,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

describe('WordWheelGame practice mode', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  });
  afterEach(() => { vi.useRealTimers(); });

  it('does NOT call onComplete via countdown when practice is true', () => {
    const onComplete = vi.fn();
    render(
      <WordWheelGame
        puzzle={puzzle}
        duration={3}
        onComplete={onComplete}
        onValidateWord={vi.fn().mockResolvedValue(false)}
        onEffect={vi.fn()}
        language="en"
        practice
      />
    );
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('hides the countdown timer in practice mode (a frozen 2:00 that never ticks looks broken)', () => {
    const { rerender } = render(
      <WordWheelGame
        puzzle={puzzle}
        duration={120}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(false)}
        onEffect={vi.fn()}
        language="en"
        practice
      />
    );
    // Practice has no countdown, so the static clock must not render.
    expect(screen.queryByTestId('wheel-timer')).toBeNull();
    expect(screen.queryByText('2:00')).toBeNull();

    // The real (timed) game still shows the countdown clock.
    rerender(
      <WordWheelGame
        puzzle={puzzle}
        duration={120}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(false)}
        onEffect={vi.fn()}
        language="en"
      />
    );
    expect(screen.getByTestId('wheel-timer')).toBeInTheDocument();
  });

  it('renders an "end practice" CTA in practice mode that fires onComplete', () => {
    const onComplete = vi.fn();
    render(
      <WordWheelGame
        puzzle={puzzle}
        duration={3}
        onComplete={onComplete}
        onValidateWord={vi.fn().mockResolvedValue(false)}
        onEffect={vi.fn()}
        language="en"
        practice
      />
    );
    const cta = screen.getByRole('button', { name: /practice.*end|end.*practice|practice\.endRun/i });
    fireEvent.click(cta);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ wordsFound: expect.any(Array), score: expect.any(Number) })
    );
  });
});
