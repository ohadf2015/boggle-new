/**
 * Guard tests for sendChallenge — no self-challenge, no duplicate pending
 * challenge spam. The friend_challenges table has no app-visible unique
 * constraint, so a double-click / repeated invite would otherwise insert N
 * pending rows. The dup guard makes a repeat send a no-op success-shaped error.
 */
vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../friendsManager', () => ({
  __esModule: true,
  areFriends: vi.fn(),
}));
vi.mock('../supabaseServer', () => ({
  __esModule: true,
  getSupabase: vi.fn(),
}));
vi.mock('../../utils/socialHelpers', () => ({
  __esModule: true,
  broadcastToUser: vi.fn(),
}));
vi.mock('../pushNotificationTriggers', () => ({
  __esModule: true,
  notifyChallengeResult: vi.fn(),
}));

import { vi, type Mock } from 'vitest';
import { sendChallenge } from '../friendsChallenges';
import { areFriends } from '../friendsManager';
import { getSupabase } from '../supabaseServer';

const mockAreFriends = areFriends as unknown as Mock;
const mockGetSupabase = getSupabase as unknown as Mock;

const challengeData = {
  challengeId: 'ROOM01',
  challengeType: 'new_game' as const,
  gameSettings: { language: 'en', mode: 'classic' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendChallenge — self-challenge guard', () => {
  it('rejects challenging yourself with CANNOT_CHALLENGE_SELF, before any friendship/DB check', async () => {
    const result = await sendChallenge('user-a', 'user-a', challengeData);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CANNOT_CHALLENGE_SELF');
    expect(mockAreFriends).not.toHaveBeenCalled();
    expect(mockGetSupabase).not.toHaveBeenCalled();
  });
});

describe('sendChallenge — duplicate pending-challenge guard', () => {
  it('rejects a second pending challenge to the same friend with CHALLENGE_ALREADY_SENT', async () => {
    mockAreFriends.mockResolvedValue(true);
    // Chainable supabase stub: .from().select().eq().eq().eq().maybeSingle()
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'existing-pending' }, error: null });
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle,
      insert: vi.fn(() => chain),
      single: vi.fn(),
    };
    mockGetSupabase.mockReturnValue({ from: vi.fn(() => chain) });

    const result = await sendChallenge('user-a', 'user-b', challengeData);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CHALLENGE_ALREADY_SENT');
    // Must NOT insert a duplicate row.
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('inserts when no pending challenge exists yet', async () => {
    mockAreFriends.mockResolvedValue(true);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'new-id',
        challenge_type: 'new_game',
        challenge_id: 'ROOM01',
        message: undefined,
        created_at: '2026-06-18T00:00:00.000Z',
        expires_at: '2026-06-19T00:00:00.000Z',
      },
      error: null,
    });
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle,
      insert: vi.fn(() => chain),
      single: insertSingle,
    };
    mockGetSupabase.mockReturnValue({ from: vi.fn(() => chain) });

    const result = await sendChallenge('user-a', 'user-b', challengeData);

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledTimes(1);
  });
});
