import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectorBoard, { projectorShowsBoard } from '@/components/education/live/ProjectorBoard';

describe('projectorShowsBoard', () => {
  it.each([
    ['classic', true],
    [undefined, true],
    ['word-hunt', true],
    ['blast', false],
    ['wheel-rush', false],
    ['vocab-quiz', false],
  ])('given %s, then the shared board shows: %s', (mode, expected) => {
    expect(projectorShowsBoard(mode as string | undefined, [['a']])).toBe(expected);
  });

  it('given no board yet, then nothing shows', () => {
    expect(projectorShowsBoard('classic', undefined)).toBe(false);
    expect(projectorShowsBoard('classic', [])).toBe(false);
  });
});

describe('ProjectorBoard', () => {
  it('given the class board, when shown on the wall, then every letter is printed in grid order', () => {
    render(<ProjectorBoard grid={[['a', 'b'], ['qu', 'd']]} label="Board" />);
    expect(screen.getAllByTestId('projector-board-tile').map((el) => el.textContent)).toEqual(['A', 'B', 'Qu', 'D']);
    expect(screen.getByRole('img', { name: 'Board' })).toBeInTheDocument();
  });
});

describe('ProjectorBoard sizing', () => {
  it('given a wall taller than its column is wide, when shown, then the board is a square bounded by both sides of a capped box', () => {
    render(<ProjectorBoard grid={[['a', 'b'], ['c', 'd']]} label="Board" />);
    const board = screen.getByTestId('projector-board');
    const box = board.parentElement as HTMLElement;
    expect(box.getAttribute('data-testid')).toBe('projector-board-box');
    expect(box.className).toContain('[container-type:size]');
    expect(box.className).toMatch(/w-\[58%\]/);
    expect(board.className).toContain('size-[min(100cqw,100cqh)]');
    expect(board.className).not.toContain('h-full');
  });
});
