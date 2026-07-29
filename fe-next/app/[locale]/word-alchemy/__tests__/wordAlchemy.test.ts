import { describe, it, expect } from 'vitest';
import {
  normalizeGuess,
  checkGuess,
  revealHint,
  ALCHEMY_OPS,
  PUZZLES,
  PUZZLES_HE,
} from '../page';

/**
 * Word Alchemy is a Parseword-lite transformation chain (experimental,
 * admin-gated hub tile). These tests pin the pure game logic — the
 * curated puzzles ship their own answers, so validation is exact-match
 * against the known next word in the chain (no dictionary lookup).
 */

describe('normalizeGuess', () => {
  it('uppercases and strips non-letters', () => {
    expect(normalizeGuess('  bear! ')).toBe('BEAR');
    expect(normalizeGuess('Re-Bar')).toBe('REBAR');
    expect(normalizeGuess('s o n')).toBe('SON');
  });
});

describe('checkGuess', () => {
  it('matches case- and whitespace-insensitively', () => {
    expect(checkGuess('Bear', 'BEAR')).toBe(true);
    expect(checkGuess(' bear ', 'BEAR')).toBe(true);
  });

  it('rejects wrong words', () => {
    expect(checkGuess('beer', 'BEAR')).toBe(false);
    expect(checkGuess('', 'BEAR')).toBe(false);
  });
});

describe('normalizeGuess — Hebrew', () => {
  it('keeps Hebrew letters and strips non-letters', () => {
    expect(normalizeGuess('חתול')).toBe('חתול');
    expect(normalizeGuess(' חור! ')).toBe('חור');
  });

  it('normalizes sofit (final) letters to their base form so either typed form matches', () => {
    // ם → מ, ן → נ, etc. — the answer is stored base-form.
    expect(normalizeGuess('שלום')).toBe('שלומ');
    expect(normalizeGuess('להם')).toBe('להמ');
  });

  it('does not mangle English when mixed casing is used (regression guard)', () => {
    expect(normalizeGuess('Re-Bar')).toBe('REBAR');
  });
});

describe('checkGuess — Hebrew', () => {
  it('matches a sofit-typed guess against a base-form answer', () => {
    expect(checkGuess('שלום', 'שלומ')).toBe(true); // player types final mem
    expect(checkGuess('חול', 'חול')).toBe(true);
    expect(checkGuess('חור', 'חול')).toBe(false);
  });
});

describe('revealHint', () => {
  it('reveals progressively more letters as wrong attempts climb', () => {
    expect(revealHint('BEAR', 0)).toBe('_ _ _ _'); // nothing
    expect(revealHint('BEAR', 1)).toBe('_ _ _ _'); // still nothing under tier 1
    expect(revealHint('BEAR', 2)).toBe('B _ _ _'); // first letter
    expect(revealHint('BEAR', 4)).toBe('B _ _ R'); // first + last
    expect(revealHint('BEAR', 6)).toBe('B E _ R'); // all but the middle
  });

  it('never fully reveals the answer at the top tier', () => {
    const masked = revealHint('GOAT', 10);
    expect(masked.replace(/[ ]/g, '')).toContain('_');
  });
});

describe('PUZZLES integrity', () => {
  it('ships at least four hand-authored puzzles', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(4);
  });

  it('every puzzle has a start word and at least two transformation steps', () => {
    for (const p of PUZZLES) {
      expect(p.id).toBeTruthy();
      expect(normalizeGuess(p.start).length).toBeGreaterThan(0);
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every step uses a known operation and a clean, real answer that differs from the prior word', () => {
    for (const p of PUZZLES) {
      let prev = normalizeGuess(p.start);
      for (const step of p.steps) {
        expect(ALCHEMY_OPS).toContain(step.op);
        const answer = normalizeGuess(step.answer);
        // answer must already be normalized (letters only, no spaces)
        expect(answer).toBe(step.answer.toUpperCase());
        expect(answer.length).toBeGreaterThan(0);
        // each transformation must change the word
        expect(answer).not.toBe(prev);
        prev = answer;
      }
    }
  });

  it('puzzle ids are unique', () => {
    const ids = PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('PUZZLES_HE integrity (Hebrew content)', () => {
  it('ships at least four hand-authored Hebrew puzzles', () => {
    expect(PUZZLES_HE.length).toBeGreaterThanOrEqual(4);
  });

  it('stores only base-form Hebrew (no sofit letters) so normalizeGuess is a no-op on answers', () => {
    const sofit = /[ךםןףץ]/;
    for (const p of PUZZLES_HE) {
      expect(sofit.test(p.start), `start ${p.start} has sofit`).toBe(false);
      for (const step of p.steps) {
        expect(sofit.test(step.answer), `answer ${step.answer} has sofit`).toBe(false);
        // answer is already normalized (no stray chars, no case change)
        expect(normalizeGuess(step.answer)).toBe(step.answer);
      }
    }
  });

  it('every Hebrew step uses a known op and an answer that differs from the prior word', () => {
    for (const p of PUZZLES_HE) {
      expect(p.id).toBeTruthy();
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      let prev = normalizeGuess(p.start);
      for (const step of p.steps) {
        expect(ALCHEMY_OPS).toContain(step.op);
        const answer = normalizeGuess(step.answer);
        expect(answer.length).toBeGreaterThan(0);
        expect(answer).not.toBe(prev);
        prev = answer;
      }
    }
  });

  it('Hebrew puzzle ids are unique and distinct from English ids', () => {
    const heIds = PUZZLES_HE.map((p) => p.id);
    expect(new Set(heIds).size).toBe(heIds.length);
    const enIds = new Set(PUZZLES.map((p) => p.id));
    for (const id of heIds) expect(enIds.has(id), `${id} collides with English`).toBe(false);
  });
});
