/**
 * Sandbox-level telemetry contract: every practice sandbox must fire
 *  - practice_started on mount
 *  - practice_word_found per accepted word
 *  - practice_completed at goal-hit
 *
 * Classic + WordHunt now use the real <GridComponent> (mocked); Wheel
 * uses real <WheelLetter> (rendered live).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    __loaded: true,
  },
}));

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="pixi-ring-stub" />,
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    screen = { width: 320, height: 240 };
    stage = { addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));
vi.mock('@/components/GridComponent', () => ({
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component-stub">
      <button
        type="button"
        data-testid="stub-submit-word"
        onClick={(e) => onWordSubmit?.((e.currentTarget as HTMLButtonElement).dataset.word ?? '')}
      />
      <div data-row="0" data-col="0" />
    </div>
  ),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
vi.mock('@/lib/practice/wordHuntPuzzle', () => ({
  generateWordHuntPuzzle: () => ({
    board: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
    target: 'STAR',
  }),
  getWordHuntTargets: () => ['STAR'],
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', async (orig) => ({
  ...(await orig()),
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['T', 'R', 'C', 'E', 'S', 'N'],
    allLetters: ['A', 'T', 'R', 'C', 'E', 'S', 'N'],
    puzzleDate: '',
    puzzleNumber: 0,
    language: 'en',
  }),
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';

const eventNames = () => captureMock.mock.calls.map((c) => c[0] as string);

const submitGridWord = (word: string) => {
  const btn = screen.getByTestId('stub-submit-word');
  btn.setAttribute('data-word', word);
  fireEvent.click(btn);
};

// Wheel now renders the real WordWheelGame — tap by glyph (center=-1,
// outer=0..5) and submit via the action-bar Submit button.
const tapWheel = (letters: string[]) => {
  for (const ch of letters) {
    const el = document.querySelector(`[data-wheel-letter="${ch}"]`) as HTMLElement | null;
    if (!el) throw new Error(`wheel letter ${ch} not found`);
    fireEvent.click(el);
  }
  const submit = screen.getByTestId('word-wheel-action-bar').querySelector('button:nth-child(2)') as HTMLElement;
  fireEvent.click(submit);
};

beforeEach(() => {
  window.localStorage.clear();
  captureMock.mockClear();
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('practice sandbox telemetry', () => {
  it('classic sandbox fires started → word_found ×3 → completed', async () => {
    render(<PracticeClassicSandbox />);

    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'classic', locale: 'en' }),
    );

    submitGridWord('STAR');
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    submitGridWord('PLAN');
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    submitGridWord('TIN');
    await waitFor(() => {
      expect(eventNames()).toContain('practice_completed');
    });

    const wordEvents = captureMock.mock.calls.filter((c) => c[0] === 'practice_word_found');
    expect(wordEvents.length).toBe(3);

    const completedCall = captureMock.mock.calls.find((c) => c[0] === 'practice_completed');
    expect(completedCall?.[1]).toMatchObject({
      mode: 'classic',
      locale: 'en',
      words_found: 3,
    });
  });

  it('wordHunt sandbox fires started → completed when target solved', async () => {
    render(<PracticeWordHuntSandbox />);
    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'wordHunt' }),
    );

    submitGridWord('STAR'); // EN target
    await waitFor(() => {
      expect(eventNames()).toContain('practice_completed');
    });
  });

  it('wheel sandbox fires started → word_found ×3 → completed', async () => {
    render(<PracticeWheelSandbox />);
    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'wheelRush' }),
    );

    // EN wheel: center=A, outer T R C E S N. Wait on the goal pill (which
    // updates in the same render batch WordWheelGame clears its builder) so the
    // next word builds from an empty slate — waiting on the async validator
    // call resolves mid-submit, before that clear flushes.
    const goalPill = () => screen.getByTestId('practice-goal-indicator');
    tapWheel(['C', 'A', 'T']); // CAT
    await waitFor(() => expect(goalPill()).toHaveTextContent('1'));
    tapWheel(['R', 'A', 'T']); // RAT
    await waitFor(() => expect(goalPill()).toHaveTextContent('2'));
    tapWheel(['A', 'C', 'E']); // ACE
    await waitFor(() => expect(goalPill()).toHaveTextContent('3'));
    await waitFor(() => {
      expect(eventNames()).toContain('practice_completed');
    });

    const wordEvents = captureMock.mock.calls.filter((c) => c[0] === 'practice_word_found');
    expect(wordEvents.length).toBe(3);
  });
});
