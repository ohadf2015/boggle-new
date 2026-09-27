import { describe, it, expect } from 'vitest';
import {
  letterScore,
  letterValue,
  canFormFromRack,
  resolveRound,
  initialSbState,
  commitBid,
  advanceRound,
  MIN_WORD_LEN,
  type SbRound,
} from '../sbEngine';
import { SEALED_BID_ROUNDS, SEALED_BID_ROUNDS_HE, pickRounds, ROUNDS_PER_GAME } from '../rounds';

const ROUNDS: SbRound[] = [
  { rack: 'TRAINED', botPick: 'TRAIN' },
  { rack: 'GARDENS', botPick: 'GARDEN' },
];

describe('letterScore', () => {
  it('sums Scrabble letter values (case-insensitive)', () => {
    // C(3)+A(1)+T(1) = 5
    expect(letterScore('CAT')).toBe(5);
    expect(letterScore('cat')).toBe(5);
    // Q(10)+U(1)+I(1)+Z(10) = 22
    expect(letterScore('QUIZ')).toBe(22);
  });

  it('ignores non-letters', () => {
    expect(letterScore('CA T')).toBe(5);
    expect(letterScore('')).toBe(0);
  });

  it('scores Hebrew base letters (sofit forms are normalized to base upstream)', () => {
    // ש1+ל1+ו1+מ1 = 4 (all common letters worth 1)
    expect(letterScore('שלומ')).toBe(4);
    // every base letter contributes, none score 0
    expect(letterScore('כלבימ')).toBeGreaterThan(0);
  });
});

describe('letterValue', () => {
  it('returns the per-tile value for a single character (case-insensitive)', () => {
    expect(letterValue('Q')).toBe(10);
    expect(letterValue('a')).toBe(1);
    expect(letterValue('ש')).toBe(1);
    expect(letterValue('ז')).toBe(4);
  });
  it('returns 0 for an unknown / empty character', () => {
    expect(letterValue('')).toBe(0);
    expect(letterValue(' ')).toBe(0);
  });
});

describe('canFormFromRack', () => {
  it('accepts words formable from the rack letters (multiset, case-insensitive)', () => {
    expect(canFormFromRack('TRAIN', 'TRAINED')).toBe(true);
    expect(canFormFromRack('train', 'TRAINED')).toBe(true);
    expect(canFormFromRack('DENT', 'TRAINED')).toBe(true);
  });

  it('rejects words needing a letter more times than the rack provides', () => {
    // TRAINED has one T; TART needs two T.
    expect(canFormFromRack('TART', 'TRAINED')).toBe(false);
  });

  it('rejects words using letters not in the rack', () => {
    expect(canFormFromRack('ZEBRA', 'TRAINED')).toBe(false);
  });

  it('handles Hebrew base letters (multiset) without treating them as stray chars', () => {
    // שלומ formable from rack שלומחת
    expect(canFormFromRack('שלומ', 'שלומחת')).toBe(true);
    // word needs a letter the rack lacks → false (must not pass vacuously)
    expect(canFormFromRack('דגים', 'שלומחת')).toBe(false);
    // needs מ twice but rack has one
    expect(canFormFromRack('ממש', 'שלומחת')).toBe(false);
  });
});

describe('resolveRound', () => {
  const rack = 'TRAINED';
  const botPick = 'TRAIN';

  it('scores a UNIQUE bid at double the base when valid & differs from the bot', () => {
    // RETAIN: R1+E1+T1+A1+I1+N1 = 6 base → unique → 12
    const r = resolveRound('RETAIN', botPick, { dictOk: true, rack });
    expect(r.outcome).toBe('unique');
    expect(r.basePoints).toBe(6);
    expect(r.points).toBe(12);
  });

  it('scores a CLASH at half the base (floored) when it matches the bot word', () => {
    // TRAIN base = T1+R1+A1+I1+N1 = 5 → clash → floor(5/2) = 2. Case-insensitive match.
    const r = resolveRound('train', botPick, { dictOk: true, rack });
    expect(r.outcome).toBe('clash');
    expect(r.basePoints).toBe(5);
    expect(r.points).toBe(2);
  });

  it('returns NONE (0) for a pass (null word)', () => {
    const r = resolveRound(null, botPick, { dictOk: true, rack });
    expect(r.outcome).toBe('none');
    expect(r.points).toBe(0);
    expect(r.playerWord).toBeNull();
  });

  it('returns NONE for a word that fails the dictionary check', () => {
    const r = resolveRound('RETAIN', botPick, { dictOk: false, rack });
    expect(r.outcome).toBe('none');
    expect(r.points).toBe(0);
  });

  it('returns NONE for a word not formable from the rack (anti-cheat safety net)', () => {
    const r = resolveRound('ZEBRA', botPick, { dictOk: true, rack });
    expect(r.outcome).toBe('none');
    expect(r.points).toBe(0);
  });

  it('returns NONE for a word shorter than MIN_WORD_LEN', () => {
    expect(MIN_WORD_LEN).toBeGreaterThanOrEqual(3);
    const r = resolveRound('AT', botPick, { dictOk: true, rack });
    expect(r.outcome).toBe('none');
  });
});

describe('state machine', () => {
  it('initialSbState starts at round 0, score 0, bidding phase', () => {
    const s = initialSbState(ROUNDS);
    expect(s.index).toBe(0);
    expect(s.totalScore).toBe(0);
    expect(s.phase).toBe('bidding');
    expect(s.rounds).toHaveLength(2);
    expect(s.lastResult).toBeUndefined();
  });

  it('commitBid reveals the round, records the result, and accumulates points', () => {
    const s0 = initialSbState(ROUNDS);
    const s1 = commitBid(s0, 'RETAIN', true); // unique on TRAINED → 12
    expect(s1.phase).toBe('revealed');
    expect(s1.lastResult?.outcome).toBe('unique');
    expect(s1.totalScore).toBe(12);
    // original state is not mutated
    expect(s0.phase).toBe('bidding');
    expect(s0.totalScore).toBe(0);
  });

  it('a clash adds the halved score', () => {
    const s = commitBid(initialSbState(ROUNDS), 'TRAIN', true); // clash → floor(5/2) = 2
    expect(s.lastResult?.outcome).toBe('clash');
    expect(s.totalScore).toBe(2);
  });

  it('advanceRound moves to the next round in bidding phase and clears lastResult', () => {
    const s1 = commitBid(initialSbState(ROUNDS), 'RETAIN', true);
    const s2 = advanceRound(s1);
    expect(s2.index).toBe(1);
    expect(s2.phase).toBe('bidding');
    expect(s2.lastResult).toBeUndefined();
    expect(s2.totalScore).toBe(12); // carried forward
  });

  it('advanceRound is a no-op while still bidding (guards out-of-phase calls)', () => {
    const s = initialSbState(ROUNDS);
    expect(advanceRound(s)).toBe(s);
  });

  it('advanceRound after the last round ends the game (done)', () => {
    let s = initialSbState(ROUNDS);
    s = commitBid(s, 'RETAIN', true); // round 0
    s = advanceRound(s); // → round 1
    s = commitBid(s, 'DANGER', true); // GARDENS: D2+A1+N1+G2+E1+R1 = 8 → unique → 16
    expect(s.totalScore).toBe(12 + 16);
    s = advanceRound(s);
    expect(s.phase).toBe('done');
  });
});

describe('curated rounds integrity', () => {
  it('every botPick is formable from its rack and long enough', () => {
    for (const { rack, botPick } of SEALED_BID_ROUNDS) {
      expect(rack.length, `rack ${rack}`).toBe(7);
      expect(canFormFromRack(botPick, rack), `${botPick} from ${rack}`).toBe(true);
      expect(botPick.length, `botPick ${botPick}`).toBeGreaterThanOrEqual(MIN_WORD_LEN);
    }
  });

  it('pickRounds returns the requested count of distinct rounds', () => {
    const picked = pickRounds(ROUNDS_PER_GAME);
    expect(picked).toHaveLength(ROUNDS_PER_GAME);
    expect(new Set(picked.map((r) => r.rack)).size).toBe(ROUNDS_PER_GAME);
  });

  it('every Hebrew botPick is formable from its (base-form) rack and long enough', () => {
    expect(SEALED_BID_ROUNDS_HE.length).toBeGreaterThanOrEqual(ROUNDS_PER_GAME);
    for (const { rack, botPick } of SEALED_BID_ROUNDS_HE) {
      expect(canFormFromRack(botPick, rack), `${botPick} from ${rack}`).toBe(true);
      expect(botPick.length, `botPick ${botPick}`).toBeGreaterThanOrEqual(MIN_WORD_LEN);
      // base form only — no sofit letters stored in the engine layer
      expect(/[ךםןףץ]/.test(rack + botPick), `${rack}/${botPick} has sofit`).toBe(false);
    }
  });

  it('pickRounds(count, "he") draws from the Hebrew pool', () => {
    const picked = pickRounds(ROUNDS_PER_GAME, 'he');
    expect(picked).toHaveLength(ROUNDS_PER_GAME);
    const heRacks = new Set(SEALED_BID_ROUNDS_HE.map((r) => r.rack));
    for (const r of picked) expect(heRacks.has(r.rack), `${r.rack} is Hebrew`).toBe(true);
  });

  it('pickRounds defaults to English for unsupported locales', () => {
    const picked = pickRounds(ROUNDS_PER_GAME, 'sv');
    const enRacks = new Set(SEALED_BID_ROUNDS.map((r) => r.rack));
    for (const r of picked) expect(enRacks.has(r.rack), `${r.rack} is English`).toBe(true);
  });
});
