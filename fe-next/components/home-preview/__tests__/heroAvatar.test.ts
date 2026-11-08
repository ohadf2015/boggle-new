import { describe, it, expect, beforeEach } from 'vitest';
import { pickHeroAvatar } from '../heroAvatar';
import { rememberAccountAvatar, readAccountAvatar } from '@/utils/accountAvatarCache';
import { getRandomAvatarConfig } from '@/shared/types/customAvatar';

describe('pickHeroAvatar', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('given a guest, then the guest avatar shows', () => {
    const guest = getRandomAvatarConfig();
    expect(pickHeroAvatar(null, null, guest)).toEqual({ userId: 'guest', customAvatar: guest });
  });

  it('given a signed-in player whose profile is still loading and nothing cached, then the placeholder shows (no id-generated face)', () => {
    expect(pickHeroAvatar('user-1', null, getRandomAvatarConfig())).toBeNull();
  });

  it('given a signed-in player whose profile is still loading, then their avatar from last time shows at once', () => {
    const mine = getRandomAvatarConfig();
    rememberAccountAvatar('user-1', mine);
    expect(pickHeroAvatar('user-1', null, null)).toEqual({ userId: 'user-1', customAvatar: mine });
  });

  it('given another account was signed in on this device before, then its avatar is never shown', () => {
    rememberAccountAvatar('someone-else', getRandomAvatarConfig());
    expect(pickHeroAvatar('user-1', null, null)).toBeNull();
    expect(readAccountAvatar('user-1')).toBeNull();
  });

  it('given the profile answered, then the profile avatar wins over the cache', () => {
    const old = getRandomAvatarConfig();
    const current = getRandomAvatarConfig();
    rememberAccountAvatar('user-1', old);
    expect(pickHeroAvatar('user-1', { avatar_config: current }, null)).toEqual({ userId: 'user-1', customAvatar: current });
  });

  it('ignores a corrupt cache entry', () => {
    localStorage.setItem('lc_account_avatar', '{nope');
    expect(pickHeroAvatar('user-1', null, null)).toBeNull();
  });
});

describe('readLastAccountAvatar', () => {
  it('returns the last signed-in account avatar for the session-restoring moment', async () => {
    const { readLastAccountAvatar } = await import('@/utils/accountAvatarCache');
    localStorage.clear();
    expect(readLastAccountAvatar()).toBeNull();
    const mine = getRandomAvatarConfig();
    rememberAccountAvatar('user-9', mine);
    expect(readLastAccountAvatar()).toEqual({ userId: 'user-9', config: mine });
  });
});
