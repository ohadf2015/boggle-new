import { describe, it, expect } from 'vitest';
import { hitTier, bannerKey, shakePx, failReasonKey, TIER_STYLE, hitPower, impactLook, praiseLook } from '../hitTier';
import { wordPoints } from '@/lib/adventure/play/scoreRun';

describe('hitTier', () => {
  it('given a short unboosted word, when tiered, then it is a normal hit', () => {
    expect(hitTier('cat', wordPoints('cat'))).toBe('hit');
  });
  it('given a 5-letter word, when tiered, then it is BIG', () => {
    expect(hitTier('stone', wordPoints('stone'))).toBe('big');
  });
  it('given any relic boost on a short word, when tiered, then it is at least BIG', () => {
    expect(hitTier('cat', wordPoints('cat') + 2)).toBe('big');
  });
  it('given a 7+ letter word, when tiered, then it is CRIT', () => {
    expect(hitTier('reading', wordPoints('reading'))).toBe('crit');
  });
  it('given a relic boost of 1.5x or more, when tiered, then it is CRIT', () => {
    const base = wordPoints('cats');
    expect(hitTier('cats', Math.ceil(base * 1.5))).toBe('crit');
  });
  it('counts letters by code point (Hebrew/Japanese safe)', () => {
    expect(hitTier('שלום', wordPoints('שלום'))).toBe('hit');
  });
});

describe('bannerKey', () => {
  it('given a KO, when banner chosen, then it is the knockout banner regardless of tier', () => {
    expect(bannerKey('hit', 'cat', true)).toBe('adventurePlay.juice.ko');
  });
  it('given a crit, then an escalated praise (critical / astonishing / whomped), stable per word', () => {
    const k = bannerKey('crit', 'reading', false);
    expect(['adventurePlay.juice.critical', 'adventurePlay.juice.astonishing', 'adventurePlay.juice.whomped']).toContain(k);
    expect(bannerKey('crit', 'reading', false)).toBe(k);
  });
  it('given a big hit, then one of great/smashing, stable per word', () => {
    const k = bannerKey('big', 'stone', false);
    expect(['adventurePlay.juice.great', 'adventurePlay.juice.smashing']).toContain(k);
    expect(bannerKey('big', 'stone', false)).toBe(k);
  });
  it('given a normal hit, then nice/good', () => {
    expect(['adventurePlay.juice.nice', 'adventurePlay.juice.good']).toContain(bannerKey('hit', 'cat', false));
  });
});

describe('shakePx', () => {
  it('scales with damage and is capped', () => {
    expect(shakePx(1)).toBeGreaterThan(0);
    expect(shakePx(20)).toBeGreaterThan(shakePx(2));
    expect(shakePx(10_000)).toBeLessThanOrEqual(10);
  });
  it('is zero for no damage', () => {
    expect(shakePx(0)).toBe(0);
  });
});

describe('failReasonKey', () => {
  it('maps every rejection to a reason key', () => {
    expect(failReasonKey('short')).toBe('adventurePlay.juice.tooShort');
    expect(failReasonKey('invalid')).toBe('adventurePlay.juice.notAWord');
    expect(failReasonKey('dup')).toBe('adventurePlay.juice.alreadyFound');
    expect(failReasonKey('chain')).toBe('adventurePlay.juice.breaksChain');
  });
  it('has no reason for an accepted word', () => {
    expect(failReasonKey('ok')).toBeNull();
  });
});

describe('TIER_STYLE', () => {
  it('grows in size from hit to crit', () => {
    expect(TIER_STYLE.hit.size).toBeLessThan(TIER_STYLE.big.size);
    expect(TIER_STYLE.big.size).toBeLessThan(TIER_STYLE.crit.size);
  });
});

describe('hitPower', () => {
  it('given a 3-letter word, when weighed, then it is the floor (0)', () => {
    expect(hitPower('cat', wordPoints('cat'))).toBe(0);
  });
  it('given longer words, when weighed, then power rises with length and caps at 1 from 8 letters', () => {
    const p4 = hitPower('cats', wordPoints('cats'));
    const p6 = hitPower('stones', wordPoints('stones'));
    expect(p4).toBeGreaterThan(0);
    expect(p6).toBeGreaterThan(p4);
    expect(hitPower('elephants', wordPoints('elephants'))).toBe(1);
  });
  it('given a relic boost, when weighed, then the word hits harder than its bare length', () => {
    expect(hitPower('cat', wordPoints('cat') * 2)).toBeGreaterThan(hitPower('cat', wordPoints('cat')));
  });
  it('counts code points (Hebrew safe)', () => {
    expect(hitPower('שלום', wordPoints('שלום'))).toBe(hitPower('abcd', wordPoints('abcd')));
  });
});

describe('impactLook floor', () => {
  it('given the smallest valid word, then it still reads as an event on a phone (big number, real burst, readable praise)', () => {
    const l = impactLook(0, 'hit');
    expect(l.numberPx).toBeGreaterThanOrEqual(52);
    expect(l.sparks).toBeGreaterThanOrEqual(10);
    expect(l.bannerPx).toBeGreaterThanOrEqual(22);
  });
});

describe('impactLook', () => {
  it('given a 7-letter word vs a 3-letter word, when drawn, then the freeze-frame is clearly heavier', () => {
    const small = impactLook(0, 'hit');
    const big = impactLook(hitPower('reading', wordPoints('reading')), 'crit');
    expect(big.numberPx).toBeGreaterThanOrEqual(small.numberPx * 1.8);
    expect(big.sparks).toBeGreaterThanOrEqual(small.sparks * 2);
    expect(big.knockPx).toBeGreaterThan(small.knockPx * 2);
    expect(big.flashPx).toBeGreaterThan(small.flashPx);
  });
  it('keeps the number phone-sized (<= 100px) at full power', () => {
    expect(impactLook(1, 'crit').numberPx).toBeLessThanOrEqual(100);
  });
});

describe('praiseLook', () => {
  it('given rising word quality, when the praise is sized, then a 3-letter hit, a BIG and a CRIT are visibly different sizes', () => {
    const hit = praiseLook('hit', 0, false);
    const big = praiseLook('big', 0.4, false);
    const crit = praiseLook('crit', 0.8, false);
    expect(hit.px).toBeGreaterThanOrEqual(26);
    expect(big.px).toBeGreaterThanOrEqual(hit.px + 8);
    expect(crit.px).toBeGreaterThanOrEqual(big.px + 8);
  });
  it('given a normal or BIG hit, then it is a speech bubble; a CRIT or knockout is a screen-wide slab stamp', () => {
    expect(praiseLook('hit', 0.2, false).slab).toBe(false);
    expect(praiseLook('big', 0.5, false).slab).toBe(false);
    expect(praiseLook('crit', 0.8, false).slab).toBe(true);
    expect(praiseLook('hit', 0, true).slab).toBe(true);
  });
  it('given a knockout, then it is the loudest praise of all', () => {
    expect(praiseLook('hit', 0, true).px).toBeGreaterThanOrEqual(praiseLook('crit', 1, false).px);
  });
});
