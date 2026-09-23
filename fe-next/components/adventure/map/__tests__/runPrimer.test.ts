import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RUN_PRIMER_KEY, takeRunPrimer } from '../runPrimer';

/**
 * The "how a run works" sheet opens by itself exactly once. The marker is
 * written when it is SHOWN (rules/60 Class 1): a reload before closing it must
 * not pop it again.
 */
describe('takeRunPrimer', () => {
  beforeEach(() => window.localStorage.clear());

  it('given a first visit, when asked, then it shows once and marks itself seen immediately', () => {
    expect(takeRunPrimer()).toBe(true);
    expect(window.localStorage.getItem(RUN_PRIMER_KEY)).not.toBeNull();
    expect(takeRunPrimer()).toBe(false);
  });

  it('given storage that throws (private mode), when asked, then it stays closed rather than nagging every visit', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    try {
      expect(takeRunPrimer()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
