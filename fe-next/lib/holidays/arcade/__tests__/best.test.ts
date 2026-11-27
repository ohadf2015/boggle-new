// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { closeness, readBest, recordBest } from '../best';

beforeEach(() => localStorage.clear());

describe('arcade best score', () => {
  it('Given no earlier run, then the first score is a new best', () => {
    expect(readBest('latke')).toBe(0);
    expect(recordBest('latke', 500)).toEqual({ best: 500, previous: 0, verdict: 'new' });
    expect(readBest('latke')).toBe(500);
  });

  it('Given a run within 10% under the best, then it is so close and the best stays', () => {
    recordBest('dash', 1000);
    expect(recordBest('dash', 920)).toEqual({ best: 1000, previous: 1000, verdict: 'close' });
    expect(recordBest('dash', 899)).toEqual({ best: 1000, previous: 1000, verdict: null });
    expect(readBest('dash')).toBe(1000);
  });

  it('Given a zero score, then it is neither a best nor close', () => {
    expect(closeness(0, 0)).toBeNull();
    expect(closeness(0, 10)).toBeNull();
  });

  it('Given storage that throws, then the run still gets a verdict and nothing crashes', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(recordBest('splat', 300)).toEqual({ best: 300, previous: 0, verdict: 'new' });
    spy.mockRestore();
    vi.restoreAllMocks();
  });

  it('Given games keep separate bests', () => {
    recordBest('latke', 900);
    expect(readBest('catch')).toBe(0);
  });

  it('Given a run that exactly matches the best, then it is a tie, not "0 short"', () => {
    recordBest('presents', 800);
    expect(recordBest('presents', 800).verdict).toBe('tie');
  });
});
