'use client';

/**
 * Fetches the delete-impact summary for the signed-in user (GET
 * /api/account/delete). The cookie session authenticates it — no bearer
 * juggling. A failed fetch must not block deletion: impact stays null and
 * the caller shows the plain confirm.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DeleteImpactSummary } from './deleteAccountImpact';

export interface UseDeleteImpactResult {
  impact: DeleteImpactSummary | null;
  isLoading: boolean;
  reload: () => void;
}

export function useDeleteImpact(enabled: boolean): UseDeleteImpactResult {
  const [impact, setImpact] = useState<DeleteImpactSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/account/delete', { method: 'GET' });
        const data = r.ok ? await r.json() : null;
        if (!cancelled && data && typeof data.isTeacher === 'boolean') {
          setImpact(data as DeleteImpactSummary);
        }
      } catch {
        // A failed impact read must never block the delete flow.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { impact, isLoading, reload };
}
