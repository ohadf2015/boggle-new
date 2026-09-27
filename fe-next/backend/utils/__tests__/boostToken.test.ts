import { describe, it, expect, beforeEach } from 'vitest';
import { signBoostToken, verifyBoostToken, BOOST_TOKEN_TTL_MS } from '../boostToken';

beforeEach(() => {
  process.env.BOOST_TOKEN_SECRET = 'test-secret-do-not-use-in-prod';
});

describe('boost token', () => {
  it('signs then verifies roundtrip', () => {
    const token = signBoostToken('sess-1', 'hint');
    const result = verifyBoostToken(token, 'sess-1');
    expect(result.valid).toBe(true);
    expect(result.boostType).toBe('hint');
  });

  it('rejects tampered signature', () => {
    const token = signBoostToken('sess-1', 'hint');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyBoostToken(tampered, 'sess-1').valid).toBe(false);
  });

  it('rejects mismatched sessionId', () => {
    const token = signBoostToken('sess-1', 'hint');
    expect(verifyBoostToken(token, 'sess-2').valid).toBe(false);
  });

  it('rejects expired token', () => {
    const past = Date.now() - 1;
    const token = signBoostToken('sess-1', 'hint', past - BOOST_TOKEN_TTL_MS);
    expect(verifyBoostToken(token, 'sess-1').valid).toBe(false);
  });

  it('rejects malformed token', () => {
    expect(verifyBoostToken('garbage', 'sess-1').valid).toBe(false);
    expect(verifyBoostToken('b1.x.y', 'sess-1').valid).toBe(false);
  });

  it('throws if secret missing', () => {
    delete process.env.BOOST_TOKEN_SECRET;
    expect(() => signBoostToken('s', 'hint')).toThrow();
  });
});
