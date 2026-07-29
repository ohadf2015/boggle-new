/**
 * Hook for fetching admin dashboard KPI stats and system health.
 *
 * Polls every 30s while the admin tab is visible. Pauses the poll when the
 * tab is hidden (`document.hidden === true`) and refetches immediately when
 * it becomes visible again — keeps server load + bandwidth scoped to admins
 * who are actually looking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const ADMIN_API_BASE = '/api/admin';
const REFRESH_INTERVAL = 30_000;

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
  return json.data ?? json;
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
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

  // Stable ref so the visibility listener never goes stale.
  const fetchRef = useRef(fetchData);
  useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);

  useEffect(() => {
    fetchRef.current();

    const interval = setInterval(() => {
      if (isHidden()) return;
      fetchRef.current();
    }, REFRESH_INTERVAL);

    const onVisibility = () => {
      if (!isHidden()) fetchRef.current();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authToken]);

  return { stats, health, loading, error };
}
