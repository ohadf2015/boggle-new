import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Challenge progress: which client, and how many writes.
 *
 * CLIENT — this module runs inside a Next API route. The module-level client
 * from '@/lib/supabase' is `createBrowserClient(url, ANON_KEY)`; on the server
 * it carries no session and acts as `anon`. `daily_challenges` and
 * `weekly_quests` grant SELECT only to the owning `authenticated` user and
 * writes only `TO service_role` (migration 20260317100000, whose own comment
 * says "Allow the server (via admin client) to insert/update challenges").
 * Through the anon client the fetch returned 0 rows with `error: null` and
 * nothing was ever written — a silent no-op that froze every student's daily
 * challenges and weekly quests. It must use the service-role client.
 *
 * BATCHING — one write per table, not one awaited UPDATE per row.
 * `daily_challenges` is UNIQUE(player_id, challenge_date, challenge_type) and
 * `weekly_quests` is UNIQUE(player_id, week_start, quest_type), so in
 * production the matching set is at most one row. The tests force N > 1 to pin
 * the shape.
 */

/** Stands in for the anon browser client. Touching it at all is the bug. */
const browserSupabase = { from: vi.fn() };
const adminSupabase = { from: vi.fn() };
const mockCreateAdminClient = vi.fn(() => adminSupabase as unknown);

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return browserSupabase;
  },
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: mockLogger }));

import { updateEducationChallengeProgress } from '../challengeProgress';

const PLAYER = 'player-1';

function dailyRow(id: string, currentValue: number, targetValue: number) {
  return {
    id,
    player_id: PLAYER,
    challenge_date: '2026-09-05',
    challenge_type: 'practice_sessions',
    challenge_tier: 'easy',
    title: 'Practice',
    description: 'Practice today',
    target_value: targetValue,
    current_value: currentValue,
    xp_reward: 10,
    bonus_reward: null,
    completed: false,
    completed_at: null,
    claimed: false,
    claimed_at: null,
    created_at: '2026-09-05T00:00:00.000Z',
  };
}

function weeklyRow(id: string, progress: number, target: number) {
  return {
    id,
    player_id: PLAYER,
    week_start: '2026-08-31',
    quest_type: 'practice_sessions',
    title: 'Weekly practice',
    description: 'Practice this week',
    requirements: { practice_sessions: target },
    current_progress: { practice_sessions: progress },
    xp_reward: 50,
    bonus_rewards: null,
    completed: false,
    completed_at: null,
    claimed: false,
    created_at: '2026-08-31T00:00:00.000Z',
  };
}

type Call = { table: string; op: 'update' | 'upsert'; payload: unknown; options?: unknown };

/** Wires the ADMIN client to answer queries and records every write. */
function wireAdmin(daily: unknown[], weekly: unknown[], writeError: unknown = null) {
  const calls: Call[] = [];
  adminSupabase.from.mockImplementation((table: string) => {
    const rows = table === 'daily_challenges' ? daily : weekly;
    const selectBuilder: Record<string, unknown> = {
      select: () => selectBuilder,
      eq: () => selectBuilder,
      then: (onOk: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(onOk),
    };
    const writeResult = () => {
      const builder: Record<string, unknown> = {
        eq: () => builder,
        in: () => builder,
        then: (onOk: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: writeError }).then(onOk),
      };
      return builder;
    };
    return {
      select: selectBuilder.select,
      eq: selectBuilder.eq,
      then: selectBuilder.then,
      update: (payload: unknown) => {
        calls.push({ table, op: 'update', payload });
        return writeResult();
      },
      upsert: (payload: unknown, options?: unknown) => {
        calls.push({ table, op: 'upsert', payload, options });
        return writeResult();
      },
    };
  });
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateAdminClient.mockReturnValue(adminSupabase as unknown);
});

describe('updateEducationChallengeProgress — uses the service-role client', () => {
  it('reads and writes through the admin client, never the browser client', async () => {
    const calls = wireAdmin([dailyRow('d1', 0, 5)], [weeklyRow('w1', 0, 3)]);

    const result = await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    expect(adminSupabase.from).toHaveBeenCalledWith('daily_challenges');
    expect(adminSupabase.from).toHaveBeenCalledWith('weekly_quests');
    expect(browserSupabase.from).not.toHaveBeenCalled();
    expect(calls.map(c => c.table)).toEqual(['daily_challenges', 'weekly_quests']);
    expect(result.updated).toBe(2);
  });

  it('fails loudly and writes nothing when no service-role client is available', async () => {
    mockCreateAdminClient.mockReturnValue(null);
    wireAdmin([dailyRow('d1', 0, 5)], []);

    const result = await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    expect(result.updated).toBe(0);
    expect(adminSupabase.from).not.toHaveBeenCalled();
    // Must never silently fall back to the anon client — that IS the bug.
    expect(browserSupabase.from).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('logs the upsert error instead of swallowing it', async () => {
    wireAdmin([dailyRow('d1', 0, 5)], [], { message: 'permission denied' });

    const result = await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('challenge'),
      expect.objectContaining({ message: 'permission denied' })
    );
    expect(result.updated).toBe(0);
  });
});

describe('updateEducationChallengeProgress — batched writes', () => {
  it('writes 3 matching daily challenges in ONE call', async () => {
    const calls = wireAdmin(
      [dailyRow('d1', 0, 5), dailyRow('d2', 1, 5), dailyRow('d3', 4, 5)],
      []
    );

    const result = await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    expect(calls.filter(c => c.table === 'daily_challenges')).toHaveLength(1);
    expect(result.updated).toBe(3);
  });

  it('carries each row its own incremented value and completion flag', async () => {
    const calls = wireAdmin([dailyRow('d1', 0, 5), dailyRow('d2', 4, 5)], []);

    await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    const write = calls.find(c => c.table === 'daily_challenges')!;
    const payload = write.payload as Record<string, unknown>[];
    expect(write.options).toEqual({ onConflict: 'id' });
    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({ id: 'd1', current_value: 1, completed: false });
    expect(payload[1]).toMatchObject({ id: 'd2', current_value: 5, completed: true });
    expect(payload[1].completed_at).toEqual(expect.any(String));
    // NOT NULL columns must survive the batched write (the phantom-insert path).
    expect(payload[0]).toMatchObject({
      player_id: PLAYER,
      challenge_date: '2026-09-05',
      challenge_type: 'practice_sessions',
      challenge_tier: 'easy',
      target_value: 5,
      xp_reward: 10,
    });
  });

  it('every row in a batch carries the identical key set', async () => {
    // PostgREST rejects a bulk upsert whose objects have different keys, so the
    // completed/completed_at pair must be present on every row, not spread in
    // conditionally.
    const calls = wireAdmin([dailyRow('d1', 0, 5), dailyRow('d2', 4, 5)], []);

    await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    const payload = calls[0].payload as Record<string, unknown>[];
    const keySets = payload.map(row => Object.keys(row).sort().join(','));
    expect(new Set(keySets).size).toBe(1);
  });

  it('never writes back claim state, so a concurrent claim is not clobbered', async () => {
    const calls = wireAdmin([dailyRow('d1', 0, 5)], [weeklyRow('w1', 0, 3)]);

    await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    for (const call of calls) {
      for (const row of call.payload as Record<string, unknown>[]) {
        expect(Object.keys(row)).not.toContain('claimed');
        expect(Object.keys(row)).not.toContain('claimed_at');
        expect(Object.keys(row)).not.toContain('created_at');
      }
    }
  });

  it('writes 2 matching weekly quests in ONE call', async () => {
    const calls = wireAdmin([], [weeklyRow('w1', 0, 3), weeklyRow('w2', 2, 3)]);

    const result = await updateEducationChallengeProgress(PLAYER, 'practice_session', 1);

    const weeklyWrites = calls.filter(c => c.table === 'weekly_quests');
    expect(weeklyWrites).toHaveLength(1);
    expect(result.updated).toBe(2);

    const payload = weeklyWrites[0].payload as Record<string, unknown>[];
    expect(payload[0]).toMatchObject({ id: 'w1', current_progress: { practice_sessions: 1 }, completed: false });
    expect(payload[1]).toMatchObject({ id: 'w2', current_progress: { practice_sessions: 3 }, completed: true });
  });

  it('makes no write at all when nothing matches the event type', async () => {
    const calls = wireAdmin([], []);

    const result = await updateEducationChallengeProgress(PLAYER, 'duel_won', 1);

    expect(calls).toHaveLength(0);
    expect(result.updated).toBe(0);
  });
});
