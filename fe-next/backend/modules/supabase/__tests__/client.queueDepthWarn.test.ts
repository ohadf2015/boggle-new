import { describe, it, expect } from 'vitest';
import { shouldWarnQueueDepth } from '../client';

describe('shouldWarnQueueDepth', () => {
  it('stays quiet below the threshold', () => {
    expect(shouldWarnQueueDepth(9, 100_000, 0)).toBe(false);
  });

  it('warns once per minute while the queue stays deep', () => {
    expect(shouldWarnQueueDepth(10, 100_000, 0)).toBe(true);
    expect(shouldWarnQueueDepth(15, 100_000 + 59_999, 100_000)).toBe(false);
    expect(shouldWarnQueueDepth(15, 100_000 + 60_000, 100_000)).toBe(true);
  });
});
