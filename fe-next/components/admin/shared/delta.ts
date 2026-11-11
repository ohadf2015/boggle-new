import type { PeriodDelta } from '@/lib/admin/eduMetrics';

export type Translate = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

export function formatDelta(delta: PeriodDelta | null): string | null {
  if (!delta || delta.pct === null) return null;
  const sign = delta.pct > 0 ? '+' : '';
  // Isolated left-to-right so the sign stays attached to the number inside right-to-left text.
  return `\u2066${sign}${delta.pct}%\u2069`;
}

/** The change against the previous window, in words an owner reads without a legend. */
export function deltaSentence(delta: PeriodDelta, windowDays: number, t: Translate): string {
  if (delta.prior === 0) {
    return delta.current === 0
      ? t('admin.delta.noneEither', 'None in the previous {days} days either', { days: windowDays })
      : t('admin.delta.fromZero', 'Up from 0 in the previous {days} days', { days: windowDays });
  }
  return t('admin.delta.vsPrior', '{pct} vs the previous {days} days (was {prior})', {
    pct: formatDelta(delta) ?? '0%',
    days: windowDays,
    prior: delta.prior,
  });
}

/** Today so far against a full yesterday: judged by pace, and silent in the first hours of the day. */
export function dayDeltaSentence(tile: { prior: number; projected?: number | null; pct: number | null }, t: Translate): string {
  const { prior, projected, pct } = tile;
  if (projected == null) return t('admin.delta.dayEarly', 'Yesterday: {prior}. Too early in the day to compare.', { prior });
  if (prior === 0 && projected === 0) return t('admin.delta.dayNone', 'None today and none yesterday either');
  if (pct === null) return t('admin.delta.dayFromZero', 'At this pace: {projected} (yesterday: 0)', { projected });
  return t('admin.delta.dayPace', 'At this pace: {projected} · {pct} vs yesterday ({prior})', {
    projected,
    pct: formatDelta({ current: projected, prior, pct }) ?? '0%',
    prior,
  });
}
