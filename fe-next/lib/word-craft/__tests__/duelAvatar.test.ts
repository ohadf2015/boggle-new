import { describe, it, expect } from 'vitest';
import { encodeAvatar, decodeAvatar } from '../duelAvatar';
import { DEFAULT_AVATAR_CONFIG, getSeededAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

describe('duelAvatar codec', () => {
  it('round-trips the default avatar config', () => {
    const token = encodeAvatar(DEFAULT_AVATAR_CONFIG);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(decodeAvatar(token)).toEqual(DEFAULT_AVATAR_CONFIG);
  });

  it('round-trips seeded configs (all optional fields populated)', () => {
    for (const seed of [1, 42, 9999, 123456]) {
      const cfg = getSeededAvatarConfig(seed);
      expect(decodeAvatar(encodeAvatar(cfg))).toEqual(cfg);
    }
  });

  it('produces a URL-safe token (no +, /, = or whitespace)', () => {
    const token = encodeAvatar(getSeededAvatarConfig(7));
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('survives a real URLSearchParams round-trip', () => {
    const cfg = getSeededAvatarConfig(2024);
    const params = new URLSearchParams();
    params.set('da', encodeAvatar(cfg));
    const parsed = new URLSearchParams(params.toString());
    expect(decodeAvatar(parsed.get('da'))).toEqual(cfg);
  });

  it('returns null for null/empty/garbage input', () => {
    expect(decodeAvatar(null)).toBeNull();
    expect(decodeAvatar(undefined)).toBeNull();
    expect(decodeAvatar('')).toBeNull();
    expect(decodeAvatar('not-base64-$$$')).toBeNull();
    expect(decodeAvatar('YWJjZА')).toBeNull(); // valid-ish base64 but not avatar JSON
  });

  it('returns null when the JSON is valid but fails the avatar schema', () => {
    const token = encodeAvatar({ hello: 'world' } as unknown as CustomAvatarConfig);
    expect(decodeAvatar(token)).toBeNull();
  });

  it('rejects an oversized token (abuse guard) without throwing', () => {
    const huge = 'A'.repeat(5000);
    expect(decodeAvatar(huge)).toBeNull();
  });
});
