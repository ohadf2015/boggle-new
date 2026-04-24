import { describe, it, expect } from 'vitest';
import { validateTriple, type FreqLookup, type ValidationConfig } from '../validator';

const cfg: ValidationConfig = { minFreq: 10, locale: 'he' };

const freqFrom = (pairs: Record<string, number>): FreqLookup => (bigram) =>
  pairs[bigram] ?? 0;

describe('validateTriple', () => {
  it('passes when both pairs exceed minFreq', () => {
    const freq = freqFrom({ 'בית ספר': 500, 'ספר תורה': 120 });
    const res = validateTriple(
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(true);
    expect(res.leftFreq).toBe(500);
    expect(res.rightFreq).toBe(120);
  });

  it('fails when left pair below threshold', () => {
    const freq = freqFrom({ 'בית ספר': 5, 'ספר תורה': 120 });
    const res = validateTriple(
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('leftPairBelowThreshold');
  });

  it('fails when right pair below threshold', () => {
    const freq = freqFrom({ 'בית ספר': 500, 'ספר תורה': 2 });
    const res = validateTriple(
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('rightPairBelowThreshold');
  });

  it('fails when either side is the same word (degenerate)', () => {
    const freq = freqFrom({ 'ספר ספר': 999, 'ספר תורה': 999 });
    const res = validateTriple(
      { word1: 'ספר', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('degenerate');
  });

  it('normalizes whitespace in bigram key lookup', () => {
    const freq: FreqLookup = (bg) => (bg === 'בית ספר' ? 100 : bg === 'ספר תורה' ? 100 : 0);
    const res = validateTriple(
      { word1: '  בית  ', bridge: ' ספר ', word2: ' תורה ' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(true);
  });
});
