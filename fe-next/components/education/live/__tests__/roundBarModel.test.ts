import { describe, expect, it } from 'vitest';
import { overtakeOf, raceMiniView, tugShare } from '../roundBarModel';
import type { StripSlot } from '../lessonTargets';

const hidden = (i: number, first: string, rest = 4): StripSlot => ({ key: String(i), first, rest, state: 'hidden' });
const taken = (i: number, word: string): StripSlot => ({ key: String(i), first: word[0], rest: word.length - 1, state: 'taken', word, by: 'Dana' });
const mine = (i: number, word: string): StripSlot => ({ key: String(i), first: word[0], rest: word.length - 1, state: 'mine', word });

describe('tugShare: how much of the rope is mine', () => {
  it('Given no points yet, When the round starts, Then the rope sits in the middle', () => {
    expect(tugShare(0, 0)).toBe(0.5);
  });

  it('Given a 4-point gap, Then the rope moves far enough to read at a glance, the same distance either way', () => {
    expect(tugShare(41, 37)).toBeGreaterThan(0.65);
    expect(tugShare(33, 37)).toBeLessThan(0.35);
    expect(tugShare(41, 37) + tugShare(33, 37)).toBeCloseTo(1);
  });

  it('Given a bigger lead, Then more of the rope is mine', () => {
    expect(tugShare(50, 37)).toBeGreaterThan(tugShare(41, 37));
  });

  it('Given a shutout either way, Then neither side ever vanishes from the bar', () => {
    expect(tugShare(10, 0)).toBeLessThan(1);
    expect(tugShare(0, 10)).toBeGreaterThan(0);
    expect(tugShare(0, 10)).toBeGreaterThanOrEqual(0.1);
    expect(tugShare(10, 0)).toBeLessThanOrEqual(0.9);
  });

  it('Given negative scores from a wrong-word cost, Then the share stays a valid fraction', () => {
    const s = tugShare(-3, 40);
    expect(s).toBeGreaterThanOrEqual(0.1);
    expect(s).toBeLessThanOrEqual(0.9);
  });
});

describe('overtakeOf: the moment the lead changes hands', () => {
  it('Given I was behind or tied, When I go ahead, Then it is my overtake', () => {
    expect(overtakeOf('behind', 'ahead')).toBe('took');
    expect(overtakeOf('level', 'ahead')).toBe('took');
  });

  it('Given I was ahead, When my rival passes me, Then it is their overtake', () => {
    expect(overtakeOf('ahead', 'behind')).toBe('lost');
  });

  it('Given the first reading or no change, Then nothing shakes', () => {
    expect(overtakeOf(null, 'ahead')).toBeNull();
    expect(overtakeOf('ahead', 'ahead')).toBeNull();
    expect(overtakeOf('behind', 'level')).toBeNull();
  });
});

describe('raceMiniView: the race folded to a count and one chip', () => {
  const slots = [taken(0, 'PHOTON'), mine(1, 'GRAVITY'), hidden(2, 'M'), hidden(3, 'O')];

  it('Given claims so far, Then it counts claimed over total', () => {
    expect(raceMiniView(slots, null)).toMatchObject({ done: 2, total: 4 });
  });

  it('Given a fresh claim, Then the chip is that claim', () => {
    expect(raceMiniView(slots, 0).chip).toEqual(slots[0]);
  });

  it('Given no fresh claim, Then the chip is the next word still to grab, so the clue stays on screen', () => {
    expect(raceMiniView(slots, null).chip).toEqual(slots[2]);
  });

  it('Given every word claimed and no fresh claim, Then the chip is the last word a classmate claimed (mine already shows in its own slot)', () => {
    const all = [taken(0, 'PHOTON'), mine(1, 'GRAVITY')];
    expect(raceMiniView(all, null).chip).toEqual(all[0]);
  });

  it('Given a claim index that is not in the list, Then it falls back to the next clue', () => {
    expect(raceMiniView(slots, 9).chip).toEqual(slots[2]);
  });

  it('Given I claimed words, Then my latest claim is always held beside the clue with a count of my claims', () => {
    const mineTwo = [mine(0, 'PHOTON'), taken(1, 'ORBIT'), mine(2, 'MAGNET'), hidden(3, 'P')];
    const v = raceMiniView(mineTwo, null);
    expect(v.mine).toEqual(mineTwo[2]);
    expect(v.mineCount).toBe(2);
    expect(v.chip).toEqual(mineTwo[3]);
  });

  it('Given my own fresh claim, Then the chip is not shown twice: the mine slot carries it and the chip falls back to the clue', () => {
    const list = [mine(0, 'PHOTON'), hidden(1, 'M')];
    const v = raceMiniView(list, 0);
    expect(v.mine).toEqual(list[0]);
    expect(v.chip).toEqual(list[1]);
  });

  it('Given no claims of mine, Then there is no mine slot', () => {
    expect(raceMiniView([taken(0, 'PHOTON'), hidden(1, 'M')], null)).toMatchObject({ mine: null, mineCount: 0 });
  });
});

