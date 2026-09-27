import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftLiveRegion } from '../WordCraftLiveRegion';
import type { PlacedTile } from '@/lib/word-craft/types';

const labels = {
  placed: (l: string, r: number, c: number) => `${l} placed at row ${r} column ${c}`,
  recalled: (l: string) => `${l} returned to rack`,
  axisLocked: (axis: 'h' | 'v') => (axis === 'h' ? 'Across locked' : 'Down locked'),
  axisUnlocked: 'Direction unlocked',
};

function tile(letter: string, row: number, col: number, id = `${letter}-${row}-${col}`): PlacedTile {
  return { letter, row, col, value: 1, isBlank: false, rackTileId: id };
}

describe('WordCraftLiveRegion', () => {
  it('mounts with no announcement', () => {
    render(<WordCraftLiveRegion pending={[]} axis={null} labels={labels} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region.textContent?.trim() ?? '').toBe('');
  });

  it('announces a tile placement when pending grows', () => {
    const { rerender } = render(<WordCraftLiveRegion pending={[]} axis={null} labels={labels} />);
    rerender(<WordCraftLiveRegion pending={[tile('A', 7, 7)]} axis={null} labels={labels} />);
    expect(screen.getByRole('status').textContent).toContain('A placed at row 8 column 8');
  });

  it('announces a tile recall when pending shrinks', () => {
    const { rerender } = render(
      <WordCraftLiveRegion pending={[tile('A', 7, 7)]} axis={null} labels={labels} />,
    );
    rerender(<WordCraftLiveRegion pending={[]} axis={null} labels={labels} />);
    expect(screen.getByRole('status').textContent).toContain('A returned to rack');
  });

  it('announces axis lock transitions', () => {
    const { rerender } = render(
      <WordCraftLiveRegion pending={[tile('A', 7, 7)]} axis={null} labels={labels} />,
    );
    rerender(
      <WordCraftLiveRegion pending={[tile('A', 7, 7), tile('B', 7, 8)]} axis="h" labels={labels} />,
    );
    expect(screen.getByRole('status').textContent).toContain('Across locked');
  });

  it('announces axis unlock when going back below 2 tiles', () => {
    const { rerender } = render(
      <WordCraftLiveRegion pending={[tile('A', 7, 7), tile('B', 7, 8)]} axis="h" labels={labels} />,
    );
    rerender(<WordCraftLiveRegion pending={[tile('A', 7, 7)]} axis={null} labels={labels} />);
    expect(screen.getByRole('status').textContent).toContain('Direction unlocked');
  });
});
