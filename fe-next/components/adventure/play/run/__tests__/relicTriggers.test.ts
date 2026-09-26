import { describe, it, expect } from 'vitest';
import { triggeredRelics, offerRarity, relicBonusLabel } from '../relicTriggers';

describe('triggeredRelics', () => {
  it('Given no relics, when a word lands, then nothing triggers', () => {
    expect(triggeredRelics('planet', 0, [])).toEqual([]);
  });

  it('Given sharp-quill, when a 6-letter word lands, then sharp-quill triggers', () => {
    expect(triggeredRelics('planet', 3, ['sharp-quill'])).toEqual(['sharp-quill']);
  });

  it('Given sharp-quill, when a 5-letter word lands, then it stays quiet', () => {
    expect(triggeredRelics('plane', 3, ['sharp-quill'])).toEqual([]);
  });

  it('Given twin-ink, then only the first word of the level triggers it', () => {
    expect(triggeredRelics('cat', 0, ['twin-ink'])).toEqual(['twin-ink']);
    expect(triggeredRelics('cat', 1, ['twin-ink'])).toEqual([]);
  });

  it('Given echo-stone, then the first word (no echoes yet) does not trigger it but later words do', () => {
    expect(triggeredRelics('cat', 0, ['echo-stone'])).toEqual([]);
    expect(triggeredRelics('cat', 2, ['echo-stone'])).toEqual(['echo-stone']);
  });

  it('Given magnet (always on), then it never pulses per word — the level deal announces it once instead', () => {
    // A relic whose factor never returns 1 would flash on EVERY word, which reads
    // as noise, not feedback. It fires in levelStartFire, not here.
    expect(triggeredRelics('dog', 4, ['magnet', 'hourglass', 'vampire-fang'])).toEqual([]);
  });

  it('Given vampire-fang in a fight, when a 6+ letter word lands, then the fang triggers', () => {
    expect(triggeredRelics('planets', 4, ['vampire-fang'], { inFight: true })).toEqual(['vampire-fang']);
    expect(triggeredRelics('plan', 4, ['vampire-fang'], { inFight: true })).toEqual([]);
  });

  it('counts letters, not UTF-16 units (Hebrew/Japanese words)', () => {
    expect(triggeredRelics('שלום', 1, ['short-sword'])).toEqual([]);
    expect(triggeredRelics('של', 1, ['short-sword'])).toEqual([]);
    expect(triggeredRelics('שלם', 1, ['short-sword'])).toEqual(['short-sword']);
  });

  it('keeps the owned order and ignores unknown ids', () => {
    expect(triggeredRelics('planets', 0, ['long-bow', 'bogus', 'sharp-quill', 'twin-ink'])).toEqual(['long-bow', 'sharp-quill', 'twin-ink']);
  });
});

describe('offerRarity', () => {
  it('reads a relic rarity from the catalog', () => {
    expect(offerRarity({ type: 'relic', id: 'phoenix-feather' })).toBe('epic');
    expect(offerRarity({ type: 'relic', id: 'magnet' })).toBe('rare');
    expect(offerRarity({ type: 'relic', id: 'short-sword' })).toBe('common');
  });
  it('treats potions, heals and gold as common', () => {
    expect(offerRarity({ type: 'potion', id: 'heal' })).toBe('common');
    expect(offerRarity({ type: 'heal', amount: 2 })).toBe('common');
    expect(offerRarity({ type: 'gold', amount: 25 })).toBe('common');
  });
});

describe('relicBonusLabel', () => {
  it('shows multipliers as ×N when whole, +N% otherwise', () => {
    expect(relicBonusLabel('long-bow', 'planets', 2)).toBe('×2');
    expect(relicBonusLabel('twin-ink', 'cat', 0)).toBe('×2');
    expect(relicBonusLabel('sharp-quill', 'planet', 1)).toBe('+50%');
    expect(relicBonusLabel('magnet', 'cat', 1)).toBe('+20%');
  });
  it('shows flat bonuses as +N', () => {
    expect(relicBonusLabel('short-sword', 'cat', 1)).toBe('+2');
    expect(relicBonusLabel('storm-rune', 'plane', 1)).toBe('+5');
    expect(relicBonusLabel('echo-stone', 'cat', 4)).toBe('+4');
  });
  it('shows +1 for the vampire fang heal and nothing for silent relics', () => {
    expect(relicBonusLabel('vampire-fang', 'planets', 0)).toBe('+1');
    expect(relicBonusLabel('hourglass', 'cat', 0)).toBe('');
    expect(relicBonusLabel('short-sword', 'dog', 0)).toBe('+2');
    expect(relicBonusLabel('short-sword', 'dogs', 0)).toBe('');
  });
});

describe('vampire-fang only claims a heal it will actually get', () => {
  it('given a fight below max HP, when a 6+ letter word lands, then the relic fires', () => {
    expect(triggeredRelics('planets', 0, ['vampire-fang'], { inFight: true, canHeal: true })).toEqual(['vampire-fang']);
  });

  it('given full HP, when a 6+ letter word lands, then it does NOT fire', () => {
    // combat.ts only heals when hp < maxHp, so a callout here is a lie.
    expect(triggeredRelics('planets', 0, ['vampire-fang'], { inFight: true, canHeal: false })).toEqual([]);
  });

  it('given no fight, then it does not fire', () => {
    expect(triggeredRelics('planets', 0, ['vampire-fang'], { inFight: false, canHeal: true })).toEqual([]);
  });
});
