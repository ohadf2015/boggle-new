/**
 * TDD — dictionary quality metrics + the monotonic-quality gate.
 * Cheap to compute; makes "auto-improve" falsifiable (recall@gold) and safe
 * (qualityGate refuses a batch that would regress precision).
 */
import { describe, it, expect } from 'vitest';
import { computeRecallAtGold, computePrecisionFromSample, qualityGate } from '../metrics';

describe('computeRecallAtGold', () => {
  it('measures the fraction of gold-valid words present in the dictionary', () => {
    const has = (w: string) => w === 'cat' || w === 'dog';
    const r = computeRecallAtGold(has, ['cat', 'dog', 'bird'], 'en');
    expect(r.total).toBe(3);
    expect(r.present).toBe(2);
    expect(r.recall).toBeCloseTo(2 / 3, 5);
  });

  it('normalizes gold words before lookup (Spanish accents fold)', () => {
    const has = (w: string) => w === 'cafe'; // stored folded
    const r = computeRecallAtGold(has, ['café'], 'es');
    expect(r.recall).toBe(1);
  });

  it('returns recall 0 (not NaN) for an empty gold set', () => {
    const r = computeRecallAtGold(() => true, [], 'en');
    expect(r.recall).toBe(0);
    expect(r.total).toBe(0);
  });
});

describe('computePrecisionFromSample', () => {
  it('measures the fraction of accepted-sample words that still hold up', () => {
    const p = computePrecisionFromSample([
      { word: 'a', holds: true },
      { word: 'b', holds: false },
      { word: 'c', holds: true },
    ]);
    expect(p.total).toBe(3);
    expect(p.held).toBe(2);
    expect(p.precision).toBeCloseTo(2 / 3, 5);
  });

  it('returns precision 1 (vacuous) for an empty sample', () => {
    expect(computePrecisionFromSample([]).precision).toBe(1);
  });
});

describe('qualityGate', () => {
  it('passes when there is no prior baseline', () => {
    expect(qualityGate(null, 0.8).ok).toBe(true);
  });

  it('passes when next stays within tolerance of the baseline', () => {
    expect(qualityGate(0.9, 0.89, 0.02).ok).toBe(true);
  });

  it('fails when next regresses beyond tolerance', () => {
    const g = qualityGate(0.9, 0.8, 0.02);
    expect(g.ok).toBe(false);
    expect(g.reason).toMatch(/regress/i);
  });

  it('passes when next improves', () => {
    expect(qualityGate(0.8, 0.95, 0.02).ok).toBe(true);
  });
});
