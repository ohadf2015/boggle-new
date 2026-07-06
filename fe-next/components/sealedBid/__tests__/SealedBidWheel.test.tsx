import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SealedBidWheel from '../SealedBidWheel';

// Mock WordWheelPixiRing to avoid Pixi setup in jsdom
vi.mock('../../daily/WordWheelPixiRing', () => ({
  default: () => null,
}));

describe('SealedBidWheel', () => {
  it('renders one tile per letter', () => {
    render(
      <SealedBidWheel
        letters={['A', 'E', 'I', 'N', 'R', 'S', 'T']}
        onChange={() => {}}
        onSubmit={() => {}}
      />
    );
    const tiles = screen.getAllByRole('button').filter((btn) => btn.getAttribute('data-wheel-letter'));
    expect(tiles.length).toBeGreaterThanOrEqual(7);
  });

  it('tapping tiles builds a word and calls onChange', () => {
    const onChange = vi.fn();
    render(
      <SealedBidWheel
        letters={['R', 'A', 'T', 'X', 'X', 'X', 'X']}
        onChange={onChange}
        onSubmit={() => {}}
      />
    );
    const tiles = screen.getAllByRole('button').filter((btn) => btn.getAttribute('data-wheel-letter'));
    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]);
    fireEvent.click(tiles[2]);
    expect(onChange).toHaveBeenLastCalledWith('RAT', [0, 1, 2]);
  });
});
