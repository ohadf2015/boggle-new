import { describe, it, expect } from 'vitest';
import { computeAvatarSeedHash } from '../configHash';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

describe('computeAvatarSeedHash (shared)', () => {
  it('changes when hair changes but colors stay the same', () => {
    const a = computeAvatarSeedHash({ ...DEFAULT_AVATAR_CONFIG, hair: 'bob' });
    const b = computeAvatarSeedHash({ ...DEFAULT_AVATAR_CONFIG, hair: 'spiky' });
    expect(a).not.toBe(b);
  });

  it('matches glowUpSeed re-export', async () => {
    const { computeAvatarSeedHash: fromGlow } = await import('../glowUpSeed');
    expect(fromGlow(DEFAULT_AVATAR_CONFIG)).toBe(computeAvatarSeedHash(DEFAULT_AVATAR_CONFIG));
  });
});
