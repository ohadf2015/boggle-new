import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const api = vi.hoisted(() => ({
  getFriends: vi.fn(),
  getPendingRequests: vi.fn(),
  getOutgoingRequests: vi.fn(),
  getPendingChallenges: vi.fn(),
  updateOnlineStatus: vi.fn(),
}));
vi.mock('@/utils/friends', () => api);

import {
  loadFriendsSnapshot,
  pingOnlineStatus,
  resetFriendsSnapshotForTests,
  SNAPSHOT_TTL_MS,
  FORCED_DEDUPE_MS,
} from './friendsSnapshot';

describe('friendsSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetFriendsSnapshotForTests();
    for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('given the tab bar and the header menu both load friends, then the four tables are fetched once', async () => {
    await Promise.all([loadFriendsSnapshot('u1'), loadFriendsSnapshot('u1')]);
    expect(api.getFriends).toHaveBeenCalledTimes(1);
    expect(api.getPendingChallenges).toHaveBeenCalledTimes(1);
  });

  it('given the snapshot went stale, then the next routine load fetches again', async () => {
    await loadFriendsSnapshot('u1');
    vi.advanceTimersByTime(SNAPSHOT_TTL_MS + 1);
    await loadFriendsSnapshot('u1');
    expect(api.getFriends).toHaveBeenCalledTimes(2);
  });

  it('given a friend action, then a forced load fetches fresh data even inside the TTL', async () => {
    await loadFriendsSnapshot('u1');
    vi.advanceTimersByTime(FORCED_DEDUPE_MS + 1);
    await loadFriendsSnapshot('u1', { force: true });
    expect(api.getFriends).toHaveBeenCalledTimes(2);
  });

  it('given one realtime event reaches every instance, then they share one forced fetch', async () => {
    await Promise.all([loadFriendsSnapshot('u1', { force: true }), loadFriendsSnapshot('u1', { force: true })]);
    expect(api.getFriends).toHaveBeenCalledTimes(1);
  });

  it('never serves another account its friends', async () => {
    await loadFriendsSnapshot('u1');
    await loadFriendsSnapshot('u2');
    expect(api.getFriends).toHaveBeenNthCalledWith(2, 'u2');
  });

  it('does not cache a failed fetch', async () => {
    api.getFriends.mockRejectedValueOnce(new Error('offline'));
    await expect(loadFriendsSnapshot('u1')).rejects.toThrow('offline');
    await loadFriendsSnapshot('u1');
    expect(api.getFriends).toHaveBeenCalledTimes(2);
  });

  it('pings online status at most once a minute across instances', () => {
    pingOnlineStatus('u1');
    pingOnlineStatus('u1');
    expect(api.updateOnlineStatus).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_001);
    pingOnlineStatus('u1');
    expect(api.updateOnlineStatus).toHaveBeenCalledTimes(2);
  });
});
