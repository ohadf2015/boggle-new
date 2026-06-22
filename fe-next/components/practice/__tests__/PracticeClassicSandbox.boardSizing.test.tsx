/**
 * PracticeClassicSandbox — board sizing / square-aspect regression.
 *
 * Bug (2026-06-22): the `[data-testid='practice-board'] &` override in
 * globals.css forced the `.game-board-frame` to `width:100%; height:100%`.
 * Because the board wrapper is a `w-full h-full` flex child whose width and
 * height are usually UNEQUAL (full width, tall remaining height), this
 * overrode the frame's `aspect-ratio:1/1` and stretched the 4×4 grid into
 * tall rectangles (cells taller than wide).
 *
 * Fix: the wrapper establishes a size container (`container-type:size`) so the
 * frame can size itself to the largest square that fits (`min(100cqw,100cqh)`)
 * and keep 1:1 cells regardless of the wrapper's aspect ratio.
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

import PracticeClassicSandbox from '../PracticeClassicSandbox';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeClassicSandbox — board keeps a square aspect (no tall cells)', () => {
  it('fills the flex space and establishes a size container for square sizing', () => {
    const { getByTestId } = render(<PracticeClassicSandbox />);
    const board = getByTestId('practice-board');

    // Fills the flex container so the frame can clamp to it.
    expect(board.className).toContain('w-full');
    expect(board.className).toContain('h-full');

    // Establishes a size container so the frame can resolve `100cqh` and pick
    // the largest fitting square instead of stretching to the wrapper's height.
    expect(board.className).toContain('[container-type:size]');

    // Must NOT use a width-driven aspect-square — the square is enforced by the
    // inner .game-board-frame CSS, not by the wrapper.
    expect(board.className).not.toContain('aspect-square');
  });
});
