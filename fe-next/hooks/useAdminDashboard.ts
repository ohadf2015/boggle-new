/**
 * Hook for fetching admin dashboard KPI stats and system health.
 */

import { useState, useEffect, useCallback } from 'react';

const ADMIN_API_BASE = '/api/admin';
const REFRESH_INTERVAL = 30_000; // 30 seconds

interface StatsData {
  overview: { totalPlayers: number; totalGames: number; totalWords: number; totalGameTimeHours: number };
  activity: { gamesToday: number; uniquePlayersToday: number; uniquePlayersWeek: number; uniquePlayersMonth: number; signupsToday: number; signupsWeek: number };
  languages: Record<string, number>;
}

interface HealthData {
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

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // Handle both old format (direct) and new format (envelope with .data)
  return json.data ?? json;
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
        fetchJson<StatsData>(`${ADMIN_API_BASE}/stats`, authToken),
        fetchJson<HealthData>(`${ADMIN_API_BASE}/system/health`, authToken),
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { stats, health, loading, error };
}
