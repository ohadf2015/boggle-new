/**
 * Daily-challenge push reminder recipient selection tests
 */

import { vi } from 'vitest';
import { getDailyChallengePushRecipients } from '../pushReminders';

// Build a chainable query builder mock
function makeBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'is', 'in', 'gte', 'lte', 'not'];
  methods.forEach((m) => {
    b[m] = vi.fn().mockReturnValue(b);
  });
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

const { mockFrom, profilesResult, tokensResult, challengesResult } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  profilesResult: { data: [] as unknown[], error: null },
  tokensResult: { data: [] as unknown[], error: null },
  challengesResult: { data: [] as unknown[], error: null },
}));

vi.mock('../email', async () => {
  const actual = await vi.importActual<typeof import('../email')>('../email');
  return {
    ...actual,
    getSupabaseAdmin: () => ({ from: mockFrom }),
    getLocalHour: vi.fn(() => 18), // default: 6pm local
  };
});

function setup() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_push_tokens') return makeBuilder(tokensResult);
    if (table === 'profiles') return makeBuilder(profilesResult);
    if (table === 'daily_challenges') return makeBuilder(challengesResult);
    return makeBuilder({ data: [], error: null });
  });
}

describe('getDailyChallengePushRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesResult.data = [];
    tokensResult.data = [];
    challengesResult.data = [];
    setup();
  });

  it('returns users with active push token who have not played today', async () => {
    tokensResult.data = [{ user_id: 'u1' }, { user_id: 'u2' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null },
      { id: 'u2', timezone: 'America/New_York', last_daily_push_sent_at: null },
    ];
    challengesResult.data = [{ player_id: 'u2' }]; // u2 played

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual(['u1']);
  });

  it('excludes users who already got a push today', async () => {
    const today = new Date().toISOString();
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: today },
    ];

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([]);
  });

  it('excludes users outside 17-19 local hour window', async () => {
    const { getLocalHour } = await import('../email');
    (getLocalHour as unknown as ReturnType<typeof vi.fn>).mockReturnValue(10);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null },
    ];

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([]);
  });

  it('returns empty list when no active tokens', async () => {
    tokensResult.data = [];
    const recipients = await getDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });
});
