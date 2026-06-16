/**
 * pickSignupCustomAvatar — on new-account creation, prefer the avatar the user
 * crafted during FTUE (persisted to localStorage) over a fresh random one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/profileStorage', () => ({
  getStoredCustomAvatar: vi.fn(),
}));

import { getStoredCustomAvatar } from '@/utils/profileStorage';
import { pickSignupCustomAvatar } from '@/contexts/auth/signupAvatar';

const mockGetStored = vi.mocked(getStoredCustomAvatar);

describe('pickSignupCustomAvatar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the FTUE-crafted avatar when one is stored', () => {
    const crafted = { face: 'craftedFace' } as never;
    mockGetStored.mockReturnValue(crafted);

    expect(pickSignupCustomAvatar()).toBe(crafted);
  });

  it('falls back to a generated random avatar when none stored', () => {
    mockGetStored.mockReturnValue(null);

    const result = pickSignupCustomAvatar();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('object');
  });
});
