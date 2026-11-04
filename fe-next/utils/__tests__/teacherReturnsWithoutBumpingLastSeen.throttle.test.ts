/**
 * Measurement-gap regression (audit 2026-10-31).
 *
 * A teacher who returns without bumping last_seen_at is pinged from the teacher
 * layout via updateOnlineStatus. Two pings inside that window are one profiles
 * write. The window is 90s — under the 5-minute online threshold — not a second gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ONLINE_STATUS_MIN_WRITE_INTERVAL_MS } from '../onlineStatusThrottle';

const eq = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const update = vi.hoisted(() => vi.fn(() => ({ eq })));

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/utils/supabase/loadClient', () => ({
  loadSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ update }),
  }),
}));

import { updateOnlineStatus } from '../friendsHeadToHead';

describe('teacher who returns without bumping last_seen_at', () => {
  beforeEach(() => {
    update.mockClear();
    eq.mockClear();
  });

  it('two pings within the window yield one profiles update', async () => {
    expect(ONLINE_STATUS_MIN_WRITE_INTERVAL_MS).toBe(90_000);
    expect(ONLINE_STATUS_MIN_WRITE_INTERVAL_MS).toBeLessThan(5 * 60 * 1000);

    await updateOnlineStatus('teacher-1');
    await updateOnlineStatus('teacher-1');

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toEqual(
      expect.objectContaining({ last_seen_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'teacher-1');
  });
});
