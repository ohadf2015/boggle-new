/**
 * Sandbox-level telemetry contract: every practice sandbox must fire
 *  - practice_started on mount
 *  - practice_word_found per accepted word
 *  - practice_completed at goal-hit
 *
 * Rewritten 2026-05-05 for the redesigned drag-pointer UX (no submit button).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
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
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';
import PracticeWheelSandbox from '../PracticeWheelSandbox';

const eventNames = () => captureMock.mock.calls.map((c) => c[0] as string);

const dragGrid = (cells: Array<[number, number]>) => {
  const tiles = cells.map(([r, c]) => screen.getByTestId(`practice-tile-${r}-${c}`));
  fireEvent.pointerDown(tiles[0]);
  for (let i = 1; i < tiles.length; i++) fireEvent.pointerEnter(tiles[i]);
  fireEvent.pointerUp(tiles[tiles.length - 1]);
};

const dragWheel = (indices: number[]) => {
  const tiles = indices.map((i) => screen.getByTestId(`practice-letter-${i}`));
  fireEvent.pointerDown(tiles[0]);
  for (let k = 1; k < tiles.length; k++) fireEvent.pointerEnter(tiles[k]);
  fireEvent.pointerUp(tiles[tiles.length - 1]);
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

    dragGrid([[0, 0], [0, 1], [0, 2], [0, 3]]); // STAR
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    dragGrid([[2, 0], [2, 1], [2, 2], [1, 2]]); // PLAN
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    dragGrid([[2, 3], [3, 2], [3, 3]]);          // TIN
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

    // EN target = "STAR"; row 0 of board
    dragGrid([[0, 0], [0, 1], [0, 2], [0, 3]]);

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

    // EN wheel: letters[0]=A (center), [1]=T [2]=R [3]=C [4]=E
    // Build 3 valid words containing center A:
    dragWheel([3, 0, 1]); // C-A-T → CAT
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    dragWheel([2, 0, 1]); // R-A-T → RAT
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    dragWheel([0, 3, 4]); // A-C-E → ACE
    await waitFor(() => {
      expect(eventNames()).toContain('practice_completed');
    });

    const wordEvents = captureMock.mock.calls.filter((c) => c[0] === 'practice_word_found');
    expect(wordEvents.length).toBe(3);
  });
});
