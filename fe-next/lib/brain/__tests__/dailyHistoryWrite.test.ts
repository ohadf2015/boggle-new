import { describe, expect, it, vi } from 'vitest';
import {
  buildDailyHistoryRow,
  upsertDailyBrainScoreHistory,
} from '../dailyHistoryWrite';

const FRACTIONAL = {
  overallScore: 81.54000000000009,
  processingSpeed: 33.88,
  workingMemory: 93.2,
  attention: 50.4,
  flexibility: 10.5,
  vocabulary: 0.4,
};

describe('buildDailyHistoryRow', () => {
  it('rounds every integer column, including the floats Postgres rejected', () => {
    const row = buildDailyHistoryRow({
      userId: 'user-1',
      periodStart: '2026-10-19',
      scores: FRACTIONAL,
      gamesPlayed: 1.9,
      drillsCompleted: 0.2,
    });

    expect(row).toEqual({
      user_id: 'user-1',
      period_type: 'daily',
      period_start: '2026-10-19',
      overall_score: 82,
      processing_speed: 34,
      working_memory: 93,
      attention: 50,
      flexibility: 11,
      vocabulary: 0,
      games_played: 2,
      drills_completed: 0,
    });
    for (const value of Object.values(row)) {
      if (typeof value === 'number') expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('never emits NaN for a non-finite score', () => {
    const row = buildDailyHistoryRow({
      userId: 'user-1',
      periodStart: '2026-10-19',
      scores: { ...FRACTIONAL, overallScore: Number.NaN, attention: Number.POSITIVE_INFINITY },
      gamesPlayed: 1,
      drillsCompleted: 0,
    });
    expect(row.overall_score).toBe(0);
    expect(row.attention).toBe(0);
  });
});

describe('upsertDailyBrainScoreHistory', () => {
  it('upserts rounded scores on the daily unique key and does not insert', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn();
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { games_played: 2, drills_completed: 1 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        upsert,
        insert,
      }),
    };

    const { error } = await upsertDailyBrainScoreHistory(supabase, {
      userId: 'user-1',
      periodStart: '2026-10-19',
      scores: FRACTIONAL,
      gamesPlayedDelta: 1,
    });

    expect(error).toBeNull();
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'user_id,period_type,period_start' });
    expect(row.overall_score).toBe(82);
    expect(row.processing_speed).toBe(34);
    expect(row.working_memory).toBe(93);
    expect(row.games_played).toBe(3);
    expect(row.drills_completed).toBe(1);
    expect(Number.isInteger(row.overall_score)).toBe(true);
  });
});
