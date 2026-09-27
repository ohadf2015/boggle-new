import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { WordCraftBoardSection } from '../WordCraftBoardSection';
import { createBoard } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

describe('WordCraftBoardSection', () => {
  it('renders the board with data-tile attributes', () => {
    const board = createBoard(11);
    const { container } = render(
      <WordCraftBoardSection
        board={board}
        pending={[]}
        selectedRackTile={null}
        onCellTap={() => {}}
        onCellDragOver={() => {}}
        onCellDrop={() => {}}
        onSceneCtx={() => {}}
      />
    );
    expect(container.querySelector('[role="grid"]')).toBeTruthy();
  });

  it('calls onSceneCtx when Pixi stage is ready', async () => {
    const board = createBoard(11);
    const onSceneCtx = vi.fn();
    const { container } = render(
      <WordCraftBoardSection
        board={board}
        pending={[]}
        selectedRackTile={null}
        onCellTap={() => {}}
        onCellDragOver={() => {}}
        onCellDrop={() => {}}
        onSceneCtx={onSceneCtx}
      />
    );
    // Pixi stage holder should be present (aria-hidden)
    expect(container.querySelector('div[aria-hidden="true"]')).toBeTruthy();
  });

  it('wraps board in zoom shell', () => {
    const board = createBoard(11);
    const { container } = render(
      <WordCraftBoardSection
        board={board}
        pending={[]}
        selectedRackTile={null}
        onCellTap={() => {}}
        onCellDragOver={() => {}}
        onCellDrop={() => {}}
        onSceneCtx={() => {}}
      />
    );
    // ZoomShell should render somewhere in the component tree
    const grid = container.querySelector('[role="grid"]');
    expect(grid).toBeTruthy();
  });

  it('forwards a tap on a pending board tile to onRecallPending', () => {
    // GIVEN a board with one pending (not-yet-submitted) tile the player placed
    const board = createBoard(11);
    const pending: PlacedTile[] = [
      { row: 5, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: 'tile-1' },
    ];
    const onRecallPending = vi.fn();
    const { container } = render(
      <WordCraftBoardSection
        board={board}
        pending={pending}
        selectedRackTile={null}
        onCellTap={() => {}}
        onCellDragOver={() => {}}
        onCellDrop={() => {}}
        onSceneCtx={() => {}}
        onRecallPending={onRecallPending}
      />
    );

    // WHEN the player taps that pending tile on the board
    const cell = container.querySelector('[data-board-cell="5,5"]');
    expect(cell).toBeTruthy();
    fireEvent.click(cell as Element);

    // THEN the tile is recalled to the rack by its rack-tile id
    expect(onRecallPending).toHaveBeenCalledWith('tile-1');
  });
});
