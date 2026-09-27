import { describe, it, expect } from 'vitest';
import { parseBlockPayload, BLOCK_TYPES } from '../parseBlockPayload';

describe('parseBlockPayload', () => {
  it('accepts a valid permanent block and trims the value', () => {
    const r = parseBlockPayload({ blockType: 'auth_user', value: '  user-1  ', reason: 'cheating' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.block_type).toBe('auth_user');
      expect(r.data.value).toBe('user-1');
      expect(r.data.reason).toBe('cheating');
      expect(r.data.expires_at).toBeNull();
    }
  });

  it('rejects an unknown block type', () => {
    const r = parseBlockPayload({ blockType: 'email', value: 'x' });
    expect(r.ok).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(parseBlockPayload({ blockType: 'ip', value: '   ' }).ok).toBe(false);
    expect(parseBlockPayload({ blockType: 'ip' }).ok).toBe(false);
  });

  it('rejects an over-long value', () => {
    expect(parseBlockPayload({ blockType: 'ip', value: 'x'.repeat(256) }).ok).toBe(false);
  });

  it('normalizes an empty reason to null', () => {
    const r = parseBlockPayload({ blockType: 'ip', value: '1.2.3.4', reason: '   ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.reason).toBeNull();
  });

  it('computes expires_at from a positive durationMs', () => {
    const before = Date.now();
    const r = parseBlockPayload({ blockType: 'ip', value: '1.2.3.4', durationMs: 3600_000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ts = new Date(r.data.expires_at as string).getTime();
      expect(ts).toBeGreaterThanOrEqual(before + 3600_000 - 1000);
    }
  });

  it('accepts a future expiresAt ISO string', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const r = parseBlockPayload({ blockType: 'guest_session', value: 'sess', expiresAt: future });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.expires_at).toBe(future);
  });

  it('rejects an expiresAt in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(parseBlockPayload({ blockType: 'ip', value: '1.2.3.4', expiresAt: past }).ok).toBe(false);
  });

  it('rejects an unparseable expiresAt', () => {
    expect(parseBlockPayload({ blockType: 'ip', value: '1.2.3.4', expiresAt: 'not-a-date' }).ok).toBe(false);
  });

  it('exposes the three supported block types', () => {
    expect([...BLOCK_TYPES]).toEqual(['auth_user', 'guest_session', 'ip']);
  });
});
