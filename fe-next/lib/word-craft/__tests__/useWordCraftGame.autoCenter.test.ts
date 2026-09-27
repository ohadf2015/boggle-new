import { describe, expect, it } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';

function fresh() {
  return buildInitialState({ seed: 7, locale: 'en' });
}

describe('auto-center first letter', () => {
  it('placing-selects the first tile at the center cell on move 1', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    const center = Math.floor(s1.board.size / 2);
    expect(s1.pendingPlacements).toHaveLength(1);
    expect(s1.pendingPlacements[0]).toMatchObject({ row: center, col: center, rackTileId: tile.id });
    expect(s1.selectedRackTileId).toBeNull();
    expect(s1.autoCenterDone).toBe(true);
  });

  it('does NOT auto-place again after recall (no fight-the-player loop)', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    const s2 = wordCraftReducer(s1, { type: 'RECALL_PENDING', rackTileId: tile.id });
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: tile.id });
    expect(s3.pendingPlacements).toHaveLength(0);
    expect(s3.selectedRackTileId).toBe(tile.id);
  });

  it('does not fire when pendings already exist or on deselect', () => {
    const s0 = fresh();
    const t0 = s0.player.rack[0];
    const t1 = s0.player.rack[1];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: t0.id });
    const s2 = wordCraftReducer(s1, { type: 'SELECT_RACK_TILE', id: t1.id });
    expect(s2.pendingPlacements).toHaveLength(1);
    expect(s2.selectedRackTileId).toBe(t1.id);
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: null });
    expect(s3.selectedRackTileId).toBeNull();
  });

  it('does not fire after the board has any committed tile', () => {
    const s0 = fresh();
    s0.board.cells[3][3].tile = { row: 3, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 'x' };
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer({ ...s0, autoCenterDone: false }, { type: 'SELECT_RACK_TILE', id: tile.id });
    expect(s1.pendingPlacements).toHaveLength(0);
    expect(s1.selectedRackTileId).toBe(tile.id);
  });

  it('resets the flag on RESET', () => {
    const s0 = fresh();
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: s0.player.rack[0].id });
    const s2 = wordCraftReducer(s1, { type: 'RESET', seed: 9, boardSize: 15, locale: 'en' });
    expect(s2.autoCenterDone).toBe(false);
  });
});
