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
import { isPlaceholderName } from './pushDisplayName';

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
 * Best real name for a rival, preferring `display_name` over the (often
 * placeholder) `username`. Returns '' when BOTH are placeholders — the copy
 * layer (which knows the recipient's locale) substitutes a localized generic
 * rival noun. See `lib/pushDisplayName.ts` for the placeholder rules and the
 * 2026-05-04 migration that created the `Player_<hex>` defaults.
 */
function bestRivalName(displayName: string | null, username: string | null): string {
  if (!isPlaceholderName(displayName)) return (displayName as string).trim();
  if (!isPlaceholderName(username)) return (username as string).trim();
  return '';
}

/** A push recipient. `locale` is the carried UI language (no extra fetch — see
 *  dailyChallengeReminder.ts) used as the language fallback when the recipient
 *  has no season daily attempts to derive a gameplay language from. */
export type RivalRecipient = { userId: string; locale?: string | null };

/** Language bucket for rows that carry no/empty `language` (legacy attempts).
 *  Collapsing them into one shared bucket keeps same-language matching a no-op
 *  where the signal is absent and active where present. */
const NO_LANG = '__nolang__';
const langKey = (l: string | null | undefined): string => {
  if (l == null) return NO_LANG;
  // Normalize so the gameplay-language codes (daily_*_attempts.language) and the
  // push-locale fallback (profiles.language) land in the same bucket. Live data
  // is already clean 2-letter lowercase (en/es/he/ja/sv); this just guards drift.
  const norm = String(l).trim().toLowerCase();
  return norm === '' ? NO_LANG : norm;
};

/** The language a player earned the most season daily score in (their "main"
 *  daily language). Tie → lexicographically smaller key for determinism. */
function dominantLanguage(byLang: Map<string, number> | undefined): string | null {
  if (!byLang || byLang.size === 0) return null;
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const [lang, score] of byLang) {
    if (score > bestScore || (score === bestScore && best !== null && lang < best)) {
      best = lang;
      bestScore = score;
    }
  }
  return best;
}

export async function findDailyChallengeRivals(
  recipients: ReadonlyArray<string | RivalRecipient>
): Promise<Map<string, RivalCandidate | null>> {
  const out = new Map<string, RivalCandidate | null>();
  if (recipients.length === 0) return out;

  // Normalize string[] (legacy callers) and object[] to a single shape.
  const recips: RivalRecipient[] = recipients.map((r) =>
    typeof r === 'string' ? { userId: r } : r
  );
  const recipientIds = recips.map((r) => r.userId);
  const localeById = new Map<string, string | null | undefined>();
  for (const r of recips) localeById.set(r.userId, r.locale ?? null);

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
      .select('player_id, score, language')
      .eq('puzzle_date', today)
      .gt('score', 0),
    supabase
      .from('daily_word_hunt_attempts')
      .select('player_id, solved, language')
      .eq('puzzle_date', today)
      .eq('solved', true),
  ]);

  if (puzzleRes.error || wordHuntRes.error) {
    const msg = puzzleRes.error?.message || wordHuntRes.error?.message;
    logger.error?.('PUSH_RIVAL', `attempts query failed: ${msg}`);
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  // Track which daily each completer cleared, PER LANGUAGE. A rival is only
  // eligible for a recipient who plays the SAME language, and the mode
  // (puzzle/wordHunt/both) is reported for that specific language. Lets copy
  // say "scored on the puzzle" vs "solved the word hunt" instead of generic.
  interface TodayFlags { puzzle: boolean; hunt: boolean }
  const todayByPlayerLang = new Map<string, Map<string, TodayFlags>>();
  const markToday = (playerId: string, lang: string, which: 'puzzle' | 'hunt') => {
    let byLang = todayByPlayerLang.get(playerId);
    if (!byLang) {
      byLang = new Map<string, TodayFlags>();
      todayByPlayerLang.set(playerId, byLang);
    }
    let flags = byLang.get(lang);
    if (!flags) {
      flags = { puzzle: false, hunt: false };
      byLang.set(lang, flags);
    }
    flags[which] = true;
  };
  for (const r of (puzzleRes.data ?? []) as Array<{ player_id: string | null; language?: string | null }>) {
    if (r.player_id) markToday(r.player_id, langKey(r.language), 'puzzle');
  }
  for (const r of (wordHuntRes.data ?? []) as Array<{ player_id: string | null; language?: string | null }>) {
    if (r.player_id) markToday(r.player_id, langKey(r.language), 'hunt');
  }
  const completers = new Set<string>(todayByPlayerLang.keys());

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
    .select('player_id, score, language')
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

  // Per-(player, language) season aggregate. Scores across languages are NOT
  // comparable (different dictionaries/difficulty) so we never sum across them.
  const seasonByPlayerLang = new Map<string, Map<string, number>>();
  for (const row of (seasonScoresRes.data ?? []) as Array<{
    player_id: string | null;
    score: number | null;
    language?: string | null;
  }>) {
    if (!row.player_id || typeof row.score !== 'number') continue;
    const lk = langKey(row.language);
    let byLang = seasonByPlayerLang.get(row.player_id);
    if (!byLang) {
      byLang = new Map<string, number>();
      seasonByPlayerLang.set(row.player_id, byLang);
    }
    byLang.set(lk, (byLang.get(lk) ?? 0) + row.score);
  }
  const seasonScoreIn = (playerId: string, lang: string): number =>
    seasonByPlayerLang.get(playerId)?.get(lang) ?? 0;

  // Pre-build candidate-rival lists keyed by LANGUAGE. A completer who cleared
  // today in language L produces a pool entry under L, scored by their
  // season aggregate IN L (not total, not other languages). The same player
  // can appear under multiple languages if they swept more than one today.
  // Score = season-window daily-puzzle aggregate (NOT leaderboard.total_score).
  interface PoolEntry {
    id: string;
    username: string;
    avatar: string | null;
    score: number;
    rank: number | null;
    mode: RivalMode;
  }
  const poolByLang = new Map<string, PoolEntry[]>();
  for (const id of completers) {
    const row = lbByUser.get(id);
    if (!row) continue;
    const byLang = todayByPlayerLang.get(id);
    if (!byLang) continue;
    for (const [lang, flags] of byLang) {
      const mode: RivalMode =
        flags.puzzle && flags.hunt ? 'both' : flags.puzzle ? 'puzzle' : 'wordHunt';
      const entry: PoolEntry = {
        id,
        username: bestRivalName(row.display_name, row.username),
        avatar: resolveRivalAvatarUrl(row.avatar_image, row.avatar_config, id),
        score: seasonScoreIn(id, lang),
        rank: typeof row.rank_position === 'number' ? row.rank_position : null,
        mode,
      };
      const list = poolByLang.get(lang);
      if (list) list.push(entry);
      else poolByLang.set(lang, [entry]);
    }
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
    // Recipient's daily language: the one they earned the most season score in;
    // else their carried UI locale; else the no-language bucket. Rivals are
    // only drawn from this language's pool, and scores compared within it.
    const myLang =
      dominantLanguage(seasonByPlayerLang.get(userId)) ?? langKey(localeById.get(userId));
    const rivalPool = poolByLang.get(myLang) ?? [];

    const myScore = seasonScoreIn(userId, myLang);
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
