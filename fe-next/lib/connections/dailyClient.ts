/**
 * Word Bridge daily-challenge client helpers — share text (pure) + thin API
 * wrappers + a stable guest fingerprint. The game logic lives in the engine;
 * this is the network/localStorage edge.
 */
import { clientStreakAfterSolve, type ClientStreak } from './streak';

export interface ShareParams {
  title: string;
  dateISO: string;
  puzzlesSolved: number;
  total: number;
  streak: number;
  rank: number | null;
}

/** Build a compact, shareable result line (pure). */
export function dailyShareText({ title, dateISO, puzzlesSolved, total, streak, rank }: ShareParams): string {
  const parts = [`🌉 ${title} ${dateISO}`, `${puzzlesSolved}/${total} ✅ · 🔥${streak}`];
  if (rank != null) parts[1] += ` · #${rank}`;
  return parts.join('\n');
}

/** Current UTC calendar day, 'YYYY-MM-DD'. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const FP_KEY = 'connections-guest-fp';
const STREAK_KEY = 'connections-daily-streak';
const PLAYED_KEY = 'connections-daily-played';

/**
 * Record that the player finished today's Word Bridge daily. Written
 * unconditionally on completion (NOT gated on server-submit success), so it is
 * a reliable "played today" signal for BOTH authed and guest players — unlike
 * the streak, which authed players resolve server-side and never persist
 * locally. Read by cross-promo cards to avoid nudging a mode already played.
 */
export function markConnectionsPlayedToday(dateISO: string = todayUTC()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYED_KEY, dateISO);
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/** True if the player already completed today's Word Bridge daily. */
export function hasPlayedConnectionsToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PLAYED_KEY) === todayUTC();
  } catch {
    return false;
  }
}

/** A stable per-device guest id (for unauthenticated leaderboard entries). */
export function getGuestFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let fp = window.localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return 'guest';
  }
}

/** Read/advance the guest's locally-stored streak (authed players use the server value). */
export function readClientStreak(): ClientStreak | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as ClientStreak) : null;
  } catch {
    return null;
  }
}

export function advanceClientStreak(todayISO: string): ClientStreak {
  const next = clientStreakAfterSolve(readClientStreak(), todayISO);
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export interface SubmitPayload {
  puzzleDate: string;
  language: string;
  displayName: string;
  score: number;
  timeTakenSeconds: number;
  puzzlesSolved: number;
  guestFingerprint?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  avatarImage?: string;
}

export interface SubmitResult {
  success: boolean;
  streak: number;
  score: number;
  currentRank: number;
  totalPlayers: number;
}

/** POST a daily result. Returns null on failure (never throws into the UI). */
export async function submitDailyScore(payload: SubmitPayload): Promise<SubmitResult | null> {
  // Offline: queue the result so it isn't lost — it syncs (and credits streak /
  // leaderboard) on reconnect via /api/scores/sync → dispatchConnections. The
  // sync route is auth-only, so this needs a cached session (getSession is local,
  // no network); guests have none and fall through to the network attempt.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const { data } = await createClient().auth.getSession();
      if (data.session?.user) {
        const [{ getOfflineStore }, { enqueueScore }] = await Promise.all([
          import('@/lib/offline'),
          import('@/lib/offline/scoreQueue'),
        ]);
        const store = await getOfflineStore();
        await enqueueScore(store, 'connections', payload);
        // Optimistic result so the UI proceeds; the real rank/streak arrive when
        // the queue syncs on reconnect.
        return { success: true, streak: 0, score: payload.score, currentRank: 0, totalPlayers: 0 };
      }
    } catch {
      // Fall through to the network attempt (which will likely fail → null).
    }
  }

  try {
    const res = await fetch('/api/connections/daily/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitResult;
  } catch {
    return null;
  }
}

export interface LeaderboardRow {
  rank_position: number;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image: string | null;
  score: number;
  time_taken_seconds: number;
  streak: number;
  puzzles_solved: number;
  language: string;
}

export interface LeaderboardResult {
  success: boolean;
  puzzleDate: string;
  totalPlayers: number;
  leaderboard: LeaderboardRow[];
  ownRank: number | null;
}

export async function fetchDailyLeaderboard(
  dateISO: string,
  opts: { guestFingerprint?: string; limit?: number } = {},
): Promise<LeaderboardResult | null> {
  try {
    const params = new URLSearchParams();
    if (opts.guestFingerprint) params.set('guestFingerprint', opts.guestFingerprint);
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const res = await fetch(`/api/connections/daily/${dateISO}/leaderboard${qs ? `?${qs}` : ''}`);
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResult;
  } catch {
    return null;
  }
}
