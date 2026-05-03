/**
 * Sandbox-level telemetry contract: every practice sandbox must fire
 *  - practice_started on mount
 *  - practice_word_found per accepted word
 *  - practice_completed at goal-hit
 *
 * Lives in one file so all three sandboxes are checked against the same
 * contract — drift between modes is a top audit smell (see audit §8).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    __loaded: true,
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';
import PracticeWheelSandbox from '../PracticeWheelSandbox';

const eventNames = () => captureMock.mock.calls.map((c) => c[0] as string);

const tap = (testId: string) => fireEvent.click(screen.getByTestId(testId));
const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

beforeEach(() => {
  window.localStorage.clear();
  captureMock.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('practice sandbox telemetry', () => {
  it('classic sandbox fires started → word_found ×3 → completed', () => {
    render(<PracticeClassicSandbox />);

    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'classic', locale: 'en' })
    );

    // STAR
    tap('practice-tile-0-0'); tap('practice-tile-0-1');
    tap('practice-tile-0-2'); tap('practice-tile-0-3');
    submit();
    // PLAN
    tap('practice-tile-2-0'); tap('practice-tile-2-1');
    tap('practice-tile-2-2'); tap('practice-tile-1-2');
    submit();
    // TIN
    tap('practice-tile-2-3'); tap('practice-tile-3-2'); tap('practice-tile-3-3');
    submit();

    const wordEvents = captureMock.mock.calls.filter((c) => c[0] === 'practice_word_found');
    expect(wordEvents.length).toBe(3);
    expect(eventNames()).toContain('practice_completed');

    const completedCall = captureMock.mock.calls.find((c) => c[0] === 'practice_completed');
    expect(completedCall?.[1]).toMatchObject({
      mode: 'classic',
      locale: 'en',
      words_found: 3,
      streak_day: 1,
    });
  });

  it('wordHunt sandbox fires started → completed when target solved', () => {
    render(<PracticeWordHuntSandbox />);
    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'wordHunt' })
    );
    // EN puzzle: target = STAR, pool = [S T A R O E]
    tap('practice-letter-0'); // S
    tap('practice-letter-1'); // T
    tap('practice-letter-2'); // A
    tap('practice-letter-3'); // R
    submit();
    expect(eventNames()).toContain('practice_completed');
  });

  it('wheel sandbox fires started → word_found → completed at 3 words', () => {
    render(<PracticeWheelSandbox />);
    expect(captureMock).toHaveBeenCalledWith(
      'practice_started',
      expect.objectContaining({ mode: 'wheelRush' })
    );
    // EN wheel: center=A outer=[T R C E]. Build CAT, RAT, ACE.
    // CAT
    tap('practice-wheel-outer-2'); // C
    tap('practice-wheel-center'); // A
    tap('practice-wheel-outer-0'); // T
    submit();
    // RAT
    tap('practice-wheel-outer-1'); // R
    tap('practice-wheel-center'); // A
    tap('practice-wheel-outer-0'); // T
    submit();
    // ACE
    tap('practice-wheel-center'); // A
    tap('practice-wheel-outer-2'); // C
    tap('practice-wheel-outer-3'); // E
    submit();

    const wordEvents = captureMock.mock.calls.filter((c) => c[0] === 'practice_word_found');
    expect(wordEvents.length).toBe(3);
    expect(eventNames()).toContain('practice_completed');
  });
});
