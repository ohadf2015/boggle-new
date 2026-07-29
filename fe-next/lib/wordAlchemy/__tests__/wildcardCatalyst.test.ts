import { describe, it, expect } from 'vitest';
import { getWildcardCatalyst, CATALYST_WORDS } from '../wildcardCatalyst';

describe('getWildcardCatalyst — determinism', () => {
  it('returns the same result for the same puzzleId every call', () => {
    expect(getWildcardCatalyst('p1')).toEqual(getWildcardCatalyst('p1'));
    expect(getWildcardCatalyst('p3')).toEqual(getWildcardCatalyst('p3'));
  });

  it('different puzzle ids can produce different active states', () => {
    const results = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'h1', 'h2', 'h3'].map(
      (id) => getWildcardCatalyst(id)
    );
    const actives = results.filter((r) => r.active);
    const inactives = results.filter((r) => !r.active);
    // With 9 samples at 1/3 rate, expect at least 1 of each
    expect(actives.length).toBeGreaterThanOrEqual(1);
    expect(inactives.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getWildcardCatalyst — probability', () => {
  it('approximately 1/3 of puzzles have an active catalyst across 90 ids', () => {
    let active = 0;
    for (let i = 0; i < 90; i++) {
      if (getWildcardCatalyst(`puzzle-${i}`).active) active++;
    }
    // Expect between 1/6 and 2/3 (generous bounds; FNV distribution is uniform)
    expect(active).toBeGreaterThan(10);
    expect(active).toBeLessThan(55);
  });
});

describe('getWildcardCatalyst — active branch', () => {
  function findActive() {
    for (let i = 0; i < 90; i++) {
      const r = getWildcardCatalyst(`p${i}`);
      if (r.active) return r;
    }
    throw new Error('No active catalyst found in 90 attempts — hash distribution broken');
  }

  it('active wildWord is a member of CATALYST_WORDS', () => {
    const r = findActive();
    expect(CATALYST_WORDS).toContain(r.wildWord);
  });

  it('active wildWord is uppercase letters only', () => {
    const r = findActive();
    expect(r.wildWord).toBeTruthy();
    expect(/^[A-Z]+$/.test(r.wildWord!)).toBe(true);
  });

  it('triggerStepIdx is 0 when active', () => {
    const r = findActive();
    expect(r.triggerStepIdx).toBe(0);
  });
});

describe('getWildcardCatalyst — inactive branch', () => {
  function findInactive() {
    for (let i = 0; i < 90; i++) {
      const r = getWildcardCatalyst(`p${i}`);
      if (!r.active) return r;
    }
    throw new Error('No inactive catalyst found in 90 attempts — hash distribution broken');
  }

  it('inactive wildWord is null', () => {
    expect(findInactive().wildWord).toBeNull();
  });

  it('triggerStepIdx is still 0 when inactive (stable shape)', () => {
    expect(findInactive().triggerStepIdx).toBe(0);
  });
});

describe('CATALYST_WORDS list', () => {
  it('contains at least 6 words', () => {
    expect(CATALYST_WORDS.length).toBeGreaterThanOrEqual(6);
  });

  it('every entry is uppercase letters only', () => {
    for (const w of CATALYST_WORDS) {
      expect(/^[A-Z]+$/.test(w)).toBe(true);
    }
  });
});
