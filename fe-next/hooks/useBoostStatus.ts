'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface BoostStatus {
  remaining: number;
  capPerDay: number;
  resetAt: string;
}

interface UseBoostStatusReturn {
  status: BoostStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBoostStatus(): UseBoostStatusReturn {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/boosts/status');
      if (!res.ok) {
        setError(`status_${res.status}`);
        return;
      }
      setStatus(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, isLoading, error, refresh };
}
