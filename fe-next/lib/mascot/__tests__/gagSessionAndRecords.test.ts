import { describe, it, expect } from 'vitest';
import { pickGag, createGagHistory, forSession, canInterrupt, type GagHistory, type GagLimits } from '../gagDirector';
import type { GagEvent } from '../gagTypes';

const yes = () => 0;
const ctx = { rejectionsThisRound: 0, wordsThisRound: 5 };
const fresh: GagLimits = { shownThisRound: 0, shownThisSession: 0, lastShownAt: null };
const longWord: GagEvent = { kind: 'word-submitted', wordLength: 8, gemLetterUsed: false };
const best: GagEvent = { kind: 'personal-best' };

function play(event: GagEvent, h: GagHistory, day = '2026-11-12', limits: GagLimits = fresh) {
  const p = pickGag(event, ctx, limits, h, yes, 100_000, day);
  return { id: p?.gag.id ?? null, variant: p?.variant.id ?? null, h: p?.history ?? h };
}

describe('measuring tape running gag (bible 2)', () => {
  it('the first long word of a session is the finger count, never the tape', () => {
    const h = forSession(createGagHistory(), 's1');
    expect(play(longWord, h).id).toBe('finger-count');
  });

  it('advances finger count → tape measure → two tapes taped together, then retires', () => {
    let h = forSession(createGagHistory(), 's1');
    let r = play(longWord, h);
    expect(r.id).toBe('finger-count');
    r = play(longWord, (h = r.h));
    expect([r.id, r.variant]).toEqual(['measuring-tape', 'measures-the-word']);
    r = play(longWord, (h = r.h));
    expect([r.id, r.variant]).toEqual(['measuring-tape', 'tapes-two-together']);
    r = play(longWord, (h = r.h));
    expect(r.id).not.toBe('measuring-tape');
  });

  it('a new session starts the tape over, and a remount in the same session keeps its stage', () => {
    let h = forSession(createGagHistory(), 's1');
    h = play(longWord, h).h;
    h = play(longWord, h).h;
    expect(play(longWord, forSession(h, 's1')).variant).toBe('tapes-two-together');
    const next = forSession(h, 's2');
    expect(play(longWord, next).id).toBe('finger-count');
  });

  it('the tape stage never touches the lifetime running-gag stages', () => {
    let h = forSession(createGagHistory(), 's1');
    h = play(longWord, h).h;
    h = play(longWord, h).h;
    expect(h.stage['measuring-tape']).toBeUndefined();
  });
});

describe('personal best: drumroll and crumpled record share one daily cap', () => {
  it('a second personal best on the same day gets no personal-best gag', () => {
    const h = forSession(createGagHistory(), 's1');
    const first = play(best, h);
    expect(first.id).toBe('record-overreaction');
    expect(play(best, first.h).id).toBeNull();
  });

  it('takes turns across days: drumroll, then the crumpled record, then the drumroll again', () => {
    let h = forSession(createGagHistory(), 's1');
    const ids: Array<string | null> = [];
    for (const day of ['2026-11-12', '2026-11-13', '2026-11-14']) {
      const r = play(best, h, day);
      ids.push(r.id);
      h = r.h;
    }
    expect(ids).toEqual(['record-overreaction', 'crumpled-record', 'record-overreaction']);
  });

  it('lands even after the round has used its gag allowance', () => {
    const spent: GagLimits = { shownThisRound: 3, shownThisSession: 10, lastShownAt: 99_000 };
    expect(play(best, forSession(createGagHistory(), 's1'), '2026-11-12', spent).id).toBe('record-overreaction');
  });

  it('a personal best may cut into a playing gag; an ordinary word may not', () => {
    expect(canInterrupt(best, ctx)).toBe(true);
    expect(canInterrupt(longWord, ctx)).toBe(false);
  });
});
