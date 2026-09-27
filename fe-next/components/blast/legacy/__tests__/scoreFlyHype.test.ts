import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pickHypePrefix, HYPE_PREFIXES_TIER2, HYPE_PREFIXES_TIER3 } from '../scoreFlyHype';

describe('pickHypePrefix', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random');
  });
  afterEach(() => {
    (Math.random as ReturnType<typeof vi.spyOn>).mockRestore();
  });

  it('returns empty string for tier 1 (keep small wins quiet)', () => {
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValue(0.01);
    expect(pickHypePrefix(1)).toBe('');
  });

  it('returns empty string most of the time on tier 2 (subtle, ~30% rate)', () => {
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValue(0.5);
    expect(pickHypePrefix(2)).toBe('');
  });

  it('returns a tier 2 prefix on a low roll', () => {
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValueOnce(0.1).mockReturnValueOnce(0);
    const out = pickHypePrefix(2);
    expect(HYPE_PREFIXES_TIER2).toContain(out);
  });

  it('returns a tier 3 prefix on a low roll (richer pool)', () => {
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValueOnce(0.1).mockReturnValueOnce(0);
    const out = pickHypePrefix(3);
    expect(HYPE_PREFIXES_TIER3).toContain(out);
  });

  it('tier 3 prefixes are distinct from tier 2 (no overlap, more celebratory)', () => {
    const overlap = HYPE_PREFIXES_TIER3.filter(p => HYPE_PREFIXES_TIER2.includes(p));
    expect(overlap).toEqual([]);
  });
});
