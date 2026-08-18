/**
 * Daily Word Tower score — submit + leaderboard.
 *
 * Word Tower had no daily-scoped score at all: `word_tower_progress` is a
 * lifetime, auth-only, one-row-per-player table, so the mode was absent from
 * every daily leaderboard its siblings appear on.
 *
 * The daily run has no end (the tower persists across UTC days and a miss never
 * ends it), so there is no "final score" moment to submit. The score is instead
 * BEST HEIGHT TODAY — which the client already maintains at
 * `wt-daily-best-${utcDateKey()}`. Every new personal best for the day is
 * submitted and the row keeps the maximum, so the leaderboard converges on the
 * same number whether you climb in one sitting or five.
 *
 * Follows the per-mode triplet convention (`daily_word_wheel_attempts` +
 * `_leaderboard` view), NOT the legacy `daily_puzzle_attempts` table — that one
 * is uniquely keyed on (player, date, language) with no mode column, so two
 * modes sharing it would overwrite each other daily.
 *
 * Guests submit too (siblings accept `guest_fingerprint`); the older
 * `/api/word-tower/leaderboard` is auth-only, which is part of why the mode
 * never felt like a daily challenge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { getSupabaseAdmin } from '@/lib/email';
import { captureApiError } from '@/utils/sentry';
import { mergeDailyBest } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';

export const runtime = 'nodejs';

const TOP_N = 50;
/** Sanity ceiling. The tallest plausible tower is far below this; anything above
 *  is a malformed or forged payload, not a climb. */
const MAX_HEIGHT_M = 100_000;

interface SubmitBody {
  heightM?: number;
  floors?: number;
  language?: string;
  guestFingerprint?: string | null;
  longestWord?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkApiRateLimit(request, 'word-tower-daily-score', { maxRequests: 30, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = (await request.json().catch(() => ({}))) as SubmitBody;
    const heightM = Math.floor(Number(body.heightM) || 0);
    const language = String(body.language || 'en').slice(0, 8);

    if (!Number.isFinite(heightM) || heightM <= 0 || heightM > MAX_HEIGHT_M) {
      return NextResponse.json({ error: 'invalid height' }, { status: 400 });
    }

    const user = await getAuthedUser(request);
    const guestFingerprint = user ? null : (body.guestFingerprint || null);
    // One identity or the other — never both, never neither. Matches the two
    // separate unique constraints on the table.
    if (!user && !guestFingerprint) {
      return NextResponse.json({ error: 'no identity' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    const puzzleDate = utcDateKey();
    const identity = user
      ? { column: 'player_id' as const, value: user.id }
      : { column: 'guest_fingerprint' as const, value: guestFingerprint as string };

    const { data: existing } = await supabase
      .from('daily_word_tower_attempts')
      .select('id, best_height_m, floors')
      .eq(identity.column, identity.value)
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .maybeSingle();

    if (existing) {
      // Keep the MAX, never last-write — a later, worse session must not clobber
      // a better one. `mergeDailyBest` is the same helper the client uses for the
      // localStorage best, so both sides agree on what "today's best" means.
      const merged = mergeDailyBest(Number(existing.best_height_m) || 0, heightM);
      if (merged <= (Number(existing.best_height_m) || 0)) {
        return NextResponse.json({ ok: true, bestHeightM: Number(existing.best_height_m) || 0, improved: false });
      }
      const { error } = await supabase
        .from('daily_word_tower_attempts')
        .update({
          best_height_m: merged,
          floors: Math.max(Number(existing.floors) || 0, Math.floor(Number(body.floors) || 0)),
          longest_word: body.longestWord ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        captureApiError(error as unknown as Error, 'word-tower-daily-score-update');
        return NextResponse.json({ error: 'failed to save' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, bestHeightM: merged, improved: true });
    }

    const { error } = await supabase.from('daily_word_tower_attempts').insert({
      puzzle_date: puzzleDate,
      language,
      player_id: user?.id ?? null,
      guest_fingerprint: guestFingerprint,
      best_height_m: heightM,
      floors: Math.floor(Number(body.floors) || 0),
      longest_word: body.longestWord ?? null,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-daily-score-insert');
      return NextResponse.json({ error: 'failed to save' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bestHeightM: heightM, improved: true });
  } catch (err) {
    captureApiError(err as Error, 'word-tower-daily-score');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const rl = checkApiRateLimit(request, 'word-tower-daily-leaderboard', { maxRequests: 30, windowMs: 60_000 });
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const puzzleDate = searchParams.get('date') || utcDateKey();
    const language = (searchParams.get('language') || 'en').slice(0, 8);

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'db unavailable' }, { status: 503 });

    // Read the VIEW, which resolves display name/avatar via a LEFT JOIN on
    // profiles with COALESCE onto the row's own denormalized columns. The join
    // must stay LEFT: `profiles` SELECT is own-row-only, so an inner join would
    // return zero rows with error:null for every other player.
    const { data: rows, error } = await supabase
      .from('daily_word_tower_leaderboard')
      .select('player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color, custom_avatar, best_height_m, floors, rank_position')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .order('rank_position', { ascending: true })
      .limit(TOP_N);

    if (error) {
      captureApiError(error as unknown as Error, 'word-tower-daily-leaderboard');
      return NextResponse.json({ error: 'failed to load' }, { status: 500 });
    }

    // `isYou` is resolved against the caller when authed; guests get it from the
    // fingerprint they pass, so a guest still sees their own row highlighted.
    const user = await getAuthedUser(request);
    const guestFingerprint = searchParams.get('guestFingerprint');

    const leaderboard = (rows ?? []).map((r) => ({
      rank: Number(r.rank_position) || 0,
      playerId: r.player_id,
      isYou: user
        ? r.player_id === user.id
        : Boolean(guestFingerprint) && r.guest_fingerprint === guestFingerprint,
      username: r.display_name || 'Player',
      avatarConfig: r.custom_avatar ?? null,
      avatarEmoji: r.avatar_emoji ?? null,
      avatarColor: r.avatar_color ?? null,
      bestHeightM: Number(r.best_height_m) || 0,
      floors: r.floors ?? 0,
    }));

    return NextResponse.json(
      { leaderboard, puzzleDate },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
    );
  } catch (err) {
    captureApiError(err as Error, 'word-tower-daily-leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
