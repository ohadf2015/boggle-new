'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { TierPromotionToast } from '@/components/ui/TierPromotionToast';
import {
  type LeaderboardTierId,
  type LeaderboardTierDef,
  LEADERBOARD_TIER_IDS,
  compareTierIds,
} from '@/lib/ranked/leaderboardTiers';

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'lexiclash_lb_tier_';

function getStoredTier(userId: string): LeaderboardTierId | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw && LEADERBOARD_TIER_IDS.includes(raw as LeaderboardTierId)) {
      return raw as LeaderboardTierId;
    }
  } catch {
    // SSR or private browsing
  }
  return null;
}

function setStoredTier(userId: string, tierId: LeaderboardTierId): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, tierId);
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

interface UseTierPromotionOptions {
  userId: string | null | undefined;
  currentTier: LeaderboardTierDef | null | undefined;
  t?: (key: string, vars?: Record<string, string>) => string;
}

/**
 * Detects leaderboard tier promotions and shows a toast.
 * Uses localStorage to persist last-seen tier per user.
 *
 * - First time: stores tier silently (no toast).
 * - Promotion: shows TierPromotionToast and updates storage.
 * - Demotion: updates storage silently (no toast).
 */
export function useTierPromotion({
  userId,
  currentTier,
  t = (k) => k,
}: UseTierPromotionOptions) {
  // Track initial mount to avoid toasting on page load
  const mountedRef = useRef(false);

  const checkPromotion = useCallback(() => {
    if (!userId || !currentTier) return;

    const storedId = getStoredTier(userId);

    if (storedId === null) {
      setStoredTier(userId, currentTier.id);
      return;
    }

    const diff = compareTierIds(currentTier.id, storedId);

    if (diff > 0) {
      setStoredTier(userId, currentTier.id);
      toast.custom(
        () =>
          React.createElement(TierPromotionToast, { tier: currentTier, t }),
        {
          duration: 5500,
          id: `tier-promotion-${currentTier.id}`,
          position: 'top-center',
        }
      );
    } else if (diff < 0) {
      setStoredTier(userId, currentTier.id);
    }
  }, [userId, currentTier, t]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // On first mount, just initialize storage without toasting
      if (userId && currentTier && getStoredTier(userId) === null) {
        setStoredTier(userId, currentTier.id);
      }
      return;
    }
    checkPromotion();
  }, [checkPromotion, userId, currentTier]);
}
