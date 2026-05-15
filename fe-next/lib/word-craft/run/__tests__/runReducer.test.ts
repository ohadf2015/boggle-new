import { buildInitialRunState, runReducer } from '../runReducer';
import { getRoundTarget } from '../runTargets';
import type { PlacedTile } from '../../types';

const init = () => buildInitialRunState({ seed: 42, locale: 'en', boardSize: 7 });

describe('buildInitialRunState', () => {
  it('starts in intro phase, round 1, empty cards, 8-tile rack', () => {
    const s = init();
    expect(s.phase).toBe('intro');
    expect(s.round.round).toBe(1);
    expect(s.round.target).toBe(getRoundTarget(1, 7));
    expect(s.activeCards).toEqual([]);
    expect(s.rack.length).toBe(8);
    expect(s.board.size).toBe(7);
    expect(s.runTotal).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    expect(init().rack.map((t) => t.letter)).toEqual(init().rack.map((t) => t.letter));
  });
});

describe('runReducer placement actions', () => {
  it('START_RUN moves intro -> playing', () => {
    const s = runReducer(init(), { type: 'START_RUN' });
    expect(s.phase).toBe('playing');
  });

  it('SELECT_RACK_TILE sets the selected id', () => {
    const s = runReducer(init(), { type: 'SELECT_RACK_TILE', rackTileId: 'abc' });
    expect(s.selectedRackTileId).toBe('abc');
  });

  it('PLACE_TILE moves a rack tile into pendingPlacements', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const first = start.rack[0];
    const center = Math.floor(start.board.size / 2);
    const s = runReducer(start, { type: 'PLACE_TILE', rackTileId: first.id, row: center, col: center });
    expect(s.pendingPlacements.length).toBe(1);
    expect(s.rack.find((t) => t.id === first.id)).toBeUndefined();
    expect(s.selectedRackTileId).toBeNull();
  });

  it('RECALL_TILE returns a pending tile to the rack', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const first = start.rack[0];
    const center = Math.floor(start.board.size / 2);
    const placed = runReducer(start, { type: 'PLACE_TILE', rackTileId: first.id, row: center, col: center });
    const s = runReducer(placed, { type: 'RECALL_TILE', rackTileId: first.id });
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.find((t) => t.id === first.id)).toBeDefined();
  });

  it('RECALL_ALL clears all pending placements back to the rack', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const center = Math.floor(start.board.size / 2);
    const a = runReducer(start, { type: 'PLACE_TILE', rackTileId: start.rack[0].id, row: center, col: center });
    const b = runReducer(a, { type: 'PLACE_TILE', rackTileId: a.rack[0].id, row: center, col: center + 1 });
    const s = runReducer(b, { type: 'RECALL_ALL' });
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.length).toBe(8);
  });

  it('COMMIT_MOVE applies placements to the board, refills the rack, and adds to round score', () => {
    const start = runReducer(init(), { type: 'START_RUN' });
    const center = Math.floor(start.board.size / 2);
    const placements: PlacedTile[] = [
      { row: center, col: center, letter: 'C', value: 3, isBlank: false, rackTileId: start.rack[0].id },
    ];
    const placed = runReducer(start, {
      type: 'PLACE_TILE', rackTileId: start.rack[0].id, row: center, col: center,
    });
    const s = runReducer(placed, {
      type: 'COMMIT_MOVE', placements, wordScore: 12, wordsCount: 1,
      lastWordScore: { chips: 6, mult: 2, total: 12 },
    });
    expect(s.round.score).toBe(12);
    expect(s.round.wordsPlayedThisRound).toBe(1);
    expect(s.pendingPlacements.length).toBe(0);
    expect(s.rack.length).toBe(8);
    expect(s.board.cells[center][center].tile).not.toBeNull();
    expect(s.lastWordScore).toEqual({ chips: 6, mult: 2, total: 12 });
  });

  it('SET_ERROR / CLEAR_ERROR set and clear lastError', () => {
    const withErr = runReducer(init(), { type: 'SET_ERROR', message: 'INVALID_WORD' });
    expect(withErr.lastError).toBe('INVALID_WORD');
    expect(runReducer(withErr, { type: 'CLEAR_ERROR' }).lastError).toBeNull();
  });
});
