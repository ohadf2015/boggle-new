/**
 * Rival lookup for the daily-challenge push reminder.
 *
 * For each recipient userId, finds the closest-by-DAILY-SEASON-SCORE leaderboard
 * neighbour who already completed today's daily (puzzle or word-hunt). Cron
 * uses the result to swap in a rival-themed push (witty "X already crushed
 * it, your move" copy + rival name/score) instead of the neutral mascot copy.
 *
 * Score basis: sum of `daily_puzzle_attempts.score` over the CURRENT SEASON
 * window per player — not lifetime, not all-modes leaderboard.total_score
 * (which mixes MP/blast/etc). The gap in the push copy reflects how the
 * rival is doing in the daily challenge for this season, which is the
 * comparison frame the player actually cares about for THIS push.
 *
 * Word-hunt has no numeric score column — solves count as "completed today"
 * (rival pool membership) but contribute 0 to the gap. A word-hunt-only
 * rival can still surface if their prior-day daily-puzzle aggregate puts
 * them within the floor; otherwise the cap drops them naturally.
 *
 * Caveat: `rankDelta` is still derived from `leaderboard.rank_position`
 * (all-modes season rank). Copy that combines gap + rank can read oddly —
 * tighten in a follow-up if it surfaces in QA.
 *
 * Returns Map<userId, RivalCandidate | null>. Null = no actionable rival
 * (recipient missing from leaderboard, no current season, or no completers).
 *
 * Avatar handling: the modern avatar is a JSONB `avatar_config` rendered
 * client-side as SVG. Server-render path lives at `/api/avatar/png/[id]`;
 * `avatarImage` falls back to legacy https avatar_image otherwise.
 *
 * Performance: 5 queries per tick (RPC season-id, seasons row, today
 * puzzle, today word-hunt, leaderboard, season-window puzzle scores) —
 * still bounded by lbIds.in() filter. Caller is the hourly cron.
 */

import logger from '@/backend/utils/logger';
import { getSupabaseAdmin, getTodayDate } from './email';

export type RivalDirection = 'above' | 'below';
export type RivalMode = 'puzzle' | 'wordHunt' | 'both';

export interface RivalCandidate {
  username: string;
  /** HTTPS avatar URL, or null when leaderboard has no/non-https avatar.
   *  Cron forwards this to FCM imageUrl only when non-null; otherwise the
   *  push trigger falls back to the encouraging mascot. The avatar gate is
   *  ONLY about the image — the rival-themed copy still fires either way. */
  avatarImage: string | null;
  direction: RivalDirection;
  scoreGap: number;
  /** Which daily the rival cleared. `both` when they swept puzzle + word-hunt. */
  mode: RivalMode;
  /** Rival's season `total_score` — lets copy say the exact number, not just a gap. */
  rivalScore: number;
  /** my.rank_position − rival.rank_position. Positive when rival is ahead, negative when behind. */
  rankDelta: number;
  /** Other in-cap rivals beyond the primary — surfaces "and {N} others" social proof. */
  additionalCount: number;
}

/**
 * Resolve a rival's avatar to an HTTPS URL that FCM can fetch.
 *
 * Order of preference:
 *   1. Modern path — `avatar_config` (JSONB) → server-rendered PNG via
 *      `/api/avatar/png/[playerId]`. Most production users have this.
 *   2. Legacy path — `avatar_image` already an https URL (OAuth profile
 *      pictures from Google sign-in).
 *   3. null — mascot fallback in `notifyDailyChallengeReminder`.
 *
 * `playerId` is required for the PNG endpoint URL. `baseUrl` defaults to
 * `NEXT_PUBLIC_APP_URL` and falls back to the production host.
 */
export function resolveRivalAvatarUrl(
  rawAvatarImage: string | null | undefined,
  avatarConfig: unknown,
  playerId: string,
  baseUrlOverride?: string
): string | null {
  const baseUrl =
    baseUrlOverride ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://lexiclash.live';
  if (avatarConfig && typeof avatarConfig === 'object') {
    return `${baseUrl.replace(/\/$/, '')}/api/avatar/png/${encodeURIComponent(playerId)}`;
  }
  if (rawAvatarImage && rawAvatarImage.startsWith('https://')) return rawAvatarImage;
  return null;
}

interface LeaderboardRow {
  player_id: string;
  username: string | null;
  display_name: string | null;
  avatar_image: string | null;
  avatar_config: unknown;
  rank_position: number | null;
}

/**
 * Auto-generated handle shape from `handle_new_user` (`Player_` + first 8 hex
 * of the user UUID). Users who never customize keep this as their `username`,
 * so it must NOT be shown in a push ("Player_9662314e matched your score").
 * Anchored + exactly-8-hex so a deliberately chosen name like "Player_Awesome"
 * is still treated as real.
 */
const PLACEHOLDER_USERNAME_RE = /^Player_[0-9a-f]{8}$/i;

/**
 * Resolve the friendliest presentable name for a rival, or null when only an
 * auto-generated placeholder handle is available. Preference:
 *   1. `display_name` (OAuth/chosen name) when non-blank
 *   2. `username` when non-blank and not a `Player_<hex>` placeholder
 *   3. null → caller drops this rival from the pool (falls back to the neutral
 *      mascot reminder rather than leaking the raw player id).
 */
export function resolveRivalName(
  displayName: string | null | undefined,
  username: string | null | undefined
): string | null {
  const dn = displayName?.trim();
  if (dn) return dn;
  const un = username?.trim();
  if (un && !PLACEHOLDER_USERNAME_RE.test(un)) return un;
  return null;
}

export async function findDailyChallengeRivals(
  recipientIds: string[]
): Promise<Map<string, RivalCandidate | null>> {
  const out = new Map<string, RivalCandidate | null>();
  if (recipientIds.length === 0) return out;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  const today = getTodayDate();

  // Resolve current season window first — score basis is sum of
  // daily_puzzle_attempts.score over [start_date, end_date]. No current
  // season → no rival pushes this tick (fail-soft).
  const seasonIdResp = await (
    supabase as unknown as { rpc: (n: string) => Promise<{ data: unknown; error: unknown }> }
  ).rpc('get_current_season_id');
  const seasonId =
    typeof seasonIdResp?.data === 'number' ? (seasonIdResp.data as number) : null;
  let seasonStart: string | null = null;
  let seasonEnd: string | null = null;
  if (seasonId !== null) {
    const sRes = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              c: string,
              v: unknown
            ) => {
              maybeSingle: () => Promise<{
                data: { start_date?: string; end_date?: string } | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .from('seasons')
      .select('start_date, end_date')
      .eq('id', seasonId)
      .maybeSingle();
    if (sRes.data) {
      seasonStart = sRes.data.start_date ?? null;
      seasonEnd = sRes.data.end_date ?? null;
    }
  }
  if (!seasonStart || !seasonEnd) {
    logger.error?.('PUSH_RIVAL', 'no current season window — skipping rival pushes');
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  // Wave 1: today's completers. Bounded result set (a few k rows max — only
  // today's daily players) regardless of leaderboard size.
  // daily_puzzle_attempts has no `solved` column — `completed_at` defaults
  // to NOW() at insert and `score` is the points earned. Filter on
  // `score > 0` to mean "they actually played and scored".
  const [puzzleRes, wordHuntRes] = await Promise.all([
    supabase
      .from('daily_puzzle_attempts')
      .select('player_id, score')
      .eq('puzzle_date', today)
      .gt('score', 0),
    supabase
      .from('daily_word_hunt_attempts')
      .select('player_id, solved')
      .eq('puzzle_date', today)
      .eq('solved', true),
  ]);

  if (puzzleRes.error || wordHuntRes.error) {
    const msg = puzzleRes.error?.message || wordHuntRes.error?.message;
    logger.error?.('PUSH_RIVAL', `attempts query failed: ${msg}`);
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  // Track which daily each completer cleared. Lets copy say "scored on the
  // puzzle" vs "solved the word hunt" instead of generic "cleared the daily".
  const puzzleCompleters = new Set<string>();
  const wordHuntCompleters = new Set<string>();
  for (const r of (puzzleRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) puzzleCompleters.add(r.player_id);
  }
  for (const r of (wordHuntRes.data ?? []) as Array<{ player_id: string | null }>) {
    if (r.player_id) wordHuntCompleters.add(r.player_id);
  }
  const completers = new Set<string>([...puzzleCompleters, ...wordHuntCompleters]);

  // Wave 2: leaderboard rows for metadata only (username/avatar/rank) —
  // total_score is NOT used for scoring anymore. Scoped to recipients ∪
  // completers to keep per-tick row count bounded (see 2026-05-06 regression).
  const lbIds = Array.from(new Set<string>([...recipientIds, ...completers]));
  if (lbIds.length === 0) {
    for (const id of recipientIds) out.set(id, null);
    return out;
  }
  const lbRes = await supabase
    .from('leaderboard')
    .select('player_id, username, display_name, avatar_image, avatar_config, rank_position')
    .in('player_id', lbIds);

  if (lbRes.error) {
    logger.error?.('PUSH_RIVAL', `leaderboard query failed: ${lbRes.error.message}`);
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  const lbRows = (lbRes.data ?? []) as LeaderboardRow[];
  const lbByUser = new Map<string, LeaderboardRow>();
  for (const row of lbRows) lbByUser.set(row.player_id, row);

  // Wave 3: per-player season-window puzzle score aggregate. We sum in JS
  // (Supabase JS client has no SUM/group_by). Row count is bounded by
  // lbIds × season-length-days × 1-attempt-per-day = O(lbIds × ~30).
  const seasonScoresRes = await supabase
    .from('daily_puzzle_attempts')
    .select('player_id, score')
    .gte('puzzle_date', seasonStart)
    .lte('puzzle_date', seasonEnd)
    .in('player_id', lbIds);

  if (seasonScoresRes.error) {
    logger.error?.(
      'PUSH_RIVAL',
      `season puzzle aggregate query failed: ${seasonScoresRes.error.message}`
    );
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  const seasonScoreByPlayer = new Map<string, number>();
  for (const row of (seasonScoresRes.data ?? []) as Array<{
    player_id: string | null;
    score: number | null;
  }>) {
    if (!row.player_id || typeof row.score !== 'number') continue;
    seasonScoreByPlayer.set(
      row.player_id,
      (seasonScoreByPlayer.get(row.player_id) ?? 0) + row.score
    );
  }

  // Pre-build the candidate-rival list once. Score = season-window daily-
  // puzzle aggregate (NOT leaderboard.total_score). Word-hunt-only completers
  // get score 0 + their prior puzzle aggregate — typically caught by the cap.
  interface PoolEntry {
    id: string;
    username: string;
    avatar: string | null;
    score: number;
    rank: number | null;
    mode: RivalMode;
  }
  const rivalPool: PoolEntry[] = [];
  for (const id of completers) {
    const row = lbByUser.get(id);
    if (!row) continue;
    // Drop rivals with no presentable name — a raw "Player_<id>" handle in a
    // push reads like a bug. The recipient still gets the neutral reminder.
    const name = resolveRivalName(row.display_name, row.username);
    if (!name) continue;
    const seasonScore = seasonScoreByPlayer.get(id) ?? 0;
    const inPuzzle = puzzleCompleters.has(id);
    const inHunt = wordHuntCompleters.has(id);
    const mode: RivalMode = inPuzzle && inHunt ? 'both' : inPuzzle ? 'puzzle' : 'wordHunt';
    rivalPool.push({
      id,
      username: name,
      avatar: resolveRivalAvatarUrl(row.avatar_image, row.avatar_config, id),
      score: seasonScore,
      rank: typeof row.rank_position === 'number' ? row.rank_position : null,
      mode,
    });
  }

  // Caps scaled to daily-puzzle range (typical day-score ~50-300, season
  // aggregate ~0-10k for engaged players). Old leaderboard-scale floors
  // (5000/2000) would have made everyone in-range.
  const ABOVE_GAP_MAX_RATIO = 1.0;   // gap may equal user score (≈ 2× catch-up)
  const BELOW_GAP_MAX_RATIO = 1.0;   // mirror — defending lead within own range
  const ABOVE_GAP_FLOOR = 500;       // newcomers (puzzle aggregate 0–500) still match rivals up to 500 ahead
  const BELOW_GAP_FLOOR = 200;       // tighter — defending lead matters less when gap is huge

  for (const userId of recipientIds) {
    const me = lbByUser.get(userId);
    if (!me) {
      out.set(userId, null);
      continue;
    }
    const myScore = seasonScoreByPlayer.get(userId) ?? 0;
    const aboveCap = Math.max(ABOVE_GAP_FLOOR, Math.round(myScore * ABOVE_GAP_MAX_RATIO));
    const belowCap = Math.max(BELOW_GAP_FLOOR, Math.round(myScore * BELOW_GAP_MAX_RATIO));

    const myRank = typeof me.rank_position === 'number' ? me.rank_position : null;

    // Two-pass: pick the closest-by-score primary, count other in-cap rivals.
    // additionalCount drives the "and {N} others" multi-rival framing —
    // tighter social proof than a single neighbour.
    let bestEntry: PoolEntry | null = null;
    let bestDirection: RivalDirection = 'above';
    let bestGap = Infinity;
    let inCapCount = 0;
    for (const r of rivalPool) {
      if (r.id === userId) continue;
      const gap = Math.abs(r.score - myScore);
      const direction: RivalDirection = r.score >= myScore ? 'above' : 'below';
      const cap = direction === 'above' ? aboveCap : belowCap;
      if (gap > cap) continue;
      inCapCount++;
      if (gap < bestGap) {
        bestGap = gap;
        bestEntry = r;
        bestDirection = direction;
      }
    }

    if (bestEntry) {
      const rankDelta =
        myRank !== null && bestEntry.rank !== null ? myRank - bestEntry.rank : 0;
      out.set(userId, {
        username: bestEntry.username,
        avatarImage: bestEntry.avatar,
        direction: bestDirection,
        scoreGap: bestGap,
        mode: bestEntry.mode,
        rivalScore: bestEntry.score,
        rankDelta,
        additionalCount: Math.max(0, inCapCount - 1),
      });
    } else {
      out.set(userId, null);
    }
  }

  return out;
}
