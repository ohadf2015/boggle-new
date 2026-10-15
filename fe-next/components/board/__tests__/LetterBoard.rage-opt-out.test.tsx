import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LetterBoard from '../LetterBoard';

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
