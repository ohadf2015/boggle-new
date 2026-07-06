import { describe, it, expect } from 'vitest';
import racks from '../sealedBidRacks.generated.json';
import { canFormFromRack } from '../../sbEngine';

const LANGS = ['en', 'he'] as const;

describe('sealedBidRacks.generated.json invariants', () => {
  for (const lang of LANGS) {
    const pool = (racks as Record<string, any[]>)[lang] ?? [];
    it(`${lang}: pool is non-empty`, () => {
      expect(pool.length).toBeGreaterThanOrEqual(8);
    });
    // Use INDEX loop, not pool.entries(), to avoid tsc downlevelIteration
    for (let i = 0; i < pool.length; i++) {
      const r = pool[i];
      it(`${lang}[${i}] ${r.letters}: 7 letters`, () => {
        expect(r.letters).toHaveLength(7);
      });
      it(`${lang}[${i}] ${r.letters}: >=1 bingo word, all use all 7 letters & are formable`, () => {
        expect(r.bingoWords.length).toBeGreaterThanOrEqual(1);
        for (const w of r.bingoWords) {
          expect(w.length).toBe(7);
          expect(canFormFromRack(w, r.letters)).toBe(true);
        }
      });
      it(`${lang}[${i}] ${r.letters}: >=6 total words spanning >=2 length buckets`, () => {
        const buckets = Object.keys(r.wordsByLen).filter(k => r.wordsByLen[k].length > 0);
        const total = Object.values(r.wordsByLen).reduce((a: number, b: any) => a + b.length, 0);
        expect(total).toBeGreaterThanOrEqual(6);
        expect(buckets.length).toBeGreaterThanOrEqual(2);
      });
      it(`${lang}[${i}] ${r.letters}: botPicks are formable & non-empty`, () => {
        expect(r.botPicks.length).toBeGreaterThanOrEqual(1);
        for (const w of r.botPicks) expect(canFormFromRack(w, r.letters)).toBe(true);
      });
    }
  }
});
