import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';
import type { PlacedTile } from '../types';

function makePlaced(row: number, col: number, letter: string, value: number, id: string): PlacedTile {
  return { row, col, letter, value, isBlank: false, rackTileId: id };
}

// Direct proof that a WordCraft game actually REACHES an end — the user's
// "no ending" report. Two consecutive passes (one per side) terminate the game.
describe('wordCraftReducer reaches a game-over', () => {
  it('ends after two consecutive passes', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    expect(start.turn).toBe('player');

    const afterFirstPass = wordCraftReducer(start, { type: 'PASS' });
    expect(afterFirstPass.turn).toBe('bot'); // not over yet — one pass
    expect(afterFirstPass.consecutivePasses).toBe(1);

    const afterSecondPass = wordCraftReducer(afterFirstPass, { type: 'PASS' });
    expect(afterSecondPass.turn).toBe('over'); // two in a row → game over
  });

  it('a commit between passes resets the deadlock counter (does not falsely end)', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    const afterPass = wordCraftReducer(start, { type: 'PASS' });
    expect(afterPass.consecutivePasses).toBe(1);
    // A scoring commit clears the pass streak (real play keeps the game alive).
    const afterCommit = wordCraftReducer(afterPass, {
      type: 'COMMIT_BOT',
      placements: [],
      score: 0,
      words: [],
    });
    expect(afterCommit.consecutivePasses).toBe(0);
  });

  // The user's report: "the sack should get empty from turn to turn and when
  // it is empty the game is finished." The bag is the game clock — once it
  // drains, the game ends, even though both racks still hold tiles.
  it('ends the moment the sack empties — even with tiles still in the rack', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    // Drain the sack so the next commit draws zero replacements.
    start.bag.tiles = [];
    // Play exactly ONE tile from a full 7-tile rack: the rack stays at 6, so a
    // game-over here is attributable ONLY to the empty sack (not the old
    // "rack reached zero" rule).
    const played = start.player.rack[0];
    const next = wordCraftReducer(start, {
      type: 'COMMIT_PLAYER',
      placements: [makePlaced(5, 5, played.letter, played.value, played.id)],
      score: 4,
      words: ['QI'],
    });

    expect(next.turn).toBe('over');
    expect(next.player.rack.length).toBeGreaterThan(0); // proves it's bag-empty, not rack-empty
  });

  it('the bot draining the sack also ends the game', () => {
    const start = buildInitialState({ seed: 2, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    start.turn = 'bot';
    start.bag.tiles = [];
    const played = start.bot.rack[0];
    const next = wordCraftReducer(start, {
      type: 'COMMIT_BOT',
      placements: [makePlaced(5, 5, played.letter, played.value, played.id)],
      score: 4,
      words: ['QI'],
    });

    expect(next.turn).toBe('over');
  });

  // End-to-end proof (no forcing of bag=[]): a real game that drains the sack
  // one tile per turn ACTUALLY terminates — and in a sane number of turns, not
  // the open-ended slog the user reported.
  it('organically reaches game-over by draining the sack — in a bounded number of turns', () => {
    let s = buildInitialState({ seed: 3, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    const startBag = s.bag.tiles.length; // 54 - 14 dealt = 40
    expect(startBag).toBe(40);

    let turns = 0;
    while (s.turn !== 'over' && turns < 200) {
      const who = s.turn as 'player' | 'bot';
      const actor = who === 'player' ? s.player : s.bot;
      const tile = actor.rack[0];
      const r = turns % 11;
      const c = (turns * 3) % 11;
      s = wordCraftReducer(s, {
        type: who === 'player' ? 'COMMIT_PLAYER' : 'COMMIT_BOT',
        placements: [makePlaced(r, c, tile.letter, tile.value, tile.id)],
        score: 1,
        words: ['X'],
      });
      turns++;
    }

    expect(s.turn).toBe('over'); // it ENDS — not the "no ending" report
    expect(s.bag.tiles.length).toBe(0); // ended because the sack drained
    expect(turns).toBeLessThanOrEqual(startBag); // ≤40 turns, a finite game
  });

  it('does NOT end while the sack still has tiles (a normal move passes to the bot)', () => {
    const start = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 11, bagSize: 54 } });
    expect(start.bag.tiles.length).toBeGreaterThan(0);
    const played = start.player.rack[0];
    const next = wordCraftReducer(start, {
      type: 'COMMIT_PLAYER',
      placements: [makePlaced(5, 5, played.letter, played.value, played.id)],
      score: 4,
      words: ['QI'],
    });

    expect(next.turn).toBe('bot'); // game continues — sack not yet empty
  });
});
