import { buildInitialRunState, runReducer } from '../runReducer';
import { getRoundTarget, ROUND_COUNT } from '../runTargets';
import { POWER_CARD_POOL } from '../powerCards';
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

// helper: force a state into 'playing' with a given round score
const playingWith = (score: number, round = 1) => {
  let s = runReducer(init(), { type: 'START_RUN' });
  s = { ...s, round: { ...s.round, round, target: s.round.target, score } };
  return s;
};

describe('runReducer round flow', () => {
  it('END_ROUND with score >= target marks roundPassed true and goes to roundResult', () => {
    const s = playingWith(9999);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.phase).toBe('roundResult');
    expect(next.roundPassed).toBe(true);
  });

  it('END_ROUND with score < target marks roundPassed false', () => {
    const s = playingWith(0);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.phase).toBe('roundResult');
    expect(next.roundPassed).toBe(false);
  });

  it('END_ROUND adds the round score to runTotal when passed', () => {
    const s = playingWith(9999);
    const next = runReducer(s, { type: 'END_ROUND' });
    expect(next.runTotal).toBe(9999);
  });

  it('PROCEED after a failed round goes to runResult, not cleared', () => {
    let s = runReducer(playingWith(0), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('runResult');
    expect(s.cleared).toBe(false);
  });

  it('PROCEED after a passed non-final round goes to cardPick with 3 choices', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('cardPick');
    expect(s.cardChoice?.length).toBe(3);
  });

  it('PROCEED after passing the final round goes to runResult, cleared', () => {
    let s = runReducer(playingWith(9999, ROUND_COUNT), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    expect(s.phase).toBe('runResult');
    expect(s.cleared).toBe(true);
  });

  it('PICK_CARD appends the card, advances the round, and resets the board', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    const chosen = s.cardChoice![0];
    s = runReducer(s, { type: 'PICK_CARD', cardId: chosen.id });
    expect(s.phase).toBe('playing');
    expect(s.activeCards.map((c) => c.id)).toContain(chosen.id);
    expect(s.round.round).toBe(2);
    expect(s.round.score).toBe(0);
    expect(s.pendingPlacements).toEqual([]);
    expect(s.board.cells.every((row) => row.every((cell) => cell.tile === null))).toBe(true);
  });

  it('PICK_CARD applies a rackSize setup card (letterHoard => 10-tile rack)', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'PROCEED' });
    const letterHoard = POWER_CARD_POOL.find((c) => c.id === 'letterHoard')!;
    s = { ...s, cardChoice: [letterHoard] };
    s = runReducer(s, { type: 'PICK_CARD', cardId: 'letterHoard' });
    expect(s.rack.length).toBe(10);
  });

  it('RESTART returns to a fresh intro state', () => {
    let s = runReducer(playingWith(9999, 1), { type: 'END_ROUND' });
    s = runReducer(s, { type: 'RESTART' });
    expect(s.phase).toBe('intro');
    expect(s.round.round).toBe(1);
    expect(s.activeCards).toEqual([]);
    expect(s.runTotal).toBe(0);
  });
});
