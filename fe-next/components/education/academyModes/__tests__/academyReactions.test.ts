/**
 * Pure reaction + reward rules behind the academy mode scenes: how the Word
 * Workshop rival reacts to each move, how the review mascot reacts to each
 * answer, which chest tier a finished round earns, and the XP count-up curve.
 */
import { describe, it, expect } from 'vitest';
import {
  RIVAL_ART,
  RIVAL_TAUNTS,
  countUpValue,
  reviewMascotMood,
  REVIEW_MASCOT_ART,
  rewardFx,
  rivalFinalMood,
  rivalReaction,
  workshopChestTier,
} from '@/lib/education/academyReactions';

describe('rivalReaction', () => {
  it('GIVEN the rival plays a word WHEN reacting THEN it attacks and taunts with a real key + English', () => {
    const r = rivalReaction({ who: 'bot', words: ['CAT'], lessonHits: 0, moveIndex: 3 });
    expect(r.mood).toBe('attack');
    expect(r.taunt).not.toBeNull();
    expect(RIVAL_TAUNTS.bot.map((x) => x.key)).toContain(r.taunt!.key);
    expect(r.taunt!.en.length).toBeGreaterThan(0);
  });

  it('GIVEN the student builds a lesson word WHEN reacting THEN the rival is hurt', () => {
    expect(rivalReaction({ who: 'player', words: ['TEACHER'], lessonHits: 1, moveIndex: 0 }).mood).toBe('hurt');
  });

  it('GIVEN an ordinary student word WHEN reacting THEN the rival gets angry, and a pass leaves it idle', () => {
    expect(rivalReaction({ who: 'player', words: ['AT'], lessonHits: 0, moveIndex: 1 }).mood).toBe('enraged');
    expect(rivalReaction({ who: 'player', words: [], lessonHits: 0, moveIndex: 2 })).toEqual({ mood: 'idle', taunt: null });
    expect(rivalReaction({ who: 'bot', words: [], lessonHits: 0, moveIndex: 2 }).mood).toBe('idle');
  });

  it('GIVEN the same move index WHEN reacting twice THEN the taunt is deterministic (no re-roll on re-render)', () => {
    const a = rivalReaction({ who: 'bot', words: ['X'], lessonHits: 0, moveIndex: 7 });
    const b = rivalReaction({ who: 'bot', words: ['X'], lessonHits: 0, moveIndex: 7 });
    expect(a).toEqual(b);
  });

  it('GIVEN the match ends WHEN the student won THEN the rival is defeated, otherwise it gloats', () => {
    expect(rivalFinalMood({ won: true, tie: false })).toBe('defeated');
    expect(rivalFinalMood({ won: false, tie: false })).toBe('attack');
    expect(rivalFinalMood({ won: false, tie: true })).toBe('enraged');
  });

  it('every mood has art', () => {
    for (const mood of ['idle', 'attack', 'hurt', 'enraged', 'defeated'] as const) {
      expect(RIVAL_ART[mood]).toMatch(/^\/images\/bosses\/boss-baron-buildaword.*\.png$/);
    }
  });
});

describe('reviewMascotMood', () => {
  it('GIVEN no answer yet WHEN a card is up THEN the mascot is thinking', () => {
    expect(reviewMascotMood({ answered: false, correct: null, streak: 0 })).toBe('think');
    expect(reviewMascotMood({ answered: false, correct: null, streak: 4 })).toBe('fire');
  });

  it('GIVEN a right answer THEN cheer, and a hot streak (3+) is on fire', () => {
    expect(reviewMascotMood({ answered: true, correct: true, streak: 1 })).toBe('cheer');
    expect(reviewMascotMood({ answered: true, correct: true, streak: 3 })).toBe('fire');
  });

  it('GIVEN a miss THEN oops', () => {
    expect(reviewMascotMood({ answered: true, correct: false, streak: 0 })).toBe('oops');
  });

  it('every mood has transparent mascot art', () => {
    for (const art of Object.values(REVIEW_MASCOT_ART)) expect(art).toMatch(/^\/mascot\/.*-nobg\.webp$/);
  });
});

describe('workshopChestTier', () => {
  it('GIVEN a win with 2+ lesson words THEN gold; a win or one lesson word THEN silver; else bronze', () => {
    expect(workshopChestTier({ won: true, lessonWords: 2 })).toBe('gold');
    expect(workshopChestTier({ won: true, lessonWords: 0 })).toBe('silver');
    expect(workshopChestTier({ won: false, lessonWords: 1 })).toBe('silver');
    expect(workshopChestTier({ won: false, lessonWords: 0 })).toBe('bronze');
  });
});

describe('rewardFx', () => {
  it('GIVEN a richer chest THEN more rays and sparks (the tier reads before the words)', () => {
    const [b, s, g] = (['bronze', 'silver', 'gold'] as const).map(rewardFx);
    expect(b.sparks).toBeLessThan(s.sparks);
    expect(s.sparks).toBeLessThan(g.sparks);
    expect(b.rays).toBeLessThanOrEqual(s.rays);
    expect(s.rays).toBeLessThan(g.rays);
    for (const fx of [b, s, g]) expect(fx.hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('countUpValue', () => {
  it('GIVEN the count-up WHEN it runs THEN it starts at 0, only climbs, and lands exactly on the target', () => {
    expect(countUpValue(55, 0, 1000)).toBe(0);
    let prev = 0;
    for (let ms = 0; ms <= 1000; ms += 50) {
      const v = countUpValue(55, ms, 1000);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(Number.isInteger(v)).toBe(true);
      prev = v;
    }
    expect(countUpValue(55, 1000, 1000)).toBe(55);
    expect(countUpValue(55, 5000, 1000)).toBe(55);
  });

  it('GIVEN zero duration or a zero target THEN it is the target at once', () => {
    expect(countUpValue(12, 0, 0)).toBe(12);
    expect(countUpValue(0, 300, 1000)).toBe(0);
  });
});
