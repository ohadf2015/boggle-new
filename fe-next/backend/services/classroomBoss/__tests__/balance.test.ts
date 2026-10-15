import { describe, it, expect } from 'vitest';
import { makeRng } from '@/lib/adventure/play/rng';
import { createBoss, applyWord, tick, toView } from '../engine';

const SCORE: Record<number, number> = { 3: 10, 4: 20, 5: 50, 6: 100, 7: 200 };
const LEN = [3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6, 7];

/** A plausible class: each student lands a word about every 8s, mostly 3-4 letters, a third are half-score repeat finds. */
function fight(students: number, seed: string, roundSeconds = 180) {
  const rng = makeRng(seed);
  let s = createBoss({ seed, bossId: 'lexiconDragon', students, roundSeconds, rows: 5, cols: 5, now: 0 });
  const nextAt = Array.from({ length: students }, () => 2000 + rng() * 6000);
  for (let now = 0; now <= roundSeconds * 1000; now += 250) {
    s = tick(s, now).state;
    for (let i = 0; i < students; i++) {
      if (now < nextAt[i]) continue;
      nextAt[i] = now - Math.log(1 - rng()) * 8000;
      const len = LEN[Math.floor(rng() * LEN.length)];
      const score = rng() < 0.35 ? SCORE[len] / 2 : SCORE[len];
      s = applyWord(s, { username: `s${i}`, word: 'x'.repeat(len), score, now }).state;
    }
    if (s.status === 'defeated') return { won: true, pct: 100, at: now };
  }
  return { won: false, pct: toView(s, roundSeconds * 1000).pctDealt, at: Infinity };
}

describe('HP balance (simulated classes)', () => {
  it.each([5, 15, 25])('given a typical class of %i, then it usually beats the boss, but not in the first minute', (n) => {
    const runs = ['a', 'b', 'c', 'd', 'e'].map((k) => fight(n, `${n}${k}`));
    expect(runs.filter((r) => r.won).length).toBeGreaterThanOrEqual(3);
    for (const r of runs) expect(r.at).toBeGreaterThan(60_000);
  });

  it('given a pair of students, then the fight is close: most of the HP goes', () => {
    const runs = ['a', 'b', 'c'].map((k) => fight(2, `2${k}`));
    for (const r of runs) expect(r.pct).toBeGreaterThanOrEqual(50);
  });
});
