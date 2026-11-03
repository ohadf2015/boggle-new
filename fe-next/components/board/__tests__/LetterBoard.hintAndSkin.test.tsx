import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LetterBoard from '../LetterBoard';
import { tileEl } from './boardTestUtils';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['S', 'U', 'N'],
];
const PATH = [{ row: 0, col: 0 }, { row: 0, col: 1 }];

function glyph(container: HTMLElement, row: number, col: number): HTMLElement {
  return container.querySelector<HTMLElement>(`[data-gk="${row}-${col}"]`)!;
}

describe('LetterBoard hint lifecycle', () => {
  it('given a hint path while blinking, then those tiles are lit and lose the skinnable face', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive hintPath={PATH} hintPhase="blink" />);
    expect(tileEl(container, 0, 0)).toHaveAttribute('data-hint');
    expect(tileEl(container, 0, 0)).not.toHaveClass('letter-tile-gradient');
    expect(glyph(container, 0, 0)).toHaveAttribute('data-hint');
  });

  it('given the hint finished fading (phase null), then the tiles return to the plain idle face', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive hintPath={PATH} hintPhase={null} />);
    const tile = tileEl(container, 0, 0);
    expect(tile).not.toHaveAttribute('data-hint');
    expect(tile).toHaveClass('letter-tile-gradient');
    expect(tile.querySelector('span')).toBeNull();
    expect(glyph(container, 0, 0)).not.toHaveAttribute('data-hint');
  });

  it('given a caller that does not drive phases, then the hint stays lit', () => {
    const { container } = render(<LetterBoard grid={GRID} interactive hintPath={PATH} />);
    expect(tileEl(container, 0, 1)).toHaveAttribute('data-hint');
  });
});

describe('LetterBoard glyph state mirrors', () => {
  it('given a marked tile, then its glyph carries data-marked so skin ink never paints on it', () => {
    const marks = { golden: new Set(['1-1']) };
    const { container } = render(<LetterBoard grid={GRID} interactive marks={marks} />);
    expect(glyph(container, 1, 1)).toHaveAttribute('data-marked');
    expect(glyph(container, 0, 0)).not.toHaveAttribute('data-marked');
  });
});
