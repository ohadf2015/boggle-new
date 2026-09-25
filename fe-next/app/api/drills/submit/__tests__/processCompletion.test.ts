// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: vi.fn().mockReturnValue({ capture: vi.fn() }),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// processCompletion fires-and-forgets the daily-quest evaluator; mock it so the
// dynamic import can't resolve after the test environment is torn down.
vi.mock('@/backend/modules/dailyMissionsManager', () => ({
  completeDailyQuestsForResult: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/dailyQuestPool', () => ({ emptyQuestResult: vi.fn((r) => r) }));

import { processBrainDrillCompletion } from '../processCompletion';

const validBody = {
  drillType: 'lightning-round',
  level: 2,
  score: 600,
  durationSeconds: 30,
  wordsFound: 15,
};

function makeMockSupabase(opts: {
  existingIdempotent?: Record<string, unknown> | null;
  existingProgress?: Record<string, unknown> | null;
  existingBrainScore?: Record<string, unknown> | null;
  lastSessionScore?: number | null;
  recentRows?: Record<string, unknown>[];
  /** A benchmark row inside the cooldown window (dedicated lookup). */
  recentCheck?: Record<string, unknown> | null;
} = {}) {
  const existingIdempotent = opts.existingIdempotent ?? null;
  const existingProgress = opts.existingProgress ?? null;
  const existingBrainScore = opts.existingBrainScore ?? null;
  const lastSessionScore = opts.lastSessionScore ?? null;
  const recentRows = opts.recentRows
    ?? (lastSessionScore != null
      ? [{ score: lastSessionScore, level: 2, created_at: '2026-09-24T00:00:00Z', extra_data: null }]
      : []);
  const spies = {
    sessionInsert: vi.fn(),
    progressInsert: vi.fn().mockResolvedValue({ error: null }),
    progressUpdate: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  };

  return {
    spies,
    rpc: vi.fn().mockResolvedValue({ data: [{ xp_granted: 30 }], error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'drill_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  filter: vi.fn().mockImplementation((col: string) => {
                    const data = col === 'extra_data->>benchmark' ? (opts.recentCheck ?? null) : existingIdempotent;
                    const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
                    return { maybeSingle, limit: vi.fn().mockReturnValue({ maybeSingle }) };
                  }),
                }),
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: recentRows, error: null }),
                }),
              }),
            }),
          }),
          insert: spies.sessionInsert.mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'sess-1', score: validBody.score, level: validBody.level },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === 'drill_progress') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: existingProgress,
                  error: existingProgress ? null : { code: 'PGRST116' },
                }),
              }),
            }),
          }),
          insert: spies.progressInsert,
          update: spies.progressUpdate,
        };
      }
      if (table === 'brain_scores') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: existingBrainScore, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'brain_score_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    }),
  };
}

describe('processBrainDrillCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing required fields with 400', async () => {
    const supabase = makeMockSupabase();
    const result = await processBrainDrillCompletion(
      { drillType: 'lightning-round', level: 1 } as unknown,
      'user-1',
      '',
      { supabase: supabase as unknown as never, source: 'live' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it('returns idempotent=true when submissionId matches a recent session', async () => {
    const supabase = makeMockSupabase({
      existingIdempotent: { id: 'sess-prior', score: 400, level: 1 },
    });
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-1',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.idempotent).toBe(true);
      expect(result.body.xpAwarded).toBe(0);
    }
  });

  it('happy path returns success with brainScore + xpAwarded', async () => {
    const supabase = makeMockSupabase();
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-2',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.success).toBe(true);
      expect(result.body.brainScore).toBeDefined();
      expect(result.body.brainScore.targetDomain).toBeDefined();
      expect(typeof result.body.xpAwarded).toBe('number');
    }
  });

  it('returns improvement signals; first ever play is not a personal best', async () => {
    const supabase = makeMockSupabase();
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-3',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.improvement).toBeDefined();
      expect(result.body.improvement.isPersonalBest).toBe(false);
      expect(result.body.improvement.totalPlays).toBe(0);
      expect(result.body.improvement.currentScore).toBe(validBody.score);
    }
  });

  it('flags a personal best when the run beats the prior high score', async () => {
    const supabase = makeMockSupabase({
      existingProgress: { id: 'prog-1', level: 2, high_score: 400, total_plays: 3, total_score: 900, avg_score: 300 },
    });
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-4',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.improvement.isPersonalBest).toBe(true);
      expect(result.body.improvement.previousBest).toBe(400);
      expect(result.body.improvement.averageScore).toBe(300);
    }
  });

  it('flags improvedVsLast via the drill_sessions recent-sessions query (.order.limit)', async () => {
    const supabase = makeMockSupabase({
      existingProgress: { id: 'prog-1', level: 2, high_score: 900, total_plays: 4, total_score: 2000, avg_score: 500 },
      lastSessionScore: 500,
    });
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-5',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.improvement.improvedVsLast).toBe(true);
      expect(result.body.improvement.isPersonalBest).toBe(false);
    }
  });

  it('does not flag improvedVsLast when the previous session scored higher', async () => {
    const supabase = makeMockSupabase({
      existingProgress: { id: 'prog-1', level: 2, high_score: 900, total_plays: 4, total_score: 2000, avg_score: 500 },
      lastSessionScore: 650,
    });
    const result = await processBrainDrillCompletion(
      validBody,
      'user-1',
      'sub-uuid-6',
      { supabase: supabase as unknown as never, source: 'offline-sync' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.improvement.improvedVsLast).toBe(false);
    }
  });

  describe('Brain Check (fixed-protocol benchmark)', () => {
    const checkBody = { drillType: 'lightning-round', level: 2, score: 120, durationSeconds: 45, wordsFound: 9, extraData: { benchmark: true } };
    const run = (supabase, body = checkBody) =>
      processBrainDrillCompletion(body, 'user-1', 'sub-check', { supabase, source: 'live' });

    it('records an on-protocol check and leaves training progress untouched', async () => {
      const supabase = makeMockSupabase({
        existingProgress: { id: 'prog-1', level: 1, high_score: 40, total_plays: 3, total_score: 90, avg_score: 30 },
      });
      const result = await run(supabase);
      expect(result.ok && result.body.brainCheck).toBe('recorded');
      expect(result.ok && result.body.levelPromoted).toBe(false);
      expect(supabase.spies.sessionInsert.mock.calls[0][0].extra_data.benchmark).toBe(true);
      expect(supabase.spies.progressUpdate).not.toHaveBeenCalled();
      expect(supabase.spies.progressInsert).not.toHaveBeenCalled();
    });

    it('stores a check inside the cooldown as a rejected run, never a measurement', async () => {
      const supabase = makeMockSupabase({
        recentCheck: { created_at: new Date(Date.now() - 3600_000).toISOString() },
      });
      const result = await run(supabase);
      expect(result.ok && result.body.brainCheck).toBe('rejected');
      const stored = supabase.spies.sessionInsert.mock.calls[0][0].extra_data;
      expect(stored.benchmark).toBe(false);
      expect(stored.benchmarkRejected).toBe(true);
      expect(supabase.spies.progressUpdate).not.toHaveBeenCalled();
    });

    it('still rejects when 20+ training runs pushed the last check out of the recent feed', async () => {
      const training = Array.from({ length: 20 }, (_, i) => ({ score: 50, level: 1, created_at: new Date(Date.now() - i * 60_000).toISOString(), extra_data: null }));
      const supabase = makeMockSupabase({
        recentRows: training,
        recentCheck: { created_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
      });
      const result = await run(supabase);
      expect(result.ok && result.body.brainCheck).toBe('rejected');
    });

    it('rejects a check played off-protocol (wrong level)', async () => {
      const supabase = makeMockSupabase();
      const result = await run(supabase, { ...checkBody, level: 4 });
      expect(result.ok && result.body.brainCheck).toBe('rejected');
    });
  });

  it('adaptive staircase: second struggling run at the same level demotes', async () => {
    const supabase = makeMockSupabase({
      existingProgress: { id: 'prog-1', level: 3, high_score: 300, total_plays: 8, total_score: 1200, avg_score: 150 },
      recentRows: [{ score: 30, level: 3, created_at: '2026-09-24T00:00:00Z', extra_data: null }],
    });
    const result = await processBrainDrillCompletion(
      { ...validBody, level: 3, score: 20 },
      'user-1',
      'sub-stair',
      { supabase, source: 'live' },
    );
    expect(result.ok && result.body.newLevel).toBe(2);
  });
});
