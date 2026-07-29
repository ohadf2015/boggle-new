import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WordCraftPendingStrip } from '../WordCraftPendingStrip';
import type { PlacedTile } from '@/lib/word-craft/types';

const labels = {
  headerEmpty: 'place a tile to start',
  recallAll: 'recall all',
  recallOne: 'recall',
  axisHorizontal: 'Across',
  axisVertical: 'Down',
  axisFlipAria: 'flip',
};

function tile(letter: string, row: number, col: number, id = `${letter}-${row}-${col}`): PlacedTile {
  return { letter, row, col, value: 1, isBlank: false, rackTileId: id };
}

describe('WordCraftPendingStrip', () => {
  it('renders empty placeholder when pending is empty', () => {
    render(
      <WordCraftPendingStrip
        pending={[]}
        axis={null}
        onRecallOne={() => {}}
        onRecallAll={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText('place a tile to start')).toBeInTheDocument();
  });

  it('renders pending tiles in column order when axis is horizontal', () => {
    render(
      <WordCraftPendingStrip
        pending={[tile('C', 7, 9), tile('A', 7, 7), tile('T', 7, 8)]}
        axis="h"
        onRecallOne={() => {}}
        onRecallAll={() => {}}
        labels={labels}
      />,
    );
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('button');
    expect(items.map((el) => el.textContent?.trim())).toEqual(['A', 'T', 'C']);
  });

  it('renders pending tiles in row order when axis is vertical', () => {
    render(
      <WordCraftPendingStrip
        pending={[tile('C', 9, 7), tile('A', 7, 7), tile('T', 8, 7)]}
        axis="v"
        onRecallOne={() => {}}
        onRecallAll={() => {}}
        labels={labels}
      />,
    );
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('button');
    expect(items.map((el) => el.textContent?.trim())).toEqual(['A', 'T', 'C']);
  });

  it('fires onRecallOne with the tile id when a tile is tapped', () => {
    const onRecallOne = vi.fn();
    render(
      <WordCraftPendingStrip
        pending={[tile('A', 7, 7, 'tile-A'), tile('T', 7, 8, 'tile-T')]}
        axis="h"
        onRecallOne={onRecallOne}
        onRecallAll={() => {}}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'recall: A' }));
    expect(onRecallOne).toHaveBeenCalledWith('tile-A');
  });

  it('fires onRecallAll when the × button is tapped', () => {
    const onRecallAll = vi.fn();
    render(
      <WordCraftPendingStrip
        pending={[tile('A', 7, 7), tile('T', 7, 8)]}
        axis="h"
        onRecallOne={() => {}}
        onRecallAll={onRecallAll}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'recall all' }));
    expect(onRecallAll).toHaveBeenCalledTimes(1);
  });

  it('renders axis chip with horizontal label when axis is h', () => {
    render(
      <WordCraftPendingStrip
        pending={[tile('A', 7, 7), tile('T', 7, 8)]}
        axis="h"
        onRecallOne={() => {}}
        onRecallAll={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText('Across')).toBeInTheDocument();
  });
});
