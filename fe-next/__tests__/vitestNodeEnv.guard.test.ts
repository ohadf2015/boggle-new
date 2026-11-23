import { describe, it, expect } from 'vitest';

// Vitest silently ignores config keys it dropped (environmentMatchGlobs in v4), which once
// put every logic test in happy-dom and tripled CI time without failing anything.
describe('vitest node project', () => {
  it('runs files under the node globs without a DOM', () => {
    expect(typeof window).toBe('undefined');
  });
});
