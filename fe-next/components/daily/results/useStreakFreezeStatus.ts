import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';

export interface UseStreakFreezeStatusReturn {
  freezesAvailable: number;
  isStreakProtected: boolean;
}

/**
 * Reads /api/streak for authenticated users and exposes the two flags the
 * results-screen indicator needs. Errors are swallowed intentionally — the
 * indicator is purely informational and must never block results rendering.
 */
export function useStreakFreezeStatus(isAuthenticated: boolean): UseStreakFreezeStatusReturn {
  const [freezesAvailable, setFreezesAvailable] = useState(0);
  const [isStreakProtected, setIsStreakProtected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWithAuth('/api/streak')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setFreezesAvailable(data.freezesAvailable ?? 0);
        const today = new Date().toISOString().split('T')[0];
        const protected_ = data.protectedUntil && new Date(data.protectedUntil) >= new Date(today);
        setIsStreakProtected(Boolean(protected_));
      })
      .catch(() => {
        /* silently ignore — indicator is optional */
      });
  }, [isAuthenticated]);

  return { freezesAvailable, isStreakProtected };
}
