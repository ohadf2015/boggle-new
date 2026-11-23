import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LetterBoard, { type BoardFeedback } from '../LetterBoard';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];

describe('LetterBoard render cost', () => {
  it('given a submitted word, when feedback or combo changes, then the tiles are not rebuilt', () => {
    const cellLabel = vi.fn((r: number, c: number, letter: string) => `${letter} ${r} ${c}`);
    const { rerender } = render(<LetterBoard grid={GRID} interactive cellLabel={cellLabel} />);
    cellLabel.mockClear();

    const feedback: BoardFeedback = { id: 'f1', kind: 'ok', word: 'CAT', score: 3 };
    rerender(<LetterBoard grid={GRID} interactive cellLabel={cellLabel} feedback={feedback} />);
    rerender(<LetterBoard grid={GRID} interactive cellLabel={cellLabel} feedback={feedback} comboLevel={2} />);

    expect(cellLabel).not.toHaveBeenCalled();
  });

  it('given a new grid, then the tiles are rebuilt with its letters', () => {
    const cellLabel = vi.fn((r: number, c: number, letter: string) => `${letter} ${r} ${c}`);
    const { rerender, container } = render(<LetterBoard grid={GRID} interactive cellLabel={cellLabel} />);
    rerender(<LetterBoard grid={[['Z', 'A', 'T'], ...GRID.slice(1)]} interactive cellLabel={cellLabel} />);
    expect(container.querySelector('[data-tile][data-row="0"][data-col="0"]')).toHaveAttribute('data-letter', 'Z');
  });
});
