import { describe, it, expect } from 'vitest';
import {
  mergeDailyLeaderboard,
  towerPoints,
  TOWER_METRES_TO_POINTS,
  type MergeInput,
} from '../mergeDailyLeaderboard';

/**
 * The hub board summed Word Hunt + Word Wheel only, while the hub showed four
 * cards — so two modes were silently missing from "today's top players".
 * These pin the merge across all four, and the two things that make it not a
 * plain sum: Word Tower scores in METRES, and identity has to group an account
 * and a guest differently.
 */

const hunt = (id: string, value: number, name = 'A') => ({
  player_id: id, display_name: name, value,
});

describe('mergeDailyLeaderboard', () => {
  it('sums one player across all four modes into a single row', () => {
    const inputs: MergeInput[] = [
      { mode: 'word-hunt', rows: [hunt('p1', 800)] },
      { mode: 'word-wheel', rows: [hunt('p1', 500)] },
      { mode: 'connections', rows: [hunt('p1', 900)] },
      { mode: 'word-tower', rows: [hunt('p1', 100)] }, // 100m -> 500 pts
    ];
    const [entry] = mergeDailyLeaderboard(inputs);
    expect(entry.total).toBe(800 + 500 + 900 + 500);
    expect(entry.byMode).toEqual({
      'word-hunt': 800, 'word-wheel': 500, connections: 900, 'word-tower': 500,
    });
    expect(entry.playedModes).toHaveLength(4);
  });

  it('converts Word Tower metres to points so the mode is not invisible in the total', () => {
    // Raw metres would contribute 103 against Word Wheel's ~537 average.
    expect(towerPoints(103)).toBe(103 * TOWER_METRES_TO_POINTS);
    expect(towerPoints(0)).toBe(0);
    expect(towerPoints(null)).toBe(0);
    expect(towerPoints(undefined)).toBe(0);
    expect(towerPoints(-5)).toBe(0);
  });

  it('keeps the raw tower height so the breakdown can show a real unit', () => {
    const [entry] = mergeDailyLeaderboard([
      { mode: 'word-tower', rows: [hunt('p1', 42)] },
    ]);
    expect(entry.towerHeightM).toBe(42);
    expect(entry.byMode['word-tower']).toBe(210);
  });

  it('reports 0 for a mode the player has not played, and does not claim they played it', () => {
    const [entry] = mergeDailyLeaderboard([
      { mode: 'word-hunt', rows: [hunt('p1', 700)] },
    ]);
    expect(entry.byMode['word-wheel']).toBe(0);
    expect(entry.playedModes).toEqual(['word-hunt']);
  });

  it('never merges an account with a guest', () => {
    const entries = mergeDailyLeaderboard([
      { mode: 'word-hunt', rows: [
        { player_id: 'p1', display_name: 'Signed in', value: 700 },
        { guest_fingerprint: 'g1', display_name: 'Guest', value: 650 },
      ] },
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.name)).toEqual(['Signed in', 'Guest']);
  });

  it('drops a row with no identity rather than inventing a shared player', () => {
    const entries = mergeDailyLeaderboard([
      { mode: 'word-hunt', rows: [
        { display_name: 'Nobody', value: 900 },
        { player_id: 'p1', display_name: 'Real', value: 100 },
      ] },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Real');
  });

  it('keeps the BEST of two rows for the same mode (retry / catch-up), never their sum', () => {
    const [entry] = mergeDailyLeaderboard([
      { mode: 'word-wheel', rows: [hunt('p1', 400), hunt('p1', 900)] },
    ]);
    expect(entry.byMode['word-wheel']).toBe(900);
    expect(entry.total).toBe(900);
  });

  it('ranks by total and breaks ties by how many modes were played', () => {
    const entries = mergeDailyLeaderboard([
      { mode: 'word-hunt', rows: [hunt('lo', 100, 'Lo'), hunt('hi', 900, 'Hi'), hunt('tie', 50, 'Tie')] },
      { mode: 'word-wheel', rows: [hunt('tie', 50, 'Tie')] },
    ]);
    expect(entries.map((e) => e.name)).toEqual(['Hi', 'Tie', 'Lo']);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('never returns a player identifier', () => {
    const [entry] = mergeDailyLeaderboard([
      { mode: 'word-hunt', rows: [{ player_id: 'secret-uuid', guest_fingerprint: 'secret-fp', display_name: 'A', value: 10 }] },
    ]);
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('secret-uuid');
    expect(serialized).not.toContain('secret-fp');
  });

  it('honours the limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) => hunt(`p${i}`, i * 10, `P${i}`));
    expect(mergeDailyLeaderboard([{ mode: 'word-hunt', rows }], 3)).toHaveLength(3);
  });

  it('tolerates a mode being absent entirely', () => {
    expect(mergeDailyLeaderboard([])).toEqual([]);
    expect(mergeDailyLeaderboard([{ mode: 'word-hunt', rows: [] }])).toEqual([]);
  });
});
