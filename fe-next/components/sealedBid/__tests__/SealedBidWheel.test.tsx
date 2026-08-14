import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SealedBidWheel from '../SealedBidWheel';

// Mock WordWheelPixiRing to avoid Pixi in jsdom, but capture its props so we can
// assert the ring lays its connector lines on the same angular grid as the tiles.
const ringProps: Array<Record<string, unknown>> = [];
vi.mock('../../daily/WordWheelPixiRing', () => ({
  default: (props: Record<string, unknown>) => {
    ringProps.push(props);
    return null;
  },
}));

describe('SealedBidWheel', () => {
  it('tells the pixi ring how many wheel slots there are, so connectors land on the tiles', () => {
    ringProps.length = 0;
    render(
      <SealedBidWheel
        letters={['A', 'E', 'I', 'N', 'R', 'S', 'T']}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(ringProps.length).toBeGreaterThan(0);
    // The ring defaults to 6 (the daily wheel's hexagon). Sealed Bid lays 7
    // tiles, so without this the lines are drawn every 60° while tiles sit
    // every 51.43° and drift a whole slot apart by the last letter.
    expect(ringProps[ringProps.length - 1].outerCount).toBe(7);
  });

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
