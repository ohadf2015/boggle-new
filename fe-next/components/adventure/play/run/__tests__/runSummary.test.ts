import { describe, it, expect } from 'vitest';
import { levelLoot, runSummary, resultScreen, resultRunStep, runWordCount } from '../runSummary';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const run = (over: Partial<PublicRun> = {}): PublicRun => ({
  w: 2, step: 3, hp: 4, maxHp: 5, relics: ['magnet'], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 30, ...over,
});

describe('resultScreen', () => {
  it('Given a boss win, then it is the run-complete screen even though runOver is true', () => {
    expect(resultScreen({ won: true, runOver: true, runComplete: true })).toBe('complete');
  });
  it('Given a loss or death, then it is the run-over screen', () => {
    expect(resultScreen({ won: false, runOver: true })).toBe('over');
  });
  it('Given the enemy fell but the player died too (won, no next link), then the run is over', () => {
    expect(resultScreen({ won: true, runOver: true, runComplete: false })).toBe('over');
  });
  it('Given a normal win, then it is the cleared screen', () => {
    expect(resultScreen({ won: true, runOver: false })).toBe('cleared');
  });
});

describe('levelLoot', () => {
  it('Given a won level with a next run, then gold is the difference and new items are listed', () => {
    const loot = levelLoot(run(), { nextRun: run({ gold: 42 }), rewards: ['scroll-w2-1'] });
    expect(loot).toEqual({ gold: 12, potions: [], items: ['scroll-w2-1'], skin: false });
  });
  it('Given no next run (loss / boss), then gold is 0 — never a negative or +0 chip', () => {
    expect(levelLoot(run(), { rewards: [] }).gold).toBe(0);
  });
  it('Given the potion count grew, then each new potion is listed', () => {
    const loot = levelLoot(run(), { nextRun: run({ potions: { heal: 2, time: 1, cleanse: 0, insight: 0 } }), rewards: [] });
    expect(loot.potions).toEqual(['heal', 'time']);
  });
  it('flags the world skin and keeps it out of the item list', () => {
    const loot = levelLoot(run(), { rewards: ['world-skin-2', 'boss-trophy-w2'] }, 'world-skin-2');
    expect(loot.skin).toBe(true);
    expect(loot.items).toEqual(['boss-trophy-w2']);
  });
  it('survives a missing previous run', () => {
    expect(levelLoot(null, { nextRun: run({ gold: 9 }), rewards: [] }).gold).toBe(9);
  });
});

describe('runSummary', () => {
  it('Given a death on level 3, then 2 levels were cleared and the best word is the top scorer', () => {
    const s = runSummary(run({ step: 3 }), { won: false, validWords: ['cat', 'planet', 'dog'], points: [3, 12, 3] });
    expect(s).toEqual({ levelsCleared: 2, relics: ['magnet'], gold: 30, bestWord: { word: 'planet', pts: 12 } });
  });
  it('Given a boss win, then the boss level counts as cleared and gold comes from the final run', () => {
    const s = runSummary(run({ step: 7, gold: 80 }), { won: true, validWords: [], points: [] });
    expect(s.levelsCleared).toBe(7);
    expect(s.bestWord).toBeNull();
    expect(s.gold).toBe(80);
  });
  it('Given a run-over with no nextRun and purseCoins=0 (Redis down), then gold must be 0 not run.gold', () => {
    // When the server fails to credit purse (Redis unavailable), it returns purseCoins=0.
    // The client must display what the server credited (0), not what the run had (50).
    const s = runSummary(run({ gold: 50 }), { won: false, validWords: [], purseCoins: 0 });
    expect(s.gold).toBe(0);
  });
  it('Given a run-over with purseCoins, then gold comes from purseCoins', () => {
    const s = runSummary(run({ gold: 50 }), { won: true, validWords: [], purseCoins: 30 });
    expect(s.gold).toBe(30);
  });
  it('falls back to 0 cleared with no run', () => {
    expect(runSummary(null, { won: false, validWords: ['a'], points: undefined }).levelsCleared).toBe(0);
  });
});

describe('resultRunStep — which banked levels the recap’s relic shelf may read', () => {
  // `recordRunWords(world, run.step, …)` banks the level just won into slot
  // `step - 1`, so a recap that asks for `step` would read every level EXCEPT
  // the one the player just finished.
  it('Given a cleared node, then the step counts the node just banked', () => {
    expect(resultRunStep(run({ step: 7 }), true)).toBe(8);
  });
  it('Given a death, then the fatal node banks nothing and is not counted', () => {
    expect(resultRunStep(run({ step: 7 }), false)).toBe(7);
  });
  it('Given no run at all, then it stays at the first step rather than going negative', () => {
    expect(resultRunStep(null, false)).toBe(1);
    expect(resultRunStep(null, true)).toBe(2);
  });
});

describe('runWordCount', () => {
  it('counts every word the run banked on the levels it cleared', () => {
    expect(runWordCount([['a', 'b'], ['c']], { won: true, validWords: ['c'] })).toBe(3);
  });

  it('still counts the words found on the node the run DIED on — a death banks nothing', () => {
    expect(runWordCount([['a', 'b']], { won: false, validWords: ['x', 'y'] })).toBe(4);
  });

  it('a first-node death counts the words it found rather than reporting zero', () => {
    expect(runWordCount([], { won: false, validWords: ['toot'] })).toBe(1);
  });
});
