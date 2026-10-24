import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LetterBoard from '../LetterBoard';
import { stubBoardLayout, press, selectedKeys } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

describe('LetterBoard Growth Radar rage opt-out', () => {
  it('given an interactive board, then the grid opts out of rage detection', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).toHaveAttribute('data-gr-no-rage');
  });

  it('given a non-interactive board, then the grid stays measurable', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive={false} />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toHaveAttribute('data-gr-no-rage');
  });

  it('given a ghost board, then the grid stays measurable', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive ghost />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toHaveAttribute('data-gr-no-rage');
  });
});

describe('LetterBoard tap feedback (GR #11488)', () => {
  it('given a locked board, when the grid is tapped, then the reason is visible in the same turn', () => {
    const { container } = render(
      <LetterBoard grid={GRID} interactive={false} lockedHint="Wait for GO" />,
    );
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const banner = container.querySelector('[data-testid="board-locked-banner"]') as HTMLElement;
    expect(banner.hidden).toBe(true);

    const t0 = performance.now();
    fireEvent.pointerDown(grid, { button: 0, pointerId: 1, pointerType: 'touch' });
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(300);
    expect(grid.getAttribute('data-state')).toBe('locked-1');
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toBe('Wait for GO');
    expect(banner.getAttribute('data-show')).toBe('1');
    expect(banner.className).not.toMatch(/sr-only/);

    fireEvent.pointerDown(grid, { button: 0, pointerId: 2, pointerType: 'touch' });
    expect(grid.getAttribute('data-state')).toBe('locked-2');
    expect(banner.getAttribute('data-show')).toBe('2');
  });

  it('given a live board, when a tile is tapped, then the grid state moves and the tile selects', () => {
    const restore = stubBoardLayout();
    try {
      const { container } = render(<LetterBoard grid={GRID} interactive />);
      const grid = container.querySelector('[role="grid"]') as HTMLElement;
      const t0 = performance.now();
      press(container, 0, 0);
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(300);
      expect(grid.getAttribute('data-state')).toBe('tap-1');
      expect(selectedKeys(container)).toEqual(['0-0']);
      press(container, 0, 1);
      expect(grid.getAttribute('data-state')).toBe('tap-2');
    } finally {
      restore();
    }
  });
});
