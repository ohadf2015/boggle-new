import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';
import type { PlacedTile } from '../types';

const placement = (rackTileId: string, row: number, col: number, letter: string, value: number): PlacedTile => ({
  rackTileId,
  row,
  col,
  letter,
  value,
});

describe('useWordCraftGame streak tracking', () => {
  it('initializes both streaks to zero', () => {
    const s = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    expect(s.streaks.player).toBe(0);
    expect(s.streaks.bot).toBe(0);
  });

  it('increments player streak on COMMIT_PLAYER', () => {
    const s0 = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    const s1 = wordCraftReducer(s0, {
      type: 'COMMIT_PLAYER',
      placements: [placement(s0.player.rack[0].id, 7, 7, 'A', 1)],
      score: 10,
      words: ['A'],
    });
    expect(s1.streaks.player).toBe(1);
    expect(s1.streaks.bot).toBe(0);
  });

  it('increments bot streak on COMMIT_BOT and leaves player streak alone', () => {
    const s0 = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    const s1 = wordCraftReducer(s0, {
      type: 'COMMIT_BOT',
      placements: [placement(s0.bot.rack[0].id, 7, 7, 'A', 1)],
      score: 5,
      words: ['A'],
    });
    expect(s1.streaks.bot).toBe(1);
    expect(s1.streaks.player).toBe(0);
  });

  it('resets the current turn-takers streak on PASS', () => {
    let s = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    s = wordCraftReducer(s, {
      type: 'COMMIT_PLAYER',
      placements: [placement(s.player.rack[0].id, 7, 7, 'A', 1)],
      score: 10,
      words: ['A'],
    });
    s = wordCraftReducer(s, {
      type: 'COMMIT_BOT',
      placements: [placement(s.bot.rack[0].id, 8, 7, 'B', 3)],
      score: 5,
      words: ['B'],
    });
    expect(s.streaks.player).toBe(1);
    // Now player passes — their streak resets, bot streak unaffected.
    s = wordCraftReducer(s, { type: 'PASS' });
    expect(s.streaks.player).toBe(0);
    expect(s.streaks.bot).toBe(1);
  });

  it('caps streak at 99 so it cannot grow unbounded', () => {
    let s = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });
    s = { ...s, streaks: { player: 99, bot: 0 } };
    s = wordCraftReducer(s, {
      type: 'COMMIT_PLAYER',
      placements: [placement(s.player.rack[0].id, 7, 7, 'A', 1)],
      score: 10,
      words: ['A'],
    });
    expect(s.streaks.player).toBe(99);
  });
});
