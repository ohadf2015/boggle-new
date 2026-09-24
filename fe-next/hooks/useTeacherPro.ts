'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionSource } from '@/lib/education/proGrant';

export interface TeacherProGrant {
  id: string;
  expires_at: string;
  days: number;
  note: string | null;
  /** True once the one-time "you're on Pro" celebration has been shown. */
  welcomed: boolean;
}

export interface TeacherProState {
  hasPro: boolean;
  loading: boolean;
  /** Where Pro comes from: the payment provider or a complimentary admin grant. */
  source: SubscriptionSource;
  /** Renewal date (provider) or hard end date (grant). */
  periodEnd: string | null;
  /** The complimentary grant record, when Pro is (or was) a gift. */
  grant: TeacherProGrant | null;
  /** A gift that has run out — the teacher is free again and should be told why. */
  grantExpired: boolean;
  /** Re-read the entitlement (after a grant lands, after checkout returns). */
  refresh: () => Promise<void>;
}

const FREE: Omit<TeacherProState, 'loading' | 'refresh'> = {
  hasPro: false, source: 'polar', periodEnd: null, grant: null, grantExpired: false,
};

// The dashboard mounts several consumers at once (plan badge, ProGate, the
// celebration, the banner). One in-flight request serves all of them; `refresh`
// drops it so the next read is fresh.
// Share the PARSED body, never the Response: a body reads once, so every consumer after the
// first threw "body already used", fell back to FREE, and showed a paying teacher a paywall.
// null = a non-OK response (stays free).
type StatusBody = Record<string, unknown> | null;
let inflight: Promise<StatusBody> | null = null;
function fetchStatus(force: boolean): Promise<StatusBody> {
  if (force || !inflight) {
    inflight = fetch('/api/subscription/status')
      .then((r) => (r.ok ? (r.json() as Promise<StatusBody>) : null))
      .finally(() => {
      // Keep the settled promise only for the current tick so concurrent mounts
      // share it, but a later mount re-reads.
      setTimeout(() => { inflight = null; }, 0);
    });
  }
  return inflight;
}

/**
 * Whether the signed-in teacher has an active Teacher Pro subscription, and where it
 * came from.
 *
 * `has_pro` is computed server-side in lib/subscriptions.ts; this only carries the
 * answer to the components that gate on it. Two deliberate choices:
 *
 * - `hasPro` starts false and `loading` starts true, and callers must render NEITHER state
 *   while loading. An optimistic `true` would paint the paid surface and yank it away; an
 *   eager `false` would tell a paying teacher to pay again.
 * - Any failure resolves to free. The gate is a merchandising boundary, not a security one —
 *   the analytics data is the teacher's own and RLS already governs it — so failing closed
 *   costs a Pro teacher one refresh, while failing open gives the product away on every
 *   flaky request.
 */
export function useTeacherPro(): TeacherProState {
  const [state, setState] = useState<Omit<TeacherProState, 'loading' | 'refresh'>>(FREE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (isCancelled: () => boolean, force = false) => {
    try {
      const data = await fetchStatus(force);
      if (!data) return;
      if (isCancelled()) return;
      setState({
        hasPro: data?.has_pro === true,
        source: (data?.source as SubscriptionSource) || 'polar',
        periodEnd: (data?.current_period_end as string | null) ?? null,
        grant: (data?.grant as TeacherProGrant | null) ?? null,
        grantExpired: data?.grant_expired === true,
      });
    } catch {
      // Stays free — see the fail-closed note above.
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(() => load(() => false, true), [load]);

  return { ...state, loading, refresh };
}
