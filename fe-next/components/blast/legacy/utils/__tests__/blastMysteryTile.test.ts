import { describe, it, expect } from 'vitest';
import { rollMysteryOutcome } from '../blastMysteryTile';

const rngOf = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('rollMysteryOutcome', () => {
  it('is deterministic for a given rng', () => {
    expect(rollMysteryOutcome(rngOf(0.1, 0.5))).toEqual(rollMysteryOutcome(rngOf(0.1, 0.5)));
  });

  it('maps roll bands to outcomes: 45% burst / 30% spawn / 20% pop / 5% mega', () => {
    expect(rollMysteryOutcome(rngOf(0.10, 0.5)).kind).toBe('scoreBurst');
    expect(rollMysteryOutcome(rngOf(0.50, 0.5)).kind).toBe('spawnSpecial');
    expect(rollMysteryOutcome(rngOf(0.80, 0.5)).kind).toBe('miniPop');
    expect(rollMysteryOutcome(rngOf(0.97, 0.5)).kind).toBe('mega');
  });

  it('scoreBurst points stay in 25-60', () => {
    for (const r of [0, 0.4449, 0.999]) {
      const o = rollMysteryOutcome(rngOf(0.2, r));
      if (o.kind === 'scoreBurst') { expect(o.points).toBeGreaterThanOrEqual(25); expect(o.points).toBeLessThanOrEqual(60); }
    }
  });

  it('spawnSpecial picks a core special', () => {
    const o = rollMysteryOutcome(rngOf(0.6, 0.5));
    if (o.kind === 'spawnSpecial') expect(['bomb', 'gold', 'rainbow', 'ice']).toContain(o.special);
  });

  it('mega pays 150', () => {
    const o = rollMysteryOutcome(rngOf(0.99, 0.5));
    expect(o).toEqual({ kind: 'mega', points: 150 });
  });
});
