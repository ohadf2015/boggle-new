import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard } from '@/lib/word-craft/board';

describe('WordCraftBoard — keyboard reticle', () => {
  it('renders no data-reticle when reticle prop is null', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        reticle={null}
      />,
    );
    expect(document.querySelector('[data-reticle="true"]')).toBeNull();
  });

  it('marks exactly one cell with data-reticle when reticle is set', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        reticle={{ row: 7, col: 7 }}
      />,
    );
    const marked = document.querySelectorAll('[data-reticle="true"]');
    expect(marked.length).toBe(1);
    expect((marked[0] as HTMLElement).dataset.boardCell).toBe('7,7');
  });

  it('moves the reticle marker when reticle prop changes', () => {
    const { rerender } = render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        reticle={{ row: 7, col: 7 }}
      />,
    );
    expect(
      (document.querySelector('[data-reticle="true"]') as HTMLElement).dataset.boardCell,
    ).toBe('7,7');

    rerender(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        reticle={{ row: 0, col: 14 }}
      />,
    );
    expect(
      (document.querySelector('[data-reticle="true"]') as HTMLElement).dataset.boardCell,
    ).toBe('0,14');
  });
});
