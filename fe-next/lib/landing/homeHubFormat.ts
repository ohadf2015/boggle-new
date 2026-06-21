/**
 * Pure formatting helpers for the mobile Home Hub (`components/landing/HomeHub`).
 * Kept side-effect-free + framework-free so they're unit-testable and shared by
 * the top bar, the live pill, the daily streak strip, and the rank XP bar.
 */

/**
 * Compact a live-player count for the "{n} online" pills.
 *   980 → "980" · 1240 → "1.2k" · 12000 → "12k" · 12500 → "12.5k"
 * Defensive: negatives / NaN / Infinity collapse to "0" (a live stat should
 * never paint a garbage string when the source feed hiccups).
 */
export function formatLiveShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(Math.floor(n));
  const k = n / 1000;
  // one decimal, but drop a trailing ".0" so 12000 reads "12k" not "12.0k"
  return `${k.toFixed(1).replace(/\.0$/, '')}k`;
}

/** Clamp a percentage into 0..100 (NaN/Infinity → 0). Drives the level ring + XP bar. */
export function clampPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Humanise a raw `LEVEL_TITLES` constant (e.g. "LEXICON_KING") into a readable
 * "Lexicon King". Used purely as the i18n FALLBACK when a localized title string
 * is missing — so the top bar never paints a SCREAMING_SNAKE constant at users.
 */
export function formatTitleFallback(raw: string): string {
  if (!raw) return '';
  return raw
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** One day in the daily-challenge week tracker. */
export interface DailyWeekCell {
  /** ISO date (YYYY-MM-DD, UTC) this cell represents. */
  date: string;
  /** Did the player complete the daily on this date? */
  played: boolean;
  /** Is this today (the last, live cell)? */
  isToday: boolean;
}

/**
 * Build the daily-challenge week tracker: the last `days` calendar days ending
 * today, in chronological order (oldest → today). Each cell is `played` when its
 * date appears in `playedDates`, and the final cell is flagged `isToday`.
 *
 * Unlike the old streak-mirror strip (which just lit `min(streak, 5)` cells),
 * this reflects the player's ACTUAL completion history per day — so a gap
 * yesterday shows as an empty cell between two filled ones.
 *
 * Defensive: an unparseable `todayDate` yields `days` empty (unplayed) cells
 * rather than throwing, so a storage hiccup never crashes the home card.
 */
export function dailyWeekCells(
  playedDates: Iterable<string>,
  todayDate: string,
  days = 7,
): DailyWeekCell[] {
  const played = new Set(playedDates);
  const base = new Date(`${todayDate}T00:00:00Z`);
  const valid = !Number.isNaN(base.getTime());

  return Array.from({ length: days }, (_, idx) => {
    // idx 0 = oldest, idx (days-1) = today
    const offset = days - 1 - idx;
    if (!valid) return { date: '', played: false, isToday: offset === 0 };
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - offset);
    const iso = d.toISOString().split('T')[0];
    return { date: iso, played: played.has(iso), isToday: offset === 0 };
  });
}
