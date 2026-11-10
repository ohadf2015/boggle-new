/**
 * Data for the Overview pulse: the daily series, weekly signups, revenue and the admin
 * notification feed, fetched together and turned into tiles + findings by buildPulse.
 * The 7/30-day toggle only recomputes; it never refetches.
 */

import { useCallback, useMemo, useState } from 'react';
import { buildPulse, type DailyPoint, type GrowthWeek, type Pulse, type PulseInput, type PulseWindow } from '@/lib/admin/overviewPulse';
import type { HealthData, StatsData } from './useAdminDashboard';
import { fetchAdminJson, useAdminPoll } from './useAdminPoll';

const REFRESH_INTERVAL = 60_000;
/** Two 30-day windows: enough to compare this month with the last. */
const DAILY_DAYS = 60;
const GROWTH_WEEKS = 12;

interface Raw {
  /** When the data was fetched; the pulse is computed as of then, so renders stay pure. */
  fetchedAt: number;
  daily: DailyPoint[] | null;
  growth: GrowthWeek[] | null;
  revenue: PulseInput['revenue'];
  unreadReports: number;
}

interface FeedItem {
  kind: string;
  read_at: string | null;
}

export function useOverviewPulse(authToken: string | null, stats: StatsData | null, health: HealthData | null) {
  const [windowDays, setWindowDays] = useState<PulseWindow>(7);
  const [raw, setRaw] = useState<Raw>({ fetchedAt: 0, daily: null, growth: null, revenue: null, unreadReports: 0 });
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!authToken) return;
    const get = <T,>(path: string) => fetchAdminJson<T>(path, authToken);
    const [daily, growth, revenue, feed] = await Promise.allSettled([
      get<{ daily: DailyPoint[] }>(`/api/admin/activity/daily?days=${DAILY_DAYS}`),
      get<{ growth: GrowthWeek[] }>(`/api/admin/analytics/signup-growth?weeks=${GROWTH_WEEKS}`),
      get<{ revenue: NonNullable<PulseInput['revenue']> }>('/api/admin/analytics/revenue'),
      get<{ items: FeedItem[] }>('/api/admin/notifications'),
    ]);
    // A failed piece keeps its last good value; only a total outage is reported as an error.
    setRaw((prev) => ({
      fetchedAt: Date.now(),
      daily: daily.status === 'fulfilled' ? daily.value.daily : prev.daily,
      growth: growth.status === 'fulfilled' ? growth.value.growth : prev.growth,
      revenue: revenue.status === 'fulfilled' ? revenue.value.revenue : prev.revenue,
      unreadReports: feed.status === 'fulfilled' ? feed.value.items.filter((i) => i.kind === 'user_report' && !i.read_at).length : prev.unreadReports,
    }));
    setFailed([daily, growth, revenue].every((r) => r.status === 'rejected'));
  }, [authToken]);

  useAdminPoll(load, REFRESH_INTERVAL, authToken);

  const pulse: Pulse | null = useMemo(
    () =>
      raw.daily === null
        ? null
        : buildPulse({ nowMs: raw.fetchedAt, windowDays, daily: raw.daily, growth: raw.growth ?? [], stats, revenue: raw.revenue, health, unreadReports: raw.unreadReports }),
    [raw, windowDays, stats, health],
  );

  return { pulse, windowDays, setWindowDays, failed, retry: load, revenue: raw.revenue };
}
