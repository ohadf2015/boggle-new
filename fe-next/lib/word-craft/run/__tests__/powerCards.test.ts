import { POWER_CARD_POOL, drawCardChoices, type ScoreContext } from '../powerCards';
import type { ScoringTile } from '../../types';

const tile = (letter: string, value: number, premium: ScoringTile['premium'] = null): ScoringTile => ({
  letter, value, premium,
});
const card = (id: string) => {
  const c = POWER_CARD_POOL.find((x) => x.id === id);
  if (!c) throw new Error(`card ${id} missing`);
  return c;
};
const baseCtx = (over: Partial<ScoreContext> = {}): ScoreContext => ({
  wordTiles: [tile('C', 3), tile('A', 1), tile('T', 1)],
  wordLength: 3,
  wordIndexInRound: 0,
  baseChips: 5,
  baseMult: 1,
  ...over,
});

describe('POWER_CARD_POOL', () => {
  it('has 12 cards with unique ids', () => {
    expect(POWER_CARD_POOL.length).toBe(12);
    expect(new Set(POWER_CARD_POOL.map((c) => c.id)).size).toBe(12);
  });

  it('vowelPower adds +2 chips per vowel', () => {
    const mod = card('vowelPower').scoreEffect!(baseCtx());
    expect(mod.addChips).toBe(2); // one vowel: A
  });

  it('longGame doubles mult for 5+ letter words only', () => {
    expect(card('longGame').scoreEffect!(baseCtx({ wordLength: 3 })).mulMult).toBe(1);
    expect(card('longGame').scoreEffect!(baseCtx({ wordLength: 5 })).mulMult).toBe(2);
  });

  it('combo adds +1 mult per word after the first', () => {
    expect(card('combo').scoreEffect!(baseCtx({ wordIndexInRound: 0 })).addMult).toBe(0);
    expect(card('combo').scoreEffect!(baseCtx({ wordIndexInRound: 3 })).addMult).toBe(3);
  });

  it('premiumHunter adds +1 mult per premium tile used', () => {
    const ctx = baseCtx({ wordTiles: [tile('C', 3, 'DL'), tile('A', 1, 'TW'), tile('T', 1)] });
    expect(card('premiumHunter').scoreEffect!(ctx).addMult).toBe(2);
  });

  it('doubleDown triples mult on the first word only', () => {
    expect(card('doubleDown').scoreEffect!(baseCtx({ wordIndexInRound: 0 })).mulMult).toBe(3);
    expect(card('doubleDown').scoreEffect!(baseCtx({ wordIndexInRound: 1 })).mulMult).toBe(1);
  });

  it('rareLetters adds +3 chips per tile worth 4+', () => {
    const ctx = baseCtx({ wordTiles: [tile('Q', 10), tile('A', 1), tile('Z', 10)] });
    expect(card('rareLetters').scoreEffect!(ctx).addChips).toBe(6);
  });

  it('shortSweet adds +15 chips only to 3-letter words', () => {
    expect(card('shortSweet').scoreEffect!(baseCtx({ wordLength: 3 })).addChips).toBe(15);
    expect(card('shortSweet').scoreEffect!(baseCtx({ wordLength: 4 })).addChips).toBe(0);
  });

  it('steadyBuild adds a flat +5 chips', () => {
    expect(card('steadyBuild').scoreEffect!(baseCtx()).addChips).toBe(5);
  });

  it('overflow returns 10% of score above target as a round-end bonus', () => {
    expect(card('overflow').roundEndBonus!(150, 100)).toBe(5);
    expect(card('overflow').roundEndBonus!(80, 100)).toBe(0);
  });

  it('setup cards expose roundSetup', () => {
    expect(card('wildcardStash').roundSetup).toEqual({ extraBlankTiles: 1 });
    expect(card('quickHands').roundSetup).toEqual({ extraBagTiles: 4 });
    expect(card('letterHoard').roundSetup).toEqual({ rackSize: 10 });
  });
});

describe('drawCardChoices', () => {
  it('is deterministic for a given seed', () => {
    const a = drawCardChoices(42, [], 3).map((c) => c.id);
    const b = drawCardChoices(42, [], 3).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('excludes already-owned card ids', () => {
    const owned = POWER_CARD_POOL.slice(0, 9).map((c) => c.id);
    const drawn = drawCardChoices(7, owned, 3);
    expect(drawn.length).toBe(3);
    drawn.forEach((c) => expect(owned).not.toContain(c.id));
  });

  it('returns at most the available pool size', () => {
    const owned = POWER_CARD_POOL.slice(0, 11).map((c) => c.id);
    expect(drawCardChoices(1, owned, 3).length).toBe(1);
  });

  it('weights draws so legendary cards appear far less often than common', () => {
    const rarityCounts: Record<string, number> = { common: 0, rare: 0, legendary: 0 };
    for (let seed = 0; seed < 500; seed++) {
      for (const c of drawCardChoices(seed, [], 3)) rarityCounts[c.rarity]++;
    }
    const commonPool = POWER_CARD_POOL.filter((c) => c.rarity === 'common').length;
    const legendaryPool = POWER_CARD_POOL.filter((c) => c.rarity === 'legendary').length;
    // Per-card appearance rate for legendary must be well below common's —
    // a uniform shuffle would make them roughly equal despite the pool-size difference.
    const commonRate = rarityCounts.common / commonPool;
    const legendaryRate = rarityCounts.legendary / legendaryPool;
    expect(legendaryRate).toBeLessThan(commonRate * 0.5);
  });
});
