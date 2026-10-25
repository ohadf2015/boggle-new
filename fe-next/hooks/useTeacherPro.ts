'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionSource } from '@/lib/education/proGrant';

export interface TeacherProGrant {
  id: string;
  expires_at: string;
  days: number;
  note: string | null;
  /** True once the one-time "you're on Pro" celebration has been shown. */
  welcomed: boolean;
}

export type TeacherProStatus = 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing';

export interface TeacherProState {
  hasPro: boolean;
  loading: boolean;
  /** Where Pro comes from: the payment provider or a complimentary admin grant. */
  source: SubscriptionSource;
  /** Provider status. `trialing` is the Polar Teacher Pro trial, not access. */
  status: TeacherProStatus;
  /** Renewal date (provider) or hard end date (grant). */
  periodEnd: string | null;
  /** ISO Polar trial end while status is trialing, else null. */
  trialExpires: string | null;
  /** ISO end of the live ACCESS trial (no card, no Pro entitlement), else null. */
  accessTrialExpires: string | null;
  /** The free access trial is known to have ended: no trial offer, straight to paid. */
  accessTrialEnded: boolean;
  /** A Polar trial was started. Hides the free-trial CTA after it ends. */
  trialUsed: boolean;
  /** True only after a successful status read. A failure must not look like "never trialed". */
  known: boolean;
  /** The complimentary grant record, when Pro is (or was) a gift. */
  grant: TeacherProGrant | null;
  /** A gift that has run out — the teacher is free again and should be told why. */
  grantExpired: boolean;
  /** Polar customer portal for a paying teacher, when the status read returned one. */
  portalUrl: string | null;
  /** Started Polar checkout in the last 14 days without completing it. */
  pendingCheckout: boolean;
  /** Re-read the entitlement (after a grant lands, after checkout returns). */
  refresh: () => Promise<void>;
}

const FREE: Omit<TeacherProState, 'loading' | 'refresh'> = {
  hasPro: false, source: 'polar', status: 'active', periodEnd: null, trialExpires: null, accessTrialExpires: null, accessTrialEnded: false, trialUsed: false, known: false, grant: null, grantExpired: false, portalUrl: null, pendingCheckout: false,
};

// The dashboard mounts several consumers at once (plan badge, ProGate, the
// celebration, the banner). One in-flight request serves all of them; `refresh`
// drops it so the next read is fresh.
// Share the PARSED body, never the Response: a body reads once, so every consumer after the
// first threw "body already used", fell back to FREE, and showed a paying teacher a paywall.
type StatusBody = Record<string, unknown> & { pending_checkout?: boolean };
type StatusRead = { kind: 'ok'; body: StatusBody } | { kind: 'signedOut' } | { kind: 'failed' };
let inflight: Promise<StatusRead> | null = null;
function fetchStatus(force: boolean): Promise<StatusRead> {
  if (force || !inflight) {
    inflight = fetch('/api/subscription/status')
      .then(async (r): Promise<StatusRead> => {
        if (r.ok) return { kind: 'ok', body: (await r.json()) as StatusBody };
        return r.status === 401 || r.status === 403 ? { kind: 'signedOut' } : { kind: 'failed' };
      })
      .catch((): StatusRead => ({ kind: 'failed' }))
      .finally(() => {
      // Keep the settled promise only for the current tick so concurrent mounts
      // share it, but a later mount re-reads.
      setTimeout(() => { inflight = null; }, 0);
    });
  }
  return inflight;
}

const RETRY_MS = 1500;
let lastKnown: { userId: string; state: Omit<TeacherProState, 'loading' | 'refresh'> } | null = null;

function stateFrom(data: StatusBody): Omit<TeacherProState, 'loading' | 'refresh'> {
  const status = (data?.status as TeacherProStatus) || 'active';
  return {
    hasPro: data?.has_pro === true,
    source: (data?.source as SubscriptionSource) || 'polar',
    status,
    periodEnd: (data?.current_period_end as string | null) ?? null,
    trialExpires: typeof data?.trial_expires === 'string' ? data.trial_expires : null,
    accessTrialExpires: typeof data?.access_trial_expires === 'string' ? data.access_trial_expires : null,
    accessTrialEnded: data?.has_pro === true ? false : data?.access_trial_ended === true,
    trialUsed: data?.trial_used === true || status === 'trialing',
    known: true,
    grant: (data?.grant as TeacherProGrant | null) ?? null,
    grantExpired: data?.grant_expired === true,
    portalUrl: typeof data?.portal_url === 'string' ? data.portal_url : null,
    pendingCheckout: data?.has_pro === true ? false : data?.pending_checkout === true,
  };
}

/**
 * Whether the signed-in teacher has an active Teacher Pro subscription, and where it
 * came from.
 *
 * `has_pro` is computed server-side in lib/subscriptions.ts; this only carries the
 * answer to the components that gate on it. Callers render NEITHER the paid surface nor
 * the paywall while `loading`:
 *
 * - `hasPro` starts false, so a failure never gives the product away.
 * - A failed read (5xx, network) is retried once; if it still fails the last answer this
 *   tab saw for this same account is reused, else `loading` stays true. A paying teacher on flaky school wifi
 *   sees a neutral state, not "Upgrade". Only a signed-out answer resolves to free.
 */
export function useTeacherPro(): TeacherProState {
  const [state, setState] = useState<Omit<TeacherProState, 'loading' | 'refresh'>>(FREE);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const userIdRef = useRef('');
  userIdRef.current = user?.id ?? '';

  const load = useCallback(async (isCancelled: () => boolean, force = false) => {
    let read = await fetchStatus(force);
    if (read.kind === 'failed') {
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      if (isCancelled()) return;
      read = await fetchStatus(true);
    }
    if (isCancelled()) return;
    if (read.kind === 'ok') {
      const next = stateFrom(read.body);
      lastKnown = userIdRef.current ? { userId: userIdRef.current, state: next } : null;
      setState(next);
      setLoading(false);
      return;
    }
    if (read.kind === 'signedOut') {
      lastKnown = null;
      setState(FREE);
      setLoading(false);
      return;
    }
    if (lastKnown && userIdRef.current && lastKnown.userId === userIdRef.current) {
      setState(lastKnown.state);
      setLoading(false);
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
