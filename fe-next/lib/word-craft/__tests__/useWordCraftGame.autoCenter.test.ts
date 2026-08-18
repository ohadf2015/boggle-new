import { describe, expect, it } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';

function fresh() {
  return buildInitialState({ seed: 7, locale: 'en' });
}

describe('rack-tap: the first tile centres itself, later tiles are aimed', () => {
  it('move 1: selecting a rack tile drops it on the centre (opening nudge)', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const centre = Math.floor(s0.board.size / 2);
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    // The blank board has exactly one sensible target, so the reducer places it
    // instead of making the player aim. WordCraftIntegration.test.tsx drives the
    // same contract end to end; the rack component stays dumb about the board.
    expect(s1.pendingPlacements).toHaveLength(1);
    expect(s1.pendingPlacements[0]).toMatchObject({ row: centre, col: centre, rackTileId: tile.id });
    expect(s1.selectedRackTileId).toBeNull();
    expect(s1.autoCenterDone).toBe(true);
  });

  it('move 2: selecting a rack tile also just selects it', () => {
    const s0 = fresh();
    const t0 = s0.player.rack[0];
    // Move 1: select tile and place it manually
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: t0.id });
    const center = Math.floor(s0.board.size / 2);
    // Place it at center
    const s1_placed = wordCraftReducer(s1, {
      type: 'PLACE_PENDING',
      placement: { row: center, col: center, letter: t0.letter, value: t0.value, isBlank: t0.isBlank, rackTileId: t0.id }
    });

    // Submit the first move
    const s2 = wordCraftReducer(s1_placed, {
      type: 'COMMIT_PLAYER',
      placements: s1_placed.pendingPlacements,
      score: 10,
      words: ['A'],
      wordCells: [[[{ row: center, col: center }]]]
    });

    // Move 2: select a second tile
    const t1 = s2.player.rack[0];
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: t1.id });

    // Consistent: also just selects, player taps square to place
    expect(s3.pendingPlacements).toHaveLength(0);
    expect(s3.selectedRackTileId).toBe(t1.id);
  });

  it('deselect works on all moves', () => {
    const s0 = fresh();
    const tile = s0.player.rack[0];
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: tile.id });
    const s2 = wordCraftReducer(s1, { type: 'SELECT_RACK_TILE', id: null });
    expect(s2.selectedRackTileId).toBeNull();
  });

  it('autoCenterDone makes the nudge strictly once per game', () => {
    const s0 = fresh();
    const s1 = wordCraftReducer(s0, { type: 'SELECT_RACK_TILE', id: s0.player.rack[0].id });
    expect(s1.autoCenterDone).toBe(true);
    // Recall the nudged tile, then select again: the player is now in control and
    // must aim, so no second auto-placement.
    const s2 = wordCraftReducer(s1, { type: 'RECALL_PENDING', rackTileId: s0.player.rack[0].id });
    const s3 = wordCraftReducer(s2, { type: 'SELECT_RACK_TILE', id: s0.player.rack[1].id });
    expect(s3.pendingPlacements).toHaveLength(0);
    expect(s3.selectedRackTileId).toBe(s0.player.rack[1].id);
  });
});
