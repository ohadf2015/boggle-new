// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: vi.fn().mockReturnValue({ capture: vi.fn() }),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

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
} = {}) {
  const existingIdempotent = opts.existingIdempotent ?? null;
  const existingProgress = opts.existingProgress ?? null;
  const existingBrainScore = opts.existingBrainScore ?? null;

  return {
    rpc: vi.fn().mockResolvedValue({ data: [{ xp_granted: 30 }], error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'drill_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  filter: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: existingIdempotent, error: null }),
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
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
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
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
});
