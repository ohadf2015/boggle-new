'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import type { BoostType } from '@/shared/types/boosts';

export const BOOST_TOKEN_STORAGE_KEY = (sessionId: string) => `lexiclash_boost_${sessionId}`;

interface ClaimedState {
  boostType: BoostType;
  token: string;
}

interface AdPromiseCallbacks {
  resolve: (rewarded: boolean) => void;
  boostType: BoostType;
}

export function useBoostClaim(sessionId: string) {
  const adCallbacksRef = useRef<AdPromiseCallbacks | null>(null);
  const [claimed, setClaimed] = useState<ClaimedState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showAd } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'generic',
    onRewardEarned: async () => {
      // Ad was successfully watched — now make claim request
      if (!adCallbacksRef.current) return;
      const { boostType, resolve } = adCallbacksRef.current;
      await makeClaimRequest(boostType, resolve);
      adCallbacksRef.current = null;
    },
    onAdError: (errorMsg: string) => {
      // Ad failed or was declined
      if (!adCallbacksRef.current) return;
      const { resolve } = adCallbacksRef.current;
      setError(errorMsg);
      setIsLoading(false);
      resolve(false);
      adCallbacksRef.current = null;
    },
  });

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY(sessionId));
    if (raw) {
      try {
        setClaimed(JSON.parse(raw));
      } catch {
        /* ignore parse errors */
      }
    }
  }, [sessionId]);

  const makeClaimRequest = useCallback(
    async (boostType: BoostType, resolve: (success: boolean) => void) => {
      // Emit started event
      posthog?.capture('boost_claim_started', { boost_type: boostType });

      try {
        const res = await fetch('/api/boosts/claim', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, boostType, adReceipt: { watched: true } }),
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          const reason = body.error ?? 'network';
          setError(reason);
          setIsLoading(false);
          // Emit failed event
          posthog?.capture('boost_claim_failed', { reason, boost_type: boostType });
          resolve(false);
          return;
        }

        const next = { boostType, token: body.token };
        sessionStorage.setItem(BOOST_TOKEN_STORAGE_KEY(sessionId), JSON.stringify(next));
        setClaimed(next);
        setIsLoading(false);
        // Emit completed event
        posthog?.capture('boost_claim_completed', { boost_type: boostType, remaining_today: body.remaining });
        resolve(true);
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg);
        setIsLoading(false);
        // Emit failed event on network error
        posthog?.capture('boost_claim_failed', { reason: 'network', boost_type: boostType });
        resolve(false);
      }
    },
    [sessionId],
  );

  const claim = useCallback(
    async (boostType: BoostType): Promise<boolean> => {
      setError(null);
      setIsLoading(true);

      return new Promise((resolve) => {
        adCallbacksRef.current = { resolve, boostType };
        showAd();
      });
    },
    [showAd],
  );

  return { claim, claimed, isLoading, error };
}
