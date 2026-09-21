import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createRequestClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';
import { mergeDailyLeaderboard, type MergeInput } from '@/lib/daily/mergeDailyLeaderboard';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/daily/leaderboard?date=YYYY-MM-DD&lang=en|all&limit=10[&fp=<guest fingerprint>]
 *
 * `lang=all` merges every language's puzzle — the hub is mounted in the UI
 * locale, so a player who solved today's Hebrew puzzle from an English hub was
 * otherwise missing from it. The caller (session user, or guest `fp`) gets their
 * own row flagged `isYou`, appended with its true rank when outside the top N.
 *
 * One board for the whole daily challenge: every mode's result for that day,
 * merged per player, with a per-mode breakdown.
 *
 * Merged SERVER-side on purpose. The per-mode routes deliberately return no
 * player identifiers, so a client could not join their responses even if it
 * fetched all four — and giving them ids to make that possible would undo the
 * privacy choice. Here the ids are used to group and then dropped; the response
 * carries display data and scores only.
 *
 * Reads the four per-mode attempt tables directly rather than each mode's
 * leaderboard endpoint: those apply their own ordering and limits, which would
 * truncate a player out of one mode before the merge and understate their total.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    const lang = url.searchParams.get('lang') || 'en';
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    // Pull generously per mode (not `limit`): a player ranked 40th in one mode
    // can still top the combined board, so truncating before the merge would
    // drop their contribution.
    const PER_MODE_CAP = 200;
    const identity = 'player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color, custom_avatar';

    // Three modes read their LEADERBOARD VIEW: it keeps player_id/guest_fingerprint
    // and joins `custom_avatar` off the profile, which the raw attempt tables do
    // not carry. Connections is the exception — `connections_daily_leaderboard`
    // strips identity entirely, so its rows can only be attributed to a player
    // via the base table.
    const read = (table: string, columns: string) => {
      const q = admin.from(table).select(columns).eq('puzzle_date', date);
      return (lang === 'all' ? q : q.eq('language', lang)).limit(PER_MODE_CAP);
    };

    const [hunt, wheel, tower, connections, you] = await Promise.allSettled([
      read('daily_word_hunt_leaderboard', `${identity}, avatar_image, efficiency_score`),
      read('daily_word_wheel_leaderboard', `${identity}, avatar_image, score`),
      read('daily_word_tower_leaderboard', `${identity}, best_height_m`),
      read('connections_daily_scores', 'player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color, avatar_image, score'),
      callerIdentity(request, url.searchParams.get('fp')),
    ]);

    // One mode failing must not blank the whole board — the others still stand.
    const rowsOf = (r: PromiseSettledResult<{ data: unknown[] | null }>): Record<string, unknown>[] =>
      r.status === 'fulfilled' && Array.isArray(r.value?.data)
        ? (r.value.data as Record<string, unknown>[])
        : [];

    const withValue = (rows: Record<string, unknown>[], field: string) =>
      rows.map((row) => ({ ...row, value: typeof row[field] === 'number' ? (row[field] as number) : 0 }));

    const inputs: MergeInput[] = [
      { mode: 'word-hunt', rows: withValue(rowsOf(hunt), 'efficiency_score') },
      { mode: 'word-wheel', rows: withValue(rowsOf(wheel), 'score') },
      { mode: 'word-tower', rows: withValue(rowsOf(tower), 'best_height_m') },
      { mode: 'connections', rows: withValue(rowsOf(connections), 'score') },
    ];

    const entries = mergeDailyLeaderboard(inputs, limit, {
      you: you.status === 'fulfilled' ? you.value : null,
    });

    // Personalised (isYou) and read right after a player finishes — a shared
    // 60s cache showed the board from before their result landed.
    return NextResponse.json({ data: entries }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/daily/leaderboard');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** The caller's group key (see `identityOf`): the session user, else the guest fingerprint. */
async function callerIdentity(request: NextRequest, fp: string | null): Promise<string | null> {
  try {
    const { supabase, token } = await createRequestClient(request);
    const { data } = await supabase.auth.getUser(token ?? undefined);
    if (data?.user?.id) return `u:${data.user.id}`;
  } catch { /* anonymous */ }
  return fp ? `g:${fp}` : null;
}
