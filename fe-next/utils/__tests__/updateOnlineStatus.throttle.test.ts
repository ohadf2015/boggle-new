/**
 * Teacher who returns without bumping last_seen_at: the layout ping must reuse
 * updateOnlineStatus's existing module throttle, so two navigations inside the
 * window produce one profiles write.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('updateOnlineStatus throttle preserved for teacher presence', () => {
  beforeEach(() => {
    update.mockClear();
    eq.mockClear();
  });

  it('two pings within the window yield one profiles.last_seen_at update', async () => {
    await updateOnlineStatus('teacher-1');
    await updateOnlineStatus('teacher-1');

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toEqual(
      expect.objectContaining({ last_seen_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith('id', 'teacher-1');
  });
});
