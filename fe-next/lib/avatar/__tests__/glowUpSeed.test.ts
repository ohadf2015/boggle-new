import { describe, it, expect } from 'vitest';
import { computeAvatarSeedHash, isRenderStale } from '../glowUpSeed';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

describe('computeAvatarSeedHash', () => {
  it('is deterministic for the same config', () => {
    expect(computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG)).toBe(
      computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG),
    );
  });

  it('is independent of key insertion order', () => {
    const a = { ...DEFAULT_AVATAR_CONFIG };
    const reordered = {
      shirtColor: DEFAULT_AVATAR_CONFIG.shirtColor,
      base: DEFAULT_AVATAR_CONFIG.base,
      ...DEFAULT_AVATAR_CONFIG,
    };
    expect(computeAvatarSeedHash(a)).toBe(computeAvatarSeedHash(reordered));
  });

  it('changes when a visual field changes', () => {
    const base = computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG);
    const changed = computeAvatarSeedHash({
      ...DEFAULT_AVATAR_CONFIG,
      hairColor: '#FF1493',
    });
    expect(changed).not.toBe(base);
  });

  it('returns a short non-empty stable string', () => {
    const h = computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG);
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
    expect(h.length).toBeLessThanOrEqual(32);
  });
});

describe('isRenderStale', () => {
  it('is fresh when the stored hash matches the current config', () => {
    const hash = computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG);
    expect(isRenderStale(DEFAULT_AVATAR_CONFIG, hash)).toBe(false);
  });

  it('is stale when the config has been re-customized', () => {
    const oldHash = computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG);
    const newConfig = { ...DEFAULT_AVATAR_CONFIG, eyes: 'wink' as const };
    expect(isRenderStale(newConfig, oldHash)).toBe(true);
  });

  it('is stale when no hash was ever stored', () => {
    expect(isRenderStale(DEFAULT_AVATAR_CONFIG, null)).toBe(true);
    expect(isRenderStale(DEFAULT_AVATAR_CONFIG, undefined)).toBe(true);
    expect(isRenderStale(DEFAULT_AVATAR_CONFIG, '')).toBe(true);
  });
});
