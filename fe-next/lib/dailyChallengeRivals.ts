/**
 * Rival lookup for the daily-challenge push reminder.
 *
 * For each recipient userId, finds the closest-by-total_score leaderboard
 * neighbour who already completed today's daily (puzzle or word-hunt). Cron
 * uses the result to swap in a rival-themed push (avatar imageUrl + witty
 * "X already crushed it, your move" copy) instead of the neutral mascot copy.
 *
 * Returns Map<userId, RivalCandidate | null>. Null = no actionable rival
 * (recipient missing from leaderboard, no completers, or only completers
 * have null avatar_image — FCM imageUrl needs HTTPS so we skip those).
 *
 * Performance: 3 queries (leaderboard, puzzle attempts, word-hunt attempts)
 * regardless of recipient count. Caller is the hourly cron, so amortized
 * per-tick cost is bounded.
 */

import logger from '@/backend/utils/logger';
import { getSupabaseAdmin, getTodayDate } from './email';

export type RivalDirection = 'above' | 'below';
export type RivalMode = 'puzzle' | 'wordHunt' | 'both';

export interface RivalCandidate {
  username: string;
  avatarImage: string;
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

interface LeaderboardRow {
  player_id: string;
  username: string | null;
  avatar_image: string | null;
  total_score: number | null;
  rank_position: number | null;
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

  // Wave 2: leaderboard rows scoped to recipients ∪ completers ONLY. The
  // leaderboard view spans 95k+ rows — an unscoped SELECT here was the same
  // pattern that drove the 2026-05-06 95% DB CPU regression. .in() keeps
  // the per-tick row count bounded to recipients + today's-completers.
  const lbIds = Array.from(new Set<string>([...recipientIds, ...completers]));
  if (lbIds.length === 0) {
    for (const id of recipientIds) out.set(id, null);
    return out;
  }
  const lbRes = await supabase
    .from('leaderboard')
    .select('player_id, username, avatar_image, total_score, rank_position')
    .in('player_id', lbIds);

  if (lbRes.error) {
    logger.error?.('PUSH_RIVAL', `leaderboard query failed: ${lbRes.error.message}`);
    for (const id of recipientIds) out.set(id, null);
    return out;
  }

  const lbRows = (lbRes.data ?? []) as LeaderboardRow[];
  const lbByUser = new Map<string, LeaderboardRow>();
  for (const row of lbRows) lbByUser.set(row.player_id, row);

  // Pre-build the candidate-rival list once: completers with HTTPS avatar +
  // numeric score. FCM imageUrl drops silently on non-HTTPS (iOS
  // UNNotificationAttachment + Android big-picture both require it).
  interface PoolEntry {
    id: string;
    username: string;
    avatar: string;
    score: number;
    rank: number | null;
    mode: RivalMode;
  }
  const rivalPool: PoolEntry[] = [];
  for (const id of completers) {
    const row = lbByUser.get(id);
    if (!row) continue;
    if (!row.avatar_image || !row.avatar_image.startsWith('https://')) continue;
    if (typeof row.total_score !== 'number') continue;
    const inPuzzle = puzzleCompleters.has(id);
    const inHunt = wordHuntCompleters.has(id);
    const mode: RivalMode = inPuzzle && inHunt ? 'both' : inPuzzle ? 'puzzle' : 'wordHunt';
    rivalPool.push({
      id,
      username: row.username || 'Rival',
      avatar: row.avatar_image,
      score: row.total_score,
      rank: typeof row.rank_position === 'number' ? row.rank_position : null,
      mode,
    });
  }

  // Cap "above" rivals so a 50k-point veteran doesn't get surfaced to a
  // 200-point newcomer ("they're 49,800 ahead" demoralizes more than
  // motivates). Symmetric cap on "below" keeps copy honest. Picks the next
  // closest within range — only falls back to null when no rival fits.
  const ABOVE_GAP_MAX_RATIO = 1.0;   // gap may equal user score (≈ 2× catch-up)
  const ABOVE_GAP_FLOOR = 500;       // grace for low-score users so they still get rivals
  const BELOW_GAP_FLOOR = 2000;      // tighter — defending lead matters less when gap is huge

  for (const userId of recipientIds) {
    const me = lbByUser.get(userId);
    if (!me || typeof me.total_score !== 'number') {
      out.set(userId, null);
      continue;
    }
    const myScore = me.total_score;
    const aboveCap = Math.max(ABOVE_GAP_FLOOR, Math.round(myScore * ABOVE_GAP_MAX_RATIO));
    const belowCap = Math.max(BELOW_GAP_FLOOR, Math.round(myScore * ABOVE_GAP_MAX_RATIO));

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
