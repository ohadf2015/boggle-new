import { describe, it, expect } from 'vitest';
import { electHost } from '../election';

describe('host election', () => {
  it('picks the lexicographically highest stable player ID', () => {
    expect(electHost(['p1', 'p9', 'p3'])).toBe('p9');
    expect(electHost(['abc', 'abd', 'aaa'])).toBe('abd');
  });

  it('is deterministic regardless of input order (every peer agrees)', () => {
    const ids = ['zeta', 'alpha', 'mu'];
    const a = electHost([...ids]);
    const b = electHost([...ids].reverse());
    expect(a).toBe(b);
    expect(a).toBe('zeta');
  });

  it('returns the sole peer when only one is connected', () => {
    expect(electHost(['only'])).toBe('only');
  });

  it('throws on an empty peer set (caller must guard)', () => {
    expect(() => electHost([])).toThrow();
  });
});
