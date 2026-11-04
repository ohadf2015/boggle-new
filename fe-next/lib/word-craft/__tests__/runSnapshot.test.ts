import { describe, it, expect, beforeEach } from 'vitest';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';
import { saveRunSnapshot, loadRunSnapshot, clearRunSnapshot } from '../runSnapshot';

const KEY = 'guest-1:L1';

function midRun() {
  const start = buildInitialState({ seed: 4242, locale: 'en', viewportDims: { size: 9, bagSize: 60 }, lessonTargets: ['CAT'] });
  return wordCraftReducer(start, { type: 'PASS' });
}

beforeEach(() => localStorage.clear());

describe('WordCraft lesson run snapshot', () => {
  it('Given a round in progress, When the page reloads, Then the same board, racks, scores and turn come back', () => {
    const state = midRun();
    saveRunSnapshot(KEY, state);
    const back = loadRunSnapshot(KEY);
    expect(back).not.toBeNull();
    expect(back!.board).toEqual(state.board);
    expect(back!.player.rack).toEqual(state.player.rack);
    expect(back!.bot.rack).toEqual(state.bot.rack);
    expect(back!.bag.tiles).toEqual(state.bag.tiles);
    expect(back!.turn).toBe(state.turn);
    expect(back!.history).toEqual(state.history);
    expect(back!.seed).toBe(4242);
    expect(back!.lesson?.targets).toEqual(['CAT']);
  });

  it('Given a restored round, When the bag is shuffled for a swap, Then it still has a working shuffle', () => {
    saveRunSnapshot(KEY, midRun());
    const back = loadRunSnapshot(KEY)!;
    expect(typeof back.bag.rng).toBe('function');
    expect(back.bag.rng()).toBeGreaterThanOrEqual(0);
  });

  it('Given tiles placed but not submitted, When restored, Then they are back in the rack and nothing is pending', () => {
    const state = midRun();
    const tile = state.player.rack[0];
    const placed = wordCraftReducer(state, { type: 'PLACE_PENDING', placement: { row: 4, col: 4, letter: tile.letter, value: tile.value, rackTileId: tile.id } as never });
    saveRunSnapshot(KEY, placed);
    const back = loadRunSnapshot(KEY)!;
    expect(back.pendingPlacements).toEqual([]);
    expect(back.player.rack.map((t) => t.id)).toContain(tile.id);
  });

  it('Given the round ended, When saved, Then no snapshot is left to resume', () => {
    saveRunSnapshot(KEY, midRun());
    saveRunSnapshot(KEY, { ...midRun(), turn: 'over' });
    expect(loadRunSnapshot(KEY)).toBeNull();
  });

  it('Given a snapshot from yesterday, When loaded, Then it is dropped', () => {
    saveRunSnapshot(KEY, midRun(), 1_000);
    expect(loadRunSnapshot(KEY, 1_000 + 13 * 60 * 60 * 1000)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('Given a corrupt or foreign value, When loaded, Then it is dropped rather than crashing the game', () => {
    localStorage.setItem('wc_lesson_run_v1:' + KEY, '{not json');
    expect(loadRunSnapshot(KEY)).toBeNull();
    localStorage.setItem('wc_lesson_run_v1:' + KEY, JSON.stringify({ savedAt: Date.now(), state: { board: 1 } }));
    expect(loadRunSnapshot(KEY)).toBeNull();
  });

  it('Given another student or lesson, When loaded, Then their round is not picked up', () => {
    saveRunSnapshot(KEY, midRun());
    expect(loadRunSnapshot('guest-2:L1')).toBeNull();
    expect(loadRunSnapshot('guest-1:L2')).toBeNull();
    clearRunSnapshot(KEY);
    expect(loadRunSnapshot(KEY)).toBeNull();
  });
});
