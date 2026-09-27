'use client';

/**
 * Closes the referral loop. Renders nothing.
 *
 * Codes were shareable and `POST /api/growth/referral` could always claim one,
 * but no client ever read `?ref=` or called the endpoint, so the loop had never
 * fired: 375 codes issued, 0 referrals, 0 rewards.
 *
 * Two beats, because whoever opens a referral link usually has no account yet:
 *  1. capture `?ref=` on arrival and hold it (signed out is the normal case),
 *  2. claim it once authenticated, then drop it.
 *
 * A failed claim only drops the code when the server gave a terminal answer
 * (invalid code / self-referral / already referred). A 5xx or an offline throw
 * keeps it, so a bad deploy or a tunnel doesn't silently burn someone's referral.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { postWithAuth } from '@/utils/authFetch';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  readReferralCodeFromSearch,
  readPendingReferral,
  storePendingReferral,
  clearPendingReferral,
} from '@/lib/referral/pendingReferral';

export default function ReferralCodeClaimer() {
  const { isAuthenticated, user } = useAuth();
  // Claiming twice is harmless server-side (it 400s as a duplicate) but it would
  // burn a request on every render, and StrictMode double-invokes effects.
  const claiming = useRef(false);

  useEffect(() => {
    const fromUrl = readReferralCodeFromSearch(window.location.search);
    if (fromUrl) {
      storePendingReferral(fromUrl);
      trackGrowthEvent('referral_link_clicked', { referralCode: fromUrl });
    }

    const code = readPendingReferral();
    if (!code || !isAuthenticated || !user || claiming.current) return;

    claiming.current = true;
    void (async () => {
      try {
        // /api/referral, not the thinner /api/growth/referral claim that used to
        // sit alongside it: this one also grants the referrer their coins, XP and
        // milestone bonuses, and records the reward rows.
        const res = await postWithAuth('/api/referral', { referralCode: code });
        // 4xx is the server's final answer on this code — retrying can only
        // repeat it. 5xx and network failures are not, so the code survives.
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          clearPendingReferral();
        }
      } catch {
        // Offline or aborted — keep the code and try again next mount.
      } finally {
        claiming.current = false;
      }
    })();
  }, [isAuthenticated, user]);

  return null;
}
