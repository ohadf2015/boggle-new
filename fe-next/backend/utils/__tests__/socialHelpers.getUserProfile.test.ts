import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const getCached = vi.fn();
const cacheProfile = vi.fn();
const single = vi.fn();

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single }),
      }),
    }),
  }),
}));

vi.mock('../../redis', () => ({
  getCachedUserProfile: (...args: unknown[]) => getCached(...args),
  cacheUserProfile: (...args: unknown[]) => cacheProfile(...args),
}));

vi.mock('../logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { asCustomAvatar, getUserProfile } from '../socialHelpers';

describe('asCustomAvatar', () => {
  it('accepts a built avatar and rejects junk', () => {
    expect(asCustomAvatar(DEFAULT_AVATAR_CONFIG)).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(asCustomAvatar({ hair: 'spiky' })).toBeUndefined();
    expect(asCustomAvatar(null)).toBeUndefined();
  });
});

describe('getUserProfile — built avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes avatar_config as customAvatar and caches it', async () => {
    getCached.mockResolvedValue(null);
    single.mockResolvedValue({
      data: {
        username: 'milo',
        display_name: 'Milo',
        avatar_emoji: '😊',
        avatar_color: '#4F46E5',
        avatar_image: null,
        avatar_config: DEFAULT_AVATAR_CONFIG,
        last_seen_at: new Date().toISOString(),
      },
    });

    const profile = await getUserProfile('user-milo');
    expect(profile?.avatar.customAvatar).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(cacheProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-milo',
        username: 'milo',
        avatarConfig: DEFAULT_AVATAR_CONFIG,
      }),
    );
  });

  it('returns customAvatar from a fresh cache that stored avatarConfig', async () => {
    getCached.mockResolvedValue({
      userId: 'user-milo',
      username: 'milo',
      displayName: 'Milo',
      avatarEmoji: '😊',
      avatarColor: '#4F46E5',
      avatarImage: null,
      avatarConfig: DEFAULT_AVATAR_CONFIG,
      lastSeenAt: new Date().toISOString(),
    });

    const profile = await getUserProfile('user-milo');
    expect(single).not.toHaveBeenCalled();
    expect(profile?.avatar.customAvatar).toEqual(DEFAULT_AVATAR_CONFIG);
  });

  it('refetches when the cache predates avatarConfig so a built face is not dropped', async () => {
    getCached.mockResolvedValue({
      userId: 'user-milo',
      username: 'milo',
      displayName: 'Milo',
      avatarEmoji: '😊',
      avatarColor: '#4F46E5',
      avatarImage: null,
      lastSeenAt: new Date().toISOString(),
    });
    single.mockResolvedValue({
      data: {
        username: 'milo',
        display_name: 'Milo',
        avatar_emoji: '😊',
        avatar_color: '#4F46E5',
        avatar_image: null,
        avatar_config: DEFAULT_AVATAR_CONFIG,
        last_seen_at: new Date().toISOString(),
      },
    });

    const profile = await getUserProfile('user-milo');
    expect(single).toHaveBeenCalled();
    expect(profile?.avatar.customAvatar).toEqual(DEFAULT_AVATAR_CONFIG);
  });
});
