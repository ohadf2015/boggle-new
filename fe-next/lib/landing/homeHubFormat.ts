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

/**
 * The daily-streak strip: `total` cells, the first `min(streak, total)` filled.
 * Returns a boolean[] the component maps to lime-filled / navy-empty squares.
 */
export function streakStripCells(streak: number, total = 5): boolean[] {
  const filled = Math.max(0, Math.min(Math.floor(streak) || 0, total));
  return Array.from({ length: total }, (_, i) => i < filled);
}

/**
 * The daily-challenge progress strip: real recent completion, not a streak echo.
 * Takes the per-day completion history (each day "done" when either the Word Hunt
 * OR Word Wheel daily was played) and returns the most recent `total` days as a
 * boolean[] (oldest→newest). Fewer days than `total` left-pad with empty cells so
 * the strip width is stable. Unlike `streakStripCells` (which just fills the first
 * N), this reflects WHICH days were actually completed.
 */
export function dailyProgressCells(
  days: ReadonlyArray<{ wordHunt: boolean; wordWheel: boolean }>,
  total = 5,
): boolean[] {
  const recent = Array.isArray(days) ? days.slice(-total) : [];
  const cells = recent.map((d) => Boolean(d?.wordHunt || d?.wordWheel));
  // left-pad so the strip is always `total` wide (oldest cells empty)
  while (cells.length < total) cells.unshift(false);
  return cells;
}

/** Clamp a percentage into 0..100 (NaN/Infinity → 0). Drives the level ring + XP bar. */
export function clampPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}
