import React from 'react';
import { render, screen } from '@testing-library/react';
import { HuntBoard } from '../HuntBoard';

const grid = [
  ['S', 'F', 'R', 'K', 'S'],
  ['F', 'E', 'V', 'S', 'C'],
  ['E', 'X', 'E', 'M', 'E'],
  ['H', 'R', 'N', 'E', 'N'],
  ['G', 'W', 'J', 'T', 'C'],
] as unknown as React.ComponentProps<typeof HuntBoard>['grid'];

describe('HuntBoard', () => {
  it('renders every tile as a grid cell with row, column and letter data', () => {
    render(<HuntBoard grid={grid} isGameOver={false} eliminatedLetters={new Set()} onWordSubmit={() => {}} onWordChange={() => {}} t={(k) => k} />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(25);
    const first = cells[0] as HTMLElement;
    expect(first.dataset.row).toBe('0');
    expect(first.dataset.col).toBe('0');
    expect(first.dataset.letter).toBe('S');
  });

  it('exposes the board as a grid', () => {
    render(<HuntBoard grid={grid} isGameOver={false} eliminatedLetters={new Set()} onWordSubmit={() => {}} onWordChange={() => {}} t={(k) => k} />);
    expect(screen.getByRole('grid')).toBeTruthy();
  });

  it('shows the live word placeholder before any drag', () => {
    render(<HuntBoard grid={grid} isGameOver={false} eliminatedLetters={new Set()} onWordSubmit={() => {}} onWordChange={() => {}} t={(k) => k} />);
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('');
  });
});
