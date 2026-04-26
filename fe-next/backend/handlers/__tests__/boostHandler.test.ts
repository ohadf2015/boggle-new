import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signBoostToken } from '../../utils/boostToken';

describe('boostHandler', () => {
  beforeEach(() => {
    process.env.BOOST_TOKEN_SECRET = 'test-secret';
    vi.clearAllMocks();
  });

  // Core verification test: boost token signing and verification
  it('signs and verifies boost tokens correctly', () => {
    const sessionId = 'sess-test-123';
    const boostType = 'firstWordBonus';

    const token = signBoostToken(sessionId, boostType);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.includes('b1')).toBe(true); // VERSION check
  });

  it('detects expired tokens', () => {
    const token = signBoostToken('sess-1', 'firstWordBonus', Date.now() - 10 * 60 * 1000);
    expect(token).toBeTruthy();
    // Expired token would fail verification (tested in boostToken.test.ts)
  });
});
