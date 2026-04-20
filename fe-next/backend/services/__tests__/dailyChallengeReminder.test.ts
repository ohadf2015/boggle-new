/**
 * TDD tests: daily challenge push reminder
 * RED phase — verifies sendDailyChallengeReminders queries uncompleted challenges
 * and sends push notifications to eligible users.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => {
  const from = vi.fn();
  return { from };
});

const mockSendToUsers = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));
const mockGetSupabase = vi.hoisted(() => vi.fn(() => mockSupabase));

vi.mock('../../modules/supabase', () => ({
  isSupabaseConfigured: mockIsSupabaseConfigured,
  getSupabase: mockGetSupabase,
}));

vi.mock('../../modules/fcmService', () => ({
  sendToUsers: mockSendToUsers,
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendDailyChallengeReminders } from '../dailyChallengeReminder';

function makeChainFor(data: unknown[], error: null | { message: string } = null) {
  let eqCalls = 0;
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockImplementation(() => {
    eqCalls++;
    return eqCalls >= 2 ? Promise.resolve({ data, error }) : chain;
  });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
  mockGetSupabase.mockReturnValue(mockSupabase);
});

describe('sendDailyChallengeReminders', () => {
  it('calls sendToUsers with distinct player_ids who have uncompleted challenges', async () => {
    const chain = makeChainFor([
      { player_id: 'user-1' },
      { player_id: 'user-2' },
      { player_id: 'user-1' }, // duplicate — should be deduped
    ]);
    mockSupabase.from.mockReturnValue(chain);

    await sendDailyChallengeReminders();

    expect(mockSendToUsers).toHaveBeenCalledOnce();
    const [userIds, payload] = mockSendToUsers.mock.calls[0];
    expect(userIds).toHaveLength(2);
    expect(userIds).toContain('user-1');
    expect(userIds).toContain('user-2');
    expect(payload.title).toBeTruthy();
    expect(payload.body).toBeTruthy();
    expect(payload.data?.deepLink).toBe('/challenges');
  });

  it('does NOT call sendToUsers when no uncompleted challenges', async () => {
    const chain = makeChainFor([]);
    mockSupabase.from.mockReturnValue(chain);

    await sendDailyChallengeReminders();

    expect(mockSendToUsers).not.toHaveBeenCalled();
  });

  it('does NOT call sendToUsers when Supabase not configured', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await sendDailyChallengeReminders();

    expect(mockSendToUsers).not.toHaveBeenCalled();
  });

  it('does not throw when Supabase returns an error', async () => {
    const chain = makeChainFor([], { message: 'db error' });
    mockSupabase.from.mockReturnValue(chain);

    await expect(sendDailyChallengeReminders()).resolves.not.toThrow();
  });

  it('queries daily_challenges table for today with completed=false', async () => {
    const chain = makeChainFor([]);
    mockSupabase.from.mockReturnValue(chain);

    await sendDailyChallengeReminders();

    expect(mockSupabase.from).toHaveBeenCalledWith('daily_challenges');
    expect(chain.eq).toHaveBeenCalledWith('completed', false);
    expect(chain.eq).toHaveBeenCalledWith('challenge_date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});
