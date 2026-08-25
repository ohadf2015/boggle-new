'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the signed-in teacher has an active Teacher Pro subscription.
 *
 * `has_pro` is computed server-side in lib/subscriptions.ts (`tier === 'pro' && status ===
 * 'active'`); this only carries the answer to the components that gate on it. Two deliberate
 * choices:
 *
 * - `hasPro` starts false and `loading` starts true, and callers must render NEITHER state
 *   while loading. An optimistic `true` would paint the paid surface and yank it away; an
 *   eager `false` would tell a paying teacher to pay again.
 * - Any failure resolves to free. The gate is a merchandising boundary, not a security one —
 *   the analytics data is the teacher's own and RLS already governs it — so failing closed
 *   costs a Pro teacher one refresh, while failing open gives the product away on every
 *   flaky request.
 */
export function useTeacherPro(): { hasPro: boolean; loading: boolean } {
  const [hasPro, setHasPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/subscription/status');
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setHasPro(data?.has_pro === true);
      } catch {
        // Stays free — see the fail-closed note above.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { hasPro, loading };
}
