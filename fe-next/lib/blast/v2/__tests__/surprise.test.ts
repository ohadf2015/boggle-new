import { describe, expect, it } from 'vitest';
import {
  rollSurprise,
  surpriseChance,
  pickSurprise,
  surpriseReward,
  advanceSeed,
  seedUnit,
  SURPRISE_UNLOCK_LEVEL,
  SURPRISE_COOLDOWN,
  SURPRISE_PITY,
  resolveSubmitSurprise,
  initialSurpriseSeed,
  type SurpriseContext,
  type SurpriseEvent,
  type SurpriseState,
} from '../surprise';

const baseCtx = (over: Partial<SurpriseContext> = {}): SurpriseContext => ({
  levelNumber: 10,
  // Below SURPRISE_PITY (4) so the default ctx exercises the SCALED chance, not
  // the pity guarantee — the scaling tests below depend on this.
  wordsSinceLast: 3,
  wordLen: 4,
  chainDepth: 0,
  ...over,
});

// Deterministic rng stub: replays the given values, then repeats the last.
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)]!;
};

describe('surpriseChance — variable-ratio with guards', () => {
  it('is zero before the unlock level (FTUE protection)', () => {
    expect(surpriseChance(baseCtx({ levelNumber: SURPRISE_UNLOCK_LEVEL - 1 }))).toBe(0);
  });

  it('is zero during the cooldown window (anti-clump)', () => {
    expect(surpriseChance(baseCtx({ wordsSinceLast: SURPRISE_COOLDOWN - 1 }))).toBe(0);
  });

  it('is a guaranteed 1 once the pity threshold is reached (anti-drought)', () => {
    expect(surpriseChance(baseCtx({ wordsSinceLast: SURPRISE_PITY }))).toBe(1);
  });

  it('rewards longer words with a higher chance', () => {
    const short = surpriseChance(baseCtx({ wordLen: 3 }));
    const long = surpriseChance(baseCtx({ wordLen: 7 }));
    expect(long).toBeGreaterThan(short);
  });

  it('rewards deeper cascades with a higher chance', () => {
    const flat = surpriseChance(baseCtx({ chainDepth: 0 }));
    const deep = surpriseChance(baseCtx({ chainDepth: 3 }));
    expect(deep).toBeGreaterThan(flat);
  });

  it('never reaches a guaranteed fire from scaling alone (stays a gamble)', () => {
    expect(surpriseChance(baseCtx({ wordLen: 12, chainDepth: 9 }))).toBeLessThan(1);
  });
});

describe('rollSurprise', () => {
  it('returns null when the fire draw exceeds the chance', () => {
    // chance for this ctx is well below 0.99; first draw 0.99 → no fire.
    expect(rollSurprise(seq(0.99), baseCtx())).toBeNull();
  });

  it('fires and picks an event when the draw is under the chance', () => {
    const ev = rollSurprise(seq(0.0, 0.0), baseCtx());
    expect(ev).not.toBeNull();
  });

  it('always fires at the pity threshold regardless of the draw', () => {
    expect(rollSurprise(seq(0.999, 0.5), baseCtx({ wordsSinceLast: SURPRISE_PITY }))).not.toBeNull();
  });

  it('returns null and consumes no second draw when locked', () => {
    expect(rollSurprise(seq(0.0, 0.0), baseCtx({ levelNumber: 1 }))).toBeNull();
  });
});

describe('pickSurprise — weighted distribution', () => {
  it('maps the bottom of the range to coin_burst (the common case)', () => {
    expect(pickSurprise(0)).toBe('coin_burst');
  });
  it('maps the very top of the range to golden_word (the rare jackpot)', () => {
    expect(pickSurprise(0.999)).toBe('golden_word');
  });
  it('only ever returns valid events across the whole range', () => {
    const valid: SurpriseEvent[] = ['coin_burst', 'gem_shower', 'chain_charge', 'lucky_double', 'golden_word'];
    for (let r = 0; r < 1; r += 0.011) {
      expect(valid).toContain(pickSurprise(r));
    }
  });
});

describe('surpriseReward', () => {
  it('coin_burst grants coins, no chest, no charge', () => {
    const r = surpriseReward('coin_burst', baseCtx());
    expect(r.coins).toBeGreaterThan(0);
    expect(r.chestProgress).toBe(0);
    expect(r.nextWordMultiplier).toBe(1);
  });

  it('gem_shower grants chest progress, no coins', () => {
    const r = surpriseReward('gem_shower', baseCtx());
    expect(r.chestProgress).toBeGreaterThan(0);
    expect(r.coins).toBe(0);
  });

  it('lucky_double charges the next word ×2 instead of paying out now', () => {
    const r = surpriseReward('lucky_double', baseCtx());
    expect(r.nextWordMultiplier).toBe(2);
    expect(r.coins).toBe(0);
  });

  it('chain_charge scales its payout with cascade depth', () => {
    const flat = surpriseReward('chain_charge', baseCtx({ chainDepth: 0 }));
    const deep = surpriseReward('chain_charge', baseCtx({ chainDepth: 4 }));
    expect(deep.coins).toBeGreaterThan(flat.coins);
  });

  it('golden_word is the biggest combined payout', () => {
    const golden = surpriseReward('golden_word', baseCtx());
    const coin = surpriseReward('coin_burst', baseCtx());
    expect(golden.coins + golden.chestProgress * 1000).toBeGreaterThan(coin.coins + coin.chestProgress * 1000);
  });

  it('payout scales up with level progression', () => {
    const early = surpriseReward('coin_burst', baseCtx({ levelNumber: 2 }));
    const late = surpriseReward('coin_burst', baseCtx({ levelNumber: 40 }));
    expect(late.coins).toBeGreaterThan(early.coins);
  });
});

describe('seed helpers are deterministic and bounded', () => {
  it('advanceSeed is a pure function of its input', () => {
    expect(advanceSeed(123)).toBe(advanceSeed(123));
    expect(advanceSeed(123)).not.toBe(advanceSeed(124));
  });
  it('seedUnit stays within [0,1)', () => {
    let s = 1;
    for (let i = 0; i < 50; i++) {
      s = advanceSeed(s);
      const u = seedUnit(s);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });
});

const freshSurprise = (over: Partial<SurpriseState> = {}): SurpriseState => ({
  surpriseSeed: initialSurpriseSeed(10),
  wordsSinceSurprise: 0,
  nextWordMultiplier: 1,
  activeSurprise: null,
  ...over,
});

describe('resolveSubmitSurprise — reducer seam', () => {
  it('advances the seed on an eligible word and is pure (no Math.random)', () => {
    // Past the cooldown so a roll actually happens (and consumes the seed).
    const eligible = freshSurprise({ wordsSinceSurprise: 4 });
    const a = resolveSubmitSurprise(eligible, { levelNumber: 10, wordLen: 4, chainDepth: 0 });
    expect(a.next.surpriseSeed).not.toBe(initialSurpriseSeed(10));
    // Same input slice → same output (pure).
    const b = resolveSubmitSurprise(freshSurprise({ wordsSinceSurprise: 4 }), { levelNumber: 10, wordLen: 4, chainDepth: 0 });
    expect(b.next.surpriseSeed).toBe(a.next.surpriseSeed);
    expect(b.next.activeSurprise?.event).toBe(a.next.activeSurprise?.event);
  });

  it('consumes a banked ×2 charge on the next word', () => {
    const r = resolveSubmitSurprise(freshSurprise({ nextWordMultiplier: 2, wordsSinceSurprise: 0 }), {
      levelNumber: 10, wordLen: 3, chainDepth: 0,
    });
    expect(r.appliedMultiplier).toBe(2);
  });

  it('guarantees a fire at the pity threshold and resets the counter', () => {
    const r = resolveSubmitSurprise(freshSurprise({ wordsSinceSurprise: SURPRISE_PITY - 1 }), {
      levelNumber: 10, wordLen: 4, chainDepth: 0,
    });
    expect(r.next.activeSurprise).not.toBeNull();
    expect(r.next.wordsSinceSurprise).toBe(0);
  });

  it('increments wordsSinceSurprise and clears the banner when nothing fires', () => {
    // Cooldown window guarantees no fire.
    const r = resolveSubmitSurprise(
      freshSurprise({ wordsSinceSurprise: 0, activeSurprise: { event: 'coin_burst', coins: 1, chestProgress: 0, key: 3 } }),
      { levelNumber: 10, wordLen: 3, chainDepth: 0 },
    );
    expect(r.next.activeSurprise).toBeNull();
    expect(r.next.wordsSinceSurprise).toBe(1);
    expect(r.appliedMultiplier).toBe(1);
  });

  it('bumps the banner key so a repeat event re-animates', () => {
    const r = resolveSubmitSurprise(
      freshSurprise({ wordsSinceSurprise: SURPRISE_PITY, activeSurprise: { event: 'gem_shower', coins: 0, chestProgress: 0.1, key: 5 } }),
      { levelNumber: 10, wordLen: 4, chainDepth: 0 },
    );
    expect(r.next.activeSurprise?.key).toBe(6);
  });

  it('a fired surprise carries its reward onto the result deltas', () => {
    const r = resolveSubmitSurprise(freshSurprise({ wordsSinceSurprise: SURPRISE_PITY }), {
      levelNumber: 10, wordLen: 4, chainDepth: 0,
    });
    const ev = r.next.activeSurprise!.event;
    if (ev === 'lucky_double') {
      expect(r.next.nextWordMultiplier).toBe(2);
    } else {
      expect(r.bonusCoins + r.bonusChestProgress).toBeGreaterThan(0);
    }
  });
});

// --- Cadence simulation: surprises must actually fire within REAL level
// lengths. Blast V2 levels ship 3 (L1-5) / 4-5 (L6-30) theme words, so a player
// makes only ~3-5 submits per level. The variable-reward loop is worthless if
// a typical level shows zero surprises — these tests pin the felt rate, not
// just the per-function math. ---
function simulateLevel(levelNumber: number, submits: number, wordLen = 4, chainDepth = 0) {
  let s: SurpriseState = {
    surpriseSeed: initialSurpriseSeed(levelNumber),
    wordsSinceSurprise: 0,
    nextWordMultiplier: 1,
    activeSurprise: null,
  };
  const fired: Array<number> = []; // submit indices (1-based) that fired
  for (let i = 1; i <= submits; i++) {
    const r = resolveSubmitSurprise(s, { levelNumber, wordLen, chainDepth });
    if (r.next.activeSurprise) fired.push(i);
    s = r.next;
  }
  return fired;
}

describe('surprise cadence over real level lengths', () => {
  it('a 5-word level (L19 class) always lands at least one surprise', () => {
    expect(simulateLevel(19, 5).length).toBeGreaterThanOrEqual(1);
  });

  it('a 4-word level always lands at least one surprise', () => {
    expect(simulateLevel(10, 4).length).toBeGreaterThanOrEqual(1);
  });

  it('the pity guarantee is REACHABLE within a 4-5 submit level', () => {
    // The guarantee must fire by the time a short level ends, else it's dead code.
    expect(SURPRISE_PITY).toBeLessThanOrEqual(5);
  });

  it('never fires on two adjacent submits (cooldown holds across the run)', () => {
    for (const lvl of [6, 10, 19, 25]) {
      const fired = simulateLevel(lvl, 8);
      for (let i = 1; i < fired.length; i++) {
        expect(fired[i]! - fired[i - 1]!).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('does not over-fire — a short level is not wall-to-wall surprises', () => {
    // Spacing + cooldown keep it special: at most ~half the submits pop.
    expect(simulateLevel(19, 5).length).toBeLessThanOrEqual(3);
  });
});
