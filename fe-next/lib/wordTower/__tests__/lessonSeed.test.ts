/**
 * RED tests for the Word Tower lesson seed — "one word list, many games".
 *
 * The contract these lock down: a teacher's vocabulary list becomes a Word Tower
 * WHEEL whose letters actually spell that list. Buildability is asserted with
 * the REAL `isBuildable` (a multiset check), never a re-implementation, because
 * the whole bug class here is "the pool has the right distinct letters but not
 * enough of them" — CHEESE needs three E tiles.
 */
import { describe, it, expect } from 'vitest';
import { WORD_TOWER_WHEEL_SIZE } from '@/shared/constants/wordTowerConstants';
import { isBuildable } from '../wordTowerManager';
import {
  LESSON_SEED_MIN_TARGETS,
  LESSON_SEED_MAX_LEN,
  LESSON_SEED_MIN_LEN,
  buildLessonSeed,
  eligibleLessonWords,
  lessonSeedSupportsLanguage,
  isLessonSeedReady,
  matchLessonTarget,
  nextLessonTarget,
} from '../lessonSeed';

/** A realistic 7th-grade phonics list: -IGHT words share almost every letter. */
const IGHT_LIST = ['light', 'night', 'sight', 'bright', 'cat'];

describe('eligibleLessonWords', () => {
  it('keeps only words the wheel could ever spell, canonical and deduped', () => {
    const eligible = eligibleLessonWords(
      ['light', 'LIGHT', 'cat', 'extraordinary', 'night'],
      'en'
    );
    // 'cat' is under LESSON_SEED_MIN_LEN, 'extraordinary' is over
    // LESSON_SEED_MAX_LEN (a word longer than the ring can never be built),
    // and the duplicate casing collapses to one canonical entry.
    expect(eligible).toEqual(['LIGHT', 'NIGHT']);
  });

  it('never returns a word longer than the wheel', () => {
    expect(LESSON_SEED_MAX_LEN).toBeLessThan(WORD_TOWER_WHEEL_SIZE);
    const eligible = eligibleLessonWords(['abcdefghij', 'light'], 'en');
    for (const w of eligible) expect(w.length).toBeLessThanOrEqual(LESSON_SEED_MAX_LEN);
  });
});

describe('lessonSeedSupportsLanguage', () => {
  it('accepts a language with both a letter bag and a Word Craft dictionary', () => {
    for (const lang of ['en', 'he', 'sv', 'es', 'ja'] as const) {
      expect(lessonSeedSupportsLanguage(lang)).toBe(true);
    }
  });

  it('rejects a language with no letter bag or no dictionary to fall back on', () => {
    // fr/de have an EMPTY letter bag — generateWheel would hand back [] with no
    // error at all (silent no-op). ru has a bag but no Word Craft dictionary,
    // so only the lesson words themselves would ever be accepted.
    expect(lessonSeedSupportsLanguage('fr')).toBe(false);
    expect(lessonSeedSupportsLanguage('de')).toBe(false);
    expect(lessonSeedSupportsLanguage('ru')).toBe(false);
  });
});

describe('isLessonSeedReady', () => {
  it('is ready with enough eligible words in a supported language', () => {
    expect(isLessonSeedReady(['light', 'night', 'sight', 'bright'], 'en')).toBe(true);
  });

  it('is not ready one word short of the minimum', () => {
    const short = ['light', 'night', 'sight'];
    expect(short.length).toBe(LESSON_SEED_MIN_TARGETS - 1);
    expect(isLessonSeedReady(short, 'en')).toBe(false);
  });

  it('is not ready when the lesson language has no wheel', () => {
    expect(isLessonSeedReady(['светит', 'ночной', 'зрение', 'яркий'], 'ru')).toBe(false);
  });
});

describe('buildLessonSeed', () => {
  it('fills the wheel exactly', () => {
    const seed = buildLessonSeed(IGHT_LIST, 'en');
    expect(seed.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
  });

  it('every seeded target is really buildable from the tray', () => {
    const seed = buildLessonSeed(IGHT_LIST, 'en');
    expect(seed.targets.length).toBeGreaterThanOrEqual(1);
    for (const target of seed.targets) {
      expect(isBuildable(target, seed.tray, 'en')).toBe(true);
    }
  });

  it('packs more than one lesson word into the ring when the letters overlap', () => {
    // LIGHT / NIGHT / SIGHT share L,I,G,H,T — the union-max multiset is 7 tiles,
    // so all three fit. A seed that only ever guarantees ONE word is the failure
    // this asserts against: the mode would collapse to "spell this one word".
    const seed = buildLessonSeed(IGHT_LIST, 'en');
    expect(seed.targets.length).toBeGreaterThanOrEqual(2);
  });

  it('handles a list whose letters barely overlap', () => {
    const seed = buildLessonSeed(['apple', 'grape', 'melon', 'peach'], 'en');
    expect(seed.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
    for (const target of seed.targets) {
      expect(isBuildable(target, seed.tray, 'en')).toBe(true);
    }
  });

  it('is deterministic for the same list, language and seed', () => {
    const a = buildLessonSeed(IGHT_LIST, 'en', { seed: 'lesson-42' });
    const b = buildLessonSeed(IGHT_LIST, 'en', { seed: 'lesson-42' });
    expect(a.tray).toEqual(b.tray);
    expect(a.targets).toEqual(b.targets);
  });

  it('does not lay the primary target out in reading order on the ring', () => {
    // A ring that spells the answer left-to-right gives the word away.
    const seed = buildLessonSeed(IGHT_LIST, 'en', { seed: 'lesson-42' });
    expect(seed.tray.join('').startsWith(seed.targets[0])).toBe(false);
  });

  it('still counts eligible words it could not seed into the ring', () => {
    const seed = buildLessonSeed(IGHT_LIST, 'en');
    const all = [...seed.targets, ...seed.extraWords];
    // BRIGHT is eligible but will not fit alongside the three -IGHT words.
    expect(all).toContain('BRIGHT');
    // Nothing is both a seeded target and an extra.
    expect(new Set(all).size).toBe(all.length);
  });

  it('leaves an unseeded lesson word reachable when the ring happens to spell it', () => {
    // The reason extraWords are scored at all. TINS does not fit as a fourth
    // target, but L,I,G,H,T,N,S — the ring the first three produced — builds it.
    const seed = buildLessonSeed(['light', 'night', 'sight', 'tins'], 'en');
    expect(seed.extraWords).toContain('TINS');
    expect(isBuildable('TINS', seed.tray, 'en')).toBe(true);
    expect(matchLessonTarget('tins', seed, 'en')).toBe('TINS');
  });

  it('returns an empty tray when the lesson cannot seed a wheel', () => {
    const seed = buildLessonSeed(['cat', 'dog'], 'en');
    expect(seed.tray).toEqual([]);
    expect(seed.targets).toEqual([]);
  });

  it('returns an empty tray for an unsupported language', () => {
    const seed = buildLessonSeed(['lumière', 'brillant', 'clarté', 'éclat'], 'fr');
    expect(seed.tray).toEqual([]);
  });
});

describe('matchLessonTarget', () => {
  const seed = buildLessonSeed(IGHT_LIST, 'en');

  it('matches a played word against the lesson regardless of case', () => {
    expect(matchLessonTarget('light', seed, 'en')).toBe('LIGHT');
    expect(matchLessonTarget('LiGhT', seed, 'en')).toBe('LIGHT');
  });

  it('matches an eligible lesson word that was not seeded into the ring', () => {
    expect(matchLessonTarget('bright', seed, 'en')).toBe('BRIGHT');
  });

  it('returns null for an ordinary dictionary word', () => {
    // THIN is a real word and buildable from these letters — it scores height
    // like any other word, but it is NOT a lesson hit.
    expect(matchLessonTarget('thin', seed, 'en')).toBeNull();
  });

  it('returns null for a word the lesson excluded as too short', () => {
    expect(matchLessonTarget('cat', seed, 'en')).toBeNull();
  });
});

describe('nextLessonTarget', () => {
  const seed = buildLessonSeed(IGHT_LIST, 'en');

  it('points at the first unhit target', () => {
    expect(nextLessonTarget(seed, new Set())).toBe(seed.targets[0]);
  });

  it('skips targets already hit, in order', () => {
    const hit = new Set([seed.targets[0]]);
    expect(nextLessonTarget(seed, hit)).toBe(seed.targets[1]);
  });

  it('returns null once every target is hit', () => {
    expect(nextLessonTarget(seed, new Set(seed.targets))).toBeNull();
  });

  it('is unaffected by hits on words outside the lesson', () => {
    expect(nextLessonTarget(seed, new Set(['THIN']))).toBe(seed.targets[0]);
  });
});
