/**
 * TDD — deterministic stratified audit sampler.
 * Picks a bounded, reproducible sample of currently-accepted words to re-verify
 * for false-accepts. Deterministic (seeded) so a run is reproducible in tests
 * and across the cron/Workflow tiers.
 */
import { describe, it, expect } from 'vitest';
import { selectAuditSample } from '../audit';

const WORDS = Array.from({ length: 100 }, (_, i) => `w${i}`.padEnd(2 + (i % 7), 'x'));

describe('selectAuditSample', () => {
  it('is deterministic for a given seed', () => {
    const a = selectAuditSample(WORDS, { n: 10, seed: 42 });
    const b = selectAuditSample(WORDS, { n: 10, seed: 42 });
    expect(a).toEqual(b);
  });

  it('changes selection with a different seed', () => {
    const a = selectAuditSample(WORDS, { n: 10, seed: 1 });
    const b = selectAuditSample(WORDS, { n: 10, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('returns exactly n items (or all when n exceeds the pool)', () => {
    expect(selectAuditSample(WORDS, { n: 10, seed: 1 })).toHaveLength(10);
    expect(selectAuditSample(WORDS, { n: 1000, seed: 1 })).toHaveLength(WORDS.length);
  });

  it('only returns words from the input pool, with no duplicates', () => {
    const s = selectAuditSample(WORDS, { n: 25, seed: 7 });
    expect(new Set(s).size).toBe(s.length);
    expect(s.every((w) => WORDS.includes(w))).toBe(true);
  });

  it('covers multiple length strata when stratified', () => {
    const s = selectAuditSample(WORDS, { n: 14, seed: 3, stratifyByLength: true });
    const lengths = new Set(s.map((w) => w.length));
    expect(lengths.size).toBeGreaterThan(1);
  });

  it('handles an empty pool', () => {
    expect(selectAuditSample([], { n: 5, seed: 1 })).toEqual([]);
  });
});
