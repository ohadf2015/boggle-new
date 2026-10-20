/**
 * One write path for the daily brain_score_history row.
 *
 * Every score column is integer. A float (81.54000000000009, 33.88, 93.20)
 * makes PostgREST return 400 and the day's trend never updates. A fetch-then-
 * insert races the unique key (user_id, period_type, period_start) into a 409.
 *
 * Upsert on that key needs no migration. Two concurrent writes can each read
 * the same counter and both store N+1 — an undercount, not a failed write.
 * An increment RPC would be exact, but migrations do not run on boot.
 */

export interface DailyHistoryScores {
  overallScore: number;
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;
}

export interface DailyHistoryInput {
  userId: string;
  periodStart: string;
  scores: DailyHistoryScores;
  gamesPlayedDelta?: number;
  drillsCompletedDelta?: number;
}

export interface DailyHistoryRow {
  user_id: string;
  period_type: 'daily';
  period_start: string;
  overall_score: number;
  processing_speed: number;
  working_memory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;
  games_played: number;
  drills_completed: number;
}

const CONFLICT = 'user_id,period_type,period_start';

/** Integer for a Postgres integer column. Non-finite input becomes 0, never NaN. */
export function roundScore(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function buildDailyHistoryRow(input: {
  userId: string;
  periodStart: string;
  scores: DailyHistoryScores;
  gamesPlayed: number;
  drillsCompleted: number;
}): DailyHistoryRow {
  const { scores } = input;
  return {
    user_id: input.userId,
    period_type: 'daily',
    period_start: input.periodStart,
    overall_score: roundScore(scores.overallScore),
    processing_speed: roundScore(scores.processingSpeed),
    working_memory: roundScore(scores.workingMemory),
    attention: roundScore(scores.attention),
    flexibility: roundScore(scores.flexibility),
    vocabulary: roundScore(scores.vocabulary),
    games_played: Math.max(0, roundScore(input.gamesPlayed)),
    drills_completed: Math.max(0, roundScore(input.drillsCompleted)),
  };
}

type ExistingCounters = {
  games_played: number | null;
  drills_completed: number | null;
} | null;

/**
 * Structural client. Both the browser supabase client and the drills
 * service-role client satisfy `from()`.
 */
export async function upsertDailyBrainScoreHistory(
  supabase: { from: (table: string) => any },
  input: DailyHistoryInput,
): Promise<{ error: { message: string } | null }> {
  const { data: existing, error: readError } = await supabase
    .from('brain_score_history')
    .select('games_played, drills_completed')
    .eq('user_id', input.userId)
    .eq('period_type', 'daily')
    .eq('period_start', input.periodStart)
    .maybeSingle();

  const prior = (readError ? null : existing) as ExistingCounters;
  const row = buildDailyHistoryRow({
    userId: input.userId,
    periodStart: input.periodStart,
    scores: input.scores,
    gamesPlayed: (prior?.games_played ?? 0) + (input.gamesPlayedDelta ?? 0),
    drillsCompleted: (prior?.drills_completed ?? 0) + (input.drillsCompletedDelta ?? 0),
  });

  const { error } = await supabase
    .from('brain_score_history')
    .upsert(row, { onConflict: CONFLICT });

  return { error: error ?? null };
}
