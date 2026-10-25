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
