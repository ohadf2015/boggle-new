import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SealedBidWheel from '../SealedBidWheel';

// Mock WordWheelPixiRing to avoid Pixi in jsdom
vi.mock('../../daily/WordWheelPixiRing', () => ({ default: () => null }));

describe('SealedBidWheel', () => {
  it('renders one tile per letter', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SealedBidWheel
        letters={['A', 'E', 'I', 'N', 'R', 'S', 'T']}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    const tiles = screen.getAllByRole('button');
    // Filter out the clear button if present
    const wheelTiles = tiles.filter(t => t.dataset.wheelIndex !== undefined);
    expect(wheelTiles.length).toBeGreaterThanOrEqual(7);
  });

  it('tapping tiles builds a word and calls onChange', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SealedBidWheel
        letters={['R', 'A', 'T', 'X', 'X', 'X', 'X']}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    const tiles = screen.getAllByRole('button');
    const wheelTiles = tiles.filter(t => t.dataset.wheelIndex !== undefined);
    fireEvent.click(wheelTiles[0]);
    fireEvent.click(wheelTiles[1]);
    fireEvent.click(wheelTiles[2]);
    expect(onChange).toHaveBeenLastCalledWith('RAT', [0, 1, 2]);
  });
});
