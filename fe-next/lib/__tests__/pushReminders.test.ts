/**
 * Daily-challenge push reminder recipient selection tests
 */

import { vi } from 'vitest';
import {
  getDailyChallengePushRecipients,
  getSmartDailyChallengePushRecipients,
  markDailyPushSentBatch,
} from '../pushReminders';

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

const {
  mockFrom,
  profilesResult,
  tokensResult,
  puzzleAttemptsResult,
  wordHuntAttemptsResult,
  prefsResult,
  avgViewResult,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  profilesResult: { data: [] as unknown[], error: null },
  tokensResult: { data: [] as unknown[], error: null },
  puzzleAttemptsResult: { data: [] as unknown[], error: null },
  wordHuntAttemptsResult: { data: [] as unknown[], error: null },
  prefsResult: { data: [] as unknown[], error: null },
  avgViewResult: { data: [] as unknown[], error: null },
}));

vi.mock('../email', async () => {
  const actual = await vi.importActual<typeof import('../email')>('../email');
  return {
    ...actual,
    getSupabaseAdmin: () => ({ from: mockFrom }),
    getLocalHour: vi.fn(() => 18), // default: 6pm local
    getLocalMinuteOfDay: vi.fn(() => 18 * 60 + 30), // default: 18:30 local
  };
});

function setup() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_push_tokens') return makeBuilder(tokensResult);
    if (table === 'profiles') return makeBuilder(profilesResult);
    if (table === 'daily_puzzle_attempts') return makeBuilder(puzzleAttemptsResult);
    if (table === 'daily_word_hunt_attempts') return makeBuilder(wordHuntAttemptsResult);
    if (table === 'user_notification_preferences') return makeBuilder(prefsResult);
    if (table === 'v_user_daily_play_avg') return makeBuilder(avgViewResult);
    return makeBuilder({ data: [], error: null });
  });
}

describe('getDailyChallengePushRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesResult.data = [];
    tokensResult.data = [];
    puzzleAttemptsResult.data = [];
    wordHuntAttemptsResult.data = [];
    prefsResult.data = [];
    setup();
  });

  it('returns users with active push token who have not played today, with locale', async () => {
    tokensResult.data = [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'he' },
      { id: 'u2', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
      { id: 'u3', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    puzzleAttemptsResult.data = [{ player_id: 'u2' }]; // u2 played daily puzzle
    wordHuntAttemptsResult.data = [{ player_id: 'u3' }]; // u3 played word hunt

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([{ userId: 'u1', locale: 'he' }]);
  });

  it('falls back to en when profiles.language is missing/null', async () => {
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: null },
    ];

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([{ userId: 'u1', locale: 'en' }]);
  });

  it('excludes users who started but did not complete today (any row = played)', async () => {
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    // User started word hunt but did not solve — still counts as played
    wordHuntAttemptsResult.data = [{ player_id: 'u1' }];

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([]);
  });

  it('does not query the legacy daily_challenges table', async () => {
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];

    await getDailyChallengePushRecipients();

    const tablesQueried = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesQueried).not.toContain('daily_challenges');
    expect(tablesQueried).toContain('daily_puzzle_attempts');
    expect(tablesQueried).toContain('daily_word_hunt_attempts');
  });

  it('excludes users who already got a push today', async () => {
    const today = new Date().toISOString();
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: today, language: 'en' },
    ];

    const recipients = await getDailyChallengePushRecipients();

    expect(recipients).toEqual([]);
  });

  it('excludes users outside 17-19 local hour window', async () => {
    const { getLocalHour } = await import('../email');
    (getLocalHour as unknown as ReturnType<typeof vi.fn>).mockReturnValue(10);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
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

describe('getSmartDailyChallengePushRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesResult.data = [];
    tokensResult.data = [];
    puzzleAttemptsResult.data = [];
    wordHuntAttemptsResult.data = [];
    prefsResult.data = [];
    avgViewResult.data = [];
    setup();
  });

  it('includes a user whose target (avg+30) falls in the current hour-window', async () => {
    // avg=18:00 (1080min) → target=18:30 (1110min). Current local = 18:30 → in [1110, 1170).
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1110);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([{ userId: 'u1', locale: 'en' }]);
  });

  it('excludes a user whose target is outside the current hour-window', async () => {
    // avg=18:00 → target=18:30. Current local = 12:00 → outside [1110, 1170).
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(720);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('cold-start fallback: never-played users in default 17–19 local window are included', async () => {
    // 2026-05-05 D1-retention sprint: brand-new installs with active push token
    // were excluded for ~3 days until v_user_daily_play_avg populated. Active
    // push token = user-granted permission, so reaching them at default
    // 17–19 local window is using existing consent, not spamming. The 3-day
    // cold-start gap was the dominant blocker on D1 retention reach.
    const { getLocalHour } = await import('../email');
    (getLocalHour as unknown as ReturnType<typeof vi.fn>).mockReturnValue(18);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = []; // no history → cold-start branch

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([{ userId: 'u1', locale: 'en' }]);
  });

  it('cold-start fallback: never-played users OUTSIDE default 17–19 local window are excluded', async () => {
    const { getLocalHour } = await import('../email');
    (getLocalHour as unknown as ReturnType<typeof vi.fn>).mockReturnValue(10); // 10am — outside

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('excludes users who already played today even if target is in window', async () => {
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1110);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];
    puzzleAttemptsResult.data = [{ player_id: 'u1' }];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('excludes users who already received a push today (last_daily_push_sent_at = today)', async () => {
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1110);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: new Date().toISOString(), language: 'en' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('excludes opted-out users (push_enabled=false OR daily_challenge=false)', async () => {
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1110);

    tokensResult.data = [{ user_id: 'u1' }, { user_id: 'u2' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
      { id: 'u2', timezone: 'America/New_York', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
      { player_id: 'u2', timezone: 'America/New_York', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];
    prefsResult.data = [
      { user_id: 'u1', push_enabled: false, daily_challenge: true },
      { user_id: 'u2', push_enabled: true, daily_challenge: false },
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('handles avg near midnight: avg=23:30 → target=00:00, current=00:15 → included', async () => {
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(15); // 00:15

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'Asia/Jerusalem', last_daily_push_sent_at: null, language: 'he' },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'Asia/Jerusalem', sample_size: 5, avg_play_minute_of_day: 1410 }, // 23:30
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([{ userId: 'u1', locale: 'he' }]);
  });

  it('queries the v_user_daily_play_avg view (proves smart path is wired)', async () => {
    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'UTC', last_daily_push_sent_at: null, language: 'en' },
    ];
    avgViewResult.data = [];

    await getSmartDailyChallengePushRecipients();

    const tablesQueried = mockFrom.mock.calls.map((c) => c[0]);
    expect(tablesQueried).toContain('v_user_daily_play_avg');
  });

  it('returns empty when no active tokens', async () => {
    tokensResult.data = [];
    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([]);
  });

  it('falls back to en when profile.language is null', async () => {
    const { getLocalMinuteOfDay } = await import('../email');
    (getLocalMinuteOfDay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(1110);

    tokensResult.data = [{ user_id: 'u1' }];
    profilesResult.data = [
      { id: 'u1', timezone: 'UTC', last_daily_push_sent_at: null, language: null },
    ];
    avgViewResult.data = [
      { player_id: 'u1', timezone: 'UTC', sample_size: 5, avg_play_minute_of_day: 1080 },
    ];

    const recipients = await getSmartDailyChallengePushRecipients();
    expect(recipients).toEqual([{ userId: 'u1', locale: 'en' }]);
  });
});

describe('markDailyPushSentBatch', () => {
  it('issues a single UPDATE with IN(...) for all userIds', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({ update: updateSpy });

    await markDailyPushSentBatch(['u1', 'u2', 'u3']);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0][0]).toMatchObject({ last_daily_push_sent_at: expect.any(String) });
    expect(updateSpy.mock.results[0].value.in).toHaveBeenCalledWith('id', ['u1', 'u2', 'u3']);
  });

  it('no-ops on empty list', async () => {
    await markDailyPushSentBatch([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
