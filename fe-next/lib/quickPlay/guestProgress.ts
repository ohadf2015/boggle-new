/**
 * Quick Play progression for signed-out players.
 *
 * `/api/quick-play/submit` is auth-gated (rewards are server-granted), so a
 * guest round used to come back as the zero outcome: +0 coins, +0 XP, "better
 * than 0% of today's scores", rank 0/300 — while the same screen announced
 * "+18 rank points this round". Most LexiClash players are signed out, so that
 * zero screen IS Quick Play for most people.
 *
 * This keeps the same numbers locally. Coins and XP are counted as PENDING, not
 * granted — matching how the daily challenge treats guests (compute the reward,
 * hand it over only once there's an account to hang it on).
 */
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';

const KEY = 'lexiclash_quick_guest_v1';

/** Mirrors backend/modules/quickPlaySubmit.ts — keep the two in sync. */
const COINS_FLAT = 25;
const COINS_CAP = 200;
const QUICK_XP_BASE = 20;
const QUICK_XP_PCT_FACTOR = 0.8;
/** Rounds kept for the "vs your average" line; the server keeps 10. */
const HISTORY_LIMIT = 10;

export interface QuickGuestProgress {
  /** Sum of every round's score_pct — the same axis the server ranks on. */
  points: number;
  /** Newest first, this round included. */
  history: number[];
  /** Earned but unclaimable until they sign in. */
  coinsPending: number;
  xpPending: number;
  bestByMode: Record<string, number>;
  /** Local date (YYYY-MM-DD) of the last round, for the day streak. */
  lastPlayedDay: string | null;
  dayStreak: number;
}

const empty = (): QuickGuestProgress => ({
  points: 0,
  history: [],
  coinsPending: 0,
  xpPending: 0,
  bestByMode: {},
  lastPlayedDay: null,
  dayStreak: 0,
});

export function getGuestProgress(): QuickGuestProgress {
  return getJsonFromLocalStorage<QuickGuestProgress>(KEY, empty());
}

export function quickCoinsFor(scorePct: number): number {
  return Math.min(COINS_CAP, COINS_FLAT + Math.round(scorePct));
}

export function quickXpFor(scorePct: number): number {
  return Math.round(QUICK_XP_BASE + scorePct * QUICK_XP_PCT_FACTOR);
}

/** Local calendar day, not UTC — a streak breaks at the player's midnight. */
function localDay(now: Date): string {
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * Record a finished guest round and return the updated progress.
 * Idempotency is the caller's job (the hub already guards double-submit).
 */
export function recordGuestRound(
  input: { mode: string; scorePct: number },
  now: Date = new Date()
): QuickGuestProgress {
  const prev = getGuestProgress();
  const scorePct = Math.max(0, Math.min(100, Math.round(input.scorePct)));
  const today = localDay(now);
  const gap = prev.lastPlayedDay ? daysBetween(prev.lastPlayedDay, today) : null;
  const dayStreak = gap === 0 ? Math.max(1, prev.dayStreak) : gap === 1 ? prev.dayStreak + 1 : 1;

  const next: QuickGuestProgress = {
    points: prev.points + scorePct,
    history: [scorePct, ...prev.history].slice(0, HISTORY_LIMIT),
    coinsPending: prev.coinsPending + quickCoinsFor(scorePct),
    xpPending: prev.xpPending + quickXpFor(scorePct),
    bestByMode: { ...prev.bestByMode, [input.mode]: Math.max(prev.bestByMode[input.mode] ?? 0, scorePct) },
    lastPlayedDay: today,
    dayStreak,
  };
  saveJsonToLocalStorage(KEY, next);
  return next;
}

/**
 * The player's trailing average score_pct, 0 when they have no history.
 * Sent with the round request so the rival field can be aimed at their level
 * — signed in or not, this is the only level signal available before the
 * first server round of a session.
 */
export function recentAveragePct(): number {
  const { history } = getGuestProgress();
  if (history.length === 0) return 0;
  const recent = history.slice(0, 5);
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

/**
 * Percentile against today's public leaderboard rows.
 *
 * The server RPC is only reachable with a session, so a guest's percentile came
 * back 0 — i.e. "better than 0% of today's scores" after every round, including
 * good ones. The leaderboard endpoint IS public, so the same question gets
 * answered from the rows the screen already fetched.
 *
 * ponytail: top-N rows, not the full distribution, so a guest's percentile is
 * computed against the best players only and reads LOW rather than wrong.
 * Upgrade path: a public percentile RPC.
 */
export function percentileFromBoard(scorePct: number, board: Array<{ bestScorePct: number }>): number {
  if (board.length === 0) return 0;
  const below = board.filter((e) => e.bestScorePct < scorePct).length;
  return Math.round((below / board.length) * 100);
}
