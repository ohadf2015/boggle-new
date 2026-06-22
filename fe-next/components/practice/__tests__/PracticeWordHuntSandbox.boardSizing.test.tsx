/**
 * PracticeWordHuntSandbox — board sizing / no-clipping regression.
 *
 * Bug (2026-06-06): the board wrapper used a *width-driven* `aspect-square`
 * (`w-full max-w-xs aspect-square`). When the vertical space left by the clue
 * boxes + tips + discoveries was smaller than the board's width, the square
 * overflowed DOWNWARD and painted its white tiles over the DiscoveredWordsList
 * below it ("6 palabras / TIA" bleeding through the grid).
 *
 * Fix mirrors the live game's `SurvivalGridSection`: the board wrapper FILLS
 * the flex container (`w-full h-full`) and lets `.game-board-frame`'s
 * `max-height: min(board-size, 100%)` clamp the square to the available height,
 * so it can never overflow its allotted space.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: vi.fn().mockResolvedValue({ isValid: true }) }),
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
vi.mock('@/components/GridComponent', () => ({
  default: () => <div data-testid="grid-component-stub" />,
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox — board fits its flex space (no clipping)', () => {
  it('fills the available height instead of forcing a width-driven square', () => {
    const { getByTestId } = render(<PracticeWordHuntSandbox />);
    const board = getByTestId('practice-board');

    // Fills the flex container height so .game-board-frame can clamp to it.
    expect(board.className).toContain('h-full');
    expect(board.className).toContain('w-full');

    // Establishes a size container so the frame can resolve `100cqh` and size
    // itself to the largest fitting square instead of stretching to the
    // wrapper's (taller) height, which made cells tall rectangles.
    expect(board.className).toContain('[container-type:size]');

    // Must NOT use a width-driven aspect-square — that overflowed downward and
    // painted over the discoveries list. The square is enforced by the inner
    // .game-board-frame CSS, not by the wrapper.
    expect(board.className).not.toContain('aspect-square');
  });
});
