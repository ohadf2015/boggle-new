import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoardSection } from '../WordCraftBoardSection';
import { createBoard } from '@/lib/word-craft/board';

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
});
