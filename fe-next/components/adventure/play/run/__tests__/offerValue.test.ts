import { describe, it, expect } from 'vitest';
import { offerValue } from '../offerValue';
import { scoreWords } from '@/lib/adventure/play/scoreRun';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const run = (over: Partial<PublicRun> = {}): PublicRun => ({
  w: 1, step: 3, hp: 3, maxHp: 5, relics: [], potions: { heal: 1, time: 0, cleanse: 0, insight: 0 }, gold: 40, ...over,
});

// Two cleared levels: one short-word level, one with long words.
const levels = [['cat', 'dog', 'house'], ['planet', 'garden', 'mountain', 'sun']];
const total = (relics: Parameters<typeof scoreWords>[1]['relics']) =>
  levels.reduce((s, l) => s + scoreWords(l, { relics }).score, 0);

describe('offerValue — live-computed card value from this run', () => {
  it('Given words from this run, when a scoring relic is offered, then it projects the real extra points per level via the shared formula', () => {
    const v = offerValue({ type: 'relic', id: 'magnet' }, { levels, run: run() });
    const expected = Math.round((total(['magnet']) - total([])) / levels.length);
    expect(v.key).toBe('ptsPerLevel');
    expect(v.params.n).toBe(expected);
    expect(v.params.n).toBeGreaterThan(0);
  });

  it('Given an order-dependent relic (twin-ink), then it counts the first word of EVERY level, not +0', () => {
    const v = offerValue({ type: 'relic', id: 'twin-ink' }, { levels, run: run() });
    expect(v.params.n).toBe(Math.round((total(['twin-ink']) - total([])) / 2));
    expect(v.params.n).toBeGreaterThan(0);
    expect(v.params.hits).toBe(2);
    expect(v.params.total).toBe(7);
  });

  it('Given a relic whose trigger never happened this run, then it says it would have fired on 0 words', () => {
    const v = offerValue({ type: 'relic', id: 'long-bow' }, { levels: [['cat', 'dog']], run: run() });
    expect(v.params.n).toBe(0);
    expect(v.params.hits).toBe(0);
  });

  it('Given an owned multiplier, when a flat relic stacks with it, then synergy is flagged', () => {
    const own = run({ relics: ['magnet'] });
    const v = offerValue({ type: 'relic', id: 'storm-rune' }, { levels: [['house', 'tiger']], run: own });
    expect(v.synergy).toBe(true);
    const alone = offerValue({ type: 'relic', id: 'storm-rune' }, { levels: [['house', 'tiger']], run: run() });
    expect(alone.synergy).toBe(false);
    expect(v.params.n).toBeGreaterThan(alone.params.n as number);
  });

  it('Given an owned multiplier, then a scoring card carries BOTH numbers: alone and stacked with the run', () => {
    const own = run({ relics: ['magnet'] });
    const v = offerValue({ type: 'relic', id: 'storm-rune' }, { levels: [['house', 'tiger']], run: own });
    expect(v.params.alone).toBe(10);
    expect(v.params.n).toBeGreaterThan(10);
    expect(v.big).toBe(`+${v.params.n}`);
  });

  it('Given hourglass, then it is priced in points from 10 more seconds at this run pace, stacked with owned relics', () => {
    const own = run({ relics: ['magnet'] });
    const v = offerValue({ type: 'relic', id: 'hourglass' }, { levels, run: own });
    expect(v.key).toBe('timePts');
    expect(v.params.secs).toBe(10);
    expect(v.params.n).toBeGreaterThan(v.params.alone);
    expect(v.synergy).toBe(true);
    expect(v.big).toBe(`+${v.params.n}`);
  });

  it('Given hourglass and no words yet, then it falls back to the plain seconds line', () => {
    expect(offerValue({ type: 'relic', id: 'hourglass' }, { levels: [], run: run() })).toMatchObject({ key: 'seconds', params: { n: 10 } });
  });

  it('Given no words yet, then a scoring relic prints no fake number', () => {
    expect(offerValue({ type: 'relic', id: 'magnet' }, { levels: [], run: run() }).key).toBe('noData');
  });

  it('Given a heal offer, then it shows hearts before -> after, capped at max', () => {
    expect(offerValue({ type: 'heal', amount: 2 }, { levels, run: run({ hp: 4 }) })).toMatchObject({ key: 'hearts', params: { from: 4, to: 5 } });
    expect(offerValue({ type: 'heal', amount: 2 }, { levels, run: run({ hp: 5 }) }).key).toBe('heartsFull');
  });

  it('Given a gold offer, then it shows the new gold total', () => {
    expect(offerValue({ type: 'gold', amount: 25 }, { levels, run: run({ gold: 40 }) })).toMatchObject({ key: 'goldTo', params: { from: 40, to: 65 } });
  });

  it('Given stat relics, then they print the stat they change from the run', () => {
    expect(offerValue({ type: 'relic', id: 'heart-locket' }, { levels, run: run() })).toMatchObject({ key: 'maxHearts', params: { from: 5, to: 6 } });
    expect(offerValue({ type: 'relic', id: 'lens-of-insight' }, { levels, run: run() })).toMatchObject({ key: 'hints', params: { from: 2, to: 3 } });
    expect(offerValue({ type: 'relic', id: 'lucky-clover' }, { levels, run: run() })).toMatchObject({ key: 'cards', params: { from: 3, to: 4 } });
    // 3 words of 6+ letters over 2 levels.
    expect(offerValue({ type: 'relic', id: 'vampire-fang' }, { levels, run: run() })).toMatchObject({ key: 'longWords', params: { hits: 3 } });
    // Half the level-clear payout, which is set by the level's SCORE. It used to
    // divide the purse by levels cleared, so buying anything in a shop shrank the
    // advertised value of a relic that pays the same +50% either way.
    const gold = offerValue({ type: 'relic', id: 'gold-tooth' }, { levels, run: run({ gold: 40 }) });
    expect(gold.key).toBe('goldPerLevel');
    expect(gold.params.n).toBeGreaterThan(0);
    expect(offerValue({ type: 'relic', id: 'gold-tooth' }, { levels, run: run({ gold: 0 }) }).params.n).toBe(gold.params.n);
  });

  it('Given a potion offer, then it shows how many you would carry', () => {
    expect(offerValue({ type: 'potion', id: 'heal' }, { levels, run: run() })).toMatchObject({ key: 'carry', params: { from: 1, to: 2 } });
  });
});

describe('offerValue.big — the language-free headline number printed on the card', () => {
  it('Given a scoring relic, then big is a signed number', () => {
    const v = offerValue({ type: 'relic', id: 'magnet' }, { levels, run: run() });
    expect(v.big).toBe(`+${v.params.n}`);
  });
  it('Given a from→to stat, then big shows both ends', () => {
    expect(offerValue({ type: 'relic', id: 'lens-of-insight' }, { levels, run: run() }).big).toBe('2 → 3');
    expect(offerValue({ type: 'heal', amount: 2 }, { levels, run: run({ hp: 3 }) }).big).toBe('3 → 5');
  });
  it('Given no data, then big is a dash, never a fake 0', () => {
    expect(offerValue({ type: 'relic', id: 'magnet' }, { levels: [], run: run() }).big).toBe('—');
  });
});
