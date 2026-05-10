/**
 * PracticeWheelSandbox drag-spell parity test — mirrors real WordWheelGame
 * pointer drag flow. Verifies that dragging across letters builds the word
 * and a drag-release with ≥3 letters auto-submits.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

/**
 * Mock document.elementFromPoint so drag hit-test can resolve. Maps a
 * sequence of (x, y) to the wheel-letter button at that position. Real
 * positions don't matter — we just return the requested button by index.
 */
const mockElementFromPoint = (indexSequence: number[]) => {
  let i = 0;
  vi.spyOn(document, 'elementFromPoint').mockImplementation(() => {
    const idx = indexSequence[Math.min(i, indexSequence.length - 1)];
    i += 1;
    return document.querySelector(`[data-wheel-index="${idx}"]`) as Element;
  });
};

describe('PracticeWheelSandbox drag-spell parity', () => {
  it('drag across 3 letters with center then release auto-submits', async () => {
    render(<PracticeWheelSandbox />);
    const wheel = screen.getByTestId('practice-wheel');
    // Sequence: pointerdown@idx 1 (T = start), pointermove@idx 0 (A center →
    // engages drag, adds T then A), pointermove@idx 2 (R → adds R),
    // pointerup → auto-submit "TAR" (3 letters with center A → valid call).
    mockElementFromPoint([1, 0, 2]);
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 20, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(wheel, { clientX: 30, clientY: 10 });
    await waitFor(() => {
      expect(validatorCheck).toHaveBeenCalled();
    });
  });

  it('single tap on a letter does NOT engage drag (drag requires move to a different letter)', async () => {
    render(<PracticeWheelSandbox />);
    const wheel = screen.getByTestId('practice-wheel');
    mockElementFromPoint([1, 1, 1]); // pointer never moves to a different letter
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 11, clientY: 10 });
    fireEvent.pointerUp(wheel, { clientX: 11, clientY: 10 });
    // Drag never engaged → no auto-submit + validator untouched.
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
  });
});
