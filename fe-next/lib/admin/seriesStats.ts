/** Small pure helpers for daily series, shared by the education insights and the Overview pulse. */

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Percent change, rounded; null when there is no baseline to compare against. */
export function pctChange(current: number, prior: number): number | null {
  return prior === 0 ? null : Math.round(((current - prior) / prior) * 100);
}

/** Trailing days with a zero count (a long run can mean an outage or lost tracking). */
export function trailingZeros(xs: number[]): number {
  let n = 0;
  while (n < xs.length && xs[xs.length - 1 - n] === 0) n += 1;
  return n;
}

const RECENT_DAYS = 3;

/** Average of the last 3 days against the earlier days of the series; null without a baseline. */
export function momentum(daily: number[]): number | null {
  if (daily.length <= RECENT_DAYS) return null;
  const avg = (xs: number[]) => sum(xs) / xs.length;
  const base = avg(daily.slice(0, -RECENT_DAYS));
  if (base === 0) return null;
  return pctChange(avg(daily.slice(-RECENT_DAYS)), base);
}
