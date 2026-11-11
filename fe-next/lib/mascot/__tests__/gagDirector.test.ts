import { describe, it, expect } from 'vitest';
import {
  pickGag,
  createGagHistory,
  fitToRemaining,
  variantDurationMs,
  beatIndexAt,
  daysBetween,
  MAX_GAGS_PER_ROUND,
  MAX_GAGS_PER_SESSION,
  GAG_GAP_MS,
  type GagLimits,
} from '../gagDirector';
import { gagById } from '../gagCatalog';
import { createSeededRng } from '../rng';
import type { GagEvent } from '../gagTypes';

const yes = () => 0;
const no = () => 0.999;
const ctx = { rejectionsThisRound: 0, wordsThisRound: 5 };
const fresh: GagLimits = { shownThisRound: 0, shownThisSession: 0, lastShownAt: null };
const DAY = '2026-11-12';
const longWord: GagEvent = { kind: 'word-submitted', wordLength: 8, gemLetterUsed: false };
const pick = (event: GagEvent, over: Partial<{ c: typeof ctx; l: GagLimits; rng: () => number; now: number; day: string; h: ReturnType<typeof createGagHistory> }> = {}) =>
  pickGag(event, over.c ?? ctx, over.l ?? fresh, over.h ?? createGagHistory(), over.rng ?? yes, over.now ?? 100_000, over.day ?? DAY);

describe('pickGag — matching', () => {
  it('a 7+ letter word can start the finger count', () => {
    expect(pick(longWord)?.gag.bible).toBe(1);
  });

  it('a 2-3 letter word can start the slow clap', () => {
    expect(pick({ kind: 'word-submitted', wordLength: 3, gemLetterUsed: false })?.gag.bible).toBe(20);
  });

  it('an ordinary 5-letter word gets no gag', () => {
    expect(pick({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false })).toBeNull();
  });

  it('the third rejection opens the dictionary, not the stamp', () => {
    const c = { ...ctx, rejectionsThisRound: 3 };
    expect(pick({ kind: 'word-rejected' }, { c })?.gag.bible).toBe(4);
    expect(pick({ kind: 'word-rejected' }, { c: { ...ctx, rejectionsThisRound: 1 } })?.gag.bible).toBe(3);
  });

  it('maps the other events to their gags', () => {
    expect(pick({ kind: 'combo-broken', fromLevel: 5 })?.gag.bible).toBe(6);
    expect(pick({ kind: 'combo-broken', fromLevel: 2 })).toBeNull();
    expect(pick({ kind: 'idle' })?.gag.bible).toBe(7);
    expect(pick({ kind: 'timer-final-10s', secondsLeft: 10 })?.gag.bible).toBe(8);
    expect(pick({ kind: 'personal-best' })?.gag.bible).toBe(9);
    expect(pick({ kind: 'rare-letter', letter: 'Q' })?.gag.bible).toBe(12);
    expect(pick({ kind: 'duplicate-word' })?.gag.bible).toBe(13);
  });

  it('days away: first visit and short gaps stay quiet, 3+ days gets the dusty gag', () => {
    expect(pick({ kind: 'session-start', daysAway: null })).toBeNull();
    expect(pick({ kind: 'session-start', daysAway: 2 })).toBeNull();
    expect(pick({ kind: 'session-start', daysAway: 3 })?.gag.bible).toBe(16);
  });
});

describe('pickGag — rationing', () => {
  it('fires roughly 1 in 5 eligible long words', () => {
    const rng = createSeededRng(11);
    let hits = 0;
    let h = createGagHistory();
    for (let i = 0; i < 5000; i++) {
      const r = pickGag(longWord, ctx, fresh, h, rng, 0, DAY);
      if (r) {
        hits++;
        h = r.history;
      }
    }
    expect(hits / 5000).toBeGreaterThan(0.15);
    expect(hits / 5000).toBeLessThan(0.25);
  });

  it('a miss on the roll fires nothing', () => {
    expect(pick(longWord, { rng: no })).toBeNull();
  });

  it(`waits ${GAG_GAP_MS}ms between gags, except one-off moments`, () => {
    const l = { ...fresh, lastShownAt: 99_000 };
    expect(pick(longWord, { l })).toBeNull();
    expect(pick({ kind: 'word-rejected' }, { l, c: { ...ctx, rejectionsThisRound: 3 } })).not.toBeNull();
    expect(pick(longWord, { l: { ...fresh, lastShownAt: 100_000 - GAG_GAP_MS } })).not.toBeNull();
  });

  it('caps gags per round and per session', () => {
    expect(pick(longWord, { l: { ...fresh, shownThisRound: MAX_GAGS_PER_ROUND } })).toBeNull();
    expect(pick(longWord, { l: { ...fresh, shownThisSession: MAX_GAGS_PER_SESSION } })).toBeNull();
  });

  it('the personal-best overreaction plays at most once a day', () => {
    const first = pick({ kind: 'personal-best' })!;
    expect(first.history.dailyShownOn['record-overreaction']).toBe(DAY);
    expect(pick({ kind: 'personal-best' }, { h: first.history })).toBeNull();
    expect(pick({ kind: 'personal-best' }, { h: first.history, day: '2026-11-13' })).not.toBeNull();
  });
});

describe('pickGag — variety', () => {
  it('never plays the same variant twice in a row', () => {
    const rng = createSeededRng(3);
    let h = createGagHistory();
    let last = '';
    for (let i = 0; i < 200; i++) {
      const r = pickGag({ kind: 'duplicate-word' }, ctx, fresh, h, () => (rng() < 0.5 ? 0 : rng()), 0, DAY);
      if (!r) continue;
      expect(r.variant.id).not.toBe(last);
      last = r.variant.id;
      h = r.history;
    }
  });

  it('skips a gag whose only variant just played', () => {
    const solo = { ...gagById('photo-evidence')!, variants: [gagById('photo-evidence')!.variants[0]] };
    const h = { ...createGagHistory(), lastVariant: { 'photo-evidence': solo.variants[0].id } };
    expect(pickGag({ kind: 'duplicate-word' }, ctx, fresh, h, yes, 0, DAY, [solo])).toBeNull();
  });

  it('a running gag heightens one stage per occurrence, then retires', () => {
    const short: GagEvent = { kind: 'word-submitted', wordLength: 2, gemLetterUsed: false };
    let h = createGagHistory();
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = pickGag(short, ctx, fresh, h, yes, 0, DAY);
      if (!r) break;
      seen.push(r.variant.id);
      h = r.history;
    }
    expect(seen).toEqual(gagById('slow-clap')!.variants.map((v) => v.id));
  });
});

describe('timing helpers', () => {
  it('stretches the last-10s hold so the slide-off lands before 0', () => {
    const v = fitToRemaining(gagById('holds-back-timer')!.variants[0], 9000);
    expect(variantDurationMs(v)).toBeLessThanOrEqual(9000);
    expect(variantDurationMs(v)).toBeGreaterThan(8500);
  });

  it('walks beats by elapsed time and ends after the last', () => {
    const v = gagById('photo-evidence')!.variants[0];
    expect(beatIndexAt(v, 0)).toBe(0);
    expect(beatIndexAt(v, v.beats[0].ms)).toBe(1);
    expect(beatIndexAt(v, variantDurationMs(v))).toBe(-1);
  });

  it('counts whole days between visits', () => {
    expect(daysBetween(0, 86_400_000 * 3 + 5)).toBe(3);
  });
});
