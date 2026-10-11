import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LessonBoardLayer } from './LessonBoardLayer';

const TILE = 60;

function mountBoard() {
  const board = document.createElement('div');
  board.id = 'board';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const el = document.createElement('div');
      el.dataset.row = String(row);
      el.dataset.col = String(col);
      el.getBoundingClientRect = () =>
        ({ left: 100 + col * TILE, top: 200 + row * TILE, width: TILE, height: TILE }) as DOMRect;
      board.appendChild(el);
    }
  }
  document.body.appendChild(board);
}

describe('LessonBoardLayer', () => {
  beforeEach(mountBoard);
  afterEach(() => document.getElementById('board')?.remove());

  it('keeps the word burst inside the board, so it never lands on the HUD or word chip', () => {
    render(
      <LessonBoardLayer
        boardSelector="#board"
        handPath={null}
        nextIndex={-1}
        burst={{ key: 'b1', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }] }}
      />,
    );
    const clip = screen.getByTestId('lesson-burst');
    expect(clip.style.left).toBe('100px');
    expect(clip.style.top).toBe('200px');
    expect(clip.style.width).toBe(`${TILE * 3}px`);
    expect(clip.style.height).toBe(`${TILE * 3}px`);
    expect(clip.className).toContain('overflow-hidden');
  });

  it('pops the points over the found word, inside the board', () => {
    render(
      <LessonBoardLayer
        boardSelector="#board"
        handPath={null}
        nextIndex={-1}
        burst={{ key: 'b1', cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }], points: 10 }}
      />,
    );
    const pop = screen.getByTestId('lesson-burst-points');
    expect(pop).toHaveTextContent('+10');
    expect(screen.getByTestId('lesson-burst')).toContainElement(pop);
    expect(pop.style.left).toBe(`${TILE * 1.5}px`);
    expect(pop.style.top).toBe(`${TILE}px`);
  });

  it('keeps the points pop clear of the board edge', () => {
    render(
      <LessonBoardLayer
        boardSelector="#board"
        handPath={null}
        nextIndex={-1}
        burst={{ key: 'b2', cells: [{ row: 0, col: 0 }], points: 10 }}
      />,
    );
    const pop = screen.getByTestId('lesson-burst-points');
    expect(parseFloat(pop.style.left)).toBeGreaterThanOrEqual(48);
    expect(parseFloat(pop.style.top)).toBeGreaterThanOrEqual(28);
  });

  it('shows the hand on the hinted word until the player starts dragging it', () => {
    const path = [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }];
    const { rerender } = render(<LessonBoardLayer boardSelector="#board" handPath={path} nextIndex={-1} burst={null} />);
    expect(screen.getByTestId('lesson-hand')).toBeInTheDocument();
    rerender(<LessonBoardLayer boardSelector="#board" handPath={path} nextIndex={1} burst={null} />);
    expect(screen.queryByTestId('lesson-hand')).toBeNull();
    expect(screen.getByTestId('lesson-next-tile')).toBeInTheDocument();
  });
});
