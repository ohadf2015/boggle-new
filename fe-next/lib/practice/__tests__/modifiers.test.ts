import { describe, it, expect } from 'vitest';
import {
  pickDailyModifier,
  PRACTICE_MODIFIERS,
  type PracticeModifier,
  scoreMultiplierFor,
} from '../modifiers';

describe('practice/modifiers', () => {
  describe('PRACTICE_MODIFIERS catalog', () => {
    it('has at least 3 modifiers (per slice B+A spec)', () => {
      expect(PRACTICE_MODIFIERS.length).toBeGreaterThanOrEqual(3);
    });

    it('every modifier has unique id, label key, and bonus rule', () => {
      const ids = new Set(PRACTICE_MODIFIERS.map((m) => m.id));
      expect(ids.size).toBe(PRACTICE_MODIFIERS.length);
      PRACTICE_MODIFIERS.forEach((m) => {
        expect(m.id).toMatch(/^[a-z][a-z0-9-]+$/);
        expect(m.labelKey).toMatch(/^practice\.modifier\./);
        expect(typeof m.bonusMultiplier).toBe('number');
        expect(m.bonusMultiplier).toBeGreaterThan(1);
        expect(typeof m.matches).toBe('function');
      });
    });

    it('contains the 3 spec-named modifiers (vowel-only, double-letter, s-words)', () => {
      const ids = PRACTICE_MODIFIERS.map((m) => m.id);
      expect(ids).toContain('vowel-only');
      expect(ids).toContain('double-letter');
      expect(ids).toContain('s-words');
    });
  });

  describe('match rules', () => {
    const byId = (id: string): PracticeModifier => {
      const m = PRACTICE_MODIFIERS.find((x) => x.id === id);
      if (!m) throw new Error(`unknown modifier ${id}`);
      return m;
    };

    it('vowel-only matches words with no consonants', () => {
      const mod = byId('vowel-only');
      expect(mod.matches('AI')).toBe(true);
      expect(mod.matches('OUI')).toBe(true);
      expect(mod.matches('CAT')).toBe(false);
      expect(mod.matches('A')).toBe(true);
      expect(mod.matches('')).toBe(false); // empty does not count
    });

    it('double-letter matches words with adjacent same letters', () => {
      const mod = byId('double-letter');
      expect(mod.matches('LETTER')).toBe(true);
      expect(mod.matches('BOOK')).toBe(true);
      expect(mod.matches('CAT')).toBe(false);
      expect(mod.matches('A')).toBe(false);
    });

    it('s-words matches words starting with S (case insensitive)', () => {
      const mod = byId('s-words');
      expect(mod.matches('SNAKE')).toBe(true);
      expect(mod.matches('snake')).toBe(true);
      expect(mod.matches('CAT')).toBe(false);
    });
  });

  describe('pickDailyModifier (deterministic by date)', () => {
    it('returns the same modifier for the same date', () => {
      const a = pickDailyModifier(new Date('2026-05-03T00:00:00Z'));
      const b = pickDailyModifier(new Date('2026-05-03T23:59:59Z'));
      expect(a.id).toBe(b.id);
    });

    it('returns different modifiers across enough different dates', () => {
      const ids = new Set<string>();
      for (let day = 1; day <= 28; day++) {
        const d = new Date(`2026-01-${String(day).padStart(2, '0')}T12:00:00Z`);
        ids.add(pickDailyModifier(d).id);
      }
      // Across 28 days expect to hit more than one modifier
      expect(ids.size).toBeGreaterThan(1);
    });

    it('always returns a member of PRACTICE_MODIFIERS', () => {
      const d = new Date('2026-07-04T12:00:00Z');
      const picked = pickDailyModifier(d);
      expect(PRACTICE_MODIFIERS.some((m) => m.id === picked.id)).toBe(true);
    });
  });

  describe('scoreMultiplierFor', () => {
    it('returns 1 if the word does not match the modifier', () => {
      const mod = PRACTICE_MODIFIERS.find((m) => m.id === 's-words')!;
      expect(scoreMultiplierFor(mod, 'CAT')).toBe(1);
    });

    it('returns the modifier bonus if the word matches', () => {
      const mod = PRACTICE_MODIFIERS.find((m) => m.id === 's-words')!;
      expect(scoreMultiplierFor(mod, 'SNAKE')).toBe(mod.bonusMultiplier);
    });
  });
});
