import { describe, it, expect } from 'vitest';
import { validateReviewBatch, MAX_REVIEW_BATCH } from '../review';

function item(over: Record<string, unknown> = {}) {
  return { puzzleId: 'he-o-006', language: 'he', word1: 'כלב', word2: 'תיכון', bridge: 'ים', verdict: 'good', ...over };
}

describe('validateReviewBatch — admin puzzle-review bulk upsert gate', () => {
  it('accepts a well-formed batch and normalizes', () => {
    const r = validateReviewBatch({ verdicts: [item(), item({ puzzleId: 'en-o-001', language: 'en', verdict: 'bad', note: 'forced' })] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.verdicts).toHaveLength(2);
      expect(r.verdicts[1].verdict).toBe('bad');
      expect(r.verdicts[1].note).toBe('forced');
    }
  });

  it('rejects a non-array / empty batch', () => {
    expect(validateReviewBatch({}).ok).toBe(false);
    expect(validateReviewBatch({ verdicts: [] }).ok).toBe(false);
    expect(validateReviewBatch(null).ok).toBe(false);
  });

  it('rejects an invalid verdict value', () => {
    expect(validateReviewBatch({ verdicts: [item({ verdict: 'maybe' })] }).ok).toBe(false);
  });

  it('rejects an unknown language', () => {
    expect(validateReviewBatch({ verdicts: [item({ language: 'fr' })] }).ok).toBe(false);
  });

  it('rejects items missing required fields', () => {
    expect(validateReviewBatch({ verdicts: [item({ puzzleId: '' })] }).ok).toBe(false);
    expect(validateReviewBatch({ verdicts: [item({ bridge: '' })] }).ok).toBe(false);
  });

  it('rejects an over-large batch', () => {
    const big = Array.from({ length: MAX_REVIEW_BATCH + 1 }, (_, i) => item({ puzzleId: `he-o-${i}` }));
    expect(validateReviewBatch({ verdicts: big }).ok).toBe(false);
  });

  it('drops a too-long note rather than failing the whole item (clamps)', () => {
    const r = validateReviewBatch({ verdicts: [item({ note: 'x'.repeat(2000) })] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.verdicts[0].note!.length).toBeLessThanOrEqual(500);
  });
});
