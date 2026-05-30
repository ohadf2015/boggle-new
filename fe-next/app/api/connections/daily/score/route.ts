import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { validateDailySubmission, resolveDailySubmission } from '@/lib/connections/dailyScore';
import { maxDailyScore } from '@/lib/connections/daily';
import { yesterdayISO, nextStreakValue } from '@/lib/connections/streak';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Rows strictly ahead of (score, time) for ranking — 1-based rank = better + 1. */
function betterFilter(score: number, timeTakenSeconds: number): string {
  return `score.gt.${score},and(score.eq.${score},time_taken_seconds.lt.${timeTakenSeconds})`;
}

/**
 * POST /api/connections/daily/score
 * Submit a Word Bridge daily-challenge result. Service-role write; the client's
 * score is clamped and its streak recomputed from the D-1 row (never trusted).
 */
export async function POST(request: NextRequest) {
  const rl = checkApiRateLimit(request, 'connections-daily-score', { maxRequests: 20, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 });
    }
    const today = todayUTC();
    const guestFingerprint = typeof body.guestFingerprint === 'string' ? body.guestFingerprint : null;

    // Clamp ceiling depends on the (date, locale) the client claims; validate
    // the rest of the body against it.
    const peekDate = typeof body.puzzleDate === 'string' ? body.puzzleDate : today;
    const peekLang = typeof body.language === 'string' ? body.language : 'en';
    const max = maxDailyScore(peekDate, peekLang);
    const v = validateDailySubmission(body, max, today);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const sub = v.value;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user && !guestFingerprint) {
      return NextResponse.json({ error: 'identity required' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const idCol = user ? 'player_id' : 'guest_fingerprint';
    const idVal = user ? user.id : (guestFingerprint as string);

    const { data: profile } = user
      ? await admin.from('profiles').select('avatar_emoji, avatar_color, avatar_image').eq('id', user.id).single()
      : { data: null };

    // Server-authoritative streak: derived from the player's previous-day row.
    const { data: prevRow } = await admin
      .from('connections_daily_scores')
      .select('streak')
      .eq('puzzle_date', yesterdayISO(sub.puzzleDate))
      .eq(idCol, idVal)
      .maybeSingle();
    const streak = nextStreakValue(prevRow?.streak ?? null);

    const { data: existing } = await admin
      .from('connections_daily_scores')
      .select('id, score, time_taken_seconds')
      .eq('puzzle_date', sub.puzzleDate)
      .eq(idCol, idVal)
      .maybeSingle();

    const decision = resolveDailySubmission({
      existing: existing ? { score: existing.score, timeTakenSeconds: existing.time_taken_seconds } : null,
      incoming: { score: sub.score, timeTakenSeconds: sub.timeTakenSeconds },
    });

    const rowData = {
      puzzle_date: sub.puzzleDate,
      player_id: user?.id ?? null,
      guest_fingerprint: user ? null : guestFingerprint,
      display_name: sub.displayName,
      avatar_emoji: (typeof body.avatarEmoji === 'string' && body.avatarEmoji) || profile?.avatar_emoji || '🎯',
      avatar_color: (typeof body.avatarColor === 'string' && body.avatarColor) || profile?.avatar_color || '#6366f1',
      avatar_image: (typeof body.avatarImage === 'string' && body.avatarImage) || profile?.avatar_image || null,
      score: sub.score,
      time_taken_seconds: sub.timeTakenSeconds,
      streak,
      puzzles_solved: sub.puzzlesSolved,
      language: sub.language,
      updated_at: new Date().toISOString(),
    };

    if (decision.action === 'insert') {
      await admin.from('connections_daily_scores').insert(rowData);
    } else if (decision.action === 'update') {
      await admin.from('connections_daily_scores').update(rowData).eq('id', existing!.id);
    }

    const finalScore = decision.action === 'keep' && existing ? existing.score : sub.score;
    const finalTime = decision.action === 'keep' && existing ? existing.time_taken_seconds : sub.timeTakenSeconds;

    const { count: better } = await admin
      .from('connections_daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', sub.puzzleDate)
      .or(betterFilter(finalScore, finalTime));
    const { count: totalPlayers } = await admin
      .from('connections_daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', sub.puzzleDate);

    return NextResponse.json({
      success: true,
      action: decision.action,
      streak,
      score: finalScore,
      currentRank: (better ?? 0) + 1,
      totalPlayers: totalPlayers ?? 1,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/connections/daily/score', {
      method: 'POST',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
