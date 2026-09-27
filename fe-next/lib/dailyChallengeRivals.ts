/**
 * Rival lookup for the daily-challenge push.
 *
 * For each recipient, finds a leaderboard neighbour who ALREADY cleared today's
 * daily (Word Hunt or the classic puzzle) so the cron can send a rival-themed
 * nudge instead of the neutral mascot reminder.
 *
 * EVENT-BASED, not score-based. We deliberately do NOT compute a season "score
 * gap" / direction / rival-score: the daily puzzle is dead (0 rows) and Word
 * Hunt — the live daily — has no additive per-player score, so any gap resolved
 * to 0 and every push falsely read "you're tied with X". See
 * docs/superpowers/specs/2026-07-03-push-rival-truthful-copy.md.
 *
 * The only facts we surface: WHO cleared today (same-language, so it's the
 * recipient's daily), which mode, and how many others also cleared it.
 *
 * Performance: 3 queries per tick (today puzzle, today word-hunt, leaderboard),
 * all bounded — leaderboard scoped to recipients ∪ today's completers.
 */

import logger from '@/backend/utils/logger';
import { getSupabaseAdmin, getTodayDate } from './email';
import { isPlaceholderName } from './pushDisplayName';

export type RivalMode = 'puzzle' | 'wordHunt' | 'both';

export interface RivalCandidate {
  username: string;
  /** HTTPS avatar URL, or null when leaderboard has no/non-https avatar.
   *  Cron forwards this to FCM imageUrl only when non-null; otherwise the push
   *  trigger falls back to the encouraging mascot. */
  avatarImage: string | null;
  /** Which daily the rival cleared. `both` when they swept puzzle + word-hunt. */
  mode: RivalMode;
  /** Other same-language completers beyond the primary — "and {N} more" proof. */
  additionalCount: number;
}

/**
 * Resolve a rival's avatar to an HTTPS URL that FCM can fetch.
 *   1. `avatar_config` (JSONB) → server-rendered PNG via /api/avatar/png/[id].
 *   2. legacy `avatar_image` already an https URL.
 *   3. null → mascot fallback.
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
 * layer substitutes a localized generic rival noun.
 */
function bestRivalName(displayName: string | null, username: string | null): string {
  if (!isPlaceholderName(displayName)) return (displayName as string).trim();
  if (!isPlaceholderName(username)) return (username as string).trim();
  return '';
}

/** A push recipient. `locale` is the carried UI language, used as the daily
 *  language so we only surface a rival who cleared the recipient's own daily. */
export type RivalRecipient = { userId: string; locale?: string | null };

/** Language bucket for rows/recipients that carry no/empty language. */
const NO_LANG = '__nolang__';
const langKey = (l: string | null | undefined): string => {
  if (l == null) return NO_LANG;
  const norm = String(l).trim().toLowerCase();
  return norm === '' ? NO_LANG : norm;
};

/** Two languages match when they're equal, or either side is language-agnostic
 *  (legacy rows / recipients with no carried locale). Keeps back-compat while
 *  still filtering a clear he-vs-en cross-language mismatch. */
const langMatches = (a: string, b: string): boolean =>
  a === b || a === NO_LANG || b === NO_LANG;

interface PoolEntry {
  id: string;
  lang: string;
  username: string;
  avatar: string | null;
  rank: number | null;
  mode: RivalMode;
}

export async function findDailyChallengeRivals(
  recipients: ReadonlyArray<string | RivalRecipient>
): Promise<Map<string, RivalCandidate | null>> {
  const out = new Map<string, RivalCandidate | null>();
  if (recipients.length === 0) return out;

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

  // Wave 1: today's completers (bounded — only today's daily players).
  // daily_puzzle_attempts: score > 0 = actually played and scored.
  // daily_word_hunt_attempts: solved = true.
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

  // Track which daily each completer cleared, PER LANGUAGE.
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

  // Wave 2: leaderboard rows for metadata only (name/avatar/rank). Scoped to
  // recipients ∪ completers to keep per-tick row count bounded.
  const lbIds = Array.from(new Set<string>([...recipientIds, ...completers]));
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

  // Build the pool: one entry per (completer, language) they cleared today.
  const pool: PoolEntry[] = [];
  for (const id of completers) {
    const row = lbByUser.get(id);
    if (!row) continue;
    const byLang = todayByPlayerLang.get(id);
    if (!byLang) continue;
    for (const [lang, flags] of byLang) {
      const mode: RivalMode =
        flags.puzzle && flags.hunt ? 'both' : flags.puzzle ? 'puzzle' : 'wordHunt';
      pool.push({
        id,
        lang,
        username: bestRivalName(row.display_name, row.username),
        avatar: resolveRivalAvatarUrl(row.avatar_image, row.avatar_config, id),
        rank: typeof row.rank_position === 'number' ? row.rank_position : null,
        mode,
      });
    }
  }

  for (const userId of recipientIds) {
    const me = lbByUser.get(userId);
    if (!me) {
      out.set(userId, null);
      continue;
    }
    const myLang = langKey(localeById.get(userId));
    const myRank = typeof me.rank_position === 'number' ? me.rank_position : null;

    // Same-language completers, excluding self.
    const candidates = pool.filter(
      (p) => p.id !== userId && langMatches(p.lang, myLang)
    );
    if (candidates.length === 0) {
      out.set(userId, null);
      continue;
    }

    // Primary = the rival nearest in rank to me (both ranked); else the
    // highest-ranked (closest to the top); ties broken by id for determinism.
    const primary = [...candidates].sort((a, b) => {
      if (myRank !== null && a.rank !== null && b.rank !== null) {
        const da = Math.abs(a.rank - myRank);
        const db = Math.abs(b.rank - myRank);
        if (da !== db) return da - db;
      } else if (a.rank !== null && b.rank !== null && a.rank !== b.rank) {
        return a.rank - b.rank;
      } else if ((a.rank === null) !== (b.rank === null)) {
        return a.rank === null ? 1 : -1; // ranked before unranked
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })[0];

    out.set(userId, {
      username: primary.username,
      avatarImage: primary.avatar,
      mode: primary.mode,
      additionalCount: Math.max(0, candidates.length - 1),
    });
  }

  return out;
}
