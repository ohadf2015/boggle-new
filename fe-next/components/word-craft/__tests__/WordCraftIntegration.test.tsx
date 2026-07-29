import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import { inferAxis, resolveTap } from '@/lib/word-craft/placement';
import { WordCraftBoard } from '../WordCraftBoard';
import { WordCraftRack } from '../WordCraftRack';
import { WordCraftPendingStrip } from '../WordCraftPendingStrip';
import { useMemo } from 'react';
import type { RackTile } from '@/lib/word-craft/types';

/**
 * "Playwright-equivalent" integration test.
 *
 * Mounts the real reducer + the three UI primitives that own input
 * (Rack, Board, PendingStrip) together with a mocked dictionary, and
 * walks through the mobile-redesign happy path:
 *
 *   1. tap rack → tap board: 1 pending tile, no axis yet
 *   2. tap rack → tap board (same row): 2 pending tiles, axis 'h' inferred
 *   3. fast-tap rack with axis locked: auto-places along axis
 *   4. PendingStrip × button: recalls all
 *
 * No browser needed; vitest-jsdom drives the same code path the user
 * triggers on mobile. Far cheaper than Playwright + sidesteps the
 * beta-email auth gate entirely.
 */

// Fixed seed so the rack composition is deterministic.
const FIXED_SEED = 12345;

function TestHarness() {
  // Real dictionary — empty set is fine for input mechanics; we never submit.
  const dict = useMemo(() => new Set<string>(), []);
  const game = useWordCraftGame({ seed: FIXED_SEED, dict, locale: 'en', boardSize: 15 });

  const axis = useMemo(() => inferAxis(game.state.pendingPlacements), [game.state.pendingPlacements]);
  const pendingIds = useMemo(
    () => new Set(game.state.pendingPlacements.map((p) => p.rackTileId)),
    [game.state.pendingPlacements],
  );

  const handleFastTap = (tile: RackTile) => {
    const result = resolveTap(tile, game.state.pendingPlacements, game.state.board);
    if ('placement' in result) {
      game.placeTileOnBoard(tile.id, result.placement.row, result.placement.col);
    }
  };

  return (
    <div>
      {/* Use aspect-square wrapper so the board renders at non-zero size */}
      <div style={{ width: 600, height: 600 }}>
        <WordCraftBoard
          board={game.state.board}
          pendingPlacements={game.state.pendingPlacements}
          onCellClick={game.placeOnBoard}
          onRecallPending={game.recallTile}
          hasSelectedTile={!!game.state.selectedRackTileId}
          isFirstMove={game.state.history.length === 0 && game.state.pendingPlacements.length === 0}
        />
      </div>
      <WordCraftPendingStrip
        pending={game.state.pendingPlacements}
        axis={axis}
        onRecallOne={game.recallTile}
        onRecallAll={game.recallAll}
        labels={{
          headerEmpty: 'place a tile',
          recallAll: 'recall all',
          recallOne: 'recall',
          axisHorizontal: 'Across',
          axisVertical: 'Down',
          axisFlipAria: 'flip',
        }}
      />
      <WordCraftRack
        tiles={game.state.player.rack}
        selectedId={game.state.selectedRackTileId}
        pendingIds={pendingIds}
        onSelect={game.selectRackTile}
        onFastTap={handleFastTap}
        axisLocked={axis !== null}
        ariaLabel="rack"
      />
      {/* Status pane the test reads */}
      <div data-testid="state">
        {`pending=${game.state.pendingPlacements.length}|axis=${axis ?? 'none'}`}
      </div>
    </div>
  );
}

function readState(): { pending: number; axis: string } {
  const text = screen.getByTestId('state').textContent ?? '';
  const m = text.match(/pending=(\d+)\|axis=(\w+)/);
  return { pending: m ? Number(m[1]) : -1, axis: m ? m[2] : '' };
}

describe('WordCraft mobile-redesign integration', () => {
  it('tap → tap places one pending tile and shows no axis', () => {
    render(<TestHarness />);

    // Pick the first rack tile + tap an empty board cell
    const firstTile = screen.getAllByRole('button', { pressed: false })[0];
    fireEvent.click(firstTile);
    const cell = document.querySelector('[data-board-cell="7,7"]') as HTMLElement;
    expect(cell).toBeTruthy();
    fireEvent.click(cell);

    expect(readState()).toEqual({ pending: 1, axis: 'none' });
  });

  it('placing 2 tiles in the same row infers a horizontal axis', () => {
    render(<TestHarness />);

    // Tile #1 → (7,7)
    const rackButtons = () =>
      Array.from(document.querySelectorAll('[data-rack-tile-id]')) as HTMLElement[];
    fireEvent.click(rackButtons()[0]);
    fireEvent.click(document.querySelector('[data-board-cell="7,7"]') as HTMLElement);

    // Tile #2 → (7,9) (same row, different col)
    fireEvent.click(rackButtons()[1]);
    fireEvent.click(document.querySelector('[data-board-cell="7,9"]') as HTMLElement);

    expect(readState()).toEqual({ pending: 2, axis: 'h' });
    // Axis chip should appear inside the pending strip
    expect(screen.getByText('Across')).toBeInTheDocument();
  });

  it('fast-tap with axis locked auto-places at the next empty axis cell', () => {
    render(<TestHarness />);

    const rackButtons = () =>
      Array.from(document.querySelectorAll('[data-rack-tile-id]')) as HTMLElement[];

    // Lock axis with two row-7 placements
    fireEvent.click(rackButtons()[0]);
    fireEvent.click(document.querySelector('[data-board-cell="7,7"]') as HTMLElement);
    fireEvent.click(rackButtons()[1]);
    fireEvent.click(document.querySelector('[data-board-cell="7,8"]') as HTMLElement);
    expect(readState()).toEqual({ pending: 2, axis: 'h' });

    // New contract: a single rack tap SELECTS; tapping the already-selected
    // tile again is the explicit fast-tap (auto-place along the locked axis).
    // This is what lets the player re-select + aim at any cell by tapping
    // instead of every tap fast-firing — the "tap doesn't work" fix.
    const remaining = rackButtons().filter((b) => !b.hasAttribute('disabled'));
    expect(remaining.length).toBeGreaterThan(0);
    const targetId = remaining[0].getAttribute('data-rack-tile-id')!;
    const byId = () => document.querySelector(`[data-rack-tile-id="${targetId}"]`) as HTMLElement;

    fireEvent.click(byId()); // first tap selects — nothing placed yet
    expect(readState()).toEqual({ pending: 2, axis: 'h' });

    fireEvent.click(byId()); // tap the selected tile again → fast-place on (7,9)
    expect(readState()).toEqual({ pending: 3, axis: 'h' });

    // Cell (7,9) should now hold a pending tile
    const filledCell = document.querySelector('[data-board-cell="7,9"]') as HTMLElement;
    expect(filledCell.dataset.tileState).toBe('pending');
  });

  it('PendingStrip × button recalls every pending tile', () => {
    render(<TestHarness />);

    const rackButtons = () =>
      Array.from(document.querySelectorAll('[data-rack-tile-id]')) as HTMLElement[];

    fireEvent.click(rackButtons()[0]);
    fireEvent.click(document.querySelector('[data-board-cell="7,7"]') as HTMLElement);
    fireEvent.click(rackButtons()[1]);
    fireEvent.click(document.querySelector('[data-board-cell="7,8"]') as HTMLElement);
    expect(readState().pending).toBe(2);

    fireEvent.click(screen.getByLabelText('recall all'));
    expect(readState().pending).toBe(0);
  });

  it('tapping a pending tile on the board recalls just that one', () => {
    render(<TestHarness />);

    const rackButtons = () =>
      Array.from(document.querySelectorAll('[data-rack-tile-id]')) as HTMLElement[];

    fireEvent.click(rackButtons()[0]);
    fireEvent.click(document.querySelector('[data-board-cell="7,7"]') as HTMLElement);
    expect(readState().pending).toBe(1);

    // Click the now-pending cell to recall it
    fireEvent.click(document.querySelector('[data-board-cell="7,7"]') as HTMLElement);
    expect(readState().pending).toBe(0);
  });
});
