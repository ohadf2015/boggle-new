/** Admin dashboard KPI stats and system health, polled every 30s while the tab is visible. */

import { useState, useCallback } from 'react';
import { fetchAdminJson, useAdminPoll } from './useAdminPoll';

const ADMIN_API_BASE = '/api/admin';
const REFRESH_INTERVAL = 30_000;

export interface StatsData {
  overview: { totalPlayers: number; totalGames: number; totalWords: number; totalGameTimeHours: number; totalGuests?: number; testAccounts?: number };
  activity: { gamesToday: number; uniquePlayersToday: number; uniquePlayersWeek: number; uniquePlayersMonth: number; signupsToday: number; signupsWeek: number };
  languages: Record<string, number>;
}

export interface HealthData {
  redis: 'ok' | 'down';
  database: 'ok' | 'down';
  process: { heapMB: number; uptimeSeconds: number };
}

interface AdminDashboardData {
  stats: StatsData | null;
  health: HealthData | null;
  loading: boolean;
  error: string | null;
}

export function useAdminDashboard(authToken: string | null): AdminDashboardData {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!authToken) return;

    try {
      const [statsData, healthData] = await Promise.allSettled([
        fetchAdminJson<StatsData>(`${ADMIN_API_BASE}/stats`, authToken),
        fetchAdminJson<HealthData>(`${ADMIN_API_BASE}/system/health`, authToken),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (healthData.status === 'fulfilled') setHealth(healthData.value);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useAdminPoll(fetchData, REFRESH_INTERVAL, authToken);

  return { stats, health, loading, error };
}
