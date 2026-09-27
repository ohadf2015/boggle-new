import { describe, it, expect, vi } from 'vitest';
import { validateTripleAsync } from '../validator';
import type { AsyncFreqLookup } from '../frequencyApi';

const cfg = { minFreq: 10, locale: 'he' as const };

describe('validateTripleAsync', () => {
  it('passes when both async-resolved pairs exceed minFreq', async () => {
    const freq: AsyncFreqLookup = async (bg) =>
      bg === 'בית ספר' ? 500 : bg === 'ספר תורה' ? 120 : 0;
    const res = await validateTripleAsync(
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(true);
    expect(res.leftFreq).toBe(500);
    expect(res.rightFreq).toBe(120);
  });

  it('short-circuits on degenerate triples without calling backend', async () => {
    const freq = vi.fn(async () => 999);
    const res = await validateTripleAsync(
      { word1: 'ספר', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('degenerate');
    expect(freq).not.toHaveBeenCalled();
  });

  it('returns leftPairBelowThreshold when left under min', async () => {
    const freq: AsyncFreqLookup = async (bg) =>
      bg === 'בית ספר' ? 5 : bg === 'ספר תורה' ? 120 : 0;
    const res = await validateTripleAsync(
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
      freq,
      cfg,
    );
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('leftPairBelowThreshold');
  });

  it('normalizes whitespace before lookup', async () => {
    const seen: string[] = [];
    const freq: AsyncFreqLookup = async (bg) => {
      seen.push(bg);
      return 100;
    };
    await validateTripleAsync(
      { word1: '  בית ', bridge: ' ספר ', word2: ' תורה ' },
      freq,
      cfg,
    );
    expect(seen).toEqual(['בית ספר', 'ספר תורה']);
  });
});
