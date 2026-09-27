/**
 * Connections completion persistence, extracted from the POST /api/connections/daily/score route
 * so it can ALSO run on the offline-sync path (app/api/scores/sync) — a queued
 * Connections result replayed on reconnect must persist identically to a live submit.
 *
 * Behavior is preserved verbatim from the route (verified by the route's own
 * test). The caller owns auth, JSON parsing, validation, identity resolution,
 * and the service-role Supabase client; this owns the writes (daily score row)
 * and the result shape.
 *
 * Returns a discriminated result so callers map outcomes themselves:
 *  - { ok: true, body } — route → 200 { success: true, ...body }; sync → award
 *  - { ok: false, status, error } — route → status+error; sync → AwardError,
 *    where status>=500 is retryable (transient) and <500 is permanent.
 */
import { resolveDailySubmission, type DailySubmission } from '@/lib/connections/dailyScore';
import { nextStreakValue, yesterdayISO } from '@/lib/connections/streak';

type SupabaseLike = any;

export interface ProcessConnectionsContext {
  supabase: SupabaseLike;
}

export interface ProcessConnectionsArgs {
  sub: DailySubmission;
  idCol: 'player_id' | 'guest_fingerprint';
  idVal: string;
  userIdForRow: string | null;
  guestIdForRow: string | null;
  profile: { avatar_emoji: string; avatar_color: string; avatar_image: string | null } | null;
  avatarOverrides: {
    avatarEmoji?: string;
    avatarColor?: string;
    avatarImage?: string | null;
  };
  admin: SupabaseLike;
}

export interface ProcessConnectionsBody {
  action: 'insert' | 'update' | 'keep';
  streak: number;
  score: number;
  currentRank: number;
  totalPlayers: number;
}

export type ProcessConnectionsResult =
  | { ok: true; body: ProcessConnectionsBody }
  | { ok: false; status: number; error: string };

/**
 * Rows strictly ahead of (score, time) for ranking — 1-based rank = better + 1.
 */
function betterFilter(score: number, timeTakenSeconds: number): string {
  return `score.gt.${score},and(score.eq.${score},time_taken_seconds.lt.${timeTakenSeconds})`;
}

export async function processConnectionsCompletion(
  rawSub: Record<string, unknown>,
  args: ProcessConnectionsArgs,
): Promise<ProcessConnectionsResult> {
  const { sub, idCol, idVal, userIdForRow, guestIdForRow, profile, avatarOverrides, admin } = args;

  try {
    // Server-authoritative streak: derived from the player's previous-day row.
    const { data: prevRow } = await admin
      .from('connections_daily_scores')
      .select('streak')
      .eq('puzzle_date', yesterdayISO(sub.puzzleDate))
      .eq(idCol, idVal)
      .maybeSingle();
    const streak = nextStreakValue(prevRow?.streak ?? null);

    // Fetch existing submission for today (same player, same day).
    const { data: existing } = await admin
      .from('connections_daily_scores')
      .select('id, score, time_taken_seconds')
      .eq('puzzle_date', sub.puzzleDate)
      .eq(idCol, idVal)
      .maybeSingle();

    // Decide whether to insert, update, or keep the existing row.
    const decision = resolveDailySubmission({
      existing: existing ? { score: existing.score, timeTakenSeconds: existing.time_taken_seconds } : null,
      incoming: { score: sub.score, timeTakenSeconds: sub.timeTakenSeconds },
    });

    // Build the row data with server-authoritative values and avatar fallbacks.
    const rowData = {
      puzzle_date: sub.puzzleDate,
      player_id: userIdForRow,
      guest_fingerprint: guestIdForRow,
      display_name: sub.displayName,
      avatar_emoji: avatarOverrides.avatarEmoji || profile?.avatar_emoji || '🎯',
      avatar_color: avatarOverrides.avatarColor || profile?.avatar_color || '#6366f1',
      avatar_image: avatarOverrides.avatarImage ?? profile?.avatar_image ?? null,
      score: sub.score,
      time_taken_seconds: sub.timeTakenSeconds,
      streak,
      puzzles_solved: sub.puzzlesSolved,
      language: sub.language,
      updated_at: new Date().toISOString(),
    };

    // Insert or update per the decision.
    if (decision.action === 'insert') {
      const { error: insErr } = await admin.from('connections_daily_scores').insert(rowData);
      // 23505 = unique violation from a concurrent double-submit; the row now
      // exists, so fall through to ranking rather than error.
      if (insErr && insErr.code !== '23505') throw insErr;
    } else if (decision.action === 'update') {
      await admin.from('connections_daily_scores').update(rowData).eq('id', existing!.id);
    }

    // Resolve final score and time for ranking.
    const finalScore = decision.action === 'keep' && existing ? existing.score : sub.score;
    const finalTime = decision.action === 'keep' && existing ? existing.time_taken_seconds : sub.timeTakenSeconds;

    // Rank: count rows better than (finalScore, finalTime).
    const { count: better } = await admin
      .from('connections_daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', sub.puzzleDate)
      .or(betterFilter(finalScore, finalTime));

    // Total players for this day.
    const { count: totalPlayers } = await admin
      .from('connections_daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', sub.puzzleDate);

    return {
      ok: true,
      body: {
        action: decision.action,
        streak,
        score: finalScore,
        currentRank: (better ?? 0) + 1,
        totalPlayers: totalPlayers ?? 1,
      },
    };
  } catch (error) {
    console.error('[CONNECTIONS API] Persistence error:', error);
    return {
      ok: false,
      status: 500,
      error: `Failed to save submission: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
