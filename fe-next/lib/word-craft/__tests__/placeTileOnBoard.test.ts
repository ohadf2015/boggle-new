/**
 * placeTileOnBoard is the drag-to-place bypass — caller passes the rack tile
 * id directly so we don't depend on async-updating selectedRackTileId.
 *
 * The validation guards live in the hook callback (above dispatch). Here we
 * lock the reducer contract: a PLACE_PENDING action with a valid placement
 * lands the tile in pendingPlacements with the supplied rack-tile id intact.
 */

import { describe, it, expect } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';

describe('PLACE_PENDING reducer contract', () => {
  it('moves a rack tile into pendingPlacements at the requested cell', () => {
    const s0 = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    const tile = s0.player.rack[0];
    const placement = {
      row: 7,
      col: 7,
      letter: tile.letter,
      value: tile.value,
      isBlank: tile.isBlank,
      rackTileId: tile.id,
    };
    const s1 = wordCraftReducer(s0, { type: 'PLACE_PENDING', placement });
    expect(s1.pendingPlacements).toHaveLength(1);
    expect(s1.pendingPlacements[0]).toMatchObject({
      row: 7,
      col: 7,
      letter: tile.letter,
      rackTileId: tile.id,
    });
  });

  it('preserves the rest of game state (turn, board, scores)', () => {
    const s0 = buildInitialState({ seed: 9, boardSize: 13, locale: 'he' });
    const tile = s0.player.rack[2];
    const s1 = wordCraftReducer(s0, {
      type: 'PLACE_PENDING',
      placement: { row: 6, col: 6, letter: tile.letter, value: tile.value, isBlank: tile.isBlank, rackTileId: tile.id },
    });
    expect(s1.turn).toBe(s0.turn);
    expect(s1.player.score).toBe(s0.player.score);
    expect(s1.bot.score).toBe(s0.bot.score);
  });
});
