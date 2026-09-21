import { describe, expect, it } from 'vitest';
import {
  MAX_BALLS,
  buildWreckWorld,
  cutBall,
  decodeRival,
  encodeRival,
  hangBall,
  stepWreck,
  wreckedCount,
  sanitizeWords,
  MAX_WRECK_BLOCKS,
  buildWreckWorldFromTower,
  towerFromWords,
  wreckAccuracy,
  wreckableTower,
  pathHitsTower,
  wreckedIds,
  wreckBounds,
  swingLeftPx,
  raidVerdict,
  revengeLedger,
} from '../wreck';
import type { TowerBlock } from '../estateTower';
import { applyLanding, createRun } from '../run';

const WORDS = ['tower', 'slab', 'anchor', 'crane', 'brick', 'ledge', 'beam', 'stack'];

/** Step the world `ms` at 120Hz. */
const run = (w: ReturnType<typeof buildWreckWorld>, ms: number) => {
  for (let t = 0; t < ms; t += 1000 / 120) stepWreck(w, 1000 / 120);
};

describe('rival share link', () => {
  it('given a tower, when encoded and decoded, then round-trips', () => {
    expect(decodeRival(encodeRival({ name: 'דנה', words: ['שלום', 'בית'] }))).toEqual({ name: 'דנה', words: ['שלום', 'בית'] });
  });

  it('given garbage, when decoded, then null', () => {
    expect(decodeRival('%%%not-base64')).toBeNull();
    expect(decodeRival(btoa('{"name":1}'))).toBeNull();
    expect(decodeRival('')).toBeNull();
  });

  it('given hostile input, when decoded, then clamped to safe sizes', () => {
    const huge = encodeRival({ name: 'x'.repeat(200), words: Array.from({ length: 500 }, () => 'y'.repeat(99)) });
    const r = decodeRival(huge)!;
    expect(r.name.length).toBeLessThanOrEqual(20);
    expect(r.words.length).toBeLessThanOrEqual(30);
    expect(r.words.every((w) => w.length <= 15)).toBe(true);
  });

  it('given a tall tower, when encoded, then the link stays under messenger URL limits', () => {
    const encoded = encodeRival({ name: 'Dana', words: Array.from({ length: 80 }, (_, i) => `floor${i}`) });
    expect(encoded.length).toBeLessThan(2000);
    expect(decodeRival(encoded)!.words.length).toBeLessThanOrEqual(30);
  });

  it('given control characters, when decoded, then stripped', () => {
    expect(decodeRival(encodeRival({ name: 'a\u0000b\u202Ec', words: ['ok\u0007'] }))).toEqual({ name: 'abc', words: ['ok'] });
  });
});

describe('wreck world', () => {
  it('given rival words, when built, then the tower stands and nothing counts as wrecked', () => {
    const w = buildWreckWorld(WORDS);
    run(w, 800);
    expect(wreckedCount(w)).toBe(0);
    expect(w.tower.collapsed).toBe(false);
  });

  it('given a ball cut at the bottom of its swing, when it flies, then it smashes the tower', () => {
    // Given a standing tower and a hung ball
    const w = buildWreckWorld(WORDS);
    run(w, 600);
    hangBall(w);
    // When the ball swings to its lowest point (quarter period) and is cut
    run(w, w.quarterPeriodMs);
    cutBall(w);
    run(w, 2500);
    // Then a real chunk of the tower is down
    expect(wreckedCount(w)).toBeGreaterThanOrEqual(Math.ceil(WORDS.length * 0.3));
  });

  it('given a ball never cut, when time passes, then it swings but never reaches the tower', () => {
    const w = buildWreckWorld(WORDS);
    run(w, 600);
    hangBall(w);
    run(w, 4000);
    expect(wreckedCount(w)).toBe(0);
  });
});

describe('wrecking balls earned', () => {
  it('given a fresh run, when read, then two balls to start', () => {
    expect(createRun(1).balls).toBe(2);
  });

  it('given a 3-perfect streak, when landed, then a ball is earned', () => {
    let r = createRun(1);
    for (let i = 0; i < 3; i += 1) r = applyLanding(r, { quality: 'perfect', wordLen: 4 }).run;
    expect(r.balls).toBe(3);
  });

  it('given endless perfects, when landed, then balls are capped', () => {
    let r = createRun(1);
    for (let i = 0; i < 60; i += 1) r = applyLanding(r, { quality: 'perfect', wordLen: 4 }).run;
    expect(r.balls).toBe(MAX_BALLS);
  });
});

describe('sanitizeWords', () => {
  it('given untrusted words, when sanitized, then bidi overrides, controls and empties are dropped and lengths clamped', () => {
    const out = sanitizeWords(['\u202Eevil', 'ok\u0000', '', 'x'.repeat(40), 42 as unknown as string]);
    expect(out).toEqual(['evil', 'ok', 'x'.repeat(15)]);
  });
});

describe('raiding a stored tower', () => {
  const stored = (n: number): TowerBlock[] =>
    Array.from({ length: n }, (_, i) => ({ word: `w${i}`, w: 220, x: i % 2 ? 6 : -6, y: -(i * 120 + 60), angle: 0, color: 0x7ce04a }));

  it('given a stored tower, when made wreckable, then floors are upright, restacked and capped', () => {
    const out = wreckableTower(stored(80));
    expect(out.length).toBe(MAX_WRECK_BLOCKS);
    expect(out.every((b) => b.angle === 0)).toBe(true);
    expect(out[0].y).toBeGreaterThan(out[1].y); // lowest floor first, y negative upwards
  });

  it('given a hostile stored tower, when built, then it stands on its own', () => {
    // Given leaning, wildly offset, oversized floors (jsonb a rival could hold)
    const hostile: TowerBlock[] = Array.from({ length: 20 }, (_, i) => ({
      word: 'x'.repeat(10),
      w: i % 2 ? 2000 : 30,
      x: (i % 2 ? 1 : -1) * 900,
      y: -(i * 120 + 60),
      angle: i % 2 ? Math.PI / 2 : -Math.PI / 2,
      color: 0,
    }));
    // When built and left alone
    const w = buildWreckWorldFromTower(hostile);
    run(w, 2000);
    // Then nothing counts as wrecked — a self-collapsing tower would be a free max raid
    expect(wreckedCount(w)).toBe(0);
    expect(w.tower.collapsed).toBe(false);
  });

  it('given an empty stored tower, when built, then there is nothing to hit', () => {
    const w = buildWreckWorldFromTower([]);
    expect(w.ids).toHaveLength(0);
    expect(wreckedCount(w)).toBe(0);
  });

  it('given a stored tower, when hit at the bottom of the swing, then floors come down', () => {
    const w = buildWreckWorldFromTower(stored(10));
    run(w, 600);
    hangBall(w);
    run(w, w.quarterPeriodMs);
    cutBall(w);
    run(w, 2500);
    expect(wreckedCount(w)).toBeGreaterThanOrEqual(3);
  });

  it('given wrecked floors, when scored, then accuracy is a safe 0..1 fraction', () => {
    expect(wreckAccuracy(3, 6)).toBeCloseTo(0.5);
    expect(wreckAccuracy(0, 0)).toBe(0);
    expect(wreckAccuracy(9, 4)).toBe(1);
    expect(wreckAccuracy(-2, 4)).toBe(0);
  });

  it('given words, when turned into a tower, then widths follow the word and floors stack', () => {
    const t = towerFromWords(['tower', 'brick']);
    expect(t).toHaveLength(2);
    expect(t[0].w).toBeGreaterThan(0);
    expect(t[1].y).toBeLessThan(t[0].y);
  });
});

describe('the swing connects (round 2: no contact, no raid)', () => {
  const stored = (n: number): TowerBlock[] =>
    Array.from({ length: n }, (_, i) => ({ word: `w${i}`, w: 220, x: 0, y: -(i * 120 + 60), angle: 0, color: 0 }));

  it('given a ball hung at rest, when aimed, then the path does not reach the tower', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    expect(pathHitsTower(w)).toBeNull();
  });

  it('given a ball at the bottom of its swing, when aimed, then the path lands ON a floor', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    run(w, w.quarterPeriodMs);
    const hit = pathHitsTower(w);
    expect(hit).not.toBeNull();
    expect(w.ids).toContain(hit!.id);
    // The aim point sits on the building, not on the street or over the roof.
    expect(hit!.y).toBeLessThan(0);
    expect(hit!.y).toBeGreaterThan(-w.towerHeightPx);
  });

  it('given a whole swing, when every cut time is tried, then connecting is forgiving but not free', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    const period = w.quarterPeriodMs * 4;
    const step = 5;
    let connects = 0;
    for (let t = 0; t < period; t += step) {
      w.swingMs = t;
      if (pathHitsTower(w)) connects += step;
    }
    // A 2-ball raid must be at least as forgiving as a drop (feel.test: >=150ms)…
    expect(connects).toBeGreaterThanOrEqual(400);
    // …and still a swing you can waste, or the skill is gone.
    expect(connects).toBeLessThan(period * 0.8);
  });

  it('given a cut inside the window, when it flies, then the ball actually strikes the building', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    run(w, w.quarterPeriodMs);
    cutBall(w);
    let heaviest = 0;
    for (let t = 0; t < 1500; t += 1000 / 120) {
      stepWreck(w, 1000 / 120);
      for (const i of w.tower.pendingImpacts) heaviest = Math.max(heaviest, i.speed);
    }
    // Heavy enough that WreckCanvas fires rubble + shake (its threshold is 7).
    expect(heaviest).toBeGreaterThan(7);
  });

  it('given a wrecked tower, when the aftermath is framed, then the damaged floors are named', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    run(w, w.quarterPeriodMs);
    cutBall(w);
    run(w, 3000);
    const down = wreckedIds(w);
    expect(down.size).toBe(wreckedCount(w));
    expect(down.size).toBeGreaterThan(0);
    for (const id of down) expect(w.ids).toContain(id);
  });

  it('given a standing tower, when the aftermath frames it, then the box is tight on the building, not the rig', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    const box = wreckBounds(w);
    // Half the swing framing is empty sky to the left of the pivot; the payoff
    // shot drops all of it so the tower fills the screen.
    expect(box.left).toBeGreaterThan(swingLeftPx(w));
    expect(box.right - box.left).toBeLessThan((10 + box.right - swingLeftPx(w)) * 0.6);
    expect(box.top).toBeLessThanOrEqual(-w.towerHeightPx * 0.9);
  });

  it('given rubble on the ground, when the camera frames it, then the whole wreck is inside the box', () => {
    const w = buildWreckWorldFromTower(stored(9));
    run(w, 600);
    hangBall(w);
    run(w, w.quarterPeriodMs);
    cutBall(w);
    run(w, 3000);
    const box = wreckBounds(w);
    for (const id of w.ids) {
      const b = w.tower.blocks.get(id)!;
      expect(b.bounds.min.x).toBeGreaterThanOrEqual(box.left - 1);
      expect(b.bounds.max.x).toBeLessThanOrEqual(box.right + 1);
      expect(b.bounds.min.y).toBeGreaterThanOrEqual(box.top - 1);
    }
  });
});

describe('raidVerdict — the readout can never contradict the payout', () => {
  const tiers = ['blocked', 'demolished', 'rattled', 'nothing'] as const;

  it('given a shield that ate the swing, when the verdict is read, then it is blocked however the client counted floors', () => {
    expect(raidVerdict({ kind: 'blocked', coinsStolen: 0, attackerCoins: 40, floorsKnocked: 0 }).tier).toBe('blocked');
    expect(raidVerdict({ kind: 'blocked', coinsStolen: 0, attackerCoins: 40, floorsKnocked: 5 }).tier).toBe('blocked');
  });

  it('given floors down and coins taken, when the verdict is read, then it is demolished', () => {
    expect(raidVerdict({ kind: 'damaged', coinsStolen: 300, attackerCoins: 340, floorsKnocked: 3 }).tier).toBe('demolished');
  });

  it('given coins taken but no floor down, when the verdict is read, then it is a HIT, not "nothing"', () => {
    // The shipped bug: "GLANCING BLOW — not a scratch" stapled to "Stole 162".
    const v = raidVerdict({ kind: 'damaged', coinsStolen: 162, attackerCoins: 196, floorsKnocked: 0 });
    expect(v.tier).toBe('rattled');
    expect(v.saysNothingHappened).toBe(false);
  });

  it('given a payout of any kind, when the verdict is read, then it never says nothing happened', () => {
    for (const coinsStolen of [0, 1, 162]) {
      for (const attackerCoins of [0, 1, 196]) {
        for (const floorsKnocked of [0, 1, 4]) {
          for (const kind of ['damaged', 'blocked'] as const) {
            const v = raidVerdict({ kind, coinsStolen, attackerCoins, floorsKnocked });
            expect(tiers).toContain(v.tier);
            if (coinsStolen > 0 || attackerCoins > 0 || floorsKnocked > 0) {
              expect(v.saysNothingHappened).toBe(false);
            }
          }
        }
      }
    }
  });

  it('given a truly empty swing, when the verdict is read, then it says nothing happened and shows no loot', () => {
    const v = raidVerdict({ kind: 'damaged', coinsStolen: 0, attackerCoins: 0, floorsKnocked: 0 });
    expect(v.tier).toBe('nothing');
    expect(v.saysNothingHappened).toBe(true);
    expect(v.showLoot).toBe(false);
  });

  it('given a tier that shows loot, when the verdict is read, then there are coins to show', () => {
    for (const coinsStolen of [0, 5]) {
      for (const attackerCoins of [0, 7]) {
        const v = raidVerdict({ kind: 'damaged', coinsStolen, attackerCoins, floorsKnocked: 0 });
        if (v.showLoot) expect(coinsStolen + attackerCoins).toBeGreaterThan(0);
      }
    }
  });

  it('given a blocked raid with scrap, when the verdict is read, then the loot is framed as scrap, not a steal', () => {
    const v = raidVerdict({ kind: 'blocked', coinsStolen: 0, attackerCoins: 40, floorsKnocked: 0 });
    expect(v.showLoot).toBe(true);
    expect(v.stealHeadline).toBe(false);
  });

  it('given coins stolen, when the verdict is read, then the steal is the one headline number', () => {
    const v = raidVerdict({ kind: 'damaged', coinsStolen: 162, attackerCoins: 196, floorsKnocked: 2 });
    expect(v.stealHeadline).toBe(true);
    expect(v.headlineCoins).toBe(162);
  });

  it('given no steal but a payout, when the verdict is read, then the banked coins become the headline', () => {
    const v = raidVerdict({ kind: 'blocked', coinsStolen: 0, attackerCoins: 40, floorsKnocked: 0 });
    expect(v.headlineCoins).toBe(40);
  });
});

describe('revengeLedger — the payback has to close on the player who hit you', () => {
  it('given they took coins and you took more back, when the ledger is read, then you are ahead', () => {
    const l = revengeLedger({ theyTook: 120, youTook: 200, blocked: false });
    expect(l.tier).toBe('ahead');
    expect(l.theyTook).toBe(120);
    expect(l.youTook).toBe(200);
    expect(l.net).toBe(80);
  });

  it('given you took back exactly what they took, when the ledger is read, then it is square', () => {
    expect(revengeLedger({ theyTook: 120, youTook: 120, blocked: false }).tier).toBe('square');
  });

  it('given you took back less than they took, when the ledger is read, then you are still short', () => {
    const l = revengeLedger({ theyTook: 120, youTook: 40, blocked: false });
    expect(l.tier).toBe('short');
    expect(l.net).toBe(-80);
  });

  it('given their shield held, when the ledger is read, then the tier is blocked whatever the numbers say', () => {
    expect(revengeLedger({ theyTook: 120, youTook: 999, blocked: true }).tier).toBe('blocked');
  });

  it('given they only broke a floor and stole nothing, when the ledger is read, then any payback puts you ahead', () => {
    const l = revengeLedger({ theyTook: 0, youTook: 30, blocked: false });
    expect(l.tier).toBe('ahead');
  });

  it('given neither side took a coin, when the ledger is read, then it is square, not short', () => {
    expect(revengeLedger({ theyTook: 0, youTook: 0, blocked: false }).tier).toBe('square');
  });

  it('given negative or fractional inputs, when the ledger is read, then the numbers are clamped whole', () => {
    const l = revengeLedger({ theyTook: -5, youTook: 12.7, blocked: false });
    expect(l.theyTook).toBe(0);
    expect(l.youTook).toBe(12);
    expect(l.net).toBe(12);
  });
});

describe('revengeLedger vs raidVerdict — one swing must not print two different totals', () => {
  it('given a damaged raid that stole nothing but banked scrap, when both are read, then the ledger reports the steal and the verdict headline is NOT a steal', () => {
    // The screen leads with `headlineCoins`; the ledger's "you took back" is
    // coins taken OFF THEM. When those differ the payout must not lead with a
    // big number the ledger contradicts — so the card shows scrap as a footnote.
    const v = raidVerdict({ kind: 'damaged', coinsStolen: 0, attackerCoins: 82, floorsKnocked: 0 });
    const l = revengeLedger({ theyTook: 120, youTook: 0, blocked: false });
    expect(v.tier).toBe('rattled');
    expect(v.stealHeadline).toBe(false);
    expect(v.headlineCoins).toBe(82);
    expect(l.youTook).toBe(0);
    expect(l.tier).toBe('short');
  });

  it('given a raid that stole coins, when both are read, then the headline and the ledger agree on the number', () => {
    const v = raidVerdict({ kind: 'damaged', coinsStolen: 96, attackerCoins: 120, floorsKnocked: 2 });
    const l = revengeLedger({ theyTook: 120, youTook: 96, blocked: false });
    expect(v.stealHeadline).toBe(true);
    expect(v.headlineCoins).toBe(l.youTook);
  });
});
