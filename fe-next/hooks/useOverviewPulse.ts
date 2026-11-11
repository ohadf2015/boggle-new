/**
 * Data for the Overview pulse: the daily series, weekly signups, revenue and the admin
 * notification feed, fetched together and turned into tiles + findings by buildPulse.
 * Today-vs-yesterday and the 7-day view share one 14-day fetch; the 30-day view needs two
 * 30-day windows and refetches once when chosen.
 */

import { useCallback, useMemo, useState } from 'react';
import { buildPulse, type DailyPoint, type GrowthWeek, type Pulse, type PulseInput, type PulseWindow } from '@/lib/admin/overviewPulse';
import type { HealthData, StatsData } from './useAdminDashboard';
import { fetchAdminJson, useAdminPoll } from './useAdminPoll';

const REFRESH_INTERVAL = 60_000;
const daysNeeded = (w: PulseWindow) => (w === 30 ? 60 : 14);
const GROWTH_WEEKS = 12;

interface Raw {
  /** When the data was fetched; the pulse is computed as of then, so renders stay pure. */
  fetchedAt: number;
  /** How many days of `daily` were requested. */
  dailyDays: number;
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
  const [windowDays, setWindowDays] = useState<PulseWindow>(1);
  const [raw, setRaw] = useState<Raw>({ fetchedAt: 0, dailyDays: 0, daily: null, growth: null, revenue: null, unreadReports: 0 });
  const [failed, setFailed] = useState(false);

  const dailyDays = daysNeeded(windowDays);
  const load = useCallback(async () => {
    if (!authToken) return;
    const get = <T,>(path: string) => fetchAdminJson<T>(path, authToken);
    const [daily, growth, revenue, feed] = await Promise.allSettled([
      get<{ daily: DailyPoint[] }>(`/api/admin/activity/daily?days=${dailyDays}`),
      get<{ growth: GrowthWeek[] }>(`/api/admin/analytics/signup-growth?weeks=${GROWTH_WEEKS}`),
      get<{ revenue: NonNullable<PulseInput['revenue']> }>('/api/admin/analytics/revenue'),
      get<{ items: FeedItem[] }>('/api/admin/notifications'),
    ]);
    // A failed piece keeps its last good value; only a total outage is reported as an error.
    setRaw((prev) => ({
      fetchedAt: Date.now(),
      dailyDays: daily.status === 'fulfilled' ? dailyDays : prev.dailyDays,
      daily: daily.status === 'fulfilled' ? daily.value.daily : prev.daily,
      growth: growth.status === 'fulfilled' ? growth.value.growth : prev.growth,
      revenue: revenue.status === 'fulfilled' ? revenue.value.revenue : prev.revenue,
      unreadReports: feed.status === 'fulfilled' ? feed.value.items.filter((i) => i.kind === 'user_report' && !i.read_at).length : prev.unreadReports,
    }));
    setFailed([daily, growth, revenue].every((r) => r.status === 'rejected'));
  }, [authToken, dailyDays]);

  useAdminPoll(load, REFRESH_INTERVAL, `${authToken}:${dailyDays}`);

  const pulse: Pulse | null = useMemo(
    () =>
      raw.daily === null || raw.dailyDays < daysNeeded(windowDays)
        ? null
        : buildPulse({ nowMs: raw.fetchedAt, windowDays, daily: raw.daily, growth: raw.growth ?? [], stats, revenue: raw.revenue, health, unreadReports: raw.unreadReports }),
    [raw, windowDays, stats, health],
  );

  return { pulse, windowDays, setWindowDays, failed, retry: load, revenue: raw.revenue };
}
