/**
 * TDD — ensemble verdict combining deterministic authorities + LLM judges.
 * Council rule: deterministic authority dominates; the LLM dual-judge settles
 * the ambiguous tail; offensive is a hard block. Never promote on one LLM vote
 * alone or low-frequency LLM-only candidates.
 */
import { describe, it, expect } from 'vitest';
import { ensembleVerdict } from '../ensemble';

describe('ensembleVerdict', () => {
  it('hard-rejects offensive regardless of every other signal', () => {
    const v = ensembleVerdict({
      deterministic: 'verified',
      judges: [{ valid: true, confidence: 1 }, { valid: true, confidence: 1 }],
      freqOk: true,
      offensive: true,
    });
    expect(v.decision).toBe('reject');
    expect(v.reason).toBe('offensive');
  });

  it('promotes when a deterministic authority verifies', () => {
    expect(ensembleVerdict({ deterministic: 'verified' }).decision).toBe('promote');
  });

  it('rejects when a deterministic authority rejects', () => {
    expect(
      ensembleVerdict({ deterministic: 'rejected', judges: [{ valid: true, confidence: 1 }] }).decision,
    ).toBe('reject');
  });

  it('promotes on a confident dual-judge agreement when frequency is ok and nothing rejects', () => {
    const v = ensembleVerdict({
      deterministic: 'not_found',
      judges: [{ valid: true, confidence: 0.9 }, { valid: true, confidence: 0.8 }],
      freqOk: true,
    });
    expect(v.decision).toBe('promote');
  });

  it('reviews (does not promote) on a single judge vote', () => {
    expect(
      ensembleVerdict({ judges: [{ valid: true, confidence: 0.95 }], freqOk: true }).decision,
    ).toBe('review');
  });

  it('rejects when both judges say invalid', () => {
    expect(
      ensembleVerdict({ judges: [{ valid: false, confidence: 0.9 }, { valid: false, confidence: 0.9 }] }).decision,
    ).toBe('reject');
  });

  it('ignores low-confidence judge votes (below threshold)', () => {
    // two "valid" judges but both under 0.75 → not counted as support → review
    const v = ensembleVerdict({
      judges: [{ valid: true, confidence: 0.5 }, { valid: true, confidence: 0.6 }],
      freqOk: true,
    });
    expect(v.decision).toBe('review');
  });

  it('will not promote LLM-only candidates when frequency is explicitly not ok', () => {
    const v = ensembleVerdict({
      judges: [{ valid: true, confidence: 0.9 }, { valid: true, confidence: 0.9 }],
      freqOk: false,
    });
    expect(v.decision).toBe('review');
  });
});
