import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const publishLevelUp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/revealTrigger', async (orig) => ({
  ...(await orig<typeof import('@/lib/avatar/revealTrigger')>()),
  publishLevelUp,
}));

import { recordConnectionsXp } from '../recordConnectionsXp';
import { renderHook } from '@testing-library/react';
import { resetResultsXp, useResultsXp } from '@/components/progression/resultsXpStore';

function respond(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })));
}

describe('recordConnectionsXp', () => {
  beforeEach(() => publishLevelUp.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it('posts the solve XP to record-xp', async () => {
    respond({ success: true, xpEarned: 20, oldLevel: 3, newLevel: 3, leveledUp: false });
    await recordConnectionsXp(20);
    expect(fetch).toHaveBeenCalledWith('/api/education/record-xp', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ xpAmount: 20, lessonId: 'connections-game', activityType: 'connections' }),
    }));
  });

  it('Given the solve crossed a level, Then the level-up is published', async () => {
    respond({ success: true, xpEarned: 20, oldLevel: 3, newLevel: 4, leveledUp: true });
    await recordConnectionsXp(20);
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 3, newLevel: 4 }, 'connections');
  });

  it('Given the level did not change, Then nothing is published', async () => {
    respond({ success: true, xpEarned: 20, oldLevel: 4, newLevel: 4, leveledUp: false });
    await recordConnectionsXp(20);
    expect(publishLevelUp).not.toHaveBeenCalled();
  });

  it('swallows network and HTTP failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(recordConnectionsXp(20)).resolves.toBeUndefined();
    respond({ error: 'x' }, false);
    await expect(recordConnectionsXp(20)).resolves.toBeUndefined();
  });

  it('Given the server granted XP, Then the Connections results meter gets it', async () => {
    resetResultsXp();
    respond({ success: true, xpEarned: 20, newTotalXp: 510, oldLevel: 3, newLevel: 3, leveledUp: false });
    await recordConnectionsXp(20);
    const { result } = renderHook(() => useResultsXp('daily:connections'));
    expect(result.current).toEqual({ gained: 20, total: 510 });
  });
});
