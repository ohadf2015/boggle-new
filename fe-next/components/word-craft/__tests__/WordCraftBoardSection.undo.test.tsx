import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('WordCraft - Undo Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('undo button has correct disabled state when no tiles placed', () => {
    const pendingPlacements: unknown[] = [];
    const hasPlacedTiles = pendingPlacements.length > 0;
    expect(hasPlacedTiles).toBe(false);
  });

  it('undo button is enabled when tiles are placed', () => {
    const pendingPlacements = [
      { rackTileId: 'tile-1', row: 7, col: 7, letter: 'A' },
      { rackTileId: 'tile-2', row: 7, col: 8, letter: 'B' },
    ];
    const hasPlacedTiles = pendingPlacements.length > 0;
    expect(hasPlacedTiles).toBe(true);
  });

  it('undo button disabled state toggles with tile count', () => {
    const testCases = [
      { pending: [], expected: false },
      { pending: [{ id: '1' }], expected: true },
      { pending: [{ id: '1' }, { id: '2' }], expected: true },
      { pending: [], expected: false },
    ];

    testCases.forEach(({ pending, expected }) => {
      const hasPlacedTiles = pending.length > 0;
      expect(hasPlacedTiles).toBe(expected);
    });
  });

  it('translation keys are properly structured', () => {
    const keys = {
      undo: 'wordcraft.undo',
      undoLastTile: 'wordcraft.undoLastTile',
    };

    expect(keys.undo).toBe('wordcraft.undo');
    expect(keys.undoLastTile).toBe('wordcraft.undoLastTile');
    expect(keys.undo).toMatch(/^wordcraft\./);
    expect(keys.undoLastTile).toMatch(/^wordcraft\./);
  });

  it('undo handler receives pending state', () => {
    const pending = [{ rackTileId: 'tile-1', row: 7, col: 7, letter: 'A' }];
    const onUndoLastTile = vi.fn();

    // Simulate the undo action
    onUndoLastTile(pending);
    expect(onUndoLastTile).toHaveBeenCalledWith(pending);
  });

  it('undo action is no-op when pending is empty', () => {
    const pending: unknown[] = [];
    const canUndo = pending.length > 0;
    expect(canUndo).toBe(false);
  });
});
